/**
 * Tools the model may call. Each executor validates its arguments against the
 * request state and returns a JSON string for the model. Side effects are
 * collected as ChatEffects for the client, which re-validates before applying.
 *
 * The model can explain the existing signal but cannot invent balances,
 * history, preferences or completed actions: everything it records must come
 * from the customer's own words or from code.
 */
import {
  DEFAULT_WEALTH_YEARS,
  isValidAmount,
  MAX_WEALTH_YEARS,
  calculateMortgageScenario,
  projectWealthComparison,
} from '../src/lib/calc.ts';
import { findAmounts, findDurations, normalizeText } from '../src/lib/parse.ts';
import {
  checkAmount,
  GOALS,
  HORIZONS,
  NEXT_STEPS,
  PURPOSES,
  type AllocationDTO,
  type ChatEffect,
  type ChatRequest,
  type ConversationContext,
  type GoalKey,
  type HorizonKey,
  type MortgageScenarioDTO,
  type NextStepKey,
  type PurposeKey,
} from '../src/shared/api.ts';
import { eligiblePromotionIds, initialOfferingIds, namedOfferingIds, OFFERINGS, offeringContextForMessages, offeringPlan, offeringReasons, validateOfferingIds, type OfferingSignals } from '../src/shared/offerings.ts';

export interface ToolContext {
  req: ChatRequest;
  /** Working copy of customer-confirmed context, updated as proposals are accepted this turn. */
  context: ConversationContext;
  latestCustomer: string;
  effects: ChatEffect[];
}

/** Provider-neutral function tool definitions (JSON Schema parameters). */
export const TOOL_DEFINITIONS = [
  {
    name: 'read_account_snapshot',
    description: 'Read the customer’s synthetic account details (balances, monthly cash flow, the dashboard signal) and current allocations. Only available after permission.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'request_account_permission',
    description: 'Ask permission to use account details for a personalized answer.',
    parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
  },
  {
    name: 'record_allocation',
    description:
      'Record what part of an account balance the customer says is for a purpose (e.g. "$3,000 for bills"). A later statement for the same account and purpose replaces the earlier one. Validated against the balance.',
    parameters: {
      type: 'object',
      properties: {
        account: { type: 'string', enum: ['chequing', 'savings'] },
        purpose: { type: 'string', enum: PURPOSES },
        amount: { type: 'number' },
        customer_quote: { type: 'string', description: 'Exact words from the customer’s latest message stating this amount.' },
      },
      required: ['account', 'purpose', 'amount', 'customer_quote'],
    },
  },
  {
    name: 'record_goal',
    description: 'Record the goal the customer stated in their latest message.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string', enum: GOALS },
        detail: { type: 'string', description: 'Short paraphrase of what they said.' },
        customer_quote: { type: 'string' },
      },
      required: ['goal', 'detail', 'customer_quote'],
    },
  },
  {
    name: 'record_time_horizon',
    description: 'Record roughly when the customer might need the money, as they stated it.',
    parameters: {
      type: 'object',
      properties: { horizon: { type: 'string', enum: HORIZONS }, customer_quote: { type: 'string' } },
      required: ['horizon', 'customer_quote'],
    },
  },
  {
    name: 'show_offerings',
    description: `Show verified Tangerine offerings as a card. Valid ids: ${OFFERINGS.map((o) => o.id).join(', ')}. Use when the customer has a stated goal or asks about Tangerine options.`,
    parameters: {
      type: 'object',
      properties: {
        offering_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['offering_ids'],
    },
  },
  {
    name: 'record_next_step',
    description: 'Record the next step the customer chose.',
    parameters: {
      type: 'object',
      properties: { step: { type: 'string', enum: NEXT_STEPS }, customer_quote: { type: 'string' } },
      required: ['step', 'customer_quote'],
    },
  },
  {
    name: 'calculate_scenario',
    description:
      'Build an interactive wealth and savings growth comparison. Use customer-stated amounts or, with permission, the not-yet-assigned chequing balance. Defaults to a context-aware horizon and compares Tangerine options unless the customer requests contribution-only math.',
    parameters: {
      type: 'object',
      properties: {
        starting_amount: { type: 'number', description: 'Optional customer-stated starting lump sum; if absent, use permissioned not-yet-assigned chequing cash or $0.' },
        monthly: { type: 'number', description: 'Optional customer-stated monthly contribution; defaults to $0 if not specified.' },
        years: { type: 'integer', description: `Optional customer-stated whole-year horizon from 1 to ${MAX_WEALTH_YEARS}. If omitted, resolve from the confirmed timeframe (1, 5 or 10 years).` },
        months: { type: 'integer', description: 'Legacy duration input. Use only if customer-stated and an exact whole number of years.' },
        annual_rate: { type: 'number', description: 'Optional customer-stated illustrative effective annual rate in percent; blank by default. Never imply the rate is guaranteed.' },
        compare_tangerine_options: { type: 'boolean', description: 'Defaults to true; set false only if the customer explicitly wants contributions-only math.' },
      },
      required: [],
    },
  },
  {
    name: 'calculate_mortgage',
    description:
      'Build an illustrative mortgage payment or affordability calculator. Use only amounts the customer stated. The default 4.79% rate is an illustrative assumption, not a Tangerine quote or approval.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['payment', 'affordability'] },
        home_price: { type: 'number' },
        mortgage_amount: { type: 'number' },
        down_payment: { type: 'number' },
        annual_income: { type: 'number', description: 'Only use an income figure the customer stated.' },
        monthly_debts: { type: 'number', description: 'Only use a debt figure the customer stated; defaults to zero.' },
        annual_rate: { type: 'number', description: 'Customer-stated rate in percent; defaults to the illustrative 4.79% assumption.' },
        amortization_years: { type: 'integer', description: 'Customer-stated whole years; defaults to 25.' },
        payment_frequency: { type: 'string', enum: ['monthly', 'biweekly'] },
      },
      required: [],
    },
  },
  {
    name: 'prepare_summary',
    description: 'Prepare the conversation summary for the customer to review.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'prepare_support_preview',
    description: 'Prepare a human-support preview when the customer asks for help, expresses frustration, or accepts an offer to prepare questions for an advisor (concept only; nothing is sent or booked).',
    parameters: { type: 'object', properties: { questions: { type: 'array', items: { type: 'string' } } }, required: ['questions'] },
  },
];

type ToolResult = Record<string, unknown>;

const PERSONAL_RE =
  /\bmy (balance|balances|account|accounts|chequing|savings|money|cash|income|spending|budget|situation|numbers)\b|this money|that money|how much (do|can|could|should|would) i|what (can|could) i (save|afford)|\bscenario\b|\bcan i afford\b|use my (account|details)/;
const SUPPORT_RE = /human|person|advis|someone|support|talk to|speak (to|with)|call (me|them|tangerine)|representative|appointment|prepare.{0,20}questions|questions? (for|to ask)|(?:write|make|draft).{0,20}questions/;
const FRUSTRATION_RE = /frustrat|annoy|useless|waste of time|not helping|don['’]t understand|can['’]t you just|ridiculous|angry|upset|fed up|unhelpful/i;
const SUPPORT_AFFIRMATIVE_RE = /^(?:yes|yeah|yep|sure|okay|ok|please|sounds good|go ahead|do that|that would help|that'd help)\b/i;
const SUPPORT_OFFER_RE = /\b(?:advisor|adviser|representative|human|person|support)\b/i;
const SUPPORT_PREPARATION_RE = /\b(?:prepare|draft|questions|connect|talk|speak|conversation)\b/i;
const SUMMARY_RE = /summar|recap|wrap (it )?up|save (this|our|the) conversation|print/;
const BROWSE_RE = /\b(all|every|full list|browse|everything|other options|whole catalogue)\b/;
const OFFERINGS_RE = /recommend|suggest|best for|fit me|tangerine|option|product|account|fund|gic|tfsa|rrsp|rsp|portfolio|credit card|mastercard|offer|compare|what can|rif|fhsa|chequing|checking|savings|usd|money.?back|cash.?back|scene\+|mortgage|heloc|line of credit|payroll|direct deposit/i;
const OFFERING_NAMED_RE = /\b(?:credit cards?|mastercards?|money.?back|cash.?back|world elite|scene\+)\b/i;
const PRODUCT_FAMILY_RE = /\b(?:credit cards?|mastercards?|mortgages?|savings accounts?|gics?|tfsas?|rrsps?|rsps?|rifs?|mutual funds?|investment funds?|lines? of credit|heloc|business banking|business accounts?|personal loans?|fhsas?|first.home savings accounts?)\b/i;
const MORTGAGE_CALCULATOR_RE =
  /\bmortgage\b.{0,60}\b(?:payment|afford(?:ability)?|calculator|calculate|monthly|rates?|options?)\b|\b(?:mortgage )?(?:payment|affordability) calculator\b|\bhow much (?:house|home)\b.{0,50}\b(?:afford|buy|qualify)\b|\b(?:afford|qualify)\b.{0,50}\b(?:house|home|mortgage)\b|\bmonthly payment\b.{0,40}\b(?:home|house|mortgage)\b|\b(?:check|see|show|explore)\b.{0,50}\b(?:live )?mortgage rates?\b|\bexplore\b.{0,50}\btangerine mortgage options?\b/i;

export function isMortgageCalculatorRequest(text: string): boolean {
  return MORTGAGE_CALCULATOR_RE.test(text);
}

function acceptsSupportOffer(ctx: ToolContext): boolean {
  if (!SUPPORT_AFFIRMATIVE_RE.test(ctx.latestCustomer.trim())) return false;
  const previousMessage = ctx.req.messages.at(-2);
  if (previousMessage?.role !== 'sunny') return false;
  return SUPPORT_OFFER_RE.test(previousMessage.text) && SUPPORT_PREPARATION_RE.test(previousMessage.text);
}

export function accountSignals(ctx: ToolContext): OfferingSignals {
  const account = ctx.req.permission === 'granted' ? ctx.req.account : null;
  const unassignedCash = unassigned(ctx, 'chequing');
  return {
    hasUnassignedCash: unassignedCash === null ? undefined : unassignedCash > 0,
    chequingSurplusSignal: account ? account.signal?.shown ?? false : undefined,
    monthlyExpenses: account?.monthlyExpenses,
    hasSavingsAccount: account && account.savingsBalance > 0 ? true : undefined,
  };
}

export function offeringContextForTurn(ctx: ToolContext): { goal: GoalKey | null; horizon: HorizonKey | null } {
  const customerMessages = ctx.req.messages.filter((message) => message.role === 'customer').map((message) => message.text);
  return offeringContextForMessages(ctx.context.goal?.type ?? null, ctx.context.horizon, customerMessages);
}

function productSuggestionReason(ctx: ToolContext, ids: string[], signals: OfferingSignals): string {
  const goalLabels: Record<string, string> = {
    build_wealth: 'building wealth and learning about investing',
    accessible_interest: 'keeping money accessible while earning interest',
    first_home: 'saving for a first home',
    understand_options: 'understanding the options before deciding',
    other: 'the goal you shared',
  };
  const horizonLabels: Record<string, string> = {
    under_1_year: 'within a year',
    '1_to_5_years': 'one to five years',
    over_5_years: 'more than five years',
    not_sure: 'an uncertain timeframe',
  };
  const turnContext = offeringContextForTurn(ctx);
  const goal = turnContext.goal ? goalLabels[turnContext.goal] : null;
  const horizon = turnContext.horizon ? horizonLabels[turnContext.horizon] : null;
  const names = ids.map((id) => OFFERINGS.find((offering) => offering.id === id)?.name).filter(Boolean);
  const isCardFamily = ids.some((id) => ['money-back-card', 'money-back-world', 'rewards-world-elite'].includes(id));
  if (ids.length === 1) return `You asked about ${names[0]}; its features and trade-offs are shown below.`;
  if (isCardFamily) return 'You asked about Tangerine credit cards; these related options are grouped for comparison.';

  const activeSignal = ctx.req.permission === 'granted'
    ? signals.hasUnassignedCash === true
      ? 'you have not-yet-assigned cash in your chequing account'
      : signals.chequingSurplusSignal === true
        ? 'you shared a chequing-balance pattern that suggests a surplus'
        : ''
    : '';
  if (!goal && !horizon) {
    return activeSignal
      ? `Since ${activeSignal}, these are three versatile Tangerine starting options to compare.`
      : `Here are ${ids.length} versatile Tangerine starting options to compare.`;
  }
  const basis = [goal && `your goal of ${goal}`, horizon && `your timeframe of ${horizon}`].filter(Boolean).join(' and ');
  return activeSignal
    ? `Since ${activeSignal}, and based on ${basis}, these options have different features and trade-offs to compare.`
    : `Based on ${basis}, these options have different features and trade-offs to compare.`;
}

/** What the customer's own words must contain for each recorded choice (meaning check on top of the quote check). */
const NEXT_STEP_WORDS: Record<NextStepKey, RegExp> = {
  learn_risk: /risk/,
  compare_options: /compar|side by side|difference/,
  explore_scenario: /scenario|calculat|what if|illustrat|numbers/,
  read_product_page: /page|website|official|read/,
  prepare_questions: /question|advis|person|talk to|speak/,
  save_for_later: /later|come back|save (this|it)|remind/,
  not_proceeding: /not (right )?now|no thanks|not ready|don.t want|stop|not interested/,
};
const GOAL_WORDS: Record<GoalKey, RegExp> = {
  build_wealth: /wealth|invest|grow|long.term|retire/,
  accessible_interest: /access|interest|safe|savings|available/,
  first_home: /home|house|condo|down payment|fhsa/,
  understand_options: /understand|options|learn|before deciding|not sure/,
  other: /./,
};
const HORIZON_WORDS: Record<HorizonKey, RegExp> = {
  under_1_year: /year|month|soon/,
  '1_to_5_years': /year/,
  over_5_years: /year|long|decade|retire|5|five/,
  not_sure: /sure|know|idea|unsure/,
};

const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'my', 'is', 'it', 'to', 'for', 'and', 'i', 'im', 'ive', 'am', 'are', 'be', 'that', 'this', 'about', 'some', 'just', 'actually', 'so', 'in', 'on']);
const tokens = (t: string) => t.replace(/[^a-z0-9.\s-]/g, ' ').split(/\s+/).filter((w) => w && !STOPWORDS.has(w));

/** The quote must come from the latest customer message: verbatim, or a light paraphrase of its words and numbers. */
export function quoteSupported(quote: string, latest: string): boolean {
  if (latest.includes(quote)) return true;
  const q = tokens(quote);
  const l = new Set(tokens(latest));
  return q.length > 0 && q.every((w) => l.has(w));
}

function balanceOf(ctx: ToolContext, account: 'chequing' | 'savings'): number | null {
  if (ctx.req.permission !== 'granted' || !ctx.req.account) return null;
  return account === 'chequing' ? ctx.req.account.chequingBalance : ctx.req.account.savingsBalance;
}

function unassigned(ctx: ToolContext, account: 'chequing' | 'savings'): number | null {
  const bal = balanceOf(ctx, account);
  if (bal === null) return null;
  const allocated = ctx.context.allocations.filter((a) => a.account === account).reduce((s, a) => s + a.amount, 0);
  return Math.max(0, Math.round((bal - allocated) * 100) / 100);
}

function upsertEffect<T extends ChatEffect['type']>(ctx: ToolContext, type: T, effect: Extract<ChatEffect, { type: T }>) {
  ctx.effects = ctx.effects.filter((e) => e.type !== type);
  ctx.effects.push(effect);
}

function quoteCheck(args: Record<string, unknown>, ctx: ToolContext): ToolResult | null {
  const quote = normalizeText(typeof args.customer_quote === 'string' ? args.customer_quote : '');
  if (!quote || !quoteSupported(quote, normalizeText(ctx.latestCustomer))) {
    return {
      status: 'needs_clarification',
      reason: 'not_stated_in_latest_message',
      instruction: 'Only record what the customer just said, in their words. Ask them to confirm.',
    };
  }
  return null;
}

function recordAllocation(args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  const account = args.account === 'savings' ? 'savings' : args.account === 'chequing' ? 'chequing' : null;
  const purpose = PURPOSES.includes(args.purpose as PurposeKey) ? (args.purpose as PurposeKey) : null;
  if (!account || !purpose) return { status: 'rejected', reason: 'invalid_account_or_purpose' };
  const bad = quoteCheck(args, ctx);
  if (bad) return bad;
  const quote = normalizeText(String(args.customer_quote));
  if (findAmounts(quote).some((a) => a.negative)) return { status: 'rejected', reason: 'negative', instruction: 'Amounts must be $0 or more. Ask what they meant.' };
  const issue = checkAmount(args.amount);
  if (issue) return { status: 'rejected', reason: issue, instruction: 'Do not record this. Ask the customer to clarify.' };
  const amount = args.amount as number;
  if (!findAmounts(quote).some((a) => !a.negative && a.value === amount)) {
    return { status: 'needs_clarification', reason: 'amount_not_in_quote', instruction: 'The amount doesn’t match what the customer said. Ask a short clarifying question.' };
  }
  const next: AllocationDTO[] = [...ctx.context.allocations.filter((a) => !(a.account === account && a.purpose === purpose)), { account, purpose, amount }];
  const bal = balanceOf(ctx, account);
  const total = next.filter((a) => a.account === account).reduce((s, a) => s + a.amount, 0);
  if (bal !== null && total > bal) {
    return {
      status: 'needs_clarification',
      reason: 'exceeds_balance',
      accountBalance: bal,
      totalAllocated: total,
      instruction: 'Allocations would exceed this account’s balance. Ask whether some is held elsewhere or whether to adjust the amounts. Do not record it.',
    };
  }
  ctx.context = { ...ctx.context, allocations: next };
  upsertEffect(ctx, 'allocationsUpdated', { type: 'allocationsUpdated', allocations: next });
  return {
    status: 'applied',
    allocations: next,
    notYetAssigned: unassigned(ctx, account),
    note: bal === null ? 'Balance not shared; the app will validate against the actual balance.' : 'Describe any remainder as “not yet assigned to a purpose”, never as “available to invest”.',
  };
}

function calculate(args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  const customerText = normalizeText(ctx.req.messages.filter((m) => m.role === 'customer').map((m) => m.text).join(' \n '));
  const latestAmounts = findAmounts(ctx.latestCustomer).filter((amount) => !amount.negative).map((amount) => amount.value);
  const allStatedAmounts = new Set(findAmounts(customerText).filter((amount) => !amount.negative).map((amount) => amount.value));
  const available = ctx.req.permission === 'granted' ? unassigned(ctx, 'chequing') : null;
  const monthlyMentioned = /(?:per|a|each)\s+month|monthly/i.test(ctx.latestCustomer);
  const inferredMonthly = monthlyMentioned && latestAmounts.length === 1 ? latestAmounts[0] : undefined;
  const monthly = args.monthly === undefined ? inferredMonthly ?? 0 : args.monthly;
  const candidateStartingAmounts = latestAmounts.filter((amount) => amount !== monthly);
  const inferredStarting = candidateStartingAmounts.length === 1 ? candidateStartingAmounts[0] : undefined;
  const start = args.starting_amount === undefined ? inferredStarting ?? available ?? 0 : args.starting_amount;
  const startingAmountWasStated = inferredStarting !== undefined || (typeof start === 'number' && allStatedAmounts.has(start));

  // Every non-default value must come from the customer or permissioned account context.
  const derived = new Set([available, ...ctx.context.allocations.map((a) => a.amount)].filter((n): n is number => n !== null));
  const allowedAmount = (value: unknown) =>
    typeof value === 'number' &&
    isValidAmount(value) &&
    (value === 0 || allStatedAmounts.has(value) || derived.has(value));
  if (typeof start !== 'number' || typeof monthly !== 'number' || !allowedAmount(start) || !allowedAmount(monthly)) {
    return {
      status: 'rejected',
      reason: 'amount_not_grounded_or_invalid',
      instruction: 'Use only customer-stated amounts or the permissioned not-yet-assigned balance; ask for clarification instead of assuming.',
    };
  }

  const defaultYears = ctx.context.horizon === 'under_1_year'
    ? 1
    : ctx.context.horizon === 'over_5_years'
      ? 10
      : DEFAULT_WEALTH_YEARS;
  const latestDurations = findDurations(ctx.latestCustomer);
  const comparativeDuration = /\b(?:more than|over|at least)\s+(?:the\s+next\s+)?\d+(?:\.\d+)?\s*(?:years?|yrs?|months?|mos?)\b/i.test(ctx.latestCustomer);
  const statedDuration = comparativeDuration ? undefined : latestDurations.at(-1);
  let years = defaultYears;
  if (statedDuration !== undefined) {
    if (statedDuration % 12 !== 0) {
      return { status: 'needs_clarification', instruction: 'Ask the customer to choose a whole number of years for the comparison.' };
    }
    years = statedDuration / 12;
  }
  if (!Number.isInteger(years) || years < 1 || years > MAX_WEALTH_YEARS) {
    return { status: 'rejected', reason: 'invalid_years', instruction: `Use a whole-year horizon from 1 to ${MAX_WEALTH_YEARS}.` };
  }

  const mentionedRates = [...customerText.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:%|percent\b)/gi)].map((match) => Number(match[1]));
  const customRate = args.annual_rate === undefined ? null : args.annual_rate;
  if (
    (customRate !== null && typeof customRate !== 'number') ||
    (typeof args.annual_rate === 'number' && !mentionedRates.includes(args.annual_rate))
  ) {
    return { status: 'not_needed', instruction: 'Use a custom annual rate only when the customer explicitly stated one.' };
  }

  const comparison = projectWealthComparison({
    startingAmount: start,
    monthlyContribution: monthly,
    years,
    customRate,
  });
  if (!comparison.valid) return { status: 'rejected', errors: comparison.errors, instruction: 'Ask the customer for valid amounts, rate, or timeframe.' };
  const compareTangerineOptions = args.compare_tangerine_options !== false;
  const options = compareTangerineOptions
    ? comparison.options
    : comparison.options.filter((option) => option.id === 'contributionsOnly');
  const scenario = {
    years: comparison.years,
    tfsaSavingsRate: comparison.tfsaSavingsRate,
    startingAmount: comparison.startingAmount,
    monthlyContribution: comparison.monthlyContribution,
    customRate: comparison.customRate,
    compareTangerineOptions,
    totalContributions: comparison.totalContributions,
    options,
    yearlyBreakdown: comparison.yearlyBreakdown,
  };
  upsertEffect(ctx, 'scenario', { type: 'scenario', ...scenario });
  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const summaryText = options
    .map((option) => `${option.label}: ending balance ${money.format(option.endingBalance)}, total growth ${money.format(option.totalGrowth)}`)
    .join('; ');
  const startingAmountSource = [
    start === available && available !== null
      ? 'The starting amount uses the permissioned not-yet-assigned chequing balance.'
      : '',
    start === 0 && monthly > 0 && !startingAmountWasStated
      ? 'No starting lump sum was specified, so use $0 and ask briefly whether the customer would like to include one.'
      : '',
  ].filter(Boolean).join(' ');
  return {
    status: 'calculated',
    ...scenario,
    summaryText,
    note: `${startingAmountSource} Show the interactive comparison. Regular Savings and TFSA Savings each use an illustrative 0.30% annual-rate assumption; GIC benchmarks are fixed-rate assumptions and not a live quote; the illustrative fund rate is optional, hypothetical, and not guaranteed.`,
  };
}

function calculateMortgage(args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  if (!isMortgageCalculatorRequest(ctx.latestCustomer)) {
    return { status: 'not_needed', instruction: 'Use this calculator only for a mortgage options, rate, payment, affordability or explorer request.' };
  }
  const text = ctx.req.messages.filter((message) => message.role === 'customer').map((message) => message.text).join(' ');
  const statedAmounts = new Set(findAmounts(text).filter((amount) => !amount.negative).map((amount) => amount.value));
  const amountValue = (key: 'home_price' | 'mortgage_amount' | 'down_payment' | 'annual_income' | 'monthly_debts'): number | undefined => {
    const value = args[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !isValidAmount(value) || (value !== 0 && !statedAmounts.has(value))) return Number.NaN;
    return value;
  };
  const mode = args.mode === 'affordability' || /\b(?:afford|qualify|how much home|home price)\b/i.test(ctx.latestCustomer)
    ? 'affordability'
    : 'payment';
  const homePrice = amountValue('home_price');
  const mortgageAmount = amountValue('mortgage_amount');
  const downPayment = amountValue('down_payment');
  const annualIncome = amountValue('annual_income');
  const monthlyDebts = amountValue('monthly_debts');
  if ([homePrice, mortgageAmount, downPayment, annualIncome, monthlyDebts].some((value) => Number.isNaN(value))) {
    return {
      status: 'rejected',
      reason: 'amount_not_grounded_or_invalid',
      instruction: 'Use only customer-stated mortgage amounts, debts and income. Do not infer income from account data or invent property costs.',
    };
  }

  const rate = args.annual_rate;
  const statedRates = [...ctx.latestCustomer.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent\b)/gi)].map((match) => Number(match[1]));
  if (rate !== undefined && (typeof rate !== 'number' || !Number.isFinite(rate) || (rate !== 4.79 && !statedRates.includes(rate)))) {
    return { status: 'rejected', reason: 'rate_not_grounded', instruction: 'Use a customer-stated rate or the clearly labeled illustrative 4.79% default.' };
  }
  const amortizationYears = args.amortization_years;
  if (amortizationYears !== undefined && (typeof amortizationYears !== 'number' || (!Number.isInteger(amortizationYears)) || (amortizationYears !== 25 && !findDurations(ctx.latestCustomer).includes(amortizationYears * 12)))) {
    return { status: 'rejected', reason: 'amortization_not_grounded', instruction: 'Use a customer-stated whole-year amortization or the illustrative 25-year default.' };
  }
  if (args.payment_frequency !== undefined && args.payment_frequency !== 'monthly' && args.payment_frequency !== 'biweekly') {
    return { status: 'rejected', reason: 'invalid_payment_frequency', instruction: 'Use monthly or biweekly payments.' };
  }

  const calculation = calculateMortgageScenario({
    mode,
    ...(homePrice !== undefined ? { homePrice } : {}),
    ...(mortgageAmount !== undefined ? { mortgageAmount } : {}),
    ...(downPayment !== undefined ? { downPayment } : {}),
    ...(annualIncome !== undefined ? { annualIncome } : {}),
    ...(monthlyDebts !== undefined ? { monthlyDebts } : {}),
    ...(typeof rate === 'number' ? { annualRate: rate } : {}),
    ...(typeof amortizationYears === 'number' ? { amortizationYears } : {}),
    ...(args.payment_frequency === 'biweekly' ? { paymentFrequency: 'biweekly' as const } : {}),
  });
  if (!calculation.valid) return { status: 'rejected', errors: calculation.errors, instruction: 'Ask the customer to correct the invalid calculator inputs.' };

  const dto: MortgageScenarioDTO = {
    mode: calculation.mode,
    homePrice: calculation.homePrice,
    mortgageAmount: calculation.mortgageAmount,
    downPayment: calculation.downPayment,
    annualIncome: calculation.annualIncome,
    monthlyDebts: calculation.monthlyDebts,
    annualRate: calculation.annualRate,
    amortizationYears: calculation.amortizationYears,
    paymentFrequency: calculation.paymentFrequency,
    regularPayment: calculation.regularPayment,
    monthlyPayment: calculation.monthlyPayment,
    termYears: calculation.termYears,
    totalPaymentsInTerm: calculation.totalPaymentsInTerm,
    principalPaidInTerm: calculation.principalPaidInTerm,
    interestPaidInTerm: calculation.interestPaidInTerm,
    gdsMonthlyLimit: calculation.gdsMonthlyLimit,
    tdsMonthlyLimit: calculation.tdsMonthlyLimit,
    monthlyHousingPaymentLimit: calculation.monthlyHousingPaymentLimit,
    maxMortgageAmount: calculation.maxMortgageAmount,
    maxPurchasePrice: calculation.maxPurchasePrice,
  };
  upsertEffect(ctx, 'mortgageScenario', { type: 'mortgageScenario', ...dto });
  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const summaryText = mode === 'affordability'
    ? dto.annualIncome > 0
      ? `Illustrative maximum purchase price ${money.format(dto.maxPurchasePrice)} and monthly housing payment limit ${money.format(dto.monthlyHousingPaymentLimit)}.`
      : 'The calculator is ready; ask the customer to enter their own annual income and any monthly debts if they want an affordability estimate.'
    : dto.mortgageAmount > 0
      ? `${dto.paymentFrequency === 'monthly' ? 'Monthly' : 'Biweekly'} payment ${money.format(dto.regularPayment)}; over five years, principal paid ${money.format(dto.principalPaidInTerm)} and interest paid ${money.format(dto.interestPaidInTerm)}.`
      : 'The calculator is ready; ask the customer to enter a home price or mortgage amount and down payment to see an illustrative payment.';
  return {
    status: 'calculated',
    ...dto,
    summaryText,
    assumptions: 'Illustrative only, using Canadian semi-annual compounding and a 5-year term. The default 4.79% rate is not a Tangerine quote. Affordability uses 39% GDS / 44% TDS and excludes property taxes, heating, condo fees and mortgage insurance.',
  };
}

export function executeTool(name: string, rawArgs: string, ctx: ToolContext): string {
  let args: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawArgs || '{}');
    args = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return JSON.stringify({ status: 'error', reason: 'invalid_arguments' });
  }
  return JSON.stringify(run(name, args, ctx));
}

function run(name: string, args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  const latest = ctx.latestCustomer.toLowerCase();
  switch (name) {
    case 'read_account_snapshot': {
      if (ctx.req.permission !== 'granted' || !ctx.req.account) {
        return {
          status: 'permission_required',
          instruction: ctx.req.permission === 'declined' ? 'The customer chose to keep it general. Answer generally.' : 'Answer generally unless account details would genuinely help.',
        };
      }
      return {
        status: 'ok',
        account: ctx.req.account,
        allocations: ctx.context.allocations,
        chequingNotYetAssigned: unassigned(ctx, 'chequing'),
        note: 'Balances don’t say what money is for. Ask before assuming any of it is available.',
      };
    }
    case 'request_account_permission': {
      if (ctx.req.permission === 'granted') return { status: 'already_granted' };
      if (!PERSONAL_RE.test(latest)) return { status: 'not_needed', instruction: 'This is a general question. Answer without account details.' };
      if (ctx.req.permission === 'declined' && !/account|balance|details/.test(latest)) {
        return { status: 'customer_declined', instruction: 'Do not ask again; continue generally.' };
      }
      upsertEffect(ctx, 'requestPermission', { type: 'requestPermission', reason: String(args.reason ?? '').slice(0, 160) });
      return { status: 'permission_requested', instruction: 'Ask for permission in your reply. The app shows the buttons.' };
    }
    case 'record_allocation':
      return recordAllocation(args, ctx);
    case 'record_goal': {
      const goal = GOALS.includes(args.goal as GoalKey) ? (args.goal as GoalKey) : null;
      if (!goal) return { status: 'rejected', reason: 'invalid_goal' };
      const bad = quoteCheck(args, ctx);
      if (bad) return bad;
      if (!GOAL_WORDS[goal].test(latest)) return { status: 'needs_clarification', reason: 'goal_not_stated', instruction: 'The customer didn’t state this goal. Ask what they’d like the money to help them do.' };
      const g = { type: goal, detail: typeof args.detail === 'string' ? args.detail.slice(0, 200) : null };
      ctx.context = { ...ctx.context, goal: g };
      upsertEffect(ctx, 'goalSet', { type: 'goalSet', goal: g });
      return { status: 'applied', goal: g, instruction: 'Answer what they asked first, then at most one follow-up (e.g. when they might need the money). Don’t force a numerical target.' };
    }
    case 'record_time_horizon': {
      const horizon = HORIZONS.includes(args.horizon as HorizonKey) ? (args.horizon as HorizonKey) : null;
      if (!horizon) return { status: 'rejected', reason: 'invalid_horizon' };
      const bad = quoteCheck(args, ctx);
      if (bad) return bad;
      if (!HORIZON_WORDS[horizon].test(latest)) return { status: 'needs_clarification', reason: 'horizon_not_stated', instruction: 'The customer didn’t say when they might need the money. Ask.' };
      ctx.context = { ...ctx.context, horizon };
      upsertEffect(ctx, 'horizonSet', { type: 'horizonSet', horizon });
      return { status: 'applied', horizon };
    }
    case 'show_offerings': {
      if (!ctx.context.goal && !OFFERINGS_RE.test(latest)) {
        return { status: 'not_needed', instruction: 'Introduce offerings once the customer has a stated goal or asks about options.' };
      }
      const requested = validateOfferingIds(args.offering_ids);
      const browseRequested = BROWSE_RE.test(latest);
      if (!requested.length && !browseRequested && !OFFERINGS_RE.test(latest)) return { status: 'rejected', reason: 'no_valid_offering_ids', validIds: OFFERINGS.map((o) => o.id) };
      const named = namedOfferingIds(latest);
      const familyIntent = PRODUCT_FAMILY_RE.test(latest);
      const knownIds = named.filter((id) => OFFERINGS.some((offering) => offering.id === id));
      const asksAboutCardFamily = OFFERING_NAMED_RE.test(latest) &&
        /\b(?:credit cards?|mastercards?)\b/i.test(latest) &&
        !/\b(?:money.?back.{0,12}world|money.?back.{0,12}card|cash.?back|world elite|scene\+)\b/i.test(latest);
      if (familyIntent && !knownIds.length && !asksAboutCardFamily) {
        return {
          status: 'not_in_catalogue',
          instruction: 'Answer the customer’s question directly using any verified knowledge entries, and do NOT surface unrelated savings/investment/card product cards.',
        };
      }
      const browsing = browseRequested && !familyIntent;
      const signals = accountSignals(ctx);
      const currentContext = offeringContextForTurn(ctx);
      const plan = offeringPlan(currentContext.goal, currentContext.horizon, signals);
      const finalIds = browsing
        ? OFFERINGS.map((offering) => offering.id)
        : initialOfferingIds(currentContext.goal, currentContext.horizon, named, latest, signals);
      const dropped = requested.filter((id) => !finalIds.includes(id));
      const reason = browsing
        ? 'Browse Tangerine products and compare their features, terms and trade-offs.'
        : productSuggestionReason(ctx, finalIds, signals);
      const plannedFeaturedId = finalIds.includes(plan.featuredId) ? plan.featuredId : finalIds[0];
      const featuredId = browsing ? undefined : named.find((id) => finalIds.includes(id)) ?? plannedFeaturedId;
      const reasons = browsing ? undefined : offeringReasons(finalIds, currentContext.goal, currentContext.horizon, signals);
      const promotionIds = eligiblePromotionIds(finalIds, ctx.latestCustomer);
      ctx.context = { ...ctx.context, offeringsShown: [...new Set([...ctx.context.offeringsShown, ...finalIds])] };
      upsertEffect(ctx, 'offeringsShown', {
        type: 'offeringsShown',
        ids: finalIds,
        reason,
        ...(reasons ? { reasons } : {}),
        ...(promotionIds.length ? { promotionIds } : {}),
        ...(featuredId ? { featuredId } : {}),
        ...(browsing ? { browseAll: true } : {}),
      });
      return {
        status: 'shown',
        offerings: finalIds.map((id) => OFFERINGS.find((o) => o.id === id)),
        emphasis: plan.emphasis,
        signalContext: {
          hasUnassignedCash: signals.hasUnassignedCash ?? null,
          chequingSurplusSignal: signals.chequingSurplusSignal ?? null,
          monthlyExpensesShared: signals.monthlyExpenses !== undefined,
          hasSavingsAccount: signals.hasSavingsAccount ?? null,
        },
        ...(featuredId ? { featured: { id: featuredId, reason: reasons?.[featuredId] } } : {}),
        ...(dropped.length ? { notShown: dropped, note: `Not shown yet for this timeline (${currentContext.horizon ?? 'not stated'}): ${dropped.join(', ')}. The customer can ask to browse all offerings.` } : {}),
        instruction:
          (plan.emphasis === 'access'
            ? 'Short timeframe: emphasise access, stability and restrictions (e.g. GICs locked until maturity). '
            : plan.emphasis === 'flexible'
              ? 'Timeline unclear: keep options flexible and ask roughly when they might need the money. '
              : '') +
          'Show exactly the products returned by the app: specific product questions show only directly relevant products, known product-family questions stay within that family, and broad recommendations use the three-product plan. Mention account context only when permission is granted and an account signal is active; never repeat diagnostic signal metadata. For short horizons, emphasize liquidity and no lock-in; for 1–5 years, explain GIC lock-in; for long horizons, explain market risk. For Money-Back cards, explain that depositing rewards into a Tangerine Savings Account unlocks a third 2% category when the account is not known to exist. Explain key trade-offs, keep choices voluntary, and never call a product suitable or best.',
      };
    }
    case 'record_next_step': {
      const step = NEXT_STEPS.includes(args.step as NextStepKey) ? (args.step as NextStepKey) : null;
      if (!step) return { status: 'rejected', reason: 'invalid_step' };
      const bad = quoteCheck(args, ctx);
      if (bad) return bad;
      if (!NEXT_STEP_WORDS[step].test(latest)) {
        return { status: 'needs_clarification', reason: 'step_not_chosen', instruction: 'The customer didn’t choose this next step. Offer next steps instead of recording one.' };
      }
      ctx.context = { ...ctx.context, nextStep: step };
      upsertEffect(ctx, 'nextStepSet', { type: 'nextStepSet', step });
      return { status: 'applied', step, instruction: 'Confirm it simply. Nothing real happens (no accounts, transfers, bookings or messages).' };
    }
    case 'calculate_scenario':
      return calculate(args, ctx);
    case 'calculate_mortgage':
      return calculateMortgage(args, ctx);
    case 'prepare_summary':
      if (!SUMMARY_RE.test(latest)) return { status: 'not_needed', instruction: 'The customer did not ask for a summary.' };
      upsertEffect(ctx, 'summaryReady', { type: 'summaryReady' });
      return { status: 'ready', instruction: 'Tell the customer their summary is ready to review.' };
    case 'prepare_support_preview': {
      const isFrustrated = FRUSTRATION_RE.test(latest);
      if (!SUPPORT_RE.test(latest) && !isFrustrated && !acceptsSupportOffer(ctx)) {
        return { status: 'not_needed', instruction: 'The customer did not ask for support or accept an offer to prepare for it.' };
      }
      const questions = (Array.isArray(args.questions) ? args.questions : [])
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .map((q) => q.trim().slice(0, 200))
        .slice(0, 5);
      upsertEffect(ctx, 'handoffReady', { type: 'handoffReady', questions });
      return {
        status: 'ready',
        instruction: isFrustrated && questions.length === 0
          ? 'Acknowledge their frustration warmly without defensiveness, let them know a concept support preview is ready, and highlight that they can connect directly with a real Tangerine representative or advisor (nothing is sent or booked in this prototype).'
          : 'Say a concept preview is ready; nothing is sent or booked.',
      };
    }
    default:
      return { status: 'error', reason: 'unknown_tool' };
  }
}
