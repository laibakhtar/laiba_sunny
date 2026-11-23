/**
 * One customer turn: retrieve knowledge, call the model with validated tools,
 * then validate the structured reply. Provider-agnostic via ModelClient.
 */
import {
  GOALS,
  HORIZONS,
  LIMITS,
  NEXT_STEPS,
  PURPOSES,
  type AccountContext,
  type AiErrorCode,
  type AllocationDTO,
  type ChatRequest,
  type ChatResponse,
  type ConversationContext,
} from '../src/shared/api.ts';
import { eligiblePromotionIds, initialOfferingIds, namedOfferingIds, OFFERINGS, resolveSignupProduct, validateOfferingIds } from '../src/shared/offerings.ts';
import { findAmounts, findDurations } from '../src/lib/parse.ts';
import { KNOWLEDGE, retrieve, validateSourceIds } from '../src/shared/knowledge.ts';
import { SYSTEM_INSTRUCTIONS, turnContext } from './prompt.ts';
import { executeTool, TOOL_DEFINITIONS, type ToolContext } from './tools.ts';

/** A tool call requested by the model; `arguments` is a JSON string. */
export interface ToolCall {
  callId: string;
  name: string;
  arguments: string;
}

/** One completed tool round within a turn: the model's own items (opaque) plus our results. */
export interface ToolRound {
  /** Provider-specific items to resend exactly as received (e.g. thoughts, function calls). */
  replay: unknown[];
  results: { callId: string; name: string; output: string }[];
}

/** Provider-neutral request. Adapters (e.g. geminiClient.ts) translate it to their SDK. */
export interface ModelRequest {
  model: string;
  /** System rules. */
  instructions: string;
  /** Per-turn reference data (facts, permission, knowledge). Not instructions. */
  context: string;
  messages: { role: 'customer' | 'sunny'; text: string }[];
  tools: typeof TOOL_DEFINITIONS;
  responseSchema: Record<string, unknown>;
  maxOutputTokens: number;
  rounds: ToolRound[];
  /** False forces a text answer (no further tool calls) this round. */
  allowTools: boolean;
  /** Present when the app asks the model to revise a draft reply that failed a check. */
  revision?: { draft: string; note: string };
}

export interface ModelResult {
  calls: ToolCall[];
  /** Final text (JSON per responseSchema) when there are no calls. */
  text: string;
  replay: unknown[];
}

export interface ModelClient {
  create(req: ModelRequest, signal: AbortSignal): Promise<ModelResult>;
}

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** JSON schema for Sunny's final reply. Output is re-validated after parsing. */
export const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    source_ids: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'source_ids', 'suggestions'],
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null);

/** Validate and trim an incoming request body. Throws AiError('bad_request'). */
export function sanitizeRequest(body: unknown): ChatRequest {
  const b = body as Partial<ChatRequest> | null;
  if (!b || typeof b !== 'object' || !Array.isArray(b.messages)) throw new AiError('bad_request', 'Malformed request.');
  const messages = b.messages
    .filter((m) => m && (m.role === 'customer' || m.role === 'sunny') && typeof m.text === 'string' && m.text.trim())
    .slice(-LIMITS.maxMessages)
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMITS.maxMessageChars) }));
  const last = messages.at(-1);
  if (!last || last.role !== 'customer') throw new AiError('bad_request', 'The last message must be from the customer.');
  const lastRaw = b.messages.at(-1)?.text ?? '';
  if (lastRaw.length > LIMITS.maxCustomerChars) {
    throw new AiError('bad_request', `Messages are limited to ${LIMITS.maxCustomerChars} characters.`);
  }
  const permission = b.permission === 'granted' || b.permission === 'declined' ? b.permission : 'not_asked';
  const a = b.account;
  const account: AccountContext | null =
    permission === 'granted' && a && typeof a === 'object'
      ? {
          chequingBalance: num(a.chequingBalance) ?? 0,
          savingsBalance: num(a.savingsBalance) ?? 0,
          monthlyIncome: num(a.monthlyIncome) ?? 0,
          monthlyExpenses: num(a.monthlyExpenses) ?? 0,
          signal:
            a.signal && typeof a.signal === 'object'
              ? {
                  rule: 'elevated_chequing_balance',
                  shown: a.signal.shown === true,
                  observationDays: num(a.signal.observationDays) ?? 0,
                  threshold: num(a.signal.threshold) ?? 0,
                  minBalance: num(a.signal.minBalance),
                  maxBalance: num(a.signal.maxBalance),
                }
              : null,
        }
      : null;
  const c = (b.context ?? {}) as Partial<ConversationContext>;
  const allocations: AllocationDTO[] = (Array.isArray(c.allocations) ? c.allocations : [])
    .map((x) => ({ account: oneOf(x?.account, ['chequing', 'savings'] as const), purpose: oneOf(x?.purpose, PURPOSES), amount: num(x?.amount) }))
    .filter((x): x is AllocationDTO => x.account !== null && x.purpose !== null && x.amount !== null && x.amount >= 0)
    .slice(0, 10);
  const goalType = oneOf(c.goal?.type, GOALS);
  return {
    firstName: String(b.firstName ?? 'there').slice(0, 40),
    messages,
    permission,
    account,
    context: {
      origin: oneOf(c.origin, ['nudge', 'self', 'checkin'] as const),
      allocations,
      goal: goalType ? { type: goalType, detail: typeof c.goal?.detail === 'string' ? c.goal.detail.slice(0, 200) : null } : null,
      horizon: oneOf(c.horizon, HORIZONS),
      nextStep: oneOf(c.nextStep, NEXT_STEPS),
      offeringsShown: validateOfferingIds(c.offeringsShown),
      offeringsExplored: validateOfferingIds(c.offeringsExplored),
      previousNextStep: oneOf(c.previousNextStep, NEXT_STEPS),
    },
  };
}

function productSuggestionReply(effects: ChatResponse['effects']): string | null {
  const shown = effects.find((effect) => effect.type === 'offeringsShown');
  if (!shown) return null;
  if (!shown.ids.length) return null;
  const explanations = shown.ids.map((id) => {
    const product = OFFERINGS.find((offering) => offering.id === id);
    const rationale = shown.reasons?.[id];
    return product ? `${product.name}: ${rationale ?? product.summary}` : null;
  }).filter((line): line is string => Boolean(line));
  return `Here are three Tangerine products to explore. ${shown.reason} ${explanations.join(' ')}`;
}

function signupReply(product: (typeof OFFERINGS)[number]): string {
  const conditions = product.conditions.filter((condition) => /annual fee|income/i.test(condition));
  const terms = conditions.length ? ` Published terms include ${conditions.join('; ')}.` : '';
  return `I can help you take the next step for the ${product.name}.${terms} Use the clickable card to open Tangerine’s official page. These conditions do not confirm your eligibility or approval; the prototype never collects application information or submits an application.`;
}

/** Only infer an explicit calculator request when each input has an unambiguous role. */
function calculatorRequest(text: string): { requested: boolean; args?: { starting_amount: number; monthly: number; years: number } } {
  const requested = /\b(?:calculator|calculate|calculation)\b/i.test(text) ||
    (/\bcompar(?:e|ison)\b/i.test(text) && /\b(?:grow|growth|savings|saving|interest|returns?)\b/i.test(text));
  if (!requested) return { requested: false };
  const amounts = findAmounts(text);
  const durations = findDurations(text);
  const monthlyMatches = [...text.matchAll(/(?:\$\s*)?(\d[\d,]*(?:\.\d+)?\s*(?:k\b|thousand\b)?)\s*(?:\/\s*month\b|(?:per|a|each)\s+month\b|monthly\b)/gi)];
  if (amounts.length !== 2 || amounts.some((a) => a.negative) || monthlyMatches.length !== 1 || durations.length !== 1 || durations[0] % 12 !== 0 || /\b(?:goal|target|debt|owe|income|salary|expenses?|bills?)\b/i.test(text)) return { requested: true };
  const monthly = findAmounts(monthlyMatches[0][1])[0]?.value;
  const index = monthlyMatches[0].index ?? 0;
  const before = findAmounts(text.slice(0, index));
  const after = findAmounts(text.slice(index + monthlyMatches[0][0].length));
  const other = [...before, ...after];
  if (monthly === undefined || other.length !== 1 || other[0].negative || !/\b(?:start(?:ing)?|initial|saved|savings|have|lump sum)\b/i.test(text)) return { requested: true };
  return { requested: true, args: { starting_amount: other[0].value, monthly, years: durations[0] / 12 } };
}

/** Knowledge retrieval uses the latest two customer messages plus the previous Sunny reply. */
export function retrievalQuery(req: ChatRequest): string {
  const customer = req.messages.filter((m) => m.role === 'customer').slice(-2).map((m) => m.text);
  const sunny = req.messages.filter((m) => m.role === 'sunny').slice(-1).map((m) => m.text.slice(0, 400));
  return [...customer, ...sunny].join(' ');
}

function requestsExternalSources(req: ChatRequest): boolean {
  let latestCustomerIndex = -1;
  for (let i = 0; i < req.messages.length; i++) {
    if (req.messages[i].role === 'customer') latestCustomerIndex = i;
  }
  const customerText = req.messages
    .filter((m) => m.role === 'customer')
    .slice(-2)
    .map((m) => m.text)
    .join(' ')
    .toLowerCase();
  const latestCustomer = req.messages[latestCustomerIndex]?.text.trim() ?? '';
  let previousSunny = '';
  for (let i = latestCustomerIndex - 1; i >= 0; i--) {
    if (req.messages[i].role === 'sunny') {
      previousSunny = req.messages[i].text;
      break;
    }
  }
  const agreesToOfferedSource =
    /^(?:yes|yeah|yep|sure|okay|ok|please|that would help|that'd help|sounds good)\b/i.test(latestCustomer) &&
    /\b(?:cra|canada revenue agency|fcac|cdic|official external|external guidance|outside source|independent source)\b/i.test(previousSunny);
  return (
    agreesToOfferedSource ||
    /\b(cra|canada revenue agency|fcac|financial consumer agency|cdic|canada deposit insurance)\b/.test(customerText) ||
    /\b(outside|beyond)\s+(?:of\s+)?tangerine\b/.test(customerText) ||
    /\b(explore|look|learn|read|see|show)\b.{0,40}\b(other providers|other banks|outside|beyond)\b/.test(customerText) ||
    /\b(outside|beyond|independent|external|third.party|broader)\b.{0,50}\b(source|guidance|information|rules|options|provider|bank)\b/.test(customerText) ||
    /\b(other banks|other providers|another bank|non.tangerine)\b/.test(customerText) ||
    /\b(compare|comparison)\b.{0,60}\b(outside|beyond|other|another|non.tangerine|different provider|different bank)\b/.test(customerText)
  );
}

function requestsProductSuggestions(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(?:should i invest|what should i invest|which (?:fund|investment|portfolio)|how much.{0,20}invest)\b/.test(t)) return false;
  return (
    /\bwhat (?:do|would|could) you recommend\b/.test(t) ||
    /\b(?:which|what) (?:tangerine )?(?:products?|accounts?|options?)\b.{0,50}\b(?:should|could|would) i (?:consider|explore|choose|use|open)\b/.test(t) ||
    /\b(?:recommend(?:ation|ations)?|suggest(?:ion|ions)?)\b.{0,60}\b(?:tangerine|product|account|option|savings|tfsa|rrsp|gic|fund|portfolio)\b/.test(t) ||
    /\b(?:tangerine )?(?:products?|accounts?|options?|savings|tfsa|rrsp|gics?|funds?|portfolios?)\b.{0,60}\b(?:recommend|suggest)\b/.test(t)
  );
}

function parseReply(text: string): { reply: string; source_ids: unknown; suggestions: unknown } {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) return parsed;
  } catch {
    // fall through
  }
  throw new AiError('provider_error', 'The AI response could not be read.');
}

const DOLLAR_RE = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/gi;

function dollarFigures(text: string): number[] {
  return [...text.matchAll(DOLLAR_RE)].map((m) => {
    const n = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
    return Math.round(n * 100) / 100;
  });
}

/** Every number appearing in the given sources (customer text, facts, tool results, knowledge…). */
function numbersIn(...sources: string[]): Set<number> {
  const out = new Set<number>();
  for (const src of sources) {
    for (const m of src.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(Math.round(parseFloat(m[0].replace(/,/g, '')) * 100) / 100);
    for (const a of findAmounts(src)) out.add(a.value);
  }
  return out;
}

/**
 * Dollar figures in a reply that no trusted source supports. The model must not
 * do arithmetic; figures must come from the customer, stated facts, the snapshot,
 * knowledge entries or deterministic tool results.
 */
export function unsupportedFigures(reply: string, allowed: Set<number>): number[] {
  return dollarFigures(reply).filter((n) => !allowed.has(n));
}

/** Remove inline citation markers like "[cdic-gic]" or "(source: tng-gic)"; sources are shown separately. */
export function stripInlineCitations(text: string): string {
  return text
    .replace(/\s*[[(](?:sources?:\s*)?(?:[a-z]{2,6}-[a-z0-9-]+)(?:\s*,\s*[a-z]{2,6}-[a-z0-9-]+)*[\])]/gi, '')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .trim();
}

/** Opt-in diagnostics (SUNNY_DEBUG_TOOLS=1): tool names and statuses only, never content or keys. */
function debugLog(round: number, entries: string[]) {
  if (typeof process !== 'undefined' && process.env?.SUNNY_DEBUG_TOOLS === '1') console.info(`[sunny] round ${round + 1}: ${entries.join(', ')}`);
}

/** Enforce the turn deadline even if the SDK doesn't honour the abort signal. */
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new AiError('timeout', 'The AI service took too long to respond.'));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

export async function runChatTurn(
  req: ChatRequest,
  client: ModelClient,
  model: string,
  signal: AbortSignal,
): Promise<ChatResponse> {
  const entries = retrieve(retrievalQuery(req), 7, [], requestsExternalSources(req));
  const ctx: ToolContext = {
    req,
    context: { ...req.context, allocations: [...req.context.allocations] },
    latestCustomer: req.messages.at(-1)!.text,
    effects: [],
  };
  const context = turnContext(req, entries);
  const rounds: ToolRound[] = [];
  let allowTools = true;
  let revision: ModelRequest['revision'];
  const trusted = () =>
    numbersIn(
      context,
      ...KNOWLEDGE.map((e) => e.content),
      ...OFFERINGS.map((o) => JSON.stringify(o)),
      JSON.stringify(req.context),
      JSON.stringify(ctx.context),
      JSON.stringify(req.account ?? {}),
      ...req.messages.map((m) => m.text),
      ...rounds.flatMap((r) => r.results.map((x) => x.output)),
    );

  for (let round = 0; round < LIMITS.maxToolRounds; round++) {
    if (signal.aborted) throw new AiError('timeout', 'The AI service took too long to respond.');
    const res = await withAbort(client.create(
      {
        model,
        instructions: SYSTEM_INSTRUCTIONS,
        context,
        messages: req.messages,
        tools: TOOL_DEFINITIONS,
        responseSchema: REPLY_SCHEMA,
        maxOutputTokens: LIMITS.maxOutputTokens,
        rounds,
        allowTools: allowTools && round < LIMITS.maxToolRounds - 1,
        ...(revision ? { revision } : {}),
      },
      signal,
    ), signal);
    if (!res.calls.length) {
      const parsed = parseReply(res.text);
      const calculator = calculatorRequest(ctx.latestCustomer);
      if (calculator.requested) {
        ctx.effects = ctx.effects.filter((effect) => effect.type !== 'scenario' || (
          calculator.args !== undefined && effect.startingAmount === calculator.args.starting_amount &&
          effect.monthlyContribution === calculator.args.monthly && effect.years === calculator.args.years
        ));
      }
      if (calculator.requested && !ctx.effects.some((effect) => effect.type === 'scenario') && calculator.args) {
        executeTool('calculate_scenario', JSON.stringify(calculator.args), ctx);
      }
      const hasScenario = ctx.effects.some((effect) => effect.type === 'scenario');
      const calculatorReply = calculator.requested
        ? hasScenario
          ? 'Here is your interactive savings and growth comparison. Any investment return is hypothetical and requires an entered rate.'
          : 'What starting amount, monthly contribution, and whole-number time period in years would you like to compare? Please include each amount and how often you contribute.'
        : !hasScenario && /\b(?:opened|created|set up|prepared|built|generated)\b[^.!?]{0,100}\b(?:calculator|comparison|projection|scenario)\b|\b(?:calculator|comparison|projection|scenario)\b[^.!?]{0,80}\b(?:is|has been)\s+(?:open|ready|created|set up|prepared)\b/i.test(parsed.reply)
          ? 'I can help with a comparison. Please tell me your starting amount, monthly contribution, and time period in years.'
          : null;
      const bad = unsupportedFigures(parsed.reply, trusted());
      if (!calculatorReply && bad.length && !revision && round < LIMITS.maxToolRounds - 1) {
        debugLog(round, [`revision: unsupported figures ${bad.length}`]);
        revision = {
          draft: parsed.reply,
          note:
            `[App check] Your draft states dollar figures that no tool or stated fact produced (${bad.map((n) => `$${n.toLocaleString('en-CA')}`).join(', ')}). ` +
            'Never do arithmetic yourself. Write a complete, helpful replacement reply (do not apologise or mention this check): record what the customer stated with the record_* tools and use calculate_scenario for any totals, or explain what is still needed.',
        };
        continue;
      }
      const recommendationRequest = requestsProductSuggestions(ctx.latestCustomer);
      if (recommendationRequest && !ctx.effects.some((effect) => effect.type === 'offeringsShown')) {
        const ids = initialOfferingIds(
          ctx.context.goal?.type ?? null,
          ctx.context.horizon,
          namedOfferingIds(ctx.latestCustomer),
          ctx.latestCustomer,
        );
        executeTool(
          'show_offerings',
          JSON.stringify({ offering_ids: ids, reason: '' }),
          ctx,
        );
      }
      const signupProductId = resolveSignupProduct(
        ctx.latestCustomer,
        req.messages.filter((message) => message.role === 'sunny').slice(-5).reverse().map((message) => message.text),
        ctx.context.offeringsShown,
      );
      const signupProduct = signupProductId ? OFFERINGS.find((offering) => offering.id === signupProductId) : undefined;
      if (signupProductId && signupProduct && !ctx.effects.some((effect) => effect.type === 'signupPrepared')) {
        const promotionIds = eligiblePromotionIds([signupProductId], ctx.latestCustomer);
        ctx.effects.push({
          type: 'signupPrepared',
          productId: signupProductId,
          ...(promotionIds.length ? { promotionIds } : {}),
        });
      }
      return {
        reply: stripInlineCitations(
          calculatorReply ?? (signupProduct ? signupReply(signupProduct) : null) ??
          (recommendationRequest ? productSuggestionReply(ctx.effects) : null) ??
          parsed.reply,
        ).slice(0, LIMITS.maxReplyChars),
        sourceIds: validateSourceIds(signupProduct ? [signupProduct.sources[0]] : parsed.source_ids),
        suggestions: (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim().slice(0, 60))
          .slice(0, LIMITS.maxSuggestions),
        effects: ctx.effects,
      };
    }
    const results = res.calls.map((c) => ({ callId: c.callId, name: c.name, output: executeTool(c.name, c.arguments, ctx) }));
    rounds.push({ replay: res.replay, results });
    const statuses = results.map((r) => (JSON.parse(r.output) as { status?: string }).status ?? 'unknown');
    debugLog(round, results.map((r, i) => `${r.name}:${statuses[i]}`));
    // If nothing useful happened, stop offering tools so the model answers (and doesn't burn quota).
    if (statuses.every((st) => st === 'not_needed' || st === 'already_granted' || st === 'customer_declined')) allowTools = false;
  }
  throw new AiError('provider_error', 'The AI took too many steps to answer.');
}
