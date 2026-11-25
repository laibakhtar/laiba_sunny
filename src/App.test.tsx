import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AiRequestError } from './conversation/aiClient';
import { calculateMortgageScenario, projectWealthComparison } from './lib/calc';
import type { ChatRequest, ChatResponse, StatusResponse } from './shared/api';
import { getOffering, offeringUrl } from './shared/offerings';

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
beforeEach(() => {
  window.localStorage.clear();
});

const SLOW = { timeout: 3000 };
const noAi = async (): Promise<StatusResponse> => ({ aiAvailable: false, model: null, reason: 'Gemini conversation is not configured. Add GEMINI_API_KEY to .env.local.' });
const aiOn = async (): Promise<StatusResponse> => ({ aiAvailable: true, model: 'test-model', reason: null });

type User = ReturnType<typeof userEvent.setup>;
async function reply(user: User, name: string | RegExp) {
  await user.click(await screen.findByRole('button', { name }, SLOW));
}
async function openSettings(user: User) {
  await user.click(screen.getByRole('button', { name: /Demo settings/ }));
  return screen.getByRole('dialog', { name: 'Demo settings' });
}

describe('scripted demo: the proactive loop', () => {
  it('states that Tangerine does not currently offer an FHSA', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);
    await user.click(screen.getByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'Does Tangerine offer an FHSA?{Enter}');
    expect(await screen.findByText(/Tangerine does not currently offer an FHSA/)).toBeInTheDocument();
    expect(screen.queryByText(/availability.*unconfirmed/i)).not.toBeInTheDocument();
  }, 30000);

  it('opens three explained product options from the dashboard and keeps Ask Sunny available', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);

    expect(screen.getByRole('heading', { name: /Would you like to see three Tangerine products you could explore/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Sunny' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explore three products' }));

    expect(await screen.findByLabelText('Tangerine offerings to learn about', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByText(/This pattern doesn’t tell me what the money is for/)).toBeInTheDocument();
    expect(screen.getAllByText('Tangerine Savings Account').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Explore opening a Savings Account' })).toBeInTheDocument();
    expect(screen.queryByText(/eligible for|you qualify for/)).not.toBeInTheDocument();
  }, 30000);

  it('nudge → permission → allocations → goal → offerings → next step → summary', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);

    // Dashboard starts with a useful nudge built from the signal.
    expect(screen.getByRole('heading', { name: /chequing balance has stayed above \$25,000 over the past three months/ })).toBeInTheDocument();
    await user.click(screen.getByText('Why am I seeing this?'));
    expect(screen.getByText(/never below \$25,000/)).toBeInTheDocument();
    expect(screen.queryByText(/too much|doing nothing|should invest/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Explore with Sunny' }));
    expect(screen.getByText('Scripted demo')).toBeInTheDocument();
    await reply(user, 'Yes, use my account details');
    await reply(user, 'I need $3,000 for bills and $10,000 for emergencies.');
    expect(await screen.findByText(/That leaves \$15,000 not yet assigned to a purpose/, {}, SLOW)).toBeInTheDocument();
    await reply(user, 'Yes, that’s right');
    await reply(user, 'I want to build wealth, but I don’t know how investing works.');
    await reply(user, 'More than 5 years away');
    expect(await screen.findByLabelText('Tangerine offerings to learn about', {}, SLOW)).toBeInTheDocument();
    expect(screen.getAllByText('Tangerine Investment Funds').length).toBeGreaterThan(0);
    await reply(user, 'Learn about investment risk first');
    expect(await screen.findByText(/I’ll remember that you wanted to understand investment risk/, {}, SLOW)).toBeInTheDocument();

    await reply(user, 'See my summary');
    expect(await screen.findByRole('heading', { name: 'Your conversation with Sunny' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Build wealth over time')).toBeInTheDocument();
    expect(screen.getByText('Learn about investment risk first')).toBeInTheDocument();
    expect(screen.getByText(/comfort with investment risk hasn’t been assessed/)).toBeInTheDocument();
  }, 30000);

  it('a later visit shows a check-in based on the saved next step; “Stop these check-ins” works', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);
    await user.click(screen.getByRole('button', { name: 'Explore with Sunny' }));
    await reply(user, 'Yes, use my account details');
    await reply(user, 'I need $3,000 for bills and $10,000 for emergencies.');
    await reply(user, 'Yes, that’s right');
    await reply(user, 'I want to build wealth, but I don’t know how investing works.');
    await reply(user, 'More than 5 years away');
    await reply(user, 'Learn about investment risk first');
    await screen.findByText(/I’ll remember that you wanted to understand investment risk/, {}, SLOW);

    const dialog = await openSettings(user);
    await user.click(within(dialog).getByRole('button', { name: /Simulate a later visit/ }));
    expect(screen.getByRole('heading', { name: 'Last time, you wanted to understand investment risk before deciding what to do. Would you like to pick that up?' })).toBeInTheDocument();
    expect(screen.getByText('Build wealth over time')).toBeInTheDocument(); // goal shown on the dashboard
    expect(screen.getByText(/Next step: Learn about investment risk first/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop these check-ins' }));
    expect(screen.getByText(/Check-ins are off/)).toBeInTheDocument();

    const again = await openSettings(user);
    await user.click(within(again).getByRole('button', { name: /Simulate a later visit/ }));
    expect(screen.queryByRole('button', { name: 'Stop these check-ins' })).not.toBeInTheDocument();
  }, 30000);

  it('“Not now” and “already set aside” are respected', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByText(/won’t bring this up for a while/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explore with Sunny' })).not.toBeInTheDocument();

    const dialog = await openSettings(user);
    await user.click(within(dialog).getByRole('button', { name: /Reset this scenario/ }));
    await user.click(screen.getByRole('button', { name: 'This money is already set aside' }));
    expect(screen.getByText(/won’t suggest exploring this balance again/)).toBeInTheDocument();
    const d2 = await openSettings(user);
    await user.click(within(d2).getByRole('button', { name: /Simulate a later visit/ }));
    expect(screen.queryByRole('button', { name: 'Explore with Sunny' })).not.toBeInTheDocument();
  }, 30000);

  it('Scenario C shows a normal dashboard with no manufactured opportunity, and Sunny is still available', async () => {
    const user = userEvent.setup();
    render(<App status={noAi} />);
    const dialog = await openSettings(user);
    await user.click(within(dialog).getByRole('button', { name: /C · Sam: no qualifying signal/ }));
    expect(screen.getByRole('heading', { name: 'Welcome back, Sam' })).toBeInTheDocument();
    expect(screen.queryByText(/Would you like to see three Tangerine products/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'What’s the difference between a GIC and an investment fund?{Enter}');
    expect(await screen.findByText(/They work very differently/, {}, SLOW)).toBeInTheDocument();
  }, 30000);
});

describe('header', () => {
  it('has no feedback control', () => {
    render(<App status={noAi} />);
    expect(screen.queryByText(/Give feedback/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Demo settings/ })).toBeInTheDocument();
  });
});

describe('live AI mode (mocked API)', () => {
  it('renders a direct clickable application card for each Tangerine credit card', async () => {
    const user = userEvent.setup();
    const products = [
      {
        text: 'I want to apply for the Money-Back Credit Card.',
        id: 'money-back-card',
        href: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
      },
      {
        text: 'I want to apply for the Money-Back World Mastercard.',
        id: 'money-back-world',
        href: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-credit-card',
      },
      {
        text: 'I want to apply for the Rewards World Elite Mastercard.',
        id: 'rewards-world-elite',
        href: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-elite-mastercard',
      },
    ] as const;
    const chat = vi.fn(async (body: ChatRequest): Promise<ChatResponse> => {
      const requestText = body.messages.at(-1)?.text ?? '';
      const product = products.find((candidate) => candidate.text === requestText)!;
      return {
        reply: 'Use the official Tangerine application page.',
        sourceIds: [],
        suggestions: [],
        effects: [{ type: 'signupPrepared', productId: product.id }],
      };
    });
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    for (let i = 0; i < products.length; i += 1) {
      await user.type(screen.getByLabelText('Message Sunny'), `${products[i].text}{Enter}`);
      const links = await screen.findAllByRole('link', { name: 'Open / Apply on Tangerine.ca' }, SLOW);
      const link = links.at(-1)!;
      expect(link).toHaveAttribute('href', products[i].href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  }, 30000);

  it('renders direct clickable next-step links for TFSA, GIC and mortgage products', async () => {
    const user = userEvent.setup();
    const products = ['tfsa', 'gic', 'mortgage'] as const;
    const chat = vi.fn(async (body: ChatRequest): Promise<ChatResponse> => {
      const text = body.messages.at(-1)?.text ?? '';
      const productId = products.find((id) => text.includes(id))!;
      return {
        reply: 'Use the official product page.',
        sourceIds: [],
        suggestions: [],
        effects: [{ type: 'signupPrepared', productId }],
      };
    });
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    for (const productId of products) {
      await user.type(screen.getByLabelText('Message Sunny'), `open ${productId}{Enter}`);
      const links = await screen.findAllByRole('link', { name: 'Open / Apply on Tangerine.ca' }, SLOW);
      const link = links.at(-1)!;
      expect(link).toHaveAttribute('href', offeringUrl(getOffering(productId)!));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  }, 30000);

  it('shows clickable Tangerine support channels on the handoff card and preview', async () => {
    const user = userEvent.setup();
    const chat = vi.fn(async (): Promise<ChatResponse> => ({
      reply: 'I hear that this has been frustrating. A concept support preview is ready.',
      sourceIds: [],
      suggestions: [],
      effects: [{ type: 'handoffReady', questions: [] }],
    }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'This is frustrating and I feel stuck.{Enter}');

    const contactLink = await screen.findByRole('link', { name: 'Tangerine Contact Us (Phone & Live Chat)' }, SLOW);
    const advisorLink = screen.getByRole('link', { name: 'Book a Phone or Video Advisor Consultation' });
    expect(contactLink).toHaveAttribute('href', 'https://www.tangerine.ca/en/help-centre/contact-us');
    expect(advisorLink).toHaveAttribute('href', 'https://www.tangerine.ca/en/personal/invest/advisors');
    for (const link of [contactLink, advisorLink]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }

    await user.click(screen.getByRole('button', { name: 'Review the support preview' }));
    expect(await screen.findByRole('heading', { name: 'Prepare for human support' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tangerine Contact Us (Phone & Live Chat)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a Phone or Video Advisor Consultation' })).toBeInTheDocument();
    expect(screen.queryByText(/\b(?:hours|a\.m\.|p\.m\.)\b/i)).not.toBeInTheDocument();
  }, 30000);

  it('shows the support card for a general customer-service answer', async () => {
    const user = userEvent.setup();
    const chat = vi.fn(async (): Promise<ChatResponse> => ({
      reply: 'You can reach Tangerine through its Contact Us page.',
      sourceIds: ['tng-contact'],
      suggestions: [],
      effects: [],
    }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'How do I contact customer service?{Enter}');
    expect(await screen.findByRole('link', { name: 'Tangerine Contact Us (Phone & Live Chat)' }, SLOW)).toHaveAttribute(
      'href',
      'https://www.tangerine.ca/en/help-centre/contact-us',
    );
    expect(screen.getByRole('link', { name: 'Book a Phone or Video Advisor Consultation' })).toHaveAttribute(
      'href',
      'https://www.tangerine.ca/en/personal/invest/advisors',
    );
  }, 30000);

  it('links mortgage source cards directly to Tangerine calculators and rates', async () => {
    const user = userEvent.setup();
    const chat = vi.fn(async (): Promise<ChatResponse> => ({
      reply: 'Tangerine has mortgage calculators and a mortgage rates page.',
      sourceIds: ['tng-mortgage'],
      suggestions: [],
      effects: [],
    }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'Where can I find Tangerine mortgage calculators and rates?{Enter}');
    await screen.findByText(/Tangerine has mortgage calculators/);
    await user.click(screen.getByText('Sources (1)'));

    expect(screen.getByRole('link', { name: 'Mortgage Payment Calculator' })).toHaveAttribute(
      'href',
      'https://www.tangerine.ca/en/personal/borrow/mortgage/mortgage-payment-calculator',
    );
    expect(screen.getByRole('link', { name: 'Mortgage Affordability Calculator' })).toHaveAttribute(
      'href',
      'https://www.tangerine.ca/en/personal/borrow/mortgage/mortgage-affordability-calculator',
    );
    expect(screen.getByRole('link', { name: 'Mortgage Rates' })).toHaveAttribute(
      'href',
      'https://www.tangerine.ca/en/rates/mortgage-rates',
    );
  }, 30000);

  it('launches the interactive growth calculator from a starter chip and updates its graph', async () => {
    const user = userEvent.setup();
    const projected = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 100, years: 5 });
    expect(projected.valid).toBe(true);
    const comparison = {
      years: projected.years,
      tfsaSavingsRate: projected.tfsaSavingsRate,
      startingAmount: projected.startingAmount,
      monthlyContribution: projected.monthlyContribution,
      customRate: projected.customRate,
      totalContributions: projected.totalContributions,
      options: projected.options,
      yearlyBreakdown: projected.yearlyBreakdown,
    };
    const chat = vi.fn(async (): Promise<ChatResponse> => ({
      reply: 'Here is an illustrative comparison you can adjust.',
      sourceIds: [],
      suggestions: [],
      effects: [{ type: 'scenario', ...comparison, compareTangerineOptions: true }],
    }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    expect(screen.getByRole('button', { name: 'Explain TFSA vs. RSP simply' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Compare 5-year savings & growth options' }, SLOW));

    expect(chat).toHaveBeenCalledTimes(1);
    const calculatorTitle = await screen.findByText('Wealth & Savings Growth Calculator', {}, SLOW);
    expect(calculatorTitle).toBeInTheDocument();
    const replyText = screen.getByText('Here is an illustrative comparison you can adjust.');
    expect(replyText.compareDocumentPosition(calculatorTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(replyText.closest('.msg')!).getByText('Wealth & Savings Growth Calculator')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ending Balance' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Key Trade-Off' })).toBeInTheDocument();
    expect(screen.getByText('Accessible anytime; regular Savings interest may be taxable.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Projected balances from year 0 to year 5' })).toBeInTheDocument();
    expect(screen.getByLabelText('Adjust custom rate (%)')).toBeDisabled();
    expect(screen.getByText(/not a universal TFSA return/i)).toBeInTheDocument();
    const years = screen.getByRole('spinbutton', { name: 'Time Horizon (Years)' });
    expect(years).toHaveValue(5);
    await user.clear(years);
    await user.type(years, '10');
    expect(screen.getByRole('img', { name: 'Projected balances from year 0 to year 10' })).toBeInTheDocument();
    expect(screen.getByText('Comparison at year 10')).toBeInTheDocument();
    expect(screen.getByText(/renewal beyond five years assumes the same 4\.05% rate/)).toBeInTheDocument();
  }, 30000);

  it('renders and updates the inline mortgage explorer with official Tangerine links', async () => {
    const user = userEvent.setup();
    const result = calculateMortgageScenario({
      mode: 'payment',
      homePrice: 500_000,
      downPayment: 100_000,
      annualRate: 4.79,
      amortizationYears: 25,
    });
    expect(result.valid).toBe(true);
    const scenario = {
      mode: result.mode,
      homePrice: result.homePrice,
      mortgageAmount: result.mortgageAmount,
      downPayment: result.downPayment,
      annualIncome: result.annualIncome,
      monthlyDebts: result.monthlyDebts,
      annualRate: result.annualRate,
      amortizationYears: result.amortizationYears,
      paymentFrequency: result.paymentFrequency,
      regularPayment: result.regularPayment,
      monthlyPayment: result.monthlyPayment,
      termYears: result.termYears,
      totalPaymentsInTerm: result.totalPaymentsInTerm,
      principalPaidInTerm: result.principalPaidInTerm,
      interestPaidInTerm: result.interestPaidInTerm,
      gdsMonthlyLimit: result.gdsMonthlyLimit,
      tdsMonthlyLimit: result.tdsMonthlyLimit,
      monthlyHousingPaymentLimit: result.monthlyHousingPaymentLimit,
      maxMortgageAmount: result.maxMortgageAmount,
      maxPurchasePrice: result.maxPurchasePrice,
    };
    const chat = vi.fn(async (): Promise<ChatResponse> => ({
      reply: 'Here is an illustrative mortgage estimate.',
      sourceIds: [],
      suggestions: [],
      effects: [{ type: 'mortgageScenario', ...scenario }],
    }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'Estimate a mortgage payment for a $500,000 home.{Enter}');
    const title = await screen.findByText('Mortgage Explorer & Calculator', {}, SLOW);
    const replyText = screen.getByText('Here is an illustrative mortgage estimate.');
    expect(within(replyText.closest('.msg')!).getByText('Mortgage Explorer & Calculator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fixed rate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Variable rate' })).toBeInTheDocument();
    expect(screen.getByText('4.79%')).toBeInTheDocument();
    expect(screen.getByText(/rate hold of up to 120 days/)).toBeInTheDocument();
    expect(screen.getByText(/15 business days from application submission to funding/)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Home Price ($)' })).toHaveValue(500_000);
    expect(screen.getByRole('link', { name: 'Explore Tangerine Mortgages' })).toHaveAttribute('href', 'https://www.tangerine.ca/en/personal/borrow/mortgage');
    for (const link of screen.getAllByRole('link', { name: /mortgage/i })) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(title).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Affordability estimate' }));
    expect(screen.getByRole('spinbutton', { name: 'Annual Income ($)' })).toBeInTheDocument();
    expect(screen.getByText(/Uses 39% GDS \/ 44% TDS/)).toBeInTheDocument();
  }, 30000);

  it('keeps “Explore other topics” and fallback suggestions when the model returns none', async () => {
    const user = userEvent.setup();
    const chat = vi.fn(async (): Promise<ChatResponse> => ({ reply: 'A GIC returns your principal at the end of a term.', sourceIds: ['cdic-gic'], suggestions: [], effects: [] }));
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'What is a GIC?{Enter}');
    await screen.findByText(/returns your principal/, {}, SLOW);
    const group = screen.getByRole('group', { name: 'Suggested replies' });
    expect(within(group).getAllByRole('button').length).toBeGreaterThanOrEqual(3);
    await user.click(screen.getByRole('button', { name: 'Explore other topics' }));
    const menu = screen.getByRole('group', { name: 'Other topics' });
    await user.click(within(menu).getByRole('button', { name: 'Browse all Tangerine offerings' }));
    await waitFor(() => expect(chat).toHaveBeenCalledTimes(2));
  }, 30000);

  it('asks permission before account details reach the model', async () => {
    const user = userEvent.setup();
    const requests: ChatRequest[] = [];
    const chat = vi.fn(async (body: ChatRequest): Promise<ChatResponse> => {
      requests.push(body);
      return { reply: 'Thanks. That leaves $15,000 not yet assigned to a purpose.', sourceIds: [], suggestions: ['Is a TFSA an investment?'], effects: [] };
    });
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Explore with Sunny' }));
    expect(screen.queryByText('Scripted demo')).not.toBeInTheDocument();
    expect(chat).not.toHaveBeenCalled(); // the opening and permission question are local
    await reply(user, 'Keep it general');
    await reply(user, 'I need $3,000 for bills and $10,000 for emergencies.');
    await screen.findByText(/not yet assigned/, {}, SLOW);
    expect(requests[0].permission).toBe('declined');
    expect(requests[0].account).toBeNull();
  }, 30000);

  it('shows an honest error with retry, and only switches to scripted when chosen', async () => {
    const user = userEvent.setup();
    let fail = true;
    const chat = vi.fn(async (): Promise<ChatResponse> => {
      if (fail) throw new AiRequestError('rate_limited', 'Gemini’s free-tier usage limit has been reached.');
      return { reply: 'A TFSA is an account, not an investment.', sourceIds: ['gov-tfsa'], suggestions: [], effects: [] };
    });
    render(<App status={aiOn} chat={chat} />);
    await user.click(await screen.findByRole('button', { name: 'Ask Sunny' }));
    await user.type(screen.getByLabelText('Message Sunny'), 'Is a TFSA an investment?{Enter}');
    expect(await screen.findByText('Gemini’s free-tier usage limit has been reached.', {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByText('Scripted demo')).not.toBeInTheDocument();
    fail = false;
    await reply(user, 'Try again');
    expect(await screen.findByText('A TFSA is an account, not an investment.', {}, SLOW)).toBeInTheDocument();

    fail = true;
    await user.type(screen.getByLabelText('Message Sunny'), 'Can I lose money?{Enter}');
    await reply(user, 'Use scripted demo instead');
    expect(await screen.findByText(/Switched to the scripted demo/, {}, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Scripted demo')).toBeInTheDocument();
    expect(await screen.findByText(/It depends on what you hold/, {}, SLOW)).toBeInTheDocument();
  }, 30000);
});
