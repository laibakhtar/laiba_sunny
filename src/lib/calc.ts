/**
 * Pure, deterministic savings arithmetic. No UI text, no React.
 *
 * All results are illustrative: they exclude interest, investment returns,
 * fees, taxes and changes in circumstances.
 */

export const MAX_MONTHS = 360;
export const MAX_AMOUNT = 10_000_000;

export interface ScenarioInput {
  /** Customer-confirmed savings already set aside for the home goal. */
  startingSavings: number;
  /** Customer's self-selected savings target. */
  target: number;
  /** Monthly amount the customer wants to explore. */
  monthly: number;
  /** Time horizon in whole months. */
  months: number;
}

export type ScenarioField = keyof ScenarioInput;

export interface ScenarioResult {
  valid: boolean;
  errors: Partial<Record<ScenarioField, string>>;
  /** Target minus starting savings, never negative. */
  gap: number;
  /** startingSavings + monthly * months. */
  projectedTotal: number;
  /** Shortfall at the end of the horizon, never negative. */
  remainingGap: number;
  /** Amount projected above the target, never negative. */
  amountAboveTarget: number;
  targetAlreadyReached: boolean;
  reachesTargetInHorizon: boolean;
  /** Whole-dollar monthly amount that would close the gap within the horizon; null when not applicable. */
  requiredMonthly: number | null;
  /** Months needed at the explored monthly amount; null when monthly is 0 or target already reached. */
  monthsToTarget: number | null;
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT;
}

export function isValidMonths(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_MONTHS;
}

export function validateScenario(input: ScenarioInput): Partial<Record<ScenarioField, string>> {
  const errors: Partial<Record<ScenarioField, string>> = {};
  if (!isValidAmount(input.startingSavings)) errors.startingSavings = 'Enter an amount of $0 or more.';
  if (!isValidAmount(input.target) || input.target <= 0) errors.target = 'Enter a target greater than $0.';
  if (!isValidAmount(input.monthly)) errors.monthly = 'Enter an amount of $0 or more.';
  if (!isValidMonths(input.months)) errors.months = `Enter a whole number of months between 1 and ${MAX_MONTHS}.`;
  return errors;
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

export function calculateScenario(input: ScenarioInput): ScenarioResult {
  const errors = validateScenario(input);
  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors,
      gap: 0,
      projectedTotal: 0,
      remainingGap: 0,
      amountAboveTarget: 0,
      targetAlreadyReached: false,
      reachesTargetInHorizon: false,
      requiredMonthly: null,
      monthsToTarget: null,
    };
  }

  const { startingSavings, target, monthly, months } = input;
  const gap = roundCents(Math.max(0, target - startingSavings));
  const projectedTotal = roundCents(startingSavings + monthly * months);
  const remainingGap = roundCents(Math.max(0, target - projectedTotal));
  const amountAboveTarget = roundCents(Math.max(0, projectedTotal - target));
  const targetAlreadyReached = gap === 0;

  return {
    valid: true,
    errors,
    gap,
    projectedTotal,
    remainingGap,
    amountAboveTarget,
    targetAlreadyReached,
    reachesTargetInHorizon: remainingGap === 0,
    requiredMonthly: targetAlreadyReached ? null : Math.ceil(gap / months),
    monthsToTarget: targetAlreadyReached || monthly <= 0 ? null : Math.ceil(gap / monthly),
  };
}

export type TimelineBand = 'underOne' | 'oneToFive' | 'overFive';

export function bandForMonths(months: number): TimelineBand {
  if (months <= 12) return 'underOne';
  if (months <= 60) return 'oneToFive';
  return 'overFive';
}

/** Monthly take-home minus expenses and other commitments; null when cash flow is unavailable. */
export function monthlyCashFlow(income: number | null, expenses: number | null, otherCommitments = 0): number | null {
  if (!isValidAmount(income) || income <= 0 || !isValidAmount(expenses)) return null;
  return income - expenses - (isValidAmount(otherCommitments) ? otherCommitments : 0);
}

/** How much of a savings balance remains for the home goal after keeping a reserve aside. */
export function homeSavingsAfterReserve(savingsBalance: number, reserve: number): number {
  if (!isValidAmount(savingsBalance)) return 0;
  const r = isValidAmount(reserve) ? reserve : 0;
  return Math.max(0, savingsBalance - r);
}

/** Parse loose customer amount input like "$1,200", "1.5k", "700". Returns null if unparseable. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/[$,\s]/g, '').replace(/cad$/, '');
  if (cleaned === '') return null;
  const match = /^(\d+(?:\.\d+)?)(k)?$/.exec(cleaned);
  if (!match) return null;
  const value = parseFloat(match[1]) * (match[2] ? 1000 : 1);
  return isValidAmount(value) ? roundCents(value) : null;
}

export interface ProjectionInput {
  start: number;
  monthly: number;
  months: number;
  /** Optional self-selected target. */
  target: number | null;
}

export interface ProjectionResult {
  valid: boolean;
  errors: Partial<Record<keyof ProjectionInput, string>>;
  contributions: number;
  total: number;
  /** Shortfall vs. target at the end (null without a target). */
  gapAtEnd: number | null;
  aboveTarget: number | null;
  /** Monthly amount that would reach the target in the period (null without a target or if already reached). */
  requiredMonthly: number | null;
}

/**
 * Illustrative arithmetic for a general goal: starting amount plus equal monthly
 * contributions. Deliberately excludes interest and investment returns: the
 * prototype does not forecast returns.
 */
export function projectWithoutReturns(input: ProjectionInput): ProjectionResult {
  const errors: ProjectionResult['errors'] = {};
  if (!isValidAmount(input.start)) errors.start = 'Enter an amount of $0 or more.';
  if (!isValidAmount(input.monthly)) errors.monthly = 'Enter an amount of $0 or more.';
  if (!isValidMonths(input.months)) errors.months = `Enter a whole number of months between 1 and ${MAX_MONTHS}.`;
  if (input.target !== null && (!isValidAmount(input.target) || input.target <= 0)) errors.target = 'Enter a target greater than $0, or leave it blank.';
  if (Object.keys(errors).length) {
    return { valid: false, errors, contributions: 0, total: 0, gapAtEnd: null, aboveTarget: null, requiredMonthly: null };
  }
  const contributions = roundCents(input.monthly * input.months);
  const total = roundCents(input.start + contributions);
  if (input.target === null) return { valid: true, errors, contributions, total, gapAtEnd: null, aboveTarget: null, requiredMonthly: null };
  const gapToday = Math.max(0, input.target - input.start);
  return {
    valid: true,
    errors,
    contributions,
    total,
    gapAtEnd: roundCents(Math.max(0, input.target - total)),
    aboveTarget: roundCents(Math.max(0, total - input.target)),
    requiredMonthly: gapToday === 0 ? null : Math.ceil(gapToday / input.months),
  };
}

export const MAX_WEALTH_YEARS = 40;
export const DEFAULT_WEALTH_YEARS = 5;

export interface WealthComparisonInput {
  startingAmount: number;
  monthlyContribution: number;
  years: number;
  /** Editable illustrative annual TFSA Savings rate in percentage points. */
  tfsaSavingsRate?: number;
  /** Annual rate in percentage points; e.g. 5 means 5%. */
  customRate?: number | null;
}

export type WealthOptionId = 'contributionsOnly' | 'savingsAccount' | 'tfsaSavings' | 'gicBenchmark' | 'illustrativeFund';

export interface WealthOptionSummary {
  id: WealthOptionId;
  label: string;
  annualRate: number;
  rateDescription: string;
  endingBalance: number;
  totalGrowth: number;
  tradeOff: string;
}

export interface WealthYearlyBreakdown {
  year: number;
  /** Cumulative starting amount plus monthly contributions through this year. */
  contributions: number;
  contributionsOnly: number;
  savingsAccount: number;
  tfsaSavings: number;
  gicBenchmark: number;
  illustrativeFund: number | null;
}

export interface WealthComparisonResult {
  valid: boolean;
  errors: Partial<Record<keyof WealthComparisonInput, string>>;
  startingAmount: number;
  monthlyContribution: number;
  years: number;
  tfsaSavingsRate: number;
  customRate: number | null;
  totalContributions: number;
  options: WealthOptionSummary[];
  yearlyBreakdown: WealthYearlyBreakdown[];
}

/**
 * Deterministic comparison model. Savings and illustrative fund balances
 * compound monthly with end-of-month contributions. The fund rate is an
 * effective annual return converted to an equivalent monthly rate. The GIC benchmark
 * compounds annually; monthly contributions are pooled and added at each
 * year-end, and horizons beyond five years assume renewal at the same rate.
 * These assumptions are illustrations, not rate quotes or forecasts.
 */
export function projectWealthComparison(input: WealthComparisonInput): WealthComparisonResult {
  const customRate = input.customRate ?? null;
  const tfsaSavingsRate = input.tfsaSavingsRate ?? 0.3;
  const errors: WealthComparisonResult['errors'] = {};
  if (!isValidAmount(input.startingAmount)) errors.startingAmount = 'Enter a starting amount between $0 and $10,000,000.';
  if (!isValidAmount(input.monthlyContribution)) errors.monthlyContribution = 'Enter a monthly contribution between $0 and $10,000,000.';
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > MAX_WEALTH_YEARS) {
    errors.years = `Enter a whole number of years from 1 to ${MAX_WEALTH_YEARS}.`;
  }
  if (customRate !== null && (!Number.isFinite(customRate) || customRate < -99.99 || customRate > 100)) {
    errors.customRate = 'Enter an illustrative annual rate from -99.99% to 100%.';
  }
  if (!Number.isFinite(tfsaSavingsRate) || tfsaSavingsRate < 0 || tfsaSavingsRate > 100) {
    errors.tfsaSavingsRate = 'Enter a TFSA Savings annual-rate assumption from 0% to 100%.';
  }

  const resultBase = {
    startingAmount: input.startingAmount,
    monthlyContribution: input.monthlyContribution,
    years: input.years,
    tfsaSavingsRate,
    customRate,
    totalContributions: 0,
    options: [],
    yearlyBreakdown: [],
  };
  if (Object.keys(errors).length > 0) return { valid: false, errors, ...resultBase };

  const savingsRate = 0.3;
  const gicRate = input.years === 1 ? 3.6 : input.years === 3 ? 3.95 : 4.05;
  const monthlyRate = (annualRate: number) => annualRate / 100 / 12;
  let contributionsOnly = input.startingAmount;
  let savingsBalance = input.startingAmount;
  let tfsaSavingsBalance = input.startingAmount;
  let gicBalance = input.startingAmount;
  let gicPendingContributions = 0;
  let illustrativeBalance = input.startingAmount;
  const yearlyBreakdown: WealthYearlyBreakdown[] = [{
    year: 0,
    contributions: roundCents(input.startingAmount),
    contributionsOnly: roundCents(contributionsOnly),
    savingsAccount: roundCents(savingsBalance),
    tfsaSavings: roundCents(tfsaSavingsBalance),
    gicBenchmark: roundCents(gicBalance),
    illustrativeFund: customRate === null ? null : roundCents(illustrativeBalance),
  }];

  for (let month = 1; month <= input.years * 12; month += 1) {
    contributionsOnly += input.monthlyContribution;
    savingsBalance = savingsBalance * (1 + monthlyRate(savingsRate)) + input.monthlyContribution;
    tfsaSavingsBalance = tfsaSavingsBalance * (1 + monthlyRate(tfsaSavingsRate)) + input.monthlyContribution;
    if (customRate !== null) illustrativeBalance = illustrativeBalance * (1 + Math.expm1(Math.log1p(customRate / 100) / 12)) + input.monthlyContribution;
    gicPendingContributions += input.monthlyContribution;

    if (month % 12 === 0) {
      gicBalance = gicBalance * (1 + gicRate / 100) + gicPendingContributions;
      gicPendingContributions = 0;
      const year = month / 12;
      yearlyBreakdown.push({
        year,
        contributions: roundCents(input.startingAmount + input.monthlyContribution * month),
        contributionsOnly: roundCents(contributionsOnly),
        savingsAccount: roundCents(savingsBalance),
        tfsaSavings: roundCents(tfsaSavingsBalance),
        gicBenchmark: roundCents(gicBalance),
        illustrativeFund: customRate === null ? null : roundCents(illustrativeBalance),
      });
    }
  }

  const totalContributions = roundCents(input.startingAmount + input.monthlyContribution * input.years * 12);
  const ending = yearlyBreakdown.at(-1)!;
  const option = (
    id: WealthOptionId,
    label: string,
    annualRate: number,
    rateDescription: string,
    endingBalance: number,
    tradeOff: string,
  ): WealthOptionSummary => ({
    id,
    label,
    annualRate,
    rateDescription,
    endingBalance,
    totalGrowth: roundCents(endingBalance - totalContributions),
    tradeOff,
  });
  const gicRateDescription = input.years === 1
    ? '1-year benchmark; fixed only for an actual GIC term'
    : input.years === 3
      ? '3-year benchmark; fixed only for an actual GIC term'
      : '5-year benchmark; fixed only for an actual GIC term';

  return {
    valid: true,
    errors,
    startingAmount: input.startingAmount,
    monthlyContribution: input.monthlyContribution,
    years: input.years,
    tfsaSavingsRate,
    customRate,
    totalContributions,
    yearlyBreakdown,
    options: [
      option('contributionsOnly', 'Contributions Only', 0, 'Baseline', ending.contributionsOnly, 'Baseline with no interest or investment returns.'),
      option('savingsAccount', 'Tangerine Savings Account', savingsRate, 'Variable base-rate assumption; can change', ending.savingsAccount, 'Accessible anytime; regular Savings interest may be taxable.'),
      option('tfsaSavings', 'Tangerine TFSA Savings Account', tfsaSavingsRate, 'Variable base-rate assumption; can change', ending.tfsaSavings, 'Accessible anytime; TFSA Savings interest is generally tax-free.'),
      option(
        'gicBenchmark',
        'Tangerine GIC Benchmark',
        gicRate,
        `${gicRate.toFixed(2)}% ${gicRateDescription}`,
        ending.gicBenchmark,
        `Fixed-rate benchmark, locked until maturity; contributions are pooled at year-end${input.years > 5 ? ` and renewal beyond five years assumes the same ${gicRate.toFixed(2)}% rate` : ''}.`,
      ),
      ...(customRate === null ? [] : [option(
        'illustrativeFund',
        'Illustrative Investment Fund / Custom Rate',
        customRate,
        'Hypothetical effective annual return assumed after fees',
        ending.illustrativeFund!,
        'Illustrative and not guaranteed; fund values fluctuate. No additional fees are deducted.',
      )]),
    ],
  };
}

export type MortgageMode = 'payment' | 'affordability';
export type MortgagePaymentFrequency = 'monthly' | 'biweekly';

export interface MortgageScenarioInput {
  mode: MortgageMode;
  homePrice?: number;
  mortgageAmount?: number;
  downPayment?: number;
  annualIncome?: number;
  monthlyDebts?: number;
  /** Annual nominal rate in percentage points, e.g. 4.79 means 4.79%. */
  annualRate?: number;
  amortizationYears?: number;
  paymentFrequency?: MortgagePaymentFrequency;
}

export interface MortgageScenarioResult {
  valid: boolean;
  errors: Partial<Record<keyof MortgageScenarioInput, string>>;
  mode: MortgageMode;
  homePrice: number;
  mortgageAmount: number;
  downPayment: number;
  annualIncome: number;
  monthlyDebts: number;
  annualRate: number;
  amortizationYears: number;
  paymentFrequency: MortgagePaymentFrequency;
  regularPayment: number;
  monthlyPayment: number;
  termYears: 5;
  totalPaymentsInTerm: number;
  principalPaidInTerm: number;
  interestPaidInTerm: number;
  gdsMonthlyLimit: number;
  tdsMonthlyLimit: number;
  monthlyHousingPaymentLimit: number;
  maxMortgageAmount: number;
  maxPurchasePrice: number;
}

const DEFAULT_MORTGAGE_RATE = 4.79;
const DEFAULT_AMORTIZATION_YEARS = 25;

function mortgagePaymentFactor(annualRate: number, paymentsPerYear: number, amortizationYears: number): number {
  const periodicRate = (1 + annualRate / 200) ** (2 / paymentsPerYear) - 1;
  const periods = paymentsPerYear * amortizationYears;
  if (periodicRate === 0) return 1 / periods;
  return periodicRate / (1 - (1 + periodicRate) ** -periods);
}

/**
 * Illustrative Canadian mortgage arithmetic using nominal rates compounded
 * semi-annually. Affordability uses 39% GDS / 44% TDS without property-tax,
 * heating, or condo-fee inputs; it is not a lender qualification result.
 */
export function calculateMortgageScenario(input: MortgageScenarioInput): MortgageScenarioResult {
  const mode: MortgageMode = input.mode === 'affordability' ? 'affordability' : 'payment';
  const annualRate = input.annualRate ?? DEFAULT_MORTGAGE_RATE;
  const amortizationYears = input.amortizationYears ?? DEFAULT_AMORTIZATION_YEARS;
  const paymentFrequency = input.paymentFrequency ?? 'monthly';
  const paymentsPerYear = paymentFrequency === 'biweekly' ? 26 : 12;
  const downPayment = input.downPayment ?? 0;
  const annualIncome = input.annualIncome ?? 0;
  const monthlyDebts = input.monthlyDebts ?? 0;
  const derivedMortgageAmount = Math.max(0, (input.homePrice ?? 0) - downPayment);
  const mortgageAmount = input.mortgageAmount ?? derivedMortgageAmount;
  const homePrice = input.homePrice ?? mortgageAmount + downPayment;
  const errors: MortgageScenarioResult['errors'] = {};

  if (input.mode !== 'payment' && input.mode !== 'affordability') errors.mode = 'Choose payment or affordability mode.';
  if (!isValidAmount(homePrice)) errors.homePrice = 'Enter a home price from $0 to $10,000,000.';
  if (!isValidAmount(mortgageAmount)) errors.mortgageAmount = 'Enter a mortgage amount from $0 to $10,000,000.';
  if (
    mode === 'payment' &&
    input.homePrice !== undefined &&
    input.mortgageAmount !== undefined &&
    Math.abs(mortgageAmount - derivedMortgageAmount) > 0.01
  ) {
    errors.mortgageAmount = 'The mortgage amount must equal the home price minus the down payment.';
  }
  if (!isValidAmount(downPayment) || (mode === 'payment' && downPayment > homePrice)) {
    errors.downPayment = mode === 'payment'
      ? 'Enter a down payment between $0 and the home price.'
      : 'Enter a down payment from $0 to $10,000,000.';
  }
  if (!isValidAmount(annualIncome)) errors.annualIncome = 'Enter annual income from $0 to $10,000,000.';
  if (!isValidAmount(monthlyDebts)) errors.monthlyDebts = 'Enter monthly debts from $0 to $10,000,000.';
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) errors.annualRate = 'Enter an annual rate from 0% to 100%.';
  if (!Number.isInteger(amortizationYears) || amortizationYears < 1 || amortizationYears > 40) errors.amortizationYears = 'Enter an amortization from 1 to 40 whole years.';
  if (paymentFrequency !== 'monthly' && paymentFrequency !== 'biweekly') errors.paymentFrequency = 'Choose monthly or biweekly payments.';

  const result = {
    mode,
    homePrice,
    mortgageAmount,
    downPayment,
    annualIncome,
    monthlyDebts,
    annualRate,
    amortizationYears,
    paymentFrequency,
    regularPayment: 0,
    monthlyPayment: 0,
    termYears: 5 as const,
    totalPaymentsInTerm: 0,
    principalPaidInTerm: 0,
    interestPaidInTerm: 0,
    gdsMonthlyLimit: 0,
    tdsMonthlyLimit: 0,
    monthlyHousingPaymentLimit: 0,
    maxMortgageAmount: 0,
    maxPurchasePrice: 0,
  };
  if (Object.keys(errors).length) return { valid: false, errors, ...result };

  const paymentFactor = mortgagePaymentFactor(annualRate, paymentsPerYear, amortizationYears);
  const regularPayment = roundCents(mortgageAmount * paymentFactor);
  const monthlyPayment = roundCents(regularPayment * paymentsPerYear / 12);
  const periodicRate = (1 + annualRate / 200) ** (2 / paymentsPerYear) - 1;
  const termPeriods = Math.min(5 * paymentsPerYear, amortizationYears * paymentsPerYear);
  let remainingBalance = mortgageAmount;
  let totalPaymentsInTerm = 0;
  let interestPaidInTerm = 0;
  for (let period = 0; period < termPeriods && remainingBalance > 0; period += 1) {
    const interest = remainingBalance * periodicRate;
    const payment = Math.min(regularPayment, remainingBalance + interest);
    const principal = Math.min(remainingBalance, Math.max(0, payment - interest));
    totalPaymentsInTerm += payment;
    interestPaidInTerm += payment - principal;
    remainingBalance = Math.max(0, remainingBalance - principal);
  }
  const principalPaidInTerm = roundCents(mortgageAmount - remainingBalance);
  const gdsMonthlyLimit = roundCents(annualIncome * 0.39 / 12);
  const tdsMonthlyLimit = roundCents(Math.max(0, annualIncome * 0.44 / 12 - monthlyDebts));
  const monthlyHousingPaymentLimit = Math.min(gdsMonthlyLimit, tdsMonthlyLimit);
  const maxMortgageAmount = roundCents(monthlyHousingPaymentLimit / mortgagePaymentFactor(annualRate, 12, amortizationYears));
  const maxPurchasePrice = roundCents(maxMortgageAmount + downPayment);
  const affordabilityPayment = mode === 'affordability' ? monthlyHousingPaymentLimit : monthlyPayment;

  return {
    valid: true,
    errors,
    ...result,
    regularPayment,
    monthlyPayment: affordabilityPayment,
    totalPaymentsInTerm: roundCents(totalPaymentsInTerm),
    principalPaidInTerm,
    interestPaidInTerm: roundCents(interestPaidInTerm),
    gdsMonthlyLimit,
    tdsMonthlyLimit,
    monthlyHousingPaymentLimit,
    maxMortgageAmount,
    maxPurchasePrice,
  };
}
