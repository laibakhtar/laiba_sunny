/**
 * Tangerine offerings Sunny can introduce, built from curated and structured
 * catalogue data. Showing an offering means it is optional to explore based on
 * what the customer said, never that it is suitable or best.
 */
import { getEntry } from './knowledge.ts';
import { offerIsCurrentAsOf, TANGERINE_CATALOGUE, TANGERINE_OFFERS, type CatalogueOffer } from './catalogue.ts';

export type GoalType = 'build_wealth' | 'accessible_interest' | 'first_home' | 'understand_options' | 'other';

export const SUPPORT_LINKS = [
  {
    sourceId: 'tng-contact',
    label: 'Tangerine Contact Us (Phone & Live Chat)',
    url: 'https://www.tangerine.ca/en/help-centre/contact-us',
  },
  {
    sourceId: 'tng-advisors',
    label: 'Book a Phone or Video Advisor Consultation',
    url: 'https://www.tangerine.ca/en/personal/invest/advisors',
  },
] as const;

export interface Offering {
  id: string;
  name: string;
  /** One-line plain-language description. */
  summary: string;
  features: string[];
  /** Fees, access restrictions and other conditions. */
  conditions: string[];
  risks: string[];
  /** Knowledge-base ids that support every statement above. */
  sources: string[];
  rates?: string[];
  /** Goals this is relevant to explore for (not a suitability judgment). */
  relevantFor: GoalType[];
  availability?: 'available' | 'unconfirmed' | 'unavailable';
}
export type OfferingReasonMap = Record<string, string>;

export const OFFERINGS: Offering[] = [
  {
    id: 'savings-account',
    name: 'Tangerine Savings Account',
    summary: 'Keeps money accessible while it earns interest.',
    features: ['No monthly fee, no minimum balance', 'Interest calculated daily, paid monthly (rates can change)', 'Up to 10 savings accounts for separate goals', 'Automatic Savings Program you can change or cancel'],
    conditions: [],
    risks: ['Interest may not keep up with rising costs'],
    sources: ['tng-savings-account', 'tng-saving-vs-investing'],
    relevantFor: ['accessible_interest', 'first_home', 'understand_options', 'other'],
  },
  {
    id: 'money-back-card',
    name: 'Tangerine Money-Back Credit Card',
    summary: 'Earn 2% Money-Back Rewards in selected categories and 0.5% on other purchases.',
    features: ['Earn 2% on eligible purchases in two categories of your choice, or three when rewards are deposited into a Tangerine Savings Account', 'Earn 0.5% on all other eligible purchases', 'No limit on total cash back earned'],
    conditions: ['$0 annual fee', 'Gross annual income of at least $12,000; Canadian residency, age of majority and other application conditions apply', 'Credit approval and a credit check are required'],
    risks: ['Interest and fees can outweigh rewards if you carry a balance', 'Approval is not guaranteed'],
    sources: ['tng-money-back-card'],
    rates: ['20.95% purchase interest rate and 22.95% cash-advance and standard balance-transfer interest rates; rates and terms may change.'],
    relevantFor: ['understand_options', 'other'],
  },
  {
    id: 'money-back-world',
    name: 'Tangerine Money-Back World Mastercard',
    summary: 'A no-annual-fee World Mastercard with the same selected-category cash-back structure.',
    features: ['Earn unlimited 2% on eligible purchases in two categories of your choice, or three when rewards are deposited into a Tangerine Savings Account', 'Earn 0.5% on all other eligible purchases', 'Rental Car Collision/Loss Damage Insurance, Mobile Device Insurance and complimentary Mastercard Travel Pass membership (DragonPass)'],
    conditions: ['$0 annual fee', '$50,000 gross personal income, $80,000 gross household income, or $250,000 in assets under management; other World Mastercard requirements apply', 'Credit approval and a credit check are required'],
    risks: ['Interest and fees can outweigh rewards if you carry a balance', 'Approval is not guaranteed'],
    sources: ['tng-money-back-world'],
    rates: ['20.95% purchase interest rate and 22.95% cash-advance interest rate on the current product page; rates may change.'],
    relevantFor: ['understand_options', 'other'],
  },
  {
    id: 'rewards-world-elite',
    name: 'Tangerine Rewards World Elite Mastercard',
    summary: 'Earn Scene+ points with selected accelerated categories and World Elite benefits.',
    features: ['Earn 1.5 Scene+ points per $1 in three selected categories and 1 point per $1 on other purchases', 'Four complimentary airport lounge visits per year via Mastercard Travel Pass (DragonPass)', 'Mobile Device Insurance, Rental Car Collision/Loss Damage Insurance, and Travel Medical/Trip Cancellation coverage'],
    conditions: ['$120 annual fee', '$80,000 gross personal income, $150,000 gross household income, or $400,000 in assets under management; other World Elite requirements apply', 'Credit approval and a credit check are required'],
    risks: ['Interest, the annual fee and other charges can outweigh rewards if you carry a balance', 'Approval is not guaranteed'],
    sources: ['tng-rewards-world-elite'],
    rates: ['20.95% purchase interest rate and 22.95% cash-advance interest rate on the current product page; rates may change.'],
    relevantFor: ['understand_options', 'other'],
  },
  {
    id: 'tfsa',
    name: 'Tangerine TFSA options',
    summary: 'A tax-free account; what you hold inside it can be savings, a GIC or investment funds.',
    features: ['TFSA Savings Account, Tax-Free GIC, or Tax-Free Investment Fund Account', 'Growth generally tax-free; access depends on the underlying product, and GICs may be locked until maturity', 'No fees while funds stay with Tangerine'],
    conditions: ['You’re responsible for staying within your contribution room', 'A fee applies when transferring out to another institution'],
    risks: ['Risk depends on the holding: savings and GICs differ from investment funds'],
    sources: ['tng-tfsa-options', 'gov-tfsa'],
    relevantFor: ['build_wealth', 'accessible_interest', 'first_home', 'understand_options', 'other'],
  },
  {
    id: 'rsp',
    name: 'Tangerine RSP options',
    summary: 'A registered retirement account with tax-deductible contributions.',
    features: ['RSP Savings Account, RSP GIC, or RSP Investment Fund Account', 'Contributions tax deductible; growth tax-deferred'],
    conditions: ['Withdrawals are taxable income, with tax withheld', '$50 fee to transfer an RSP to another institution'],
    risks: ['Risk depends on the holding inside the account'],
    sources: ['tng-rsp-options', 'gov-rrsp'],
    relevantFor: ['build_wealth', 'understand_options'],
  },
  {
    id: 'gic',
    name: 'Tangerine GICs',
    summary: 'Your principal back at the end of a set term, plus interest.',
    features: ['Terms from short (e.g. 90 days) to multiple years', 'No minimum to open', 'Available in a TFSA, RSP, RIF or non-registered'],
    conditions: ['Not cashable before maturity, except approved financial-hardship redemptions'],
    risks: ['Money is locked in for the term'],
    sources: ['tng-gic', 'fcac-gic-rights'],
    relevantFor: ['build_wealth', 'accessible_interest', 'first_home', 'understand_options'],
  },
  {
    id: 'investment-funds',
    name: 'Tangerine Investment Funds',
    summary: 'Diversified mutual-fund portfolios for longer-term investing.',
    features: ['Core, Global ETF and Socially Responsible Global portfolios; Money Market Fund', 'Can be held in a TFSA, RSP, RIF or non-registered account'],
    conditions: [
      'Management fees: 0.80% Core, 0.50% Global ETF, 0.55% Socially Responsible, plus a 0.15% administration fee and other fund expenses',
      'Read the prospectus before investing',
    ],
    risks: ['Not guaranteed and not CDIC-insured', 'Values change frequently; you can lose money'],
    sources: ['tng-investment-funds', 'cdic-coverage'],
    relevantFor: ['build_wealth', 'understand_options'],
  },
  {
    id: 'advisors',
    name: 'Tangerine Advisors',
    summary: 'Phone or video consultations about investing and financial planning.',
    features: ['No-obligation investment consultation', 'Book online (not in this prototype)', 'Tangerine says advisors aren’t paid commissions based on what you choose'],
    conditions: ['Advice fees or minimums aren’t stated on Tangerine’s page'],
    risks: [],
    sources: ['tng-advisors'],
    relevantFor: ['build_wealth', 'understand_options'],
  },
];

const ALREADY_CURATED = new Set(['savings', 'tfsa', 'rsp', 'gic', 'investment-funds', 'moneyback-card', 'moneyback-world-card', 'rewards-world-elite', 'fhsa-status']);
const catalogueOfferings: Offering[] = TANGERINE_CATALOGUE
  .filter((product) => !ALREADY_CURATED.has(product.id))
  .map((product) => ({
    id: product.id,
    name: product.name,
    summary: product.summary,
    features: product.customerFit,
    conditions: [...product.eligibility, ...product.fees, ...product.limitations],
    risks: [],
    sources: [
      product.sourceId,
      ...product.relatedSourceIds.filter((sourceId) => getEntry(sourceId)?.kind === 'tangerine'),
    ],
    rates: product.rates.map((rate) =>
      `${rate.label}: ${rate.value ?? 'check Tangerine’s current rates page'}. ${rate.notes}`,
    ),
    relevantFor: ['understand_options', 'other'] as GoalType[],
    availability: product.availability,
  }));
OFFERINGS.push(...catalogueOfferings);

for (const product of TANGERINE_CATALOGUE) {
  const offeringId = product.id === 'savings' ? 'savings-account' : product.id;
  const offering = OFFERINGS.find((item) => item.id === offeringId);
  if (!offering || product.category === 'credit-card' || product.id === 'fhsa-status') continue;
  offering.summary = product.summary;
  offering.features = product.customerFit;
  offering.conditions = [...product.eligibility, ...product.fees, ...product.limitations];
  offering.sources = [
    product.sourceId,
    ...product.relatedSourceIds.filter((id) => getEntry(id)?.kind === 'tangerine'),
    ...offering.sources.filter(
      (id) => id !== product.sourceId && !product.relatedSourceIds.includes(id) && getEntry(id)?.kind === 'tangerine',
    ),
  ];
  offering.rates = product.rates.map((rate) =>
    `${rate.label}: ${rate.value ?? 'check Tangerine’s current rates page'}. ${rate.notes}`,
  );
  offering.availability = product.availability;
}

const BY_ID = new Map(OFFERINGS.map((o) => [o.id, o]));
const OFFER_BY_ID = new Map(TANGERINE_OFFERS.map((offer) => [offer.id, offer]));
const NAMED_PRODUCT_PATTERNS: [string, RegExp][] = [
  ['savings-account', /savings account/],
  ['chequing', /\bchequing\b|\bchecking\b|payroll|direct deposit|debit card/],
  ['usd-savings', /\b(?:us|u\.s\.) dollars?\b|\busd\b/],
  ['tfsa', /tfsa|tax.free/],
  ['rsp', /\brr?sp\b|retirement/],
  ['rif', /\brif\b|retirement income fund/],
  ['gic', /\bgics?\b|guaranteed/],
  ['investment-funds', /investment funds?|mutual funds?|portfolio|etf/],
  ['rewards-world-elite', /rewards world elite|world elite|scene\+|rewards mastercard/],
  ['money-back-world', /money.?back.{0,12}world|world mastercard/],
  ['money-back-card', /money.?back(?!\s+world)|cash.?back/],
  ['mortgage', /mortgage|home loan/],
  ['heloc', /\bheloc\b|home equity/],
  ['line-of-credit', /line of credit|credit line/],
  ['rsp-loan', /rrsp loan|rsp loan|borrow.{0,20}(?:rrsp|rsp)/],
  ['fhsa-status', /\bfhsa\b|first.home savings account/],
  ['advisors', /advis|person|talk to/],
];
const RECOMMENDATION_IDS = new Set([
  'savings-account',
  'money-back-card',
  'money-back-world',
  'rewards-world-elite',
  'tfsa',
  'rsp',
  'gic',
  'investment-funds',
  'advisors',
]);

export function getOffering(id: string): Offering | undefined {
  return BY_ID.get(id);
}

export function getCatalogueOffer(id: string): CatalogueOffer | undefined {
  return OFFER_BY_ID.get(id);
}

export function namedOfferingIds(text: string): string[] {
  const normalized = text.toLowerCase();
  return NAMED_PRODUCT_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(([id]) => id);
}

/** Match only current offers whose stated qualifying facts the customer explicitly confirmed. */
export function eligiblePromotionIds(
  productIds: string[],
  customerText: string,
  asOf = new Date().toISOString().slice(0, 10),
): string[] {
  const text = customerText.toLowerCase();
  const newToTangerine = /\b(?:new to tangerine|new tangerine (?:client|customer)|never had (?:a )?tangerine account|never banked with tangerine)\b/.test(text);
  const payrollMove = /\b(?:payroll|direct deposit|pay)\b/.test(text) && /\b(?:move|switch|set up|change|redirect)\b/.test(text);
  const neverHadTangerineCard = /\bnever (?:had|held|owned|opened).{0,35}\b(?:tangerine )?(?:credit card|money.?back card)\b/.test(text);
  const ids: string[] = [];
  if (newToTangerine && payrollMove && productIds.includes('chequing')) ids.push('chequing-payroll-bonus');
  if (neverHadTangerineCard && productIds.some((id) => ['money-back-card', 'money-back-world'].includes(id))) ids.push('moneyback-ten-percent');
  return ids.filter((id) => {
    const offer = OFFER_BY_ID.get(id);
    return offer && offerIsCurrentAsOf(offer, asOf);
  });
}

export const SIGNUP_PRODUCT_IDS = ['savings-account', 'money-back-card', 'money-back-world', 'rewards-world-elite'] as const;
export type SignupProductId = (typeof SIGNUP_PRODUCT_IDS)[number];

export function isSignupProductId(id: string): id is SignupProductId {
  return SIGNUP_PRODUCT_IDS.includes(id as SignupProductId);
}

export function signupProductFromText(text: string): SignupProductId | null {
  const t = text.toLowerCase();
  if (/\b(?:rewards world elite|world elite|scene\+)\b/.test(t)) return 'rewards-world-elite';
  if (/\b(?:money.?back.{0,12}world|world mastercard)\b/.test(t)) return 'money-back-world';
  if (/\b(?:money.?back card|cash.?back card|credit card)\b/.test(t)) return 'money-back-card';
  if (/\b(?:savings account|save account)\b/.test(t)) return 'savings-account';
  return null;
}

export function wantsToStartSignup(text: string): boolean {
  return /\b(?:open|apply|sign.?up|start (?:an? )?(?:application|account)|get started|interested in|ready to|want to (?:open|apply|sign up|get|start)|would like to (?:open|apply|sign up|get|start)|want (?:a|an|the) (?:new )?(?:credit card|savings account))\b/i.test(text);
}

export function resolveSignupProduct(
  text: string,
  previousSunny: string[],
  offeringsShown: string[],
): SignupProductId | null {
  if (!wantsToStartSignup(text)) return null;
  const explicit = signupProductFromText(text);
  if (explicit) return explicit;
  for (const previous of previousSunny) {
    const suggested = signupProductFromText(previous);
    if (suggested && offeringsShown.includes(suggested)) return suggested;
  }
  return null;
}

export function signupChecklist(id: SignupProductId): string[] {
  if (id === 'savings-account') {
    return [
      'Review the current variable interest rate and account terms on Tangerine’s page.',
      'Tangerine says a SIN is required to open an interest-earning account online.',
      'The account has no monthly fee or minimum balance; confirm any applicable transaction fees.',
    ];
  }
  if (id === 'money-back-card' || id === 'money-back-world') {
    return [
      `${id === 'money-back-card' ? 'There is no annual fee' : 'There is no annual fee; World Mastercard eligibility includes $50,000 personal income, $80,000 household income, or $250,000 in assets under management'}.`,
      'Review the current purchase, cash-advance and balance-transfer rates and full cardholder terms before applying.',
      `${id === 'money-back-card' ? 'The published gross annual income requirement is at least $12,000' : 'Credit approval and other card-specific requirements apply'}; approval is not guaranteed.`,
      'Carrying a balance incurs interest charges, which can outweigh rewards.',
      'Depositing Money-Back Rewards into a Tangerine Savings Account unlocks a third 2% category.',
    ];
  }
  return [
    'The annual fee is $120; World Elite eligibility includes $80,000 personal income, $150,000 household income, or $400,000 in assets under management.',
    'Credit approval is required and is not guaranteed; applying involves a credit check.',
    'Review the current purchase rate, rewards terms and full cardholder terms before applying.',
    'Cash advances and carrying a balance can cost more than the rewards earned.',
  ];
}

/** Keep only real offering ids, de-duplicated, in order. */
export function validateOfferingIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) if (typeof id === 'string' && BY_ID.has(id) && !out.includes(id)) out.push(id);
  return out.slice(0, OFFERINGS.length);
}

/** Offerings relevant to explore for a goal, in catalogue order. */
export function offeringsFor(goal: GoalType | null): Offering[] {
  return OFFERINGS.filter((o) => RECOMMENDATION_IDS.has(o.id) && o.relevantFor.includes(goal ?? 'understand_options'));
}

/** The official page for an offering (first source). */
export function offeringUrl(o: Offering): string | undefined {
  return getEntry(o.sources[0])?.url;
}

export function offeringRecommendationReason(
  id: string,
  goal: GoalType | null,
  horizon: HorizonType | null,
  signals?: OfferingSignals,
): string {
  if (id === 'chequing') {
    return 'You asked about Tangerine Chequing, so this is a specific account to explore for everyday banking and payroll; check the current fee schedule and account terms.';
  }
  if (id === 'money-back-card' || id === 'money-back-world') {
    const accountRule = signals?.hasSavingsAccount
      ? 'A Tangerine Savings Account is present in the shared account context; depositing rewards there unlocks a third 2% category.'
      : 'Depositing rewards into a Tangerine Savings Account unlocks a third 2% category.';
    return `You asked about the ${getOffering(id)?.name}; compare its rewards and benefits with the terms. ${accountRule} Carrying a balance incurs interest, and approval is not guaranteed.`;
  }
  if (id === 'rewards-world-elite') {
    return 'You asked about the Tangerine Rewards World Elite Mastercard; compare its Scene+ rewards and benefits with the $120 annual fee and published income criteria. Carrying a balance incurs interest, and approval is not guaranteed.';
  }
  if (id === 'fhsa-status') {
    return 'You asked about an FHSA. Tangerine does not currently offer one; this is an information note, not an available Tangerine product or an application option.';
  }
  if (id === 'investment-funds') {
    const timeframe = goal === 'build_wealth' && horizon === 'over_5_years'
      ? 'You said you want to build wealth over a longer timeframe'
      : goal === 'build_wealth' && horizon === '1_to_5_years'
        ? 'You said you want to build wealth and have a one-to-five-year timeframe'
        : goal === 'build_wealth' || goal === 'understand_options'
          ? 'You said you want to understand investing options'
          : horizon === 'over_5_years'
            ? 'You said this is a longer-term goal'
            : 'This is a specific Tangerine investment product you asked to explore';
    return `${timeframe}. Tangerine Investment Funds offer diversified mutual-fund portfolios to learn about; their value can fall and you can lose money.`;
  }
  if (id === 'savings-account') {
    if (signals?.chequingSurplusSignal && (horizon === 'under_1_year' || horizon === 'not_sure')) {
      return 'The chequing-surplus signal makes access worth considering; a Tangerine Savings Account keeps funds accessible without a GIC term lock-in, while its variable interest rate can change.';
    }
    const reason = goal === 'first_home'
      ? 'You said you’re saving toward a first home; this is a currently available option for accessible savings, while Tangerine does not currently offer an FHSA'
      : horizon === 'under_1_year'
        ? 'You may need the money within a year, and this account keeps savings accessible'
        : goal === 'accessible_interest'
          ? 'You said access and earning interest matter, and this account keeps savings accessible'
          : 'As a general starting point, you can explore this if access and variable interest matter to you';
    return `${reason}. The interest rate is variable and can change.`;
  }
  if (id === 'gic') {
    return horizon === 'under_1_year'
      ? 'You mentioned a shorter timeframe; a Tangerine GIC offers a set term, but is generally locked in until maturity, so check that the term matches your timing.'
      : 'A Tangerine GIC offers a set term and known maturity date; funds are generally locked in until maturity.';
  }
  if (id === 'tfsa') {
    if (signals?.chequingSurplusSignal && (horizon === 'under_1_year' || horizon === 'not_sure')) {
      return 'The chequing-surplus signal makes access worth considering; a Tangerine TFSA Savings Account is not locked in, while GICs or investment funds held inside a TFSA have different access and risk.';
    }
    return goal === 'first_home'
      ? 'You said you’re saving toward a first home; a Tangerine TFSA is one registered account to compare with an RSP, but its withdrawal and contribution rules differ from an FHSA.'
      : 'A Tangerine TFSA may be worth comparing for its tax treatment; the account can hold savings, GICs or investment funds, which have different access and risk.';
  }
  if (id === 'rsp') {
    return 'A Tangerine RSP is a retirement account to compare if retirement saving is part of your goal; contributions and withdrawals have tax consequences.';
  }
  if (id === 'advisors') {
    return 'Tangerine Advisors can discuss your goals and investment questions; this prototype cannot book a consultation.';
  }
  const product = getOffering(id);
  return product
    ? `You asked about ${product.name}; its details and trade-offs are included so you can decide whether to explore it.`
    : 'This is an optional Tangerine product to explore; any choice is yours.';
}

export function offeringReasons(
  ids: string[],
  goal: GoalType | null,
  horizon: HorizonType | null,
  signals?: OfferingSignals,
): OfferingReasonMap {
  return Object.fromEntries(ids.map((id) => [id, offeringRecommendationReason(id, goal, horizon, signals)]));
}

export type HorizonType = 'under_1_year' | '1_to_5_years' | 'over_5_years' | 'not_sure';
export type Emphasis = 'access' | 'balanced' | 'growth' | 'flexible';

export interface OfferingSignals {
  hasUnassignedCash?: boolean;
  chequingSurplusSignal?: boolean;
  monthlyExpenses?: number;
  hasSavingsAccount?: boolean;
}

export interface OfferingPlan {
  ids: string[];
  emphasis: Emphasis;
  featuredId: string;
}

const SHORT_TERM = ['savings-account', 'gic', 'tfsa'];

/**
 * Deterministic rule for the *initial* product exploration, used by both the
 * scripted engine and the server tool. It decides what's relevant to learn
 * about first given the customer's stated goal and timeline. It is not a
 * suitability decision or an allocation, and the full catalogue stays one
 * click away ("Browse all Tangerine offerings").
 *  - Within a year: access and stability first (savings, GIC terms and restrictions, TFSA savings).
 *  - 1–5 years: two accessible/stable options and one relevant investment/registered-account option.
 *  - More than 5 years: three products that explain the goal's major account and holding choices.
 *  - Not sure / not stated: flexible options while the timeline is clarified.
 */
export function offeringPlan(
  goal: GoalType | null,
  horizon: HorizonType | null,
  signals: OfferingSignals = {},
): OfferingPlan {
  if (signals.chequingSurplusSignal && (horizon === 'under_1_year' || horizon === 'not_sure')) {
    return { ids: ['savings-account', 'tfsa'], emphasis: 'access', featuredId: 'savings-account' };
  }
  if (signals.hasUnassignedCash && horizon === '1_to_5_years') {
    return { ids: ['gic', 'tfsa'], emphasis: 'balanced', featuredId: 'gic' };
  }
  if (signals.hasUnassignedCash && horizon === 'over_5_years') {
    return { ids: ['tfsa', 'rsp', 'investment-funds'], emphasis: 'growth', featuredId: 'tfsa' };
  }
  if (horizon === 'under_1_year') return { ids: SHORT_TERM, emphasis: 'access', featuredId: 'savings-account' };
  if (horizon === '1_to_5_years') {
    const ids = goal === 'build_wealth' || goal === 'understand_options'
      ? ['savings-account', 'gic', 'investment-funds']
      : ['savings-account', 'gic', 'tfsa'];
    return { ids, emphasis: 'balanced', featuredId: goal === 'build_wealth' ? 'investment-funds' : 'savings-account' };
  }
  if (horizon === 'over_5_years') {
    const ids = goal === 'build_wealth'
      ? ['investment-funds', 'tfsa', 'rsp']
      : goal === 'first_home'
        ? ['savings-account', 'tfsa', 'gic']
        : goal === 'accessible_interest'
          ? ['savings-account', 'gic', 'tfsa']
          : goal === 'understand_options'
            ? ['investment-funds', 'tfsa', 'gic']
            : SHORT_TERM;
    const featuredId = ids[0];
    return { ids, emphasis: goal === 'build_wealth' ? 'growth' : 'balanced', featuredId };
  }
  if (horizon === 'not_sure') return { ids: SHORT_TERM, emphasis: 'flexible', featuredId: 'savings-account' };
  if (goal === 'build_wealth' || goal === 'understand_options') {
    const ids = ['savings-account', 'gic', 'investment-funds'];
    return { ids, emphasis: 'flexible', featuredId: 'investment-funds' };
  }
  return { ids: SHORT_TERM, emphasis: 'flexible', featuredId: 'savings-account' };
}

/**
 * Keep product-specific questions focused. Broad exploration uses the
 * three-product plan; generic credit-card exploration stays within that family.
 */
export function initialOfferingIds(
  goal: GoalType | null,
  horizon: HorizonType | null,
  namedIds: string[] = [],
  customerText = '',
  signals: OfferingSignals = {},
): string[] {
  const plan = offeringPlan(goal, horizon, signals);
  const named = namedIds.filter((id) => BY_ID.has(id) && getOffering(id)?.availability !== 'unconfirmed');
  const text = customerText.toLowerCase();
  const asksAboutCardFamily = /\b(?:credit cards?|mastercards?)\b/.test(text) &&
    !/\b(?:money.?back.{0,12}world|money.?back.{0,12}card|cash.?back|world elite|scene\+)\b/.test(text);
  if (asksAboutCardFamily) return ['money-back-card', 'money-back-world', 'rewards-world-elite'];
  if (named.length) return [...new Set(named)].slice(0, 3);
  if (!customerText.trim() && named.length) return [...new Set([...named, ...plan.ids])].slice(0, 3);
  return plan.ids;
}
