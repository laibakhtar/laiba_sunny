/**
 * Curated Tangerine personal-product catalogue. Rates and offers are volatile;
 * numeric values are stored only when they were visible in official sources on
 * the review date. The catalogue is descriptive, not a suitability engine.
 */

export const CATALOGUE_REVIEWED_ON = '2026-11-09';

export interface CatalogueSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  kind: 'tangerine' | 'general';
  reviewed: string;
  keywords: string[];
}

export interface CatalogueRate {
  label: string;
  type: 'variable' | 'fixed-by-term' | 'prime-plus' | 'apr' | 'management-fee' | 'not-applicable';
  /** Null means Tangerine's current value must be checked at the linked rate page. */
  value: string | null;
  notes: string;
}

export interface CatalogueProduct {
  id: string;
  sourceId: string;
  sourceUrl: string;
  name: string;
  category: 'banking' | 'savings' | 'registered' | 'investment' | 'credit-card' | 'borrowing';
  availability: 'available' | 'unconfirmed' | 'unavailable';
  summary: string;
  customerFit: string[];
  eligibility: string[];
  rates: CatalogueRate[];
  fees: string[];
  limitations: string[];
  relatedSourceIds: string[];
  openQuestions: string[];
  keywords: string[];
}

const TANGERINE = 'Tangerine';
const REVIEWED = CATALOGUE_REVIEWED_ON;

export const CATALOGUE_REFERENCE_SOURCES: CatalogueSource[] = [
  {
    id: 'tng-live-rates',
    title: 'Current Tangerine Rates',
    url: 'https://www.tangerine.ca/en/rates',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['rate', 'rates', 'interest rate', 'prime rate', 'savings rate', 'gic rate', 'mortgage rate', 'heloc rate'],
  },
  {
    id: 'tng-fee-schedule',
    title: 'Bank Fee Schedule',
    url: 'https://www.tangerine.ca/en/legal/fee-schedule/bank-fee-schedule',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['fee', 'fees', 'fee schedule', 'atm fee', 'transfer fee', 'overdraft fee', 'account fee'],
  },
  {
    id: 'tng-account-terms',
    title: 'Account Terms',
    url: 'https://www.tangerine.ca/en/legal/account-terms',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['account terms', 'account agreement', 'opening an account', 'account eligibility'],
  },
  {
    id: 'tng-credit-card-terms',
    title: 'Credit Card Cardholder Agreement',
    url: 'https://www.tangerine.ca/en/legal/credit-card-cardholder-agreement',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['credit card', 'cardholder agreement', 'apr', 'cash advance', 'card fees'],
  },
  {
    id: 'tng-line-of-credit-terms',
    title: 'Line of Credit Account Agreement',
    url: 'https://www.tangerine.ca/en/legal/line-of-credit',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['line of credit', 'prime rate', 'credit agreement', 'credit line'],
  },
  {
    id: 'tng-ai-information',
    title: 'Official Information about Tangerine for AI Systems',
    url: 'https://www.tangerine.ca/en/ai-information',
    publisher: TANGERINE,
    kind: 'tangerine',
    reviewed: REVIEWED,
    keywords: ['fhsa availability', 'tangerine fhsa', 'about tangerine', 'tangerine products'],
  },
];

export const TANGERINE_CATALOGUE: CatalogueProduct[] = [
  {
    id: 'chequing',
    sourceId: 'tng-catalogue-chequing',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/chequing-account',
    name: 'Tangerine Chequing Account',
    category: 'banking',
    availability: 'available',
    summary: 'Everyday banking account with a Visa Debit card and interest on the balance.',
    customerFit: [
      'Useful to explore for day-to-day purchases, bill payments, payroll deposits and transfers.',
      'Compare ATM access and transaction needs with the published fee schedule.',
    ],
    eligibility: ['The public product summary does not give complete account-opening criteria; identity verification and account terms apply.'],
    rates: [{ label: 'Chequing interest rate', type: 'variable', value: null, notes: 'Check the live rate page; the rate can change.' }],
    fees: [
      'No monthly fee or minimum balance.',
      'Interac e-Transfers are free. Scotiabank and eligible Global ATM Alliance withdrawals are free; other Canadian ABMs cost $1.50 and other US/worldwide ABMs cost $3.',
      'Optional overdraft protection: $5 per use (up to once per month) and 19% annual interest on overdrawn balances.',
      'Foreign currency conversion fee: 2.50%. NSF fee: $10.',
    ],
    limitations: ['Overdraft interest and fees can apply. Some non-standard transactions have fees; check the current fee schedule.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms'],
    openQuestions: ['The current variable interest rate is not stored in the catalogue.'],
    keywords: ['chequing', 'checking', 'payroll', 'pay', 'direct deposit', 'everyday', 'debit', 'atm', 'overdraft', 'bank account'],
  },
  {
    id: 'savings',
    sourceId: 'tng-catalogue-savings',
    sourceUrl: 'https://www.tangerine.ca/en/personal/save/savings-account',
    name: 'Tangerine Savings Account',
    category: 'savings',
    availability: 'available',
    summary: 'A non-registered savings account with daily interest calculation and monthly interest payment.',
    customerFit: ['Useful to explore for money a customer wants to set aside while retaining access.', 'Tangerine describes savings goals and automatic savings features.'],
    eligibility: ['The public product summary does not give complete account-opening criteria; identity verification and account terms apply.'],
    rates: [{ label: 'Savings interest rate', type: 'variable', value: null, notes: 'Check the live rate page. Posted and promotional rates can change.' }],
    fees: ['No monthly fee or minimum balance.', 'Other account fees may apply; check the current fee schedule.'],
    limitations: ['Interest rates are variable and may change.', 'Promotional rates have separate eligibility, balance caps and timing; see the offer terms.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule'],
    openQuestions: ['Current posted and promotional rates must be checked on Tangerine’s live page.'],
    keywords: ['savings', 'interest', 'save', 'cash', 'emergency fund', 'goal', 'automatic savings', 'non-registered'],
  },
  {
    id: 'usd-savings',
    sourceId: 'tng-catalogue-usd-savings',
    sourceUrl: 'https://www.tangerine.ca/en/personal/save/us-dollar-savings-account',
    name: 'Tangerine US Dollar Savings Account',
    category: 'savings',
    availability: 'available',
    summary: 'A savings account denominated in US dollars.',
    customerFit: ['Useful to explore when a customer has a US-dollar savings need and wants to keep those funds in USD.'],
    eligibility: ['The public product summary does not give complete account-opening criteria; identity verification and account terms apply.'],
    rates: [{ label: 'USD savings interest rate', type: 'variable', value: null, notes: 'Check the current Tangerine rates page; rates are in USD.' }],
    fees: ['Fees are charged in the currency of the account; check the current fee schedule.'],
    limitations: ['Currency conversion can apply when moving between CAD and USD.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms'],
    openQuestions: ['Current USD rate and any transfer or currency-conversion costs depend on the transaction and must be confirmed.'],
    keywords: ['usd', 'us dollar', 'american dollars', 'currency', 'foreign exchange', 'savings'],
  },
  {
    id: 'tfsa',
    sourceId: 'tng-catalogue-tfsa',
    sourceUrl: 'https://www.tangerine.ca/en/personal/invest/tfsa',
    name: 'Tangerine TFSA',
    category: 'registered',
    availability: 'available',
    summary: 'Tangerine offers TFSA Savings, Tax-Free GIC and Tax-Free Investment Fund accounts; the TFSA is the account wrapper, not the holding itself.',
    customerFit: ['Useful to explore when a customer wants to understand tax-free account options; access and risk depend on the holding inside the TFSA.'],
    eligibility: ['CRA eligibility and contribution-room rules apply; customers are responsible for confirming their own room.', 'Tangerine account-opening terms also apply.'],
    rates: [{ label: 'Rate or return', type: 'variable', value: null, notes: 'Savings and GIC rates vary by product and term; investment-fund returns are not guaranteed. Check the linked product pages.' }],
    fees: ['Tangerine states no registered-account fees while funds remain with Tangerine; a $50 TFSA transfer-out fee is listed in the fee schedule.'],
    limitations: ['Contribution-room limits and over-contribution tax rules apply.', 'Risk, return and access depend on whether the account holds savings, a GIC or investment funds.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms', 'gov-tfsa'],
    openQuestions: ['Current rates and any promotional eligibility must be verified on the live Tangerine pages.'],
    keywords: ['tfsa', 'tax-free', 'registered savings', 'contribution room', 'tax free account'],
  },
  {
    id: 'rsp',
    sourceId: 'tng-catalogue-rsp',
    sourceUrl: 'https://www.tangerine.ca/en/personal/invest/rsp',
    name: 'Tangerine RSP (RRSP)',
    category: 'registered',
    availability: 'available',
    summary: 'Tangerine offers RSP Savings, RSP GIC and RSP Investment Fund accounts.',
    customerFit: ['Useful to explore for retirement savings education; tax effects and access depend on contributions, holdings and withdrawals.'],
    eligibility: ['CRA eligibility and contribution-room rules apply; customers are responsible for confirming their own room.', 'Tangerine account-opening terms also apply.'],
    rates: [{ label: 'Rate or return', type: 'variable', value: null, notes: 'Savings and GIC rates vary; investment-fund returns are not guaranteed. Check the live product pages.' }],
    fees: ['Tangerine states no registered-account fees while funds remain with Tangerine.', '$50 RSP transfer-out fee.'],
    limitations: ['Withdrawals are generally taxable and withholding tax may apply.', 'Contribution-room rules apply.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms', 'gov-rrsp'],
    openQuestions: ['Current rates and minimum contribution amounts are not stored in the catalogue.'],
    keywords: ['rsp', 'rrsp', 'retirement', 'registered retirement savings', 'tax deductible', 'withdrawal'],
  },
  {
    id: 'rif',
    sourceId: 'tng-catalogue-rif',
    sourceUrl: 'https://www.tangerine.ca/en/personal/invest/rif',
    name: 'Tangerine RIF (RRIF)',
    category: 'registered',
    availability: 'available',
    summary: 'Tangerine offers RIF Savings and RIF GIC options for retirement income.',
    customerFit: ['Useful to explore when a customer is learning about drawing income from registered retirement savings.'],
    eligibility: ['The public product information does not specify complete account-opening criteria; CRA rules and Tangerine account terms apply.'],
    rates: [{ label: 'Savings or GIC rate', type: 'variable', value: null, notes: 'Check the current rates page and the specific GIC term.' }],
    fees: ['A $50 RIF transfer-out fee is listed in the fee schedule.'],
    limitations: ['Minimum withdrawal and tax rules apply to registered retirement income funds; confirm current rules with the CRA.', 'GIC access depends on its term and cashability.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms'],
    openQuestions: ['Current rates, minimum withdrawal details and complete eligibility are not stored here.'],
    keywords: ['rif', 'rrif', 'retirement income', 'withdrawal', 'retirement'],
  },
  {
    id: 'gic',
    sourceId: 'tng-catalogue-gic',
    sourceUrl: 'https://www.tangerine.ca/en/personal/invest/guaranteed-investments',
    name: 'Tangerine Guaranteed Investment Certificates (GICs)',
    category: 'investment',
    availability: 'available',
    summary: 'Fixed-term GICs are available in registered and non-registered accounts, with a guaranteed rate for the selected term.',
    customerFit: ['Useful to explore when someone wants a known term and rate and can leave the money invested until maturity.'],
    eligibility: ['Account-specific requirements apply; confirm the selected GIC and registered-account eligibility with Tangerine.'],
    rates: [{ label: 'GIC rate by term and account type', type: 'fixed-by-term', value: null, notes: 'Rates change; check Tangerine’s live rates before discussing a specific return.' }],
    fees: ['Tangerine states no GIC fees or service charges; account transfer-out fees may still apply.'],
    limitations: ['Not cashable before maturity except for approved financial-hardship redemption.', 'Available terms and rates differ by account type and currency.'],
    relatedSourceIds: ['tng-live-rates', 'tng-fee-schedule', 'tng-account-terms', 'fcac-gic-rights'],
    openQuestions: ['Current GIC rates and exact terms must be checked live; an FHSA GIC is not confirmed by the product page reviewed.'],
    keywords: ['gic', 'guaranteed investment', 'term deposit', 'fixed term', 'maturity', 'cashable', 'locked in'],
  },
  {
    id: 'investment-funds',
    sourceId: 'tng-catalogue-funds',
    sourceUrl: 'https://www.tangerine.ca/en/personal/invest/mutual-funds',
    name: 'Tangerine Investment Funds',
    category: 'investment',
    availability: 'available',
    summary: 'Mutual-fund portfolios include Core, Global ETF, Socially Responsible Global portfolios and a Money Market Fund.',
    customerFit: ['Useful to explore for longer-horizon investing education when a customer understands that fund values can fall and accepts investment risk.'],
    eligibility: ['Account and fund eligibility apply; read the current prospectus and account information before investing.'],
    rates: [
      { label: 'Core Portfolio management fee', type: 'management-fee', value: '0.80%', notes: 'Plus the 0.15% fixed administration fee and other fund expenses.' },
      { label: 'Global ETF Portfolio management fee', type: 'management-fee', value: '0.50%', notes: 'Plus the 0.15% fixed administration fee and other fund expenses.' },
      { label: 'Socially Responsible Global Portfolio management fee', type: 'management-fee', value: '0.55%', notes: 'Plus the 0.15% fixed administration fee and other fund expenses.' },
    ],
    fees: ['Fixed administration fee is 0.15% of each portfolio’s value; other fund expenses also apply.'],
    limitations: ['Mutual funds are not guaranteed or CDIC-insured; their values change and investors can lose capital.', 'Minimum investment amounts and total MER figures are not specified in the reviewed summary; consult the current prospectus.'],
    relatedSourceIds: ['tng-fee-schedule', 'tng-account-terms', 'fcac-investing-basics'],
    openQuestions: ['Minimum investment and total MER for each fund require a current prospectus check.'],
    keywords: ['investment funds', 'mutual funds', 'portfolio', 'etf', 'money market', 'fees', 'risk', 'investing', 'lose money'],
  },
  {
    id: 'moneyback-card',
    sourceId: 'tng-money-back-card',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
    name: 'Tangerine Money-Back Credit Card',
    category: 'credit-card',
    availability: 'available',
    summary: 'Earn 2% Money-Back Rewards on purchases in two categories of your choice, or three when rewards are deposited into a Tangerine Savings Account, and 0.5% on all other purchases. There is no limit on total cash back earned.',
    customerFit: ['Useful to explore when comparing selected-category cash-back rewards; compare rewards with interest and fees.'],
    eligibility: ['Gross annual income of at least $12,000; Canadian residency, age of majority, no bankruptcy in the past seven years, credit check and approval requirements apply.'],
    rates: [
      { label: 'Purchase interest rate', type: 'apr', value: '20.95%', notes: 'The current official product page shows 20.95%; rates may change.' },
      { label: 'Cash-advance and standard balance-transfer interest rate', type: 'apr', value: '22.95%', notes: 'The current official product page shows 22.95%; rates and terms may change.' },
    ],
    fees: ['$0 annual fee.', 'Cash advance: $3.50 in Canada or $5 outside Canada.', 'Regular balance transfer fee: 3% or $5 minimum.', 'Foreign currency conversion: 2.50%.', 'Dishonoured payment and over-limit fees may apply.'],
    limitations: ['Cash advances and balance transfers do not earn rewards and have no interest-free grace period.', 'Rewards require the account to be in good standing; terms and merchant-category classification apply.'],
    relatedSourceIds: ['tng-credit-card-terms'],
    openQuestions: ['Rates, fees and full cardholder terms can change; confirm them on Tangerine’s live page.'],
    keywords: ['credit card', 'money back', 'cashback', 'cash back', 'rewards', 'apr', 'interest', 'card'],
  },
  {
    id: 'moneyback-world-card',
    sourceId: 'tng-money-back-world',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-credit-card',
    name: 'Tangerine Money-Back World Mastercard',
    category: 'credit-card',
    availability: 'available',
    summary: 'Earn 2% Money-Back Rewards on purchases in two categories of your choice, or three when rewards are deposited into a Tangerine Savings Account, and 0.5% on all other purchases.',
    customerFit: ['Useful to explore when comparing cash-back categories and World Mastercard benefits with the published eligibility requirements.'],
    eligibility: ['$50,000 gross personal income, $80,000 gross household income, or $250,000 in assets under management; other World Mastercard requirements and credit approval apply.'],
    rates: [
      { label: 'Purchase interest rate', type: 'apr', value: '20.95%', notes: 'Published on the current product page; rates may change.' },
      { label: 'Cash-advance interest rate', type: 'apr', value: '22.95%', notes: 'Published on the current product page; rates may change.' },
    ],
    fees: ['$0 annual fee.'],
    limitations: ['Rental Car Collision/Loss Damage Insurance, Mobile Device Insurance and complimentary Mastercard Travel Pass membership (DragonPass) are subject to certificate and program terms.', 'Rewards depend on eligible purchases and account standing; read the cardholder agreement.'],
    relatedSourceIds: ['tng-credit-card-terms'],
    openQuestions: ['The product page’s complete card interest-rate and eligibility schedule must be checked live.'],
    keywords: ['money-back world mastercard', 'world mastercard', 'cashback card', 'credit card'],
  },
  {
    id: 'rewards-world-elite',
    sourceId: 'tng-rewards-world-elite',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/credit-cards/world-elite-mastercard',
    name: 'Tangerine Rewards World Elite Mastercard',
    category: 'credit-card',
    availability: 'available',
    summary: 'Earn 1.5 Scene+ points per $1 in three selected categories and 1 point per $1 on all other purchases.',
    customerFit: ['Useful to explore when a customer wants to compare Scene+ categories, benefits, annual fee and income criteria with their expected card use.'],
    eligibility: [
      'Credit approval applies.',
      '$80,000 gross personal income, $150,000 gross household income, or $400,000 in assets under management; other World Elite requirements and credit approval apply.',
    ],
    rates: [
      { label: 'Purchase APR', type: 'apr', value: '20.95%', notes: 'Published on the current product page; rates may change.' },
      { label: 'Cash-advance APR', type: 'apr', value: '22.95%', notes: 'Published on the current product page; rates may change.' },
    ],
    fees: ['$120 annual fee.'],
    limitations: ['Four complimentary airport lounge visits per year via Mastercard Travel Pass (DragonPass), Mobile Device Insurance, Rental Car Collision/Loss Damage Insurance and Travel Medical/Trip Cancellation coverage are subject to their terms.', 'Rewards categories are subject to merchant classification and program terms; cash advances, fees, interest and other excluded transactions do not earn points.'],
    relatedSourceIds: ['tng-credit-card-terms'],
    openQuestions: ['Confirm the current purchase and cash-advance rates and complete card terms on Tangerine’s live page.'],
    keywords: ['rewards world elite', 'world elite', 'scene+', 'scene plus', 'credit card', 'annual fee', 'income requirement', 'lounge'],
  },
  {
    id: 'mortgage',
    sourceId: 'tng-catalogue-mortgage',
    sourceUrl: 'https://www.tangerine.ca/en/personal/borrow/mortgage',
    name: 'Tangerine Mortgage',
    category: 'borrowing',
    availability: 'available',
    summary: 'Mortgage options for home purchases and refinancing, with rates and terms that depend on the product and application.',
    customerFit: ['Useful to explore for a home purchase or refinance; compare payment, term, prepayment options and total borrowing costs.'],
    eligibility: ['Application, property and credit approval criteria apply; check Tangerine’s current mortgage terms.'],
    rates: [{ label: 'Mortgage rates', type: 'fixed-by-term', value: null, notes: 'Rates vary by term and can change; confirm live rates and eligibility with Tangerine.' }],
    fees: ['Applicable legal, appraisal, discharge or other transaction costs depend on the mortgage and transaction; confirm with Tangerine.'],
    limitations: ['Rates and approval are not guaranteed by this catalogue.', 'Mortgage prepayment privileges and penalties depend on the selected mortgage agreement.'],
    relatedSourceIds: ['tng-live-rates', 'tng-account-terms'],
    openQuestions: ['Current posted rates, eligible property types and exact fees need direct confirmation.'],
    keywords: ['mortgage', 'home loan', 'buy a home', 'refinance', 'renewal', 'interest rate', 'prepayment'],
  },
  {
    id: 'heloc',
    sourceId: 'tng-catalogue-heloc',
    sourceUrl: 'https://www.tangerine.ca/en/personal/borrow/home-equity-line-of-credit',
    name: 'Tangerine Home Equity Line of Credit',
    category: 'borrowing',
    availability: 'available',
    summary: 'A revolving credit product secured against eligible home equity.',
    customerFit: ['Useful to explore for a homeowner considering a planned large expense and who understands the home-secured borrowing risk and has a repayment plan.'],
    eligibility: ['Home, equity, application and credit approval criteria apply; confirm with Tangerine.'],
    rates: [{ label: 'HELOC interest rate', type: 'variable', value: null, notes: 'The site shows a dynamic rate; verify the current rate and rate structure directly.' }],
    fees: ['Confirm any legal, appraisal, setup and transaction fees with Tangerine before applying.'],
    limitations: ['Borrowing is secured by the home; failure to repay can put the home at risk.', 'Availability and credit limit are subject to approval.'],
    relatedSourceIds: ['tng-live-rates', 'tng-account-terms'],
    openQuestions: ['Exact rate structure, eligibility, available limit and fees require a current lender quote.'],
    keywords: ['heloc', 'home equity line of credit', 'home equity', 'borrow against home', 'renovation'],
  },
  {
    id: 'line-of-credit',
    sourceId: 'tng-catalogue-line-of-credit',
    sourceUrl: 'https://www.tangerine.ca/en/personal/borrow/line-of-credit',
    name: 'Tangerine Line of Credit',
    category: 'borrowing',
    availability: 'available',
    summary: 'Reusable personal credit line; the interest rate is Tangerine Prime plus an adjustment factor.',
    customerFit: ['Useful to explore when a customer is comparing flexible borrowing and has considered the interest cost and a repayment plan.'],
    eligibility: ['Application and credit approval apply; the approved limit and adjustment factor are account-specific.'],
    rates: [{ label: 'Interest rate', type: 'prime-plus', value: null, notes: 'Variable: Tangerine Prime plus an account-specific adjustment factor. Check Tangerine’s current Prime Rate and the customer’s agreement.' }],
    fees: ['Tangerine describes no annual fee. Other fees and interest are governed by the line-of-credit agreement.'],
    limitations: ['Access is subject to available credit; interest changes when Tangerine Prime changes.', 'Borrowing is not a substitute for emergency savings or a repayment plan.'],
    relatedSourceIds: ['tng-live-rates', 'tng-line-of-credit-terms'],
    openQuestions: ['The personal adjustment factor and approved limit are individual and not listed publicly.'],
    keywords: ['line of credit', 'personal loan', 'borrow', 'prime rate', 'credit line'],
  },
  {
    id: 'rsp-loan',
    sourceId: 'tng-catalogue-rsp-loan',
    sourceUrl: 'https://www.tangerine.ca/en/personal/borrow/rsp-loan',
    name: 'Tangerine RSP Loan',
    category: 'borrowing',
    availability: 'available',
    summary: 'A seasonal loan to fund an RSP contribution; the loan proceeds are placed in a Tangerine RSP Savings Account.',
    customerFit: ['Useful to explain only when a customer asks about the product; compare borrowing cost, repayment capacity and tax contribution room before deciding.'],
    eligibility: ['Tangerine says applications are available between November and March; approval criteria and rates apply.'],
    rates: [{ label: 'RSP Loan rate', type: 'variable', value: null, notes: 'The product page describes a preferred rate but does not publish a numeric value in the retrieved content; confirm current offer and loan agreement.' }],
    fees: ['Tangerine says there are no early prepayment penalties.'],
    limitations: ['Repayment term is 1–5 years.', 'Borrowing to contribute creates debt and investment risk; the customer is responsible for CRA contribution limits.'],
    relatedSourceIds: ['tng-live-rates', 'tng-account-terms', 'gov-rrsp'],
    openQuestions: ['Current preferred rate, loan amount eligibility and full fees are not listed in the reviewed product summary.'],
    keywords: ['rsp loan', 'rrsp loan', 'borrow to invest', 'retirement contribution', 'loan rate'],
  },
  {
    id: 'fhsa-status',
    sourceId: 'tng-catalogue-fhsa-status',
    sourceUrl: 'https://www.tangerine.ca/en/ai-information',
    name: 'Tangerine FHSA status',
    category: 'registered',
    availability: 'unavailable',
    summary: 'Tangerine does not currently offer a First Home Savings Account (FHSA).',
    customerFit: ['Useful as a clear availability note when a customer asks about an FHSA; Tangerine TFSA and RSP accounts are alternatives some first-home savers explore.'],
    eligibility: ['This is not a Tangerine product and cannot be opened through Tangerine.'],
    rates: [{ label: 'Tangerine FHSA rate or investment options', type: 'not-applicable', value: null, notes: 'Tangerine does not currently offer an FHSA.' }],
    fees: ['No Tangerine FHSA fees apply because Tangerine does not currently offer this account.'],
    limitations: ['Tangerine’s educational content may discuss FHSAs, but that does not mean Tangerine offers the product.'],
    relatedSourceIds: ['tng-ai-information'],
    openQuestions: ['Product availability may change; verify current offerings with Tangerine.'],
    keywords: ['fhsa', 'first home savings account', 'first home', 'home buyer', 'registered account'],
  },
];

export interface CatalogueOffer {
  id: string;
  sourceId: string;
  sourceUrl: string;
  name: string;
  summary: string;
  eligibility: string[];
  conditions: string[];
  startsOn: string | null;
  endsOn: string | null;
  status: 'active-as-checked' | 'date-window-published';
  relatedProductIds: string[];
  keywords: string[];
}

export const TANGERINE_OFFERS: CatalogueOffer[] = [
  {
    id: 'refer-a-friend',
    sourceId: 'tng-offer-referral',
    sourceUrl: 'https://www.tangerine.ca/en/offers/referral/offer-terms-and-conditions',
    name: '$50 Tangerine Refer a Friend bonus',
    summary: 'Eligible existing clients and new clients can each receive $50 when the referral and new-account conditions are met.',
    eligibility: [
      'The existing client can receive a bonus for each eligible referral, up to six per calendar year.',
      'The new client must never have had an ING DIRECT or Tangerine account and must enroll using a valid Orange Key.',
    ],
    conditions: [
      'The new client must open a first Tangerine account (credit cards excluded), deposit at least $250 within 60 days and maintain at least $250 for 60 consecutive days.',
      'The bonus is paid to a Tangerine Chequing or non-registered Savings Account; account terms and exclusions apply.',
      'This enrollment bonus cannot be combined with other Tangerine enrollment bonus offers unless stated otherwise.',
    ],
    startsOn: null,
    endsOn: null,
    status: 'active-as-checked',
    relatedProductIds: ['chequing', 'savings'],
    keywords: ['offer', 'promotion', 'promo', 'referral', 'refer a friend', 'orange key', '$50', 'new client'],
  },
  {
    id: 'new-client-savings-rate',
    sourceId: 'tng-offer-savings-rate',
    sourceUrl: 'https://www.tangerine.ca/en/offers/savings-account-promo',
    name: 'New-client Savings Account offer',
    summary: 'Tangerine’s current offers page advertises a 4.50% annualized savings rate for up to five months.',
    eligibility: ['New Tangerine clients; full account, client-number date window and registered-account criteria are in the offer terms.'],
    conditions: [
      'The published terms describe a 153-day promotional period and a $1,000,000 maximum balance for the applicable account type.',
      'The terms page retrieved on the review date displayed unresolved date and rate placeholders; verify the current offer and applicable rate before quoting or promoting it.',
      'The offer may be changed, extended or cancelled without notice.',
    ],
    startsOn: null,
    endsOn: null,
    status: 'active-as-checked',
    relatedProductIds: ['savings', 'tfsa', 'rsp'],
    keywords: ['offer', 'promotion', 'promo', 'new client', 'savings rate', '4.50%', 'boosted rate', 'bonus interest'],
  },
  {
    id: 'chequing-payroll-bonus',
    sourceId: 'tng-offer-chequing-payroll',
    sourceUrl: 'https://www.tangerine.ca/en/offers/chequing-account-promo',
    name: '$250 new-client payroll offer',
    summary: 'Tangerine advertises a $250 bonus for new clients who open a Chequing Account and move their pay to it.',
    eligibility: ['New Tangerine clients who open a Chequing Account and set up payroll deposits.'],
    conditions: ['The public offer page says payroll must be deposited for two consecutive months; check the linked page for current full terms and any unlisted application window.'],
    startsOn: null,
    endsOn: null,
    status: 'active-as-checked',
    relatedProductIds: ['chequing'],
    keywords: ['offer', 'promotion', 'promo', 'chequing', 'payroll', 'pay', 'bonus', '$250', 'new client'],
  },
  {
    id: 'moneyback-ten-percent',
    sourceId: 'tng-offer-moneyback-10',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
    name: 'Money-Back Credit Card 10% promotional bonus',
    summary: 'Eligible new Money-Back Credit Card holders can receive 10% back on eligible net purchases, up to $100.',
    eligibility: ['Apply by November 30, 2026, activate within 45 days of approval, and be a new Tangerine Credit Card Account holder.'],
    conditions: [
      'The 60-day purchase period begins when the card is activated; eligible net purchases are capped at $1,000.',
      'The account must be open and in good standing at payout; bonus is credited within 1–2 statement cycles after the period.',
      'Limit one offer per eligible client. Tangerine may change, cancel or extend the offer.',
    ],
    startsOn: null,
    endsOn: '2026-11-30',
    status: 'date-window-published',
    relatedProductIds: ['moneyback-card'],
    keywords: ['offer', 'promotion', 'promo', 'credit card', 'money back', 'cashback', '10%', '$100', 'November 30'],
  },
  {
    id: 'moneyback-world-120',
    sourceId: 'tng-offer-moneyback-world-120',
    sourceUrl: 'https://www.tangerine.ca/en/offers',
    name: '$120 Money-Back World Mastercard offer',
    summary: 'Eligible new Money-Back World Mastercard holders can earn a $120 Money-Back Rewards bonus.',
    eligibility: ['Apply by November 30, 2026, activate within 45 days of approval, and be a new eligible Money-Back World Mastercard account holder.'],
    conditions: [
      'At least $1,500 in eligible net purchases must post within 90 days after activation.',
      'The account must be open and in good standing at payout; the offer is subject to change and full card terms.',
    ],
    startsOn: null,
    endsOn: '2026-11-30',
    status: 'date-window-published',
    relatedProductIds: ['moneyback-world-card'],
    keywords: ['offer', 'promotion', 'promo', 'money-back world mastercard', 'credit card', '$120', 'cashback'],
  },
  {
    id: 'world-elite-welcome',
    sourceId: 'tng-offer-world-elite',
    sourceUrl: 'https://www.tangerine.ca/en/offers/world-elite-mastercard-offer',
    name: 'Rewards World Elite Mastercard welcome offer and annual lifestyle credit',
    summary: 'Tangerine advertises 50,000 Scene+ points ($500 stated value) for new clients spending $5,000 in the first three months, plus 10,000 points ($100 stated value) after $30,000 in annual account spend.',
    eligibility: ['New clients and card-specific credit and income criteria apply; the card page lists income thresholds.'],
    conditions: [
      'The $100 annual lifestyle credit requires $30,000 of annual spend; four lounge passes and other benefits have separate terms.',
      'The offer page lists a $120 annual fee, 20.95% purchase APR and 22.95% cash-advance APR.',
      'Offer value depends on eligible spend, card eligibility and redemption; check the live offer page for current terms.',
    ],
    startsOn: null,
    endsOn: null,
    status: 'active-as-checked',
    relatedProductIds: ['rewards-world-elite'],
    keywords: ['offer', 'promotion', 'promo', 'world elite', 'scene+', 'welcome bonus', '50,000', '$500', '$100', 'annual credit'],
  },
  {
    id: 'wealth-three-percent',
    sourceId: 'tng-offer-wealth-3-percent',
    sourceUrl: 'https://www.tangerine.ca/en/personal',
    name: 'Tangerine Wealth 3% Bonus Offer',
    summary: 'A 3% bonus on qualifying investment-fund contributions or transfers, up to $30,000 per eligible account.',
    eligibility: ['New and existing Tangerine Wealth clients with qualifying investment-fund accounts.'],
    conditions: [
      'Offer period: November 2, 2026 to March 15, 2027. At least $25,000 net investment amount is required; amounts across different account types cannot be combined to meet the threshold.',
      'Qualifying contributions/transfers must be funded by May 17, 2027 and the total portfolio amount maintained until June 21, 2027.',
      'Bonus is paid in 60 monthly instalments. Withdrawals/transfers out may reduce future payments; retaining at least $20,000 of the net investment amount is required to continue payments.',
      'The bonus is not an immediate cash discount; eligible account types and source-of-funds rules apply. Review the full official terms.',
    ],
    startsOn: '2026-11-02',
    endsOn: '2027-03-15',
    status: 'date-window-published',
    relatedProductIds: ['investment-funds'],
    keywords: ['offer', 'promotion', 'promo', 'wealth', 'investment funds', '3%', 'bonus', 'transfer', '$25,000'],
  },
  {
    id: 'shell-fuel-discount',
    sourceId: 'tng-offer-shell-fuel',
    sourceUrl: 'https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card',
    name: 'Tangerine cardholder Shell fuel discount',
    summary: 'An additional 3 cents per litre fuel discount is advertised for eligible linked Tangerine credit cards at participating Shell locations.',
    eligibility: ['Eligible Tangerine credit cardholders enrolled in the Shell Fuel Benefits Program with an eligible card linked to Shell Go+.'],
    conditions: [
      'The additional discount offer runs October 5 to December 31, 2026, in Ontario, British Columbia, Alberta, Saskatchewan, Manitoba and the Northwest Territories; Shell Flying J locations are excluded.',
      'Maximum 1,000 litres per month per eligible card. The offer may be changed or terminated without notice.',
    ],
    startsOn: '2026-10-05',
    endsOn: '2026-12-31',
    status: 'date-window-published',
    relatedProductIds: ['moneyback-card', 'moneyback-world-card', 'rewards-world-elite'],
    keywords: ['offer', 'promotion', 'promo', 'shell', 'fuel', 'gas', 'discount', 'cents per litre'],
  },
];

export const CATALOGUE_PRODUCT_BY_ID = new Map(TANGERINE_CATALOGUE.map((product) => [product.id, product]));

/** Do not surface cached offer details after they are stale or outside their published window. */
export function offerIsCurrentAsOf(offer: CatalogueOffer, asOf: string): boolean {
  const date = Date.parse(`${asOf}T00:00:00Z`);
  const reviewed = Date.parse(`${CATALOGUE_REVIEWED_ON}T00:00:00Z`);
  if (!Number.isFinite(date) || date < reviewed || date - reviewed > 7 * 24 * 60 * 60 * 1000) return false;
  if (offer.startsOn && asOf < offer.startsOn) return false;
  if (offer.endsOn && asOf > offer.endsOn) return false;
  return true;
}
