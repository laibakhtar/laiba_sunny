// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EMPTY_CONTEXT, type AccountContext, type ChatRequest, type ChatResponse, type StatusResponse } from '../src/shared/api';
import { OFFERINGS } from '../src/shared/offerings';
import { AiError, type ModelClient, type ModelRequest, type ModelResult } from './chat';
import { handleChat, handleStatus, type ServerConfig } from './http';

const ACCOUNT: AccountContext = {
  chequingBalance: 28_000,
  savingsBalance: 12_000,
  monthlyIncome: 5_200,
  monthlyExpenses: 3_600,
  signal: { rule: 'elevated_chequing_balance', shown: true, observationDays: 90, threshold: 25_000, minBalance: 25_412, maxBalance: 28_000 },
};

function request(text: string, extra: Partial<ChatRequest> = {}): ChatRequest {
  return {
    firstName: 'Alex',
    messages: [
      { role: 'sunny', text: 'Before we explore anything, is this money set aside for upcoming expenses, emergencies, or something else?' },
      { role: 'customer', text },
    ],
    permission: 'not_asked',
    account: null,
    context: { ...EMPTY_CONTEXT, origin: 'nudge' },
    ...extra,
  };
}
const granted = { permission: 'granted' as const, account: ACCOUNT };

const call = (name: string, args: unknown, id = name) => ({ callId: id, name, arguments: JSON.stringify(args) });
const final = (reply: string, source_ids: string[] = [], suggestions: string[] = []): ModelResult => ({ calls: [], replay: [], text: JSON.stringify({ reply, source_ids, suggestions }) });
const tools = (...calls: ReturnType<typeof call>[]): ModelResult => ({ calls, replay: calls, text: '' });

function mockClient(...results: (ModelResult | Error | 'hang')[]) {
  const requests: ModelRequest[] = [];
  const client: ModelClient = {
    async create(req, signal) {
      requests.push(structuredClone(req));
      const next = results.shift();
      if (next === 'hang') return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
      if (next instanceof Error) throw next;
      if (!next) throw new Error('no more mock results');
      return next;
    },
  };
  return { client, requests };
}

function config(client: ModelClient | null, extra: Partial<ServerConfig> = {}): ServerConfig {
  return { apiKey: client ? 'test-key' : undefined, model: 'test-model', createClient: () => client!, verify: async () => ({ ok: true, message: 'ok' }), ...extra };
}

async function chat(cfg: ServerConfig, req: ChatRequest) {
  const r = await handleChat(cfg, JSON.stringify(req));
  return { status: r.status, body: r.body as ChatResponse & { error?: { code: string; message: string } } };
}

const toolOutputs = (requests: ModelRequest[], round = 1) => (requests[round]?.rounds ?? []).flatMap((r) => r.results.map((x) => JSON.parse(x.output)));

describe('configuration and failures', () => {
  it('reports a missing key clearly', async () => {
    const body = (await handleStatus(config(null), false)).body as StatusResponse;
    expect(body.aiAvailable).toBe(false);
    expect(body.reason).toMatch(/GEMINI_API_KEY/);
    const c = await chat(config(null), request('Hi'));
    expect(c.status).toBe(503);
    expect(c.body.error?.code).toBe('not_configured');
  });

  it('maps provider errors and timeouts to safe codes', async () => {
    expect((await chat(config(mockClient(new AiError('rate_limited', 'busy')).client), request('Hi'))).status).toBe(429);
    const unknown = await chat(config(mockClient(new Error('boom key=test-key')).client), request('Hi'));
    expect(unknown.status).toBe(502);
    expect(JSON.stringify(unknown.body)).not.toContain('test-key');
    const deaf: ModelClient = { create: () => new Promise(() => {}) };
    expect((await chat(config(deaf, { turnTimeoutMs: 50 }), request('Hi'))).status).toBe(504);
  });

  it('rejects malformed or oversized requests and unreadable model output', async () => {
    expect((await handleChat(config(mockClient().client), 'not json')).status).toBe(400);
    expect((await chat(config(mockClient().client), request('a'.repeat(1001)))).status).toBe(400);
    expect((await chat(config(mockClient({ calls: [], replay: [], text: 'nope' }).client), request('Hi'))).status).toBe(502);
  });
});

describe('product recommendations', () => {
  it('recognizes product recommendation phrasing and keeps the response concise', async () => {
    for (const text of ['What products do you recommend for me?', 'Which products fit me?']) {
      const { client } = mockClient(final('I can’t choose a product for you.'));
      const r = await chat(config(client), request(text));
      expect(r.body.effects).toContainEqual(expect.objectContaining({
        type: 'offeringsShown',
        ids: ['savings-account', 'tfsa', 'gic'],
      }));
      expect(r.body.reply.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(3);
      expect(r.body.reply).toMatch(/What goal or timeframe would you like to focus on\?/);
    }
  });

  it('uses the first-home goal and 1–5 year horizon to rank accessible options', async () => {
    const { client } = mockClient(final('Here are options to explore.'));
    const response = await chat(config(client), request('What products fit me?', {
      context: {
        ...EMPTY_CONTEXT,
        goal: { type: 'first_home', detail: 'save for a down payment' },
        horizon: '1_to_5_years',
      },
    }));
    expect(response.body.effects).toContainEqual(expect.objectContaining({
      type: 'offeringsShown',
      ids: ['tfsa', 'gic', 'savings-account'],
    }));
    expect(response.body.reply).not.toMatch(/What goal or timeframe/);
  });

  it('shows exactly three cards for an explicit three-product comparison request', async () => {
    const { client } = mockClient(final('Here are three Tangerine products to compare.'));
    const response = await chat(config(client), request(
      "I have some extra money in my chequing account, but I'm not sure what to do with it. Can you show me three Tangerine products to compare?",
    ));
    const shown = response.body.effects.find((effect) => effect.type === 'offeringsShown');
    expect(shown).toEqual(expect.objectContaining({ type: 'offeringsShown', ids: ['savings-account', 'tfsa', 'gic'] }));
    expect(response.body.reply.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(3);
  });
});

describe('privacy and grounding', () => {
  it('without permission, no balances or signal evidence reach the model', async () => {
    const { client, requests } = mockClient(tools(call('read_account_snapshot', {})), final('Happy to help generally.'));
    // Even if a client sends account data without permission, the server drops it.
    await chat(config(client), request('What is this about?', { account: ACCOUNT }));
    const sent = JSON.stringify(requests);
    expect(sent).not.toMatch(/28,000|28000|25,412/);
    expect(toolOutputs(requests)[0].status).toBe('permission_required');
    expect(requests[0].context).toMatch(/ACCOUNT CONTEXT: not shared/);
  });

  it('with permission, the computed signal and balances are provided as reference data', async () => {
    const { client, requests } = mockClient(final('Your balance stayed above $25,000 for 90 days.'));
    const r = await chat(config(client), request('Why am I seeing this?', granted));
    expect(r.status).toBe(200);
    expect(requests[0].context).toMatch(/stayed at or above \$25,000 for the last 90 days/);
    expect(requests[0].context).toMatch(/Savings balance: \$12,000 \(separate account/);
  });

  it('validates source ids and strips inline citations', async () => {
    const { client } = mockClient(final('Funds can lose value [tng-investment-funds].', ['tng-investment-funds', 'invented']));
    const r = await chat(config(client), request('Can I lose money?'));
    expect(r.body.sourceIds).toEqual(['tng-investment-funds']);
    expect(r.body.reply).toBe('Funds can lose value.');
  });

  it('uses Tangerine sources by default and brings in CRA sources when the customer asks', async () => {
    const defaultRequest = mockClient(final('A TFSA can hold savings or investments.', ['tng-tfsa-options']));
    await chat(config(defaultRequest.client), request('What is a TFSA?'));
    expect(defaultRequest.requests[0].context).toContain('[tng-tfsa-options]');
    expect(defaultRequest.requests[0].context).not.toContain('[gov-tfsa]');

    const externalRequest = mockClient(final('The CRA explains the tax rules.', ['gov-tfsa']));
    await chat(config(externalRequest.client), request('Can you show me the CRA rules for a TFSA?'));
    const context = externalRequest.requests[0].context;
    expect(context).toContain('[gov-tfsa]');
    expect(context.indexOf('[tng-tfsa-options]')).toBeLessThan(context.indexOf('[gov-tfsa]'));
  });

  it('retrieves government sources for uncovered contribution-room rules while keeping Tangerine first', async () => {
    const { client, requests } = mockClient(final('Tangerine explains the account; the CRA sets current contribution-room rules.', ['tng-edu-tfsa-vs-rrsp', 'gov-tfsa']));
    await chat(config(client), request('What is my TFSA contribution room?'));
    const context = requests[0].context;
    expect(context).toContain('[tng-edu-tfsa-vs-rrsp]');
    expect(context).toContain('[gov-tfsa]');
    expect(context.indexOf('[tng-edu-tfsa-vs-rrsp]')).toBeLessThan(context.indexOf('[gov-tfsa]'));
  });

  it('instructs Sunny to teach beginner concepts with a short example and Tangerine context', async () => {
    const { client, requests } = mockClient(final('Compound interest earns interest on earlier interest.'));
    await chat(config(client), request('What is compound interest?'));
    expect(requests[0].instructions).toMatch(/FINANCIAL EDUCATION & PLAIN-LANGUAGE DEFINITIONS/);
    expect(requests[0].instructions).toMatch(/3–4 short sentences/);
    expect(requests[0].instructions).toMatch(/relatable hypothetical example/);
    expect(requests[0].instructions).toMatch(/using relevant tng entries/);
    expect(requests[0].instructions).toMatch(/bite-sized next step through a relevant suggestion chip/);
  });

  it('instructs the model to explain optional product suggestions without giving investment advice', async () => {
    const { client, requests } = mockClient(final('I included these products because of your stated goal.'));
    await chat(config(client), request('Why did you suggest these products?', {
      context: { ...EMPTY_CONTEXT, goal: { type: 'build_wealth', detail: 'learn about investing' }, horizon: 'over_5_years', offeringsShown: ['investment-funds'] },
    }));
    expect(requests[0].instructions).toMatch(/specific, factual reason for each suggestion/);
    expect(requests[0].instructions).toMatch(/never as an instruction or personalized investment recommendation/);
    expect(requests[0].instructions).toMatch(/When asked why you suggested a product, answer directly/);
    expect(requests[0].instructions).toMatch(/do NOT write a dense paragraph repeating every card detail/);
    expect(requests[0].instructions).toMatch(/concise "- " bullets/);
    expect(requests[0].instructions).toMatch(/GIC rates are fixed\/guaranteed.*Savings rates are variable.*Investment Fund projections are illustrative only and not guaranteed/);
  });

  it('sets clear FHSA and credit-card application guidance without collecting sensitive data', async () => {
    const { client, requests } = mockClient(final('Tangerine does not currently offer an FHSA.'));
    await chat(config(client), request('Does Tangerine offer an FHSA?'));
    expect(requests[0].instructions).toMatch(/clearly say upfront that Tangerine does not currently offer an FHSA/);
    expect(requests[0].instructions).toMatch(/The Juice first-home education/);
    expect(requests[0].instructions).toMatch(/clickable official next-step card/);
    expect(requests[0].instructions).toMatch(/Never collect SINs, personal income figures for underwriting, card or identity details, login credentials/);
  });

  it('surfaces a product card when the model skips the tool on a recommendation request', async () => {
    const { client } = mockClient(final('I can’t choose a product for you.'));
    const r = await chat(config(client), request('What do you recommend?'));
    expect(r.body.effects).toEqual([
      expect.objectContaining({
        type: 'offeringsShown',
        ids: ['savings-account', 'tfsa', 'gic'],
        reason: expect.stringMatching(/versatile Tangerine starting options/),
        reasons: expect.objectContaining({
          'savings-account': expect.stringMatching(/access/),
          gic: expect.stringMatching(/set term/),
          tfsa: expect.stringMatching(/tax treatment/),
        }),
        featuredId: 'savings-account',
      }),
    ]);
    expect(r.body.reply).toMatch(/^- Tangerine Savings Account:.*interest rate can change\./m);
    expect(r.body.reply).toMatch(/^- Tangerine TFSA/m);
    expect(r.body.reply).toMatch(/^- Tangerine GICs?:/m);
    expect(r.body.reply.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(3);
    expect(r.body.reply).toMatch(/What goal or timeframe would you like to focus on\?/);
    expect(r.body.reply).not.toMatch(/can’t choose a product for you/);
    expect(r.body.effects[0]?.type === 'offeringsShown' ? r.body.effects[0].reason : '').not.toMatch(/chequing|account signals considered/i);
  });

  it('uses the customer-confirmed goal and timeline to shape live product suggestions', async () => {
    const { client } = mockClient(final('Here are some products to explore.'));
    const r = await chat(config(client), request('What Tangerine products do you recommend?', {
      context: {
        ...EMPTY_CONTEXT,
        goal: { type: 'build_wealth', detail: 'learn about investing' },
        horizon: 'over_5_years',
      },
    }));
    expect(r.body.effects).toEqual([
      expect.objectContaining({
        type: 'offeringsShown',
        ids: ['tfsa', 'rsp', 'investment-funds'],
        reason: expect.stringMatching(/goal of building wealth and learning about investing.*timeframe of more than five years/),
        featuredId: 'tfsa',
        reasons: expect.objectContaining({
          'investment-funds': expect.stringMatching(/longer timeframe/),
          tfsa: expect.stringMatching(/tax treatment/),
          rsp: expect.stringMatching(/retirement account/),
        }),
      }),
    ]);
  });

  it('surfaces product options for a direct “which should I consider” request', async () => {
    const { client } = mockClient(final('I can’t choose for you.'));
    const r = await chat(config(client), request('Which Tangerine products should I consider?'));
    expect(r.body.effects).toEqual([
      expect.objectContaining({ type: 'offeringsShown', ids: expect.arrayContaining(['savings-account', 'tfsa', 'gic']) }),
    ]);
    expect(r.body.reply).toMatch(/versatile Tangerine starting options/);
  });

  it('does not turn a request for a personal investment decision into product recommendations', async () => {
    const { client } = mockClient(final('I can’t decide whether you should invest.'));
    const r = await chat(config(client), request('What should I invest in?'));
    expect(r.body.effects).toEqual([]);
  });

  it('prepares an official signup next step for a Savings Account without collecting application data', async () => {
    const { client } = mockClient(final('I can help with that.'));
    const r = await chat(config(client), request('I want to open a Tangerine Savings Account.'));
    expect(r.body.effects).toEqual([{ type: 'signupPrepared', productId: 'savings-account' }]);
    expect(r.body.reply).toMatch(/never collects application information or submits an application/);
    expect(r.body.sourceIds).toContain('tng-catalogue-savings');
  });

  it('prepares a credit-card signup step only for the card the customer requested', async () => {
    const { client } = mockClient(final('I can help with that.'));
    const r = await chat(config(client), request('I want to apply for a new credit card.'));
    expect(r.body.effects).toEqual([{ type: 'signupPrepared', productId: 'money-back-card' }]);
    expect(r.body.sourceIds).toContain('tng-money-back-card');
  });

  it('prepares the requested card application step for each Tangerine credit card', async () => {
    const cases = [
      ['I want to apply for the Money-Back Credit Card.', 'money-back-card', 'tng-money-back-card', '$0 annual fee', '$12,000'],
      ['I want to apply for the Money-Back World Mastercard.', 'money-back-world', 'tng-money-back-world', '$0 annual fee', '$50,000'],
      ['I want to apply for the Rewards World Elite Mastercard.', 'rewards-world-elite', 'tng-rewards-world-elite', '$120 annual fee', '$80,000'],
    ] as const;
    for (const [text, productId, sourceId, annualFee, incomeCriteria] of cases) {
      const { client } = mockClient(final('I can help with that.'));
      const response = await chat(config(client), request(text));
      expect(response.body.effects).toEqual([{ type: 'signupPrepared', productId }]);
      expect(response.body.sourceIds).toContain(sourceId);
      expect(response.body.reply).toContain(annualFee);
      expect(response.body.reply).toContain(incomeCriteria);
      expect(response.body.reply).toMatch(/never collects application information or submits an application/);
    }
  });

  it.each([
    ['Can you help me start a TFSA?', 'tfsa', 'tng-catalogue-tfsa'],
    ['I want to open a TFSA Savings Account with Tangerine. Can you take me to the correct page?', 'tfsa-savings', 'tng-tfsa-savings'],
    ['I want to open a GIC.', 'gic', 'tng-catalogue-gic'],
    ['How do I apply for a Tangerine mortgage?', 'mortgage', 'tng-catalogue-mortgage'],
    ['I want to open a Tangerine Chequing Account.', 'chequing', 'tng-catalogue-chequing'],
  ])('prepares a direct official next step for "%s"', async (text, productId, sourceId) => {
    const { client } = mockClient(final('I can help with that.'));
    const response = await chat(config(client), request(text));
    expect(response.body.effects).toContainEqual({ type: 'signupPrepared', productId });
    expect(response.body.sourceIds).toContain(sourceId);
  });

  it('keeps an ambiguous application follow-up on the latest product topic, not an older credit card', async () => {
    const { client } = mockClient(final('I can help you review the mortgage page.'));
    const response = await chat(config(client), request('What documents do I need to apply?', {
      messages: [
        { role: 'customer', text: 'Tell me about the Money-Back World Mastercard.' },
        { role: 'sunny', text: 'The Money-Back World Mastercard has cash-back rewards.' },
        { role: 'customer', text: 'I want to explore a Tangerine mortgage.' },
        { role: 'sunny', text: 'Tangerine mortgage options and rates depend on the product.' },
        { role: 'customer', text: 'What documents do I need to apply?' },
      ],
    }));
    expect(response.body.effects).toContainEqual({ type: 'signupPrepared', productId: 'mortgage' });
    expect(response.body.effects).not.toContainEqual({ type: 'signupPrepared', productId: 'money-back-world' });
  });

  it('does not infer a product from a generic application follow-up without an active product topic', async () => {
    const { client } = mockClient(final('Which product are you asking about?'));
    const response = await chat(config(client), request('What documents do I need to apply?'));
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({ type: 'signupPrepared' }));
  });

  it('does not treat Sunny’s own external-source offer as customer consent', async () => {
    const { client, requests } = mockClient(final('Tangerine’s page does not cover that detail.'));
    await chat(config(client), request('What are the rules?', {
      messages: [
        { role: 'sunny', text: 'Would you like an official CRA source?' },
        { role: 'customer', text: 'What are the rules?' },
      ],
    }));
    expect(requests[0].context).not.toContain('[gov-fhsa-overview]');
    expect(requests[0].context).not.toContain('[gov-tfsa]');
  });

  it('retrieves external guidance when the customer accepts Sunny’s offer', async () => {
    const { client, requests } = mockClient(final('The CRA has the current TFSA rules.', ['gov-tfsa']));
    await chat(config(client), request('Yes, please.', {
      messages: [
        { role: 'sunny', text: 'Would you like an official CRA source for the TFSA rules?' },
        { role: 'customer', text: 'Yes, please.' },
      ],
    }));
    expect(requests[0].context).toContain('[gov-tfsa]');
  });

  it('asks the model to revise replies with dollar figures it computed itself', async () => {
    const { client, requests } = mockClient(final('You could invest $15,500 now.'), final('Let’s look at what the money is for first.'));
    const r = await chat(config(client), request('What could I do?', granted));
    expect(requests[1].revision?.note).toMatch(/\$15,500/);
    expect(r.body.reply).toMatch(/what the money is for/);
  });
});

describe('validated allocations', () => {
  it('records the customer’s allocations; the remainder is computed, not invented', async () => {
    const q = 'I need $3,000 for bills and $10,000 for emergencies.';
    const { client, requests } = mockClient(
      tools(
        call('record_allocation', { account: 'chequing', purpose: 'upcoming_expenses', amount: 3000, customer_quote: '$3,000 for bills' }, 'a'),
        call('record_allocation', { account: 'chequing', purpose: 'emergency', amount: 10000, customer_quote: '$10,000 for emergencies' }, 'b'),
      ),
      final('That leaves $15,000 not yet assigned to a purpose.'),
    );
    const r = await chat(config(client), request(q, granted));
    expect(toolOutputs(requests).map((o) => o.status)).toEqual(['applied', 'applied']);
    expect(toolOutputs(requests)[1].notYetAssigned).toBe(15000);
    expect(r.body.effects).toEqual([
      { type: 'allocationsUpdated', allocations: [{ account: 'chequing', purpose: 'upcoming_expenses', amount: 3000 }, { account: 'chequing', purpose: 'emergency', amount: 10000 }] },
    ]);
    expect(requests[1].revision).toBeUndefined();
  });

  it('a correction replaces the earlier amount', async () => {
    const context = { ...EMPTY_CONTEXT, allocations: [{ account: 'chequing' as const, purpose: 'emergency' as const, amount: 10000 }] };
    const { client } = mockClient(tools(call('record_allocation', { account: 'chequing', purpose: 'emergency', amount: 8000, customer_quote: 'keep $8,000 for emergencies' })), final('Updated.'));
    const r = await chat(config(client), request('Actually, keep $8,000 for emergencies.', { ...granted, context }));
    expect(r.body.effects[0]).toEqual({ type: 'allocationsUpdated', allocations: [{ account: 'chequing', purpose: 'emergency', amount: 8000 }] });
  });

  it('rejects allocations above the balance, negatives and amounts not stated', async () => {
    const over = mockClient(tools(call('record_allocation', { account: 'chequing', purpose: 'emergency', amount: 30000, customer_quote: '$30,000 for emergencies' })), final('…'));
    const r1 = await chat(config(over.client), request('I have $30,000 for emergencies.', granted));
    expect(toolOutputs(over.requests)[0]).toMatchObject({ status: 'needs_clarification', reason: 'exceeds_balance' });
    expect(r1.body.effects).toEqual([]);

    const neg = mockClient(tools(call('record_allocation', { account: 'chequing', purpose: 'emergency', amount: 500, customer_quote: '-500 for emergencies' })), final('…'));
    await chat(config(neg.client), request('Keep -500 for emergencies', granted));
    expect(toolOutputs(neg.requests)[0]).toMatchObject({ status: 'rejected', reason: 'negative' });

    const vague = mockClient(tools(call('record_allocation', { account: 'chequing', purpose: 'emergency', amount: 5000, customer_quote: 'some of that money' })), final('How much?'));
    await chat(config(vague.client), request('I need some of that money for emergencies.', granted));
    expect(toolOutputs(vague.requests)[0].status).toBe('needs_clarification');
  });
});

describe('goals, offerings, next steps and calculations', () => {
  it('records a stated goal and shows only valid offering ids', async () => {
    const { client, requests } = mockClient(
      tools(
        call('record_goal', { goal: 'build_wealth', detail: 'learn how investing works', customer_quote: 'I want to build wealth' }, 'g'),
        call('show_offerings', { offering_ids: ['investment-funds', 'tfsa', 'robo-advisor'], reason: 'You want to learn about longer-term investing.' }, 'o'),
      ),
      final('Here are options to learn about.', ['tng-investment-funds']),
    );
    const r = await chat(config(client), request('I want to build wealth, but I don’t know how investing works.'));
    expect(toolOutputs(requests).map((o) => o.status)).toEqual(['applied', 'shown']);
    expect(r.body.effects).toEqual([
      { type: 'goalSet', goal: { type: 'build_wealth', detail: 'learn how investing works' } },
      // Timeline not stated yet: the shared rule keeps flexible options; funds stay because the customer asked about investing.
      expect.objectContaining({
        type: 'offeringsShown',
        ids: ['savings-account', 'gic', 'investment-funds'],
        reason: expect.stringMatching(/goal of building wealth and learning about investing/),
        featuredId: 'investment-funds',
        reasons: expect.objectContaining({
          'savings-account': expect.any(String),
          gic: expect.any(String),
          'investment-funds': expect.any(String),
        }),
      }),
    ]);
  });

  it('won’t show offerings before a goal unless the customer asks about options', async () => {
    const { client, requests } = mockClient(tools(call('show_offerings', { offering_ids: ['investment-funds'], reason: 'x' })), final('…'));
    await chat(config(client), request('Hi, what is this?'));
    expect(toolOutputs(requests)[0].status).toBe('not_needed');

    const recommendation = mockClient(tools(call('show_offerings', { offering_ids: ['savings-account'], reason: 'General starting point.' })), final('Here is an option.'));
    await chat(config(recommendation.client), request('Which products fit me?'));
    expect(toolOutputs(recommendation.requests)[0].status).toBe('shown');
  });

  it('keeps credit-card offering requests within the credit-card family', async () => {
    const { client } = mockClient(
      tools(call('show_offerings', { offering_ids: ['money-back-card'], reason: 'You asked about Tangerine cards.' })),
      final('Here are Tangerine credit cards to compare.'),
    );
    const response = await chat(config(client), request('What Tangerine credit card offerings do you have?'));
    expect(response.body.effects).toContainEqual(expect.objectContaining({
      type: 'offeringsShown',
      ids: ['money-back-card', 'money-back-world', 'rewards-world-elite'],
    }));
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({
      type: 'offeringsShown',
      ids: expect.arrayContaining(['savings-account', 'gic']),
    }));
  });

  it('shows only a specifically named card and does not fall back for an unlisted family', async () => {
    const specific = mockClient(
      tools(call('show_offerings', { offering_ids: ['money-back-card', 'savings-account'], reason: 'x' })),
      final('Here are the card details.'),
    );
    const single = await chat(config(specific.client), request('Tell me about the Rewards World Elite Mastercard.'));
    expect(single.body.effects).toContainEqual(expect.objectContaining({
      type: 'offeringsShown',
      ids: ['rewards-world-elite'],
    }));

    const unknown = mockClient(
      tools(call('show_offerings', { offering_ids: ['savings-account'], reason: 'x' })),
      final('Tangerine does not list a business account in this catalogue.'),
    );
    const response = await chat(config(unknown.client), request('What business accounts does Tangerine offer?'));
    expect(toolOutputs(unknown.requests)[0]).toMatchObject({
      status: 'not_in_catalogue',
      instruction: expect.stringMatching(/do NOT surface unrelated/),
    });
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({ type: 'offeringsShown' }));
  });

  it('passes permitted account signals to offering matching and card explanations', async () => {
    const { client, requests } = mockClient(
      tools(call('show_offerings', { offering_ids: ['money-back-card'], reason: 'x' })),
      final('Here are Tangerine credit cards.'),
    );
    const response = await chat(config(client), request('What Tangerine credit cards do you offer?', {
      permission: 'granted',
      account: ACCOUNT,
    }));
    const effect = response.body.effects.find((item) => item.type === 'offeringsShown');
    expect(effect).toMatchObject({
      type: 'offeringsShown',
      ids: ['money-back-card', 'money-back-world', 'rewards-world-elite'],
      reasons: expect.objectContaining({
        'money-back-card': expect.stringMatching(/Savings Account is present.*third 2% category/),
      }),
    });
    expect(toolOutputs(requests)[0]).toMatchObject({
      signalContext: { hasUnassignedCash: true, chequingSurplusSignal: true, monthlyExpensesShared: true, hasSavingsAccount: true },
    });
    expect((effect as Extract<ChatResponse['effects'][number], { type: 'offeringsShown' }>).reason).not.toMatch(/Account signals considered/i);
  });

  it('mentions account signals in the card reason only with permission and an active signal', async () => {
    const { client } = mockClient(
      tools(call('show_offerings', { offering_ids: [], reason: 'Account signals considered: unknown.' })),
      final('Here are three options to explore.'),
    );
    const response = await chat(config(client), request('What Tangerine products should I consider?', {
      permission: 'granted',
      account: ACCOUNT,
    }));
    const effect = response.body.effects.find((item) => item.type === 'offeringsShown');
    expect(effect).toMatchObject({
      type: 'offeringsShown',
      reason: expect.stringMatching(/Since you have not-yet-assigned cash in your chequing account/),
    });
    expect(effect?.type === 'offeringsShown' ? effect.reason : '').not.toMatch(/Account signals considered/i);
  });

  it('shows the entire catalogue on an explicit browse request, even if the model supplies no ids', async () => {
    const { client } = mockClient(
      tools(call('show_offerings', { offering_ids: [], reason: 'You asked to see all Tangerine products.' })),
      final('Here is the complete catalogue.'),
    );
    const response = await chat(config(client), request('Browse all Tangerine products.'));
    const effect = response.body.effects.find((item) => item.type === 'offeringsShown');
    expect(effect).toMatchObject({
      type: 'offeringsShown',
      ids: OFFERINGS.map((offering) => offering.id),
    });
    expect(response.body.effects).toContainEqual(expect.objectContaining({ type: 'offeringsShown', ids: expect.arrayContaining(['mortgage', 'usd-savings']) }));
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({ type: 'offeringsShown', ids: expect.arrayContaining(['fhsa-status']) }));
  });

  it('records the chosen next step only from the customer’s words', async () => {
    const ok = mockClient(tools(call('record_next_step', { step: 'learn_risk', customer_quote: 'learn about investment risk first' })), final('Noted.'));
    const r = await chat(config(ok.client), request('I’d like to learn about investment risk first.'));
    expect(r.body.effects).toEqual([{ type: 'nextStepSet', step: 'learn_risk' }]);
    const bad = mockClient(tools(call('record_next_step', { step: 'prepare_questions', customer_quote: 'book an advisor' })), final('…'));
    await chat(config(bad.client), request('Tell me more about GICs.'));
    expect(toolOutputs(bad.requests)[0].status).toBe('needs_clarification');
    // Found in live testing: a real quote that doesn't express a next step must not record one.
    const unchosen = mockClient(tools(call('record_next_step', { step: 'learn_risk', customer_quote: 'I don’t know how investing works' })), final('…'));
    const r2 = await chat(config(unchosen.client), request('I want to build wealth, but I don’t know how investing works.'));
    expect(toolOutputs(unchosen.requests)[0]).toMatchObject({ status: 'needs_clarification', reason: 'step_not_chosen' });
    expect(r2.body.effects).toEqual([]);
  });

  it('builds a growth comparison only with customer-given or permissioned values', async () => {
    const context = {
      ...EMPTY_CONTEXT,
      horizon: '1_to_5_years' as const,
      allocations: [
        { account: 'chequing' as const, purpose: 'upcoming_expenses' as const, amount: 3000 },
        { account: 'chequing' as const, purpose: 'emergency' as const, amount: 10000 },
      ],
    };
    const good = mockClient(tools(call('calculate_scenario', { starting_amount: 15000, monthly: 400, years: 5 })), final('Here’s the comparison.'));
    const r = await chat(config(good.client), request('What if I added $400 a month for 5 years?', { ...granted, context }));
    expect(toolOutputs(good.requests)[0]).toMatchObject({ status: 'calculated', years: 5, totalContributions: 39000 });
    expect(r.body.effects[0]).toMatchObject({
      type: 'scenario',
      years: 5,
      startingAmount: 15000,
      monthlyContribution: 400,
      compareTangerineOptions: true,
      options: expect.arrayContaining([expect.objectContaining({ id: 'gicBenchmark', annualRate: 4.05 })]),
    });
    expect((r.body.effects[0] as Extract<ChatResponse['effects'][number], { type: 'scenario' }>).yearlyBreakdown).toHaveLength(6);

    const invented = mockClient(tools(call('calculate_scenario', { starting_amount: 15000, monthly: 900, months: 60 })), final('…'));
    await chat(config(invented.client), request('What if I added money monthly for 60 months?', { ...granted, context }));
    expect(toolOutputs(invented.requests)[0].status).toBe('rejected');
  });

  it('uses the 5-year default when the model proposes 3 years without a customer-stated timeframe', async () => {
    const client = mockClient(
      tools(call('calculate_scenario', { starting_amount: 5000, monthly: 200, years: 3 })),
      final('Here is an interactive comparison.'),
    );
    const response = await chat(config(client.client), request(
      'If I start with $5,000 and add $200 a month, how much could I save across Tangerine’s options?',
      { context: { ...EMPTY_CONTEXT, horizon: '1_to_5_years' } },
    ));
    expect(toolOutputs(client.requests)[0]).toMatchObject({
      status: 'calculated',
      years: 5,
      totalContributions: 17_000,
    });
    expect(response.body.effects[0]).toMatchObject({
      type: 'scenario',
      years: 5,
      yearlyBreakdown: expect.arrayContaining([expect.objectContaining({ year: 5 })]),
    });
  });

  it('uses the 10-year default for a long-term context rather than treating “over 5 years” as exactly 5', async () => {
    const client = mockClient(
      tools(call('calculate_scenario', { starting_amount: 5000, monthly: 200, years: 5 })),
      final('Here is an interactive comparison.'),
    );
    const response = await chat(config(client.client), request(
      'If I start with $5,000 and add $200 a month, I want to compare options for more than 5 years.',
      { context: { ...EMPTY_CONTEXT, horizon: 'over_5_years' } },
    ));
    expect(toolOutputs(client.requests)[0]).toMatchObject({ status: 'calculated', years: 10 });
    expect(response.body.effects[0]).toMatchObject({ type: 'scenario', years: 10 });
  });

  it.each([
    ['under_1_year', 1],
    ['1_to_5_years', 5],
    ['not_sure', 5],
    [null, 5],
    ['over_5_years', 10],
  ] as const)('uses the %s context to default the calculator to %s years', async (horizon, expectedYears) => {
    const client = mockClient(tools(call('calculate_scenario', {})), final('Here is an interactive comparison.'));
    const r = await chat(config(client.client), request('Compare growth options.', {
      context: { ...EMPTY_CONTEXT, horizon },
    }));
    expect(toolOutputs(client.requests)[0]).toMatchObject({ status: 'calculated', years: expectedYears });
    expect(r.body.effects[0]).toMatchObject({ type: 'scenario', years: expectedYears });
  });

  it('uses permissioned unassigned cash or a zero starting amount for the growth scenario', async () => {
    const context = {
      ...EMPTY_CONTEXT,
      allocations: [
        { account: 'chequing' as const, purpose: 'upcoming_expenses' as const, amount: 3000 },
        { account: 'chequing' as const, purpose: 'emergency' as const, amount: 10000 },
      ],
    };
    const permissioned = mockClient(tools(call('calculate_scenario', { monthly: 400 })), final('Here is your comparison.'));
    const withAccount = await chat(config(permissioned.client), request('I can save $400 per month.', { ...granted, context }));
    expect(withAccount.body.effects[0]).toMatchObject({ type: 'scenario', startingAmount: 15000, monthlyContribution: 400, years: 5 });
    expect(toolOutputs(permissioned.requests)[0].note).toMatch(/permissioned not-yet-assigned chequing balance/);

    const general = mockClient(tools(call('calculate_scenario', { monthly: 400 })), final('Here is your comparison.'));
    const withoutAccount = await chat(config(general.client), request('I can save $400 per month.'));
    expect(withoutAccount.body.effects[0]).toMatchObject({ type: 'scenario', startingAmount: 0, monthlyContribution: 400, years: 5 });
    expect(toolOutputs(general.requests)[0].note).toMatch(/ask briefly whether the customer would like to include one/);
  });

  it('returns exact wealth balances and growth in the calculator tool summary', async () => {
    const client = mockClient(
      tools(call('calculate_scenario', { starting_amount: 5000, monthly: 200, years: 5 })),
      final('Here are the calculated figures.'),
    );
    const response = await chat(config(client.client), request('Compare growth using $5,000 and $200 per month for 5 years.'));
    const result = toolOutputs(client.requests)[0];
    expect(result.summaryText).toContain('Tangerine Savings Account: ending balance $');
    expect(result.summaryText).toContain('Tangerine GIC Benchmark: ending balance $');
    expect(result.summaryText).not.toContain('Illustrative Investment Fund / Custom Rate: ending balance $');
    expect(result.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'savingsAccount', endingBalance: expect.any(Number), totalGrowth: expect.any(Number) }),
      expect.objectContaining({ id: 'tfsaSavings', endingBalance: expect.any(Number), totalGrowth: expect.any(Number) }),
      expect.objectContaining({ id: 'gicBenchmark', endingBalance: expect.any(Number), totalGrowth: expect.any(Number) }),
    ]));
    expect(response.body.reply).toContain(result.summaryText);
    expect(response.body.effects[0]).toMatchObject({ type: 'scenario', years: 5 });
  });

  it('calculates a mortgage payment and emits a calculator effect with the official-page assumptions', async () => {
    const client = mockClient(
      tools(call('calculate_mortgage', {
        mode: 'payment',
        home_price: 500_000,
        down_payment: 100_000,
        annual_rate: 4.79,
        amortization_years: 25,
      })),
      final('The calculator shows an illustrative payment.'),
    );
    const response = await chat(config(client.client), request(
      'Estimate a mortgage payment for a $500,000 home with $100,000 down over 25 years at 4.79%.',
    ));
    expect(toolOutputs(client.requests)[0]).toMatchObject({
      status: 'calculated',
      mortgageAmount: 400_000,
      annualRate: 4.79,
      amortizationYears: 25,
      regularPayment: expect.any(Number),
      principalPaidInTerm: expect.any(Number),
      interestPaidInTerm: expect.any(Number),
    });
    expect(response.body.effects[0]).toMatchObject({
      type: 'mortgageScenario',
      mortgageAmount: 400_000,
      annualRate: 4.79,
      termYears: 5,
    });
  });

  it('shows a mortgage calculator for a calculator request even if the model omits the tool call', async () => {
    const { client } = mockClient(final('I can open a mortgage calculator for you.'));
    const response = await chat(config(client), request('Can you show me the mortgage payment calculator?'));
    expect(response.body.effects).toContainEqual(expect.objectContaining({ type: 'mortgageScenario', mode: 'payment' }));
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({ type: 'signupPrepared' }));
    expect(response.body.reply).toMatch(/calculator is ready/i);
    expect(response.body.reply).not.toMatch(/\$0\.00/);
  });

  it('opens the wealth calculator for an explicit savings comparison when the model omits the tool call', async () => {
    const { client } = mockClient(final('I can open that comparison for you.'));
    const response = await chat(config(client), request('Compare growth starting with $5,000 and saving $200 per month for 5 years.'));
    expect(response.body.effects).toContainEqual(expect.objectContaining({
      type: 'scenario',
      startingAmount: 5000,
      monthlyContribution: 200,
      years: 5,
    }));
    expect(response.body.reply).toMatch(/interactive savings and growth comparison/i);
  });

  it('opens the calculator on the first response for the complete customer request', async () => {
    const { client } = mockClient(final('I’ve opened the interactive calculator for you.'));
    const response = await chat(config(client), request(
      'I have $5,000 saved and can add $200 monthly. Compare how my money could grow over five years and open the interactive calculator.',
    ));
    expect(response.body.effects).toContainEqual(expect.objectContaining({
      type: 'scenario',
      startingAmount: 5000,
      monthlyContribution: 200,
      years: 5,
    }));
    expect(response.body.reply).toMatch(/interactive savings and growth comparison/i);
  });

  it.each([
    'Explore Tangerine mortgage options',
    'Check live mortgage rates',
  ])('opens the mortgage explorer when asked to "%s"', async (question) => {
    const { client } = mockClient(final('Use the mortgage explorer card below to compare options.'));
    const response = await chat(config(client), request(question));
    expect(response.body.effects).toContainEqual(expect.objectContaining({ type: 'mortgageScenario', mode: 'payment' }));
  });

  it('recognizes a plain home-affordability question and keeps it an estimate, not an application', async () => {
    const { client } = mockClient(final('I can show an illustrative estimate.'));
    const response = await chat(config(client), request('How much house could I afford?'));
    expect(response.body.effects).toContainEqual(expect.objectContaining({ type: 'mortgageScenario', mode: 'affordability' }));
    expect(response.body.effects).not.toContainEqual(expect.objectContaining({ type: 'signupPrepared' }));
  });

  it('does not carry a stale first-home goal into a new general goal and timeframe', async () => {
    const client = mockClient(
      tools(call('show_offerings', { offering_ids: [] })),
      final('Here are some options to explore.'),
    );
    const response = await chat(config(client.client), request(
      'I want to save for a goal in about 3 years. What Tangerine options fit that timeframe?',
      {
        context: { ...EMPTY_CONTEXT, goal: { type: 'first_home', detail: 'Buying a first home' }, horizon: 'over_5_years' },
        messages: [
          { role: 'customer', text: 'I am saving for my first home over the long term.' },
          { role: 'sunny', text: 'We can explore options for that first-home goal.' },
          { role: 'customer', text: 'I want to save for a goal in about 3 years. What Tangerine options fit that timeframe?' },
        ],
      },
    ));
    const effect = response.body.effects.find((item) => item.type === 'offeringsShown');
    expect(effect).toMatchObject({ ids: ['savings-account', 'gic', 'tfsa'] });
    expect(JSON.stringify(effect)).not.toMatch(/first.home|FHSA/i);
  });

  it('does not mistake existing chequing cash for a chequing product request', async () => {
    const client = mockClient(
      tools(call('show_offerings', { offering_ids: [] })),
      final('Here are a few options.'),
    );
    const response = await chat(config(client.client), request('There is money in my chequing account. What Tangerine products do you recommend?'));
    const effect = response.body.effects.find((item) => item.type === 'offeringsShown');
    expect(effect?.type === 'offeringsShown' ? effect.ids : []).not.toContain('chequing');
  });

  it('guards permission requests, summaries and support previews', async () => {
    const { client, requests } = mockClient(
      tools(call('request_account_permission', { reason: 'x' }, 'p'), call('prepare_summary', {}, 's'), call('prepare_support_preview', { questions: ['q'] }, 'h')),
      final('A TFSA is an account…'),
    );
    const r = await chat(config(client), request('Is a TFSA an investment?'));
    expect(toolOutputs(requests).map((o) => o.status)).toEqual(['not_needed', 'not_needed', 'not_needed']);
    expect(r.body.effects).toEqual([]);
    expect(requests.map((q) => q.allowTools)).toEqual([true, false]);
  });

  it('prepares an advisor preview only after an explicit request or acceptance of the offer', async () => {
    const offered = mockClient(tools(call('prepare_support_preview', { questions: ['How should I think about risk?'] })), final('Your questions are ready.'));
    const r = await chat(config(offered.client), request('Yes, please.', {
      messages: [
        { role: 'sunny', text: 'For personal investment advice, I can help prepare questions for a Tangerine advisor if you would like.' },
        { role: 'customer', text: 'Yes, please.' },
      ],
    }));
    expect(toolOutputs(offered.requests)[0].status).toBe('ready');
    expect(r.body.effects).toEqual([{ type: 'handoffReady', questions: ['How should I think about risk?'] }]);

    const unrelated = mockClient(tools(call('prepare_support_preview', { questions: ['q'] })), final('Sure.'));
    await chat(config(unrelated.client), request('Yes, please.'));
    expect(toolOutputs(unrelated.requests)[0].status).toBe('not_needed');
  });

  it('prepares a support preview when a frustrated customer has no specific questions yet', async () => {
    const frustrated = mockClient(
      tools(call('prepare_support_preview', { questions: [] })),
      final('I hear that this has been frustrating. A concept support preview is ready, and you can connect directly with Tangerine support.'),
    );
    const response = await chat(config(frustrated.client), request('This is frustrating and I feel stuck.'));
    expect(toolOutputs(frustrated.requests)[0]).toMatchObject({
      status: 'ready',
      instruction: 'Acknowledge their frustration warmly without defensiveness, let them know a concept support preview is ready, and highlight that they can connect directly with a real Tangerine representative or advisor (nothing is sent or booked in this prototype).',
    });
    expect(response.body.effects).toEqual([{ type: 'handoffReady', questions: [] }]);
  });

  it('stops a runaway tool loop', async () => {
    const loop = Array.from({ length: 6 }, () => tools(call('prepare_summary', {})));
    const { client, requests } = mockClient(...loop);
    const r = await chat(config(client), request('Summary please'));
    expect(r.status).toBe(502);
    expect(requests.map((q) => q.allowTools)).toEqual([true, true, true, true, false]);
  });
});

describe('quote grounding and rate limiting', () => {
  it('accepts light paraphrases but not invented words', async () => {
    const { quoteSupported } = await import('./tools');
    const latest = 'i need 3000 for bills and 10000 for emergencies.';
    expect(quoteSupported('3000 for bills', latest)).toBe(true);
    expect(quoteSupported('3000 for rent', latest)).toBe(false);
  });

  it('limits chat requests per client', async () => {
    const { createRateLimiter } = await import('./http');
    let t = 0;
    const allow = createRateLimiter(1000, 2, () => t);
    expect([allow('a'), allow('a'), allow('a'), allow('b')]).toEqual([true, true, false, true]);
    t = 1001;
    expect(allow('a')).toBe(true);
  });
});
