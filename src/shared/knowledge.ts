/**
 * Curated knowledge base for Sunny. Used at runtime by the server (to ground
 * model answers) and the client (to render validated source links).
 *
 * Runtime knowledge combines the original curated sources and the dated
 * product catalogue. No live web fetching happens during a conversation.
 * Nothing here has been reviewed or approved by Tangerine; see CONTENT_SOURCES.md.
 */
import {
  CATALOGUE_REFERENCE_SOURCES,
  CATALOGUE_REVIEWED_ON,
  offerIsCurrentAsOf,
  TANGERINE_CATALOGUE,
  TANGERINE_OFFERS,
} from './catalogue.ts';

export const REVIEW_DATE = '2026-10-21';
/** Wealth-use-case sources added and checked on this date. */
export const REVIEW_DATE_WEALTH = '2026-10-24';
export const REVIEW_DATE_LATEST = '2026-11-19';
export const REVIEW_DATE_EDUCATION = '2026-11-20';

export interface KnowledgeEntry {
  id: string;
  topic: string;
  /** Plain-language factual content, paraphrased from the source. */
  content: string;
  publisher: string;
  pageTitle: string;
  url: string;
  /** Date the team actually retrieved and checked the page. */
  reviewed: string;
  /** Tangerine is first-party product education; government is external statutory guidance. */
  kind: 'tangerine' | 'government';
  resources?: { label: string; url: string }[];
  conditions: string[];
  /** What the source does not answer. Sunny must not fill these gaps by inference. */
  openQuestions: string[];
  keywords: string[];
}

const T = 'Tangerine';
const CRA = 'Canada Revenue Agency';
const FCAC = 'Financial Consumer Agency of Canada';
const CDIC = 'Canada Deposit Insurance Corporation';

const BASE_KNOWLEDGE: KnowledgeEntry[] = [
  // ---------------------------------------------------------- government
  {
    id: 'gov-fhsa-overview',
    topic: 'What an FHSA is',
    content:
      'A First Home Savings Account (FHSA) is a registered plan that lets first-time home buyers save toward a qualifying first home with tax advantages, up to certain limits. Contributions are generally tax-deductible, and qualifying withdrawals to buy or build a qualifying first home are tax-free.',
    publisher: CRA,
    pageTitle: 'First Home Savings Account (FHSA)',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Contribution limits and other CRA rules apply.', 'Some investments held in an FHSA can trigger taxes.'],
    openQuestions: ['Which financial institutions offer an FHSA is not covered by this source.'],
    keywords: ['fhsa', 'first home savings account', 'tax', 'deductible', 'registered', 'first home'],
  },
  {
    id: 'gov-fhsa-opening',
    topic: 'Who can open an FHSA',
    content:
      'To open an FHSA you must be a resident of Canada, at least 18 (19 where that is the age of majority) and 71 or younger as of December 31 of the year you open it, and a first-time home buyer: in the current year or the previous four calendar years you must not have lived in a qualifying home you owned (alone or jointly) as your principal residence. Similar conditions apply to a spouse or common-law partner.',
    publisher: CRA,
    pageTitle: 'Opening your FHSAs',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/opening-your-fhsas.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['All conditions must be met when the account is opened.'],
    openQuestions: ['Sunny cannot confirm whether a particular customer is eligible.'],
    keywords: ['eligible', 'eligibility', 'open', 'first-time', 'qualify', 'age', 'resident', 'fhsa'],
  },
  {
    id: 'gov-fhsa-investments',
    topic: 'What an FHSA can hold (account vs. holdings)',
    content:
      'An FHSA is an account with special tax treatment, not an investment itself. It can hold qualified investments such as cash, guaranteed investment certificates (GICs), mutual funds, most securities listed on a designated stock exchange, and government savings bonds. The issuer of the account may limit which of these it offers.',
    publisher: CRA,
    pageTitle: 'Investments in your FHSAs',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/investments-your-fhsa.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Risk depends on what is held inside the account, not on the account type.'],
    openQuestions: ['Which holdings a specific institution offers inside an FHSA.'],
    keywords: ['investment', 'hold', 'gic', 'cash', 'mutual fund', 'stocks', 'is an fhsa an investment', 'inside', 'lose'],
  },
  {
    id: 'gov-fhsa-withdrawals',
    topic: 'Taking money out of an FHSA',
    content:
      'A qualifying withdrawal used to buy or build a qualifying home is not taxed if all conditions are met, such as having a written agreement to buy or build, being a Canadian resident, and intending to live in the home as your principal residence. Other withdrawals are generally added to your income and taxed. The account holder is responsible for making sure the conditions are met.',
    publisher: CRA,
    pageTitle: 'Withdrawals and transfers out of your FHSAs',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/withdrawals-transfers-out-your-fhsas.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['A form must be submitted to the FHSA issuer for a qualifying withdrawal.'],
    openQuestions: ['Processing times or withdrawal mechanics at any specific institution.'],
    keywords: ['withdraw', 'withdrawal', 'take money out', 'access', 'taxable', 'qualifying'],
  },
  {
    id: 'gov-tfsa',
    topic: 'What a TFSA is',
    content:
      'A Tax-Free Savings Account (TFSA) is a registered account that can hold cash savings or investments. Contributions are not tax-deductible, but income earned inside it (interest, dividends, capital gains) is generally tax-free, including when withdrawn. You can withdraw at any time, for any reason, and withdrawals affect contribution room.',
    publisher: CRA,
    pageTitle: 'What is a TFSA',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/what.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Contribution room rules apply; over-contributing has tax consequences.'],
    openQuestions: [],
    keywords: ['tfsa', 'tax-free savings account', 'tax free', 'flexible', 'withdraw', 'difference'],
  },
  {
    id: 'gov-hbp',
    topic: "Home Buyers' Plan (RRSP)",
    content:
      "The Home Buyers' Plan (HBP) lets you withdraw money from your RRSPs to buy or build a qualifying home, up to a set limit. The amount withdrawn must be repaid to your RRSPs over a 15-year period. You can also make a qualifying FHSA withdrawal for the same home if you meet the conditions for both.",
    publisher: CRA,
    pageTitle: "The Home Buyers' Plan",
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Repayment rules apply; temporary relief changes when repayment starts for some withdrawals.'],
    openQuestions: ['Current withdrawal limit should be checked on the CRA page.'],
    keywords: ['hbp', 'home buyers plan', 'rrsp', 'rsp', 'retirement'],
  },
  {
    id: 'fcac-down-payment',
    topic: 'Minimum down payment',
    content:
      'In Canada the minimum down payment depends on the purchase price: 5% of a price up to $500,000; for $500,000 to $1.5 million, 5% of the first $500,000 plus 10% of the portion above; 20% at $1.5 million or more. With less than 20% down you typically need mortgage loan insurance, which protects the lender. The minimum down payment normally must come from your own funds.',
    publisher: FCAC,
    pageTitle: 'How much you need for a down payment',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['These are minimums, not a recommendation; closing costs are extra.', 'Rules can change; check the FCAC page.'],
    openQuestions: ['What a specific customer can afford or qualify for.'],
    keywords: ['down payment', 'how much', 'need', 'minimum', 'mortgage insurance', '20%', 'target'],
  },
  {
    id: 'fcac-buying-home',
    topic: 'Saving for a home: keep it safe and accessible',
    content:
      'For a home purchase, the FCAC suggests making saving part of your budget, for example with automatic transfers each pay period, and keeping the money you save protected and easily accessible. It lists savings accounts, GICs and low-risk mutual funds as short-term options, and notes closing costs of roughly 1.5% to 4% of the purchase price on top of the down payment.',
    publisher: FCAC,
    pageTitle: 'Buying a home',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/buying-home.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['General guidance, not a recommendation for an individual.'],
    openQuestions: [],
    keywords: ['timeline', 'short-term', 'accessible', 'closing costs', 'automatic', 'budget', 'start', 'where to start'],
  },
  {
    id: 'fcac-preparing-mortgage',
    topic: 'Preparing to talk to a lender',
    content:
      'Lenders generally review your income, expenses, debts, credit report and score, the amount you want to borrow and the amortization period. FCAC suggests ordering your credit report before shopping for a mortgage and checking it for errors, and getting preapproved before house hunting.',
    publisher: FCAC,
    pageTitle: 'Preparing to get a mortgage',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/mortgages/preparing-mortgage.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Lenders apply qualification tests; Sunny does not assess mortgage affordability.'],
    openQuestions: [],
    keywords: ['mortgage', 'lender', 'prepare', 'credit', 'preapproval', 'documents', 'affordability'],
  },
  {
    id: 'fcac-emergency-fund',
    topic: 'Emergency savings',
    content:
      'An emergency fund is money set aside for unexpected expenses such as car or home repairs, job loss or a health problem that stops you from working. Having one can help you avoid going into debt when something unexpected happens.',
    publisher: FCAC,
    pageTitle: 'Limiting future debt',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/debt/limiting-debt.html',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['How much to keep aside is the customer’s decision.'],
    openQuestions: ['The source does not explain keeping emergency money in a separate account.'],
    keywords: ['emergency', 'emergencies', 'unexpected', 'reserve', 'rainy day'],
  },
  {
    id: 'cdic-coverage',
    topic: 'Deposit insurance: what is and isn’t covered',
    content:
      'CDIC insures eligible deposits at member institutions, including savings deposits and GICs, up to $100,000 (principal and interest) per insured category. TFSA deposits and FHSA deposits are separate categories. Mutual funds, stocks, bonds and ETFs are not covered by CDIC.',
    publisher: CDIC,
    pageTitle: 'What’s covered',
    url: 'https://www.cdic.ca/your-coverage/whats-covered/',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Coverage applies only at CDIC member institutions and to eligible deposits.'],
    openQuestions: ['Whether a specific Tangerine product is an eligible deposit is not stated on the Tangerine pages reviewed; describe the general CDIC rule and suggest confirming with Tangerine or CDIC.'],
    keywords: ['lose money', 'safe', 'risk', 'insured', 'cdic', 'protected', 'guaranteed', 'mutual fund'],
  },
  {
    id: 'cdic-gic',
    topic: 'What a GIC is',
    content:
      'A guaranteed investment certificate (GIC) is a type of secured investment: you lend money to the issuing institution for a set term in exchange for return of your principal and the potential to earn interest.',
    publisher: CDIC,
    pageTitle: 'Guaranteed Investment Certificates (GICs)',
    url: 'https://cdic.ca/?p=116',
    reviewed: REVIEW_DATE,
    kind: 'government',
    conditions: ['Terms and redemption rules vary by issuer and product.'],
    openQuestions: [],
    keywords: ['gic', 'guaranteed investment certificate', 'term', 'term deposit'],
  },

  {
    id: 'fcac-goals',
    topic: 'Saving vs investing, time horizon and risk',
    content:
      'The FCAC explains that saving and investing can both help reach goals. It describes short-term goals as 2 years or less and long-term goals as 6 years or more, and notes that many investments offer the potential for a higher return but involve some risk, which may be more acceptable for longer-term goals because there is more time to recover from losses. Risk tolerance depends on your emotional willingness to accept risk and your financial ability to absorb loss. One risk is that investments may not keep up with inflation. The FCAC also notes you’re generally better off paying down debt first, because debt interest is usually more than you can earn by investing.',
    publisher: FCAC,
    pageTitle: 'Setting savings and investment goals',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/savings-investment-goals.html',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'government',
    conditions: ['General guidance, not a recommendation for an individual.'],
    openQuestions: [],
    keywords: ['saving', 'investing', 'risk', 'return', 'time horizon', 'horizon', 'next year', 'long term', 'short term', 'lose money', 'debt', 'inflation', 'risk tolerance', 'build wealth'],
  },
  {
    id: 'fcac-investing-basics',
    topic: 'Before investing: factors and costs',
    content:
      'The FCAC suggests considering your financial situation, goals, investment time horizon and risk tolerance before investing. It explains that investment costs can come from buying, selling and managing an investment, and that costs reduce your return.',
    publisher: FCAC,
    pageTitle: 'Basics of investing',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/investing-basics.html',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'government',
    conditions: [],
    openQuestions: [],
    keywords: ['fees', 'costs', 'before investing', 'how investing works', 'factors', 'not ready', 'decide'],
  },
  {
    id: 'fcac-gic-rights',
    topic: 'GICs: rights and early cash-out',
    content:
      'The FCAC explains that with a GIC or term deposit you get back the amount you invest at the end of the term. Before you buy, institutions must tell you whether you can cash it in before the end date and how that affects interest, and whether CDIC insures the product.',
    publisher: FCAC,
    pageTitle: 'Guaranteed investment certificates and term deposits: know your rights',
    url: 'https://www.canada.ca/en/financial-consumer-agency/services/rights-responsibilities/rights-investing/rights-guaranteed-investment-certificates.html',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'government',
    conditions: [],
    openQuestions: [],
    keywords: ['gic', 'term', 'cash in', 'early', 'principal', 'need the money', 'next year'],
  },
  {
    id: 'gov-rrsp',
    topic: 'What an RRSP is',
    content:
      'An RRSP is a registered retirement savings plan you set up. Contributions can reduce your taxable income, income earned in the plan is usually exempt from tax while it stays in the plan, and withdrawals are generally taxable when received.',
    publisher: CRA,
    pageTitle: 'Registered Retirement Savings Plan (RRSP)',
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/registered-retirement-savings-plan-rrsp.html',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'government',
    conditions: ['Contribution limits and rules apply.'],
    openQuestions: ['The page does not list what investments an RRSP can hold.'],
    keywords: ['rrsp', 'rsp', 'retirement', 'tax deductible', 'difference', 'tfsa vs rrsp'],
  },

  // -------------------------------------------------------------- Tangerine
  {
    id: 'tng-savings-account',
    topic: 'Tangerine Savings Account',
    content:
      'The Tangerine Savings Account has no monthly fee and no minimum balance. Interest is calculated daily and paid monthly, and rates can change. Clients can hold up to 10 non-registered Savings Accounts (for example, one per goal), set up an Automatic Savings Program that can be changed, skipped or cancelled at any time, and use a Savings Goals tool to estimate when a goal could be reached.',
    publisher: T,
    pageTitle: 'Savings Account',
    url: 'https://www.tangerine.ca/en/personal/save/savings-account',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['A fee applies to transfers to another financial institution (see Tangerine’s fee schedule).', 'Opening an interest-earning account online requires a SIN.'],
    openQuestions: ['Current interest rates (intentionally not stored; promotional rates change).'],
    keywords: ['tangerine', 'savings account', 'automatic savings', 'savings goals', 'separate', 'no fee', 'help'],
  },
  {
    id: 'tng-tfsa-options',
    topic: 'TFSA options at Tangerine',
    content:
      'Tangerine offers three ways to hold a TFSA: a TFSA Savings Account (tax-free interest with the features of a Tangerine Savings Account and generally flexible access), a Tax-Free Guaranteed Investment (a GIC held in a TFSA, generally locked until maturity), and a Tax-Free Investment Fund Account (Tangerine investment funds held in a TFSA, whose value can fluctuate). Registered accounts have no fees while funds stay with Tangerine.',
    publisher: T,
    pageTitle: 'TFSAs',
    url: 'https://www.tangerine.ca/en/personal/invest/tfsa',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['A fee applies when transferring funds to another financial institution.', 'Clients are responsible for confirming their own contribution limits.'],
    openQuestions: ['The page does not state CDIC coverage for each TFSA option; investment funds are not CDIC-insured per CDIC.'],
    keywords: ['tangerine', 'tfsa', 'tax-free', 'investment fund', 'gic', 'options', 'offer'],
  },
  {
    id: 'tng-tfsa-savings',
    topic: 'Tangerine TFSA Savings Account access',
    content:
      'Tangerine’s TFSA Savings Account has no monthly fee and no minimum balance, and money can be accessed at any time: Tangerine says “You’re never locked in, and there are no minimums.” Interest and withdrawals are not taxed as long as contributions stay within CRA limits.',
    publisher: T,
    pageTitle: 'TFSA Savings Account',
    url: 'https://www.tangerine.ca/en/personal/save/tfsa',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['Open to individuals 18 and older.', 'A fee applies to transfers out to another institution.'],
    openQuestions: ['Promotional rates shown on the page were deliberately not recorded.'],
    keywords: ['tangerine', 'tfsa', 'withdraw', 'access', 'locked in', 'whenever', 'take money out'],
  },
  {
    id: 'tng-gic',
    topic: 'Tangerine GICs',
    content:
      'Tangerine offers non-registered GICs (including US-dollar GICs) and registered GICs held in a TFSA, RSP or RIF. Terms range from short terms (such as 90 days) to multiple years, and there is no minimum balance to open one. Tangerine GICs are not cashable before maturity, except where an application for early redemption due to financial hardship has been approved. At maturity, the GIC follows the instruction you set (renew, reinvest or pay out), which can be changed during the term.',
    publisher: T,
    pageTitle: 'Types of GICs: Non-Registered & Registered',
    url: 'https://www.tangerine.ca/en/personal/invest/guaranteed-investments',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['Money in a Tangerine GIC is locked in until maturity, apart from approved hardship redemptions.'],
    openQuestions: ['An FHSA GIC is not listed on this page.', 'Current GIC rates were deliberately not recorded.'],
    keywords: ['tangerine', 'gic', 'guaranteed', 'cashable', 'redeem', 'maturity', 'term', 'locked', 'take money out'],
  },
  {
    id: 'tng-investment-funds',
    topic: 'Tangerine Investment Funds (portfolios)',
    content:
      'Tangerine offers mutual-fund portfolios: Core Portfolios, Global ETF Portfolios (a mutual fund holding a selection of ETFs), Socially Responsible Global Portfolios, and a Money Market Fund described as a stable short-term option. The portfolios hold stocks, bonds or cash equivalents in different mixes. Tangerine states annual management fees of 0.80% (Core), 0.50% (Global ETF) and 0.55% (Socially Responsible), plus a fixed administration fee of 0.15% of each portfolio’s value and other fund expenses. They can be held in a TFSA, RSP, RIF or non-registered account.',
    publisher: T,
    pageTitle: 'Mutual Fund Investments in Canada',
    url: 'https://www.tangerine.ca/en/personal/invest/mutual-funds',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: [
      'Mutual funds are not guaranteed or insured by CDIC, and their values change frequently.',
      'All securities, including mutual funds, carry a risk of loss of capital; diversification does not eliminate it.',
      'Read the prospectus before investing. Tangerine Investment Funds Limited is the principal distributor.',
    ],
    openQuestions: ['Minimum investment amounts and total MER figures are not stated on this page.'],
    keywords: ['tangerine', 'invest', 'investment', 'investing', 'mutual fund', 'fund', 'portfolio', 'etf', 'lose money', 'risk', 'fees', 'management fee', 'build wealth', 'grow'],
  },
  {
    id: 'tng-rsp-options',
    topic: 'RSP options at Tangerine',
    content:
      'Tangerine offers an RSP Savings Account, an RSP Guaranteed Investment (GIC) and an RSP Investment Fund Account. Tangerine states that RSP contributions are tax deductible, and that withdrawals are taxable income with tax withheld. Registered accounts have no fees while funds stay with Tangerine.',
    publisher: T,
    pageTitle: 'RSPs',
    url: 'https://www.tangerine.ca/en/personal/invest/rsp',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: ['Transferring an RSP to another institution has a $50 fee.', 'Contribution limits apply; customers confirm their own room with the CRA.'],
    openQuestions: ['Minimum contributions are not stated on the page.'],
    keywords: ['rsp', 'rrsp', 'retirement', 'tax deductible', 'tangerine', 'options', 'registered'],
  },
  {
    id: 'tng-advisors',
    topic: 'Tangerine Advisors',
    content:
      'Tangerine describes advisors who offer phone or video consultations, including a no-obligation investment consultation and financial-planning conversations, which can be booked online. Tangerine states its advisors don’t receive commissions based on the portfolio a client chooses or how much they invest.',
    publisher: T,
    pageTitle: 'Tangerine Advisors | Personalized Investment Advice & Guidance',
    url: 'https://www.tangerine.ca/en/personal/invest/advisors',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: ['Booking in this prototype is not real; nothing is scheduled or sent.'],
    openQuestions: ['Advice fees, minimums or eligibility for the advisory service are not stated on the page.'],
    keywords: ['advisor', 'adviser', 'advice', 'person', 'human', 'talk to', 'consultation', 'book', 'planning', 'help me decide'],
  },
  {
    id: 'tng-saving-vs-investing',
    topic: 'Saving vs investing (Tangerine article)',
    content:
      'Tangerine’s article “What’s the difference between saving and investing?” (Nov 22, 2023) explains that savings accounts aim to pay interest with little to no risk of losing money and keep funds easy to access, while investments carry varying levels of risk in pursuit of higher potential returns and suit longer timeframes. It notes savings interest may not keep up with rising costs, investing fees are generally higher and returns aren’t guaranteed, and that the two can work together.',
    publisher: T,
    pageTitle: 'What’s the difference between saving and investing?',
    url: 'https://www.tangerine.ca/en/thejuice/invest/whats-the-difference-between-saving-and-investing',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: ['Educational article, not advice; published in 2023.'],
    openQuestions: [],
    keywords: ['saving', 'investing', 'difference', 'build wealth', 'grow', 'risk', 'return', 'how investing works', 'start'],
  },
  {
    id: 'tng-beginners-guide',
    topic: 'Accounts vs. investment products (Tangerine article)',
    content:
      'Tangerine’s “A beginner’s guide to investing” (Jan 10, 2024) describes accounts such as a TFSA or RRSP as the container, and GICs, bonds, stocks, mutual funds and ETFs as the products that go inside. It notes GICs are a low-risk tool, mutual funds and ETFs carry a risk of loss, and fund fees vary.',
    publisher: T,
    pageTitle: 'A beginner’s guide to investing',
    url: 'https://www.tangerine.ca/en/thejuice/invest/a-beginners-guide-to-investing',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: ['Educational article, not advice.'],
    openQuestions: [],
    keywords: ['container', 'account', 'is a tfsa an investment', 'inside', 'holdings', 'products', 'beginner', 'how investing works'],
  },
  {
    id: 'tng-chequing-vs-savings',
    topic: 'Chequing vs savings (Tangerine article)',
    content:
      'Tangerine’s article “Chequing vs. savings accounts” (June 20, 2024) describes chequing accounts as typically used for day-to-day banking, with low or no interest, and savings accounts as a place to set money aside for emergencies or a future purpose, generally with higher interest than chequing.',
    publisher: T,
    pageTitle: 'Chequing vs. savings accounts: your questions answered',
    url: 'https://www.tangerine.ca/en/thejuice/save/chequing-vs-savings-accounts-your-questions-answered',
    reviewed: REVIEW_DATE_WEALTH,
    kind: 'tangerine',
    conditions: ['Educational article; current account rates were deliberately not recorded.'],
    openQuestions: [],
    keywords: ['chequing', 'leave it in chequing', 'why not leave', 'savings account', 'interest', 'everyday'],
  },
  {
    id: 'tng-money-back-card',
    topic: 'Tangerine Money-Back Credit Card',
    content:
      'The Tangerine Money-Back Credit Card has no annual fee. It earns 2% Money-Back Rewards on eligible purchases in two categories of the customer’s choice, or three categories when rewards are deposited into a Tangerine Savings Account, and 0.5% on all other eligible purchases. There is no limit on total cash back earned. The current product page lists a 20.95% purchase interest rate and 22.95% cash-advance and standard balance-transfer interest rates; the live page gives current rates and terms.',
    publisher: T,
    pageTitle: 'Money-Back Credit Card',
    url: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
    reviewed: REVIEW_DATE_LATEST,
    kind: 'tangerine',
    conditions: ['$0 annual fee.', 'The product page lists gross annual income of at least $12,000 and other Canadian-residency, age, credit-check and approval conditions.', 'Regular balance transfers have a 3% fee or $5 minimum; check the live page for current rates and terms.'],
    openQuestions: ['Rates, fees and full cardholder terms can change; confirm them on Tangerine’s live page.'],
    keywords: ['tangerine', 'credit card', 'money-back card', 'cash back', 'cashback', '2%', 'rewards category', 'annual fee'],
  },
  {
    id: 'tng-money-back-world',
    topic: 'Tangerine Money-Back World Mastercard',
    content:
      'The Tangerine Money-Back World Mastercard has no annual fee. It earns unlimited 2% Money-Back Rewards on eligible purchases in two categories of the customer’s choice, or three categories when rewards are deposited into a Tangerine Savings Account, and 0.5% on all other eligible purchases. Benefits include Rental Car Collision/Loss Damage Insurance, Mobile Device Insurance and complimentary Mastercard Travel Pass membership (DragonPass). Its product page lists minimum eligibility of $50,000 gross personal income, $80,000 gross household income, or $250,000 in assets under management, along with other requirements.',
    publisher: T,
    pageTitle: 'Money-Back World Mastercard',
    url: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-credit-card',
    reviewed: REVIEW_DATE_LATEST,
    kind: 'tangerine',
    conditions: ['$0 annual fee.', 'The product page lists $50,000 gross personal income, $80,000 gross household income, or $250,000 in assets under management; other eligibility and credit approval requirements apply.', 'Insurance and Mastercard Travel Pass benefits are subject to their terms.'],
    openQuestions: ['Check the live product page and cardholder agreement for current rates and benefit terms.'],
    keywords: ['tangerine', 'credit card', 'mastercard', 'money-back world', 'cash back', 'cashback', 'world mastercard'],
  },
  {
    id: 'tng-rewards-world-elite',
    topic: 'Tangerine Rewards World Elite Mastercard',
    content:
      'The Tangerine Rewards World Elite Mastercard has a $120 annual fee. It earns 1.5 Scene+ points per $1 in three selected categories and 1 point per $1 on all other purchases. The product page lists 20.95% purchase and 22.95% cash-advance interest rates. Benefits include four complimentary airport lounge visits per year via Mastercard Travel Pass (DragonPass), Mobile Device Insurance, Rental Car Collision/Loss Damage Insurance, and Travel Medical/Trip Cancellation coverage. Its product page lists minimum eligibility of $80,000 gross personal income, $150,000 gross household income, or $400,000 in assets under management, along with other requirements.',
    publisher: T,
    pageTitle: 'Rewards World Elite Mastercard',
    url: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-elite-mastercard',
    reviewed: REVIEW_DATE_LATEST,
    kind: 'tangerine',
    conditions: ['$120 annual fee.', 'The product page lists $80,000 gross personal income, $150,000 gross household income, or $400,000 in assets under management; other eligibility and credit approval requirements apply.', 'Insurance and Mastercard Travel Pass benefits are subject to their terms.'],
    openQuestions: ['Check the live product page and cardholder agreement for current benefit terms.'],
    keywords: ['tangerine', 'credit card', 'mastercard', 'rewards world elite', 'scene+', 'lounge', 'annual fee', 'income eligibility'],
  },
  {
    id: 'tng-fhsa-status',
    topic: 'FHSA availability and first-home education at Tangerine',
    content:
      'Tangerine does not currently offer a First Home Savings Account (FHSA). Tangerine’s first-home education describes an FHSA as a registered account designed to help eligible first-time home buyers save toward a first home tax-free, and discusses the Home Buyers’ Plan in the context of an RSP. Tangerine’s AI-information page also lists FHSA among its financial-education topics; educational coverage does not mean Tangerine offers the account. Customers often explore Tangerine TFSA or RSP accounts for a down payment, but the right account depends on their circumstances.',
    publisher: T,
    pageTitle: 'Official Information about Tangerine for AI Systems',
    url: 'https://www.tangerine.ca/en/ai-information',
    reviewed: REVIEW_DATE_LATEST,
    kind: 'tangerine',
    conditions: ['Tangerine does not currently offer an FHSA.', 'The 2024 first-home article includes historical government contribution figures; check current CRA rules for tax and contribution details.'],
    openQuestions: ['Current CRA eligibility, contribution and withdrawal rules are not provided here.'],
    keywords: ['tangerine', 'fhsa', 'first home', 'home buyers plan', 'hbp', 'tfsa', 'rsp', 'down payment', 'does tangerine offer'],
  },
  {
    id: 'tng-mortgage',
    topic: 'Tangerine mortgages and tools',
    content:
      'Tangerine offers a closed mortgage with fixed or variable rates, a rate hold of up to 120 days before closing, prepayment options, portability, and a dedicated Mortgage Specialist after you apply. Its website has a Mortgage Affordability Calculator, Mortgage Payment Calculator, Rent vs Buy Calculator and a Mortgage Checklist. Tangerine says to allow at least 15 business days from submission to funding.',
    publisher: T,
    pageTitle: 'Mortgages: Fixed & Variable Mortgage Loans',
    url: 'https://www.tangerine.ca/en/personal/borrow/mortgage',
    resources: [
      { label: 'Mortgage Payment Calculator', url: 'https://www.tangerine.ca/en/personal/borrow/mortgage/mortgage-payment-calculator' },
      { label: 'Mortgage Affordability Calculator', url: 'https://www.tangerine.ca/en/personal/borrow/mortgage/mortgage-affordability-calculator' },
      { label: 'Mortgage Rates', url: 'https://www.tangerine.ca/en/rates/mortgage-rates' },
    ],
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['Approval is subject to Tangerine’s review; Sunny cannot assess qualification.'],
    openQuestions: ['Pre-approval is not described on this page.', 'There is no dedicated first-time buyer section on this page.'],
    keywords: ['tangerine', 'mortgage', 'calculator', 'affordability', 'specialist', 'checklist', 'rate hold', 'help'],
  },
  {
    id: 'tng-contact',
    topic: 'Contacting Tangerine',
    content:
      'Tangerine’s Contact Us page lists phone support at 1-888-826-4374 (everyday banking 24/7; mortgage line on weekdays), a separate Investment Funds line at 1-877-464-5678, and live chat for saving, chequing and investing during set hours.',
    publisher: T,
    pageTitle: 'Contact Us',
    url: 'https://www.tangerine.ca/en/help-centre/contact-us',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: ['Hours vary by line and on holidays; check the page for current hours.'],
    openQuestions: ['Tangerine’s AI-information page lists shorter mortgage and investment-fund hours than the Contact Us page; the hours conflict was not resolved.'],
    keywords: ['contact', 'phone', 'call', 'chat', 'talk to', 'human', 'person', 'support', 'help'],
  },
  {
    id: 'tng-first-home-article',
    topic: 'Tangerine article: saving for a first home',
    content:
      'Tangerine’s article “How to save for your first home” (July 8, 2024) suggests setting milestone goals, budgeting savings as its own line item, paying down high-interest debt, earning interest through options such as high-interest savings or GICs, and automating transfers. It describes the FHSA as a registered account designed to help eligible first-time home buyers save toward a first home tax-free, and discusses the Home Buyers’ Plan in the context of an RSP. Its specific government contribution and down-payment figures are dated and should not be treated as current rules.',
    publisher: T,
    pageTitle: 'How to save for your first home',
    url: 'https://www.tangerine.ca/en/thejuice/borrow/how-to-save-for-your-first-home',
    reviewed: REVIEW_DATE_LATEST,
    kind: 'tangerine',
    conditions: ['Published in 2024: government contribution and down-payment figures may have changed; check current CRA/FCAC rules.'],
    openQuestions: ['The article is educational and does not provide current CRA contribution or eligibility rules.'],
    keywords: ['tangerine', 'start', 'where to start', 'tips', 'budget', 'automate', 'first home', 'fhsa', 'home buyers plan', 'rsp', 'help'],
  },
  {
    id: 'tng-about',
    topic: 'About Tangerine',
    content:
      'Tangerine is a trade name of Tangerine Bank, a wholly owned subsidiary of The Bank of Nova Scotia (Scotiabank) and a CDIC member in its own right. Tangerine lists savings accounts, GICs, registered accounts (such as TFSAs and RRSPs), mutual funds and investment portfolios, and mortgages among its services.',
    publisher: T,
    pageTitle: 'Official Information about Tangerine for AI Systems',
    url: 'https://www.tangerine.ca/en/ai-information',
    reviewed: REVIEW_DATE,
    kind: 'tangerine',
    conditions: [],
    openQuestions: [],
    keywords: ['tangerine', 'scotiabank', 'cdic', 'about', 'what can tangerine', 'offer'],
  },
  {
    id: 'tng-edu-compound-interest',
    topic: 'Simple and compound interest',
    content:
      'Simple interest is calculated only on the original amount saved; compound interest is interest on that amount plus interest already kept in the account. For example, with a hypothetical $100 balance that earns $1 and keeps it, a later interest calculation can include $101; if the interest is withdrawn, it continues to be based on the original $100. Tangerine explains that its Savings Account interest is calculated daily and paid monthly, while GIC interest frequency depends on the term: terms of one year or longer may be compounded and/or paid annually, and shorter terms are generally paid at maturity. The rate and timing depend on the product and can change where the rate is variable.',
    publisher: T,
    pageTitle: 'Understand compound interest in 60 seconds',
    url: 'https://www.tangerine.ca/en/thejuice/save/understand-compound-interest-in-60-seconds-video',
    resources: [
      { label: 'Tangerine Savings Account', url: 'https://www.tangerine.ca/en/personal/save/savings-account' },
      { label: 'Tangerine GICs', url: 'https://www.tangerine.ca/en/personal/invest/guaranteed-investments' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['The $100 example is illustrative only; actual interest depends on the balance, rate, timing and product terms.'],
    openQuestions: ['Current savings and GIC rates are not stored here; check Tangerine’s live rate pages.'],
    keywords: ['compound interest', 'simple interest', 'interest on interest', 'calculated daily', 'paid monthly', 'gic interest', 'how interest works'],
  },
  {
    id: 'tng-edu-tfsa-vs-rrsp',
    topic: 'TFSA vs. RSP/RRSP',
    content:
      'A TFSA and an RSP/RRSP are registered account types with different tax treatment, not investments by themselves. A TFSA can hold savings or investments whose growth and withdrawals are generally tax-free; an RSP/RRSP is usually aimed at retirement, contributions may be deductible, and withdrawals are generally taxable, with Tangerine noting tax withheld on RSP withdrawals. Tangerine’s educational comparison describes a TFSA as flexible for short-, medium- or long-term goals and an RSP as retirement-focused. For example, the same $100 contribution can have different tax treatment depending on which account holds it; the example does not calculate anyone’s tax outcome.',
    publisher: T,
    pageTitle: 'RSP vs TFSA: Understand the difference',
    url: 'https://www.tangerine.ca/en/thejuice/invest/rsp-vs-tfsa-understand-the-difference',
    resources: [
      { label: 'Tangerine TFSA options', url: 'https://www.tangerine.ca/en/personal/invest/tfsa' },
      { label: 'Tangerine RSP options', url: 'https://www.tangerine.ca/en/personal/invest/rsp' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['This is general education, not personalized tax advice.'],
    openQuestions: ['Current contribution limits, eligibility and detailed tax rules should be checked with the CRA.'],
    keywords: ['tfsa', 'rsp', 'rrsp', 'tfsa vs rrsp', 'tfsa vs rsp', 'difference between tfsa and rrsp', 'difference between tfsa and rsp', 'tfsa contribution room', 'tax-free', 'tax deductible', 'retirement account', 'withholding tax'],
  },
  {
    id: 'tng-edu-container-vs-holdings',
    topic: 'Registered accounts as containers and their holdings',
    content:
      'A TFSA or RSP/RRSP is like a container that provides a particular tax treatment; it is not an investment on its own. Savings, GICs and Investment Funds are examples of holdings that can go inside an account, subject to what the institution offers. For example, two people can each have a TFSA but hold different things: accessible savings in one and a term GIC in the other, so their risk and access differ. Tangerine’s beginner guide uses this container-and-product distinction to explain investing.',
    publisher: T,
    pageTitle: 'A beginner’s guide to investing',
    url: 'https://www.tangerine.ca/en/thejuice/invest/a-beginners-guide-to-investing',
    resources: [
      { label: 'Tangerine TFSA options', url: 'https://www.tangerine.ca/en/personal/invest/tfsa' },
      { label: 'Tangerine RSP options', url: 'https://www.tangerine.ca/en/personal/invest/rsp' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['Available holdings depend on the account and products offered by the institution.'],
    openQuestions: ['The container alone does not determine the risk or liquidity of a specific holding.'],
    keywords: ['container', 'holdings', 'what is inside a tfsa', 'tfsa an investment', 'rsp an investment', 'account vs investment', 'investment product', 'risk and access'],
  },
  {
    id: 'tng-edu-mer-and-fees',
    topic: 'MER, management fees and administration fees',
    content:
      'A Management Expense Ratio (MER) is an annual percentage that summarizes ongoing costs embedded in a mutual fund, so those costs reduce the return shown by the fund rather than arriving as a separate monthly account bill. Management fees support managing and operating a fund; an administration fee is another fund cost, and Tangerine lists management and administration fees for its Investment Funds. For a simplified example, a 1% annual cost on an unchanged $1,000 balance is about $10 for a year; actual balances and costs vary. A $0 monthly fee on a Savings or Chequing Account does not mean an Investment Fund has no embedded costs.',
    publisher: T,
    pageTitle: 'What does Total Cost Reporting mean for my investments?',
    url: 'https://www.tangerine.ca/en/thejuice/invest/total-cost-reporting-explained',
    resources: [
      { label: 'Management fee vs. MER', url: 'https://www.tangerine.ca/en/thejuice/invest/management-fee-vs-mer' },
      { label: 'Tangerine Investment Funds and fees', url: 'https://www.tangerine.ca/en/personal/invest/mutual-funds' },
      { label: 'Tangerine Savings Account', url: 'https://www.tangerine.ca/en/personal/save/savings-account' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['The $1,000 example is simplified and illustrative; fund expenses and account fees vary by product and can change.'],
    openQuestions: ['Check the current fund documents for the specific fees and total costs of a fund.'],
    keywords: ['mer', 'management expense ratio', 'management fee', 'administration fee', 'admin fee', 'fund fees', 'investment costs', 'account fee', 'fees'],
  },
  {
    id: 'tng-edu-fixed-vs-variable',
    topic: 'Fixed and variable interest rates',
    content:
      'A fixed rate stays set for its agreed term, which can make interest more predictable; a variable rate can move as market or benchmark rates change. Tangerine describes its GIC rates as fixed for the chosen term, its Savings Account rate as subject to change, and its closed mortgages as available with fixed or variable rates. For example, a hypothetical $1,000 fixed-rate GIC keeps its agreed rate during its term, while a savings rate may change; a mortgage’s exact payment effects depend on its contract. Compare the rate, term, access and product conditions rather than treating one rate type as universally better.',
    publisher: T,
    pageTitle: 'What the Bank of Canada’s interest rate changes mean for your money',
    url: 'https://www.tangerine.ca/en/thejuice/borrow/what-the-bank-of-canada-s-interest-rate-changes-mean-for-your-money',
    resources: [
      { label: 'Tangerine Mortgages', url: 'https://www.tangerine.ca/en/personal/borrow/mortgage' },
      { label: 'Tangerine GICs', url: 'https://www.tangerine.ca/en/personal/invest/guaranteed-investments' },
      { label: 'Tangerine Savings Account', url: 'https://www.tangerine.ca/en/personal/save/savings-account' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['The $1,000 example is hypothetical; rates, terms and mortgage payment behaviour depend on the current product agreement.'],
    openQuestions: ['Current posted rates and individualized mortgage terms must be checked with Tangerine.'],
    keywords: ['fixed vs variable', 'fixed rate', 'variable rate', 'interest rate changes', 'mortgage rate', 'gic rate', 'savings rate'],
  },
  {
    id: 'tng-edu-credit-basics',
    topic: 'Credit-card fees, rewards and payments',
    content:
      'An annual fee is the yearly charge for a card; cash back or Scene+ points are rewards earned under that card’s terms; and the purchase interest rate is the rate used when purchase balances are not paid as required. Tangerine’s Money-Back card page explains that new purchases can avoid interest when the full statement balance is paid by the due date, while cash advances do not receive that grace period. The statement balance is the full amount shown for that billing period; the minimum payment is the smaller required amount shown on the statement, and paying only that amount can leave a balance that accrues interest. For example, if a statement shows $100 due and only the lower minimum is paid, the remaining balance is still owed.',
    publisher: T,
    pageTitle: 'Money-Back Credit Card: Fees & Interest',
    url: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
    resources: [
      { label: 'Tangerine Help Centre', url: 'https://www.tangerine.ca/en/help-centre' },
      { label: 'Tangerine credit-card education', url: 'https://www.tangerine.ca/en/thejuice/spend/how-to-maximize-cash-back-credit-card' },
      { label: 'Tangerine Rewards World Elite Mastercard', url: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-elite-mastercard' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['The $100 example is illustrative. Paying less than the full statement balance may lead to interest under the card agreement.'],
    openQuestions: ['Minimum-payment formulas, due dates and current rates are specific to the card agreement and statement; check the current disclosure.'],
    keywords: ['annual fee', 'cash back', 'cashback', 'scene+', 'purchase interest', 'grace period', 'statement balance', 'minimum payment', 'credit card interest', 'credit card payment'],
  },
  {
    id: 'tng-edu-emergency-fund',
    topic: 'Emergency funds and accessible savings',
    content:
      'An emergency fund is money set aside for unexpected costs such as repairs, urgent travel or an interruption in income. Keeping it somewhere accessible can help avoid relying on debt or needing to sell or withdraw a longer-term investment at the wrong time. Tangerine’s education describes using a separate, easy-to-access Savings Account to track emergency money apart from day-to-day chequing. For example, setting aside $100 for an unexpected repair makes it easier to see what is reserved instead of mixing it with everyday spending.',
    publisher: T,
    pageTitle: 'How to build an emergency fund',
    url: 'https://www.tangerine.ca/en/thejuice/save/how-to-build-an-emergency-fund-during-a-time-of-high-inflation',
    resources: [
      { label: 'Tangerine Savings Account', url: 'https://www.tangerine.ca/en/personal/save/savings-account' },
      { label: 'Chequing vs. savings accounts', url: 'https://www.tangerine.ca/en/thejuice/save/chequing-vs-savings-accounts-your-questions-answered' },
    ],
    reviewed: REVIEW_DATE_EDUCATION,
    kind: 'tangerine',
    conditions: ['An emergency fund is an individual choice; no single target amount fits everyone.'],
    openQuestions: ['The education article’s suggested savings targets are general guidelines, not a personalized requirement.'],
    keywords: ['emergency fund', 'emergency savings', 'rainy day', 'unexpected expense', 'liquid', 'accessible savings', 'separate account', 'chequing'],
  },
];

const catalogueKnowledge: KnowledgeEntry[] = [
  ...TANGERINE_CATALOGUE.filter((product) => product.category !== 'credit-card' && product.id !== 'fhsa-status').map((product) => ({
    id: product.sourceId,
    topic: product.name,
    content: [
      product.summary,
      `Common situations where customers may explore it: ${product.customerFit.join(' ')}`,
      `Eligibility: ${product.eligibility.join(' ')}`,
      `Rates: ${product.rates.map((rate) => `${rate.label}: ${rate.value ?? 'check current official rates'}. ${rate.notes}`).join(' ')}`,
    ].join('\n'),
    publisher: 'Tangerine',
    pageTitle: product.name,
    url: product.sourceUrl,
    reviewed: CATALOGUE_REVIEWED_ON,
    kind: 'tangerine' as const,
    conditions: [
      ...product.fees.map((fee) => `Fee: ${fee}`),
      ...product.limitations.map((limitation) => `Limitation: ${limitation}`),
    ],
    openQuestions: product.openQuestions,
    keywords: product.keywords,
  })),
  ...TANGERINE_OFFERS.filter((offer) => offerIsCurrentAsOf(offer, new Date().toISOString().slice(0, 10))).map((offer) => ({
    id: offer.sourceId,
    topic: offer.name,
    content: `${offer.summary}\nEligibility: ${offer.eligibility.join(' ')}\nOffer conditions: ${offer.conditions.join(' ')}\nValidity: ${offer.startsOn ?? 'start date not stated'} to ${offer.endsOn ?? 'end date not stated'}; verified on ${CATALOGUE_REVIEWED_ON}.`,
    publisher: 'Tangerine',
    pageTitle: offer.name,
    url: offer.sourceUrl,
    reviewed: CATALOGUE_REVIEWED_ON,
    kind: 'tangerine' as const,
    conditions: offer.conditions,
    openQuestions: offer.endsOn ? ['Offers can be changed or withdrawn; verify the terms and eligibility before quoting.'] : ['No end date was stated in the reviewed source; verify that this offer is still available before quoting.'],
    keywords: [...offer.keywords, 'tangerine', 'eligibility', 'current offer'],
  })),
  ...CATALOGUE_REFERENCE_SOURCES.map((source) => ({
    id: source.id,
    topic: source.title,
    content: `Official reference for current ${source.title.toLowerCase()}. Check this page for the latest rates, fees or legal terms; values and conditions may change.`,
    publisher: source.publisher,
    pageTitle: source.title,
    url: source.url,
    reviewed: source.reviewed,
    kind: source.kind,
    conditions: [],
    openQuestions: [],
    keywords: source.keywords,
  })),
];

export const KNOWLEDGE: KnowledgeEntry[] = [...BASE_KNOWLEDGE, ...catalogueKnowledge];

const BY_ID = new Map(KNOWLEDGE.map((e) => [e.id, e]));

export function getEntry(id: string): KnowledgeEntry | undefined {
  return BY_ID.get(id);
}

/** Keep only ids that exist in the knowledge base, de-duplicated, in order. */
export function validateSourceIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) if (typeof id === 'string' && BY_ID.has(id) && !out.includes(id)) out.push(id);
  return out.slice(0, 4);
}

/** Rank Tangerine entries first; government guidance is included only by request. */
export function retrieve(query: string, k = 6, always: string[] = [], includeGovernment = false): KnowledgeEntry[] {
  const q = ` ${query.toLowerCase().replace(/[^a-z0-9%$ ]+/g, ' ')} `;
  const scored = KNOWLEDGE.filter((e) => includeGovernment || e.kind !== 'government').map((e) => {
    let score = 0;
    for (const kw of e.keywords) if (q.includes(` ${kw}`) || q.includes(kw)) score += kw.includes(' ') ? 3 : 2;
    for (const w of e.topic.toLowerCase().split(/\W+/)) if (w.length > 3 && q.includes(` ${w}`)) score += 1;
    if (always.includes(e.id)) score += 100;
    if (score > 0 && e.kind === 'tangerine') score += 2;
    return { e, score };
  });
  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.e);
  if (!includeGovernment) return ranked.slice(0, k);

  const tangerine = ranked.filter((entry) => entry.kind === 'tangerine');
  const government = ranked.filter((entry) => entry.kind === 'government');
  if (k <= 1) return (tangerine.length ? tangerine : government).slice(0, k);
  const governmentSlots = Math.min(government.length, Math.max(1, Math.floor(k / 3)));
  return [
    ...tangerine.slice(0, k - governmentSlots),
    ...government.slice(0, governmentSlots),
  ];
}
