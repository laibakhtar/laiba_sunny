import { describe, expect, it } from 'vitest';
import { bandForMonths, calculateMortgageScenario, calculateScenario, homeSavingsAfterReserve, monthlyCashFlow, parseAmount, projectWealthComparison } from './calc';

describe('calculateScenario', () => {
  it('matches the default confirmed scenario for Alex', () => {
    const r = calculateScenario({ startingSavings: 14000, target: 50000, monthly: 700, months: 36 });
    expect(r.valid).toBe(true);
    expect(r.gap).toBe(36000);
    expect(r.projectedTotal).toBe(39200);
    expect(r.remainingGap).toBe(10800);
    expect(r.requiredMonthly).toBe(1000);
    expect(r.reachesTargetInHorizon).toBe(false);
    expect(r.monthsToTarget).toBe(52);
  });

  it('handles a zero monthly amount without Infinity or NaN', () => {
    const r = calculateScenario({ startingSavings: 0, target: 40000, monthly: 0, months: 60 });
    expect(r.valid).toBe(true);
    expect(r.projectedTotal).toBe(0);
    expect(r.remainingGap).toBe(40000);
    expect(r.monthsToTarget).toBeNull();
    expect(r.requiredMonthly).toBe(667);
    for (const v of [r.gap, r.projectedTotal, r.remainingGap, r.requiredMonthly]) expect(Number.isFinite(v)).toBe(true);
  });

  it('reports a target already reached with no negative gap', () => {
    const r = calculateScenario({ startingSavings: 60000, target: 50000, monthly: 500, months: 12 });
    expect(r.targetAlreadyReached).toBe(true);
    expect(r.gap).toBe(0);
    expect(r.remainingGap).toBe(0);
    expect(r.requiredMonthly).toBeNull();
    expect(r.monthsToTarget).toBeNull();
    expect(r.amountAboveTarget).toBe(16000);
  });

  it('rejects invalid inputs instead of producing misleading numbers', () => {
    expect(calculateScenario({ startingSavings: -1, target: 50000, monthly: 700, months: 36 }).valid).toBe(false);
    expect(calculateScenario({ startingSavings: 0, target: 0, monthly: 700, months: 36 }).valid).toBe(false);
    expect(calculateScenario({ startingSavings: 0, target: 50000, monthly: NaN, months: 36 }).valid).toBe(false);
    expect(calculateScenario({ startingSavings: 0, target: 50000, monthly: 700, months: 0 }).valid).toBe(false);
    expect(calculateScenario({ startingSavings: 0, target: 50000, monthly: 700, months: 2.5 }).valid).toBe(false);
    const bad = calculateScenario({ startingSavings: 0, target: 50000, monthly: Infinity, months: 36 });
    expect(bad.valid).toBe(false);
    expect(bad.errors.monthly).toBeTruthy();
  });
});

describe('helpers', () => {
  it('keeps the emergency reserve inside the savings balance (no double subtraction)', () => {
    expect(homeSavingsAfterReserve(24000, 10000)).toBe(14000);
    expect(homeSavingsAfterReserve(3000, 3000)).toBe(0);
    expect(homeSavingsAfterReserve(3000, 5000)).toBe(0);
  });

  it('computes cash flow and treats missing income as unavailable', () => {
    expect(monthlyCashFlow(4800, 3500, 0)).toBe(1300);
    expect(monthlyCashFlow(0, 3500)).toBeNull();
    expect(monthlyCashFlow(null, null)).toBeNull();
  });

  it('bands timelines', () => {
    expect(bandForMonths(9)).toBe('underOne');
    expect(bandForMonths(12)).toBe('underOne');
    expect(bandForMonths(36)).toBe('oneToFive');
    expect(bandForMonths(60)).toBe('oneToFive');
    expect(bandForMonths(72)).toBe('overFive');
  });

  it('parses loose amounts', () => {
    expect(parseAmount('$1,200')).toBe(1200);
    expect(parseAmount('1.5k')).toBe(1500);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
  });
});

describe('projectWithoutReturns', () => {
  it('adds contributions only, with an optional target', async () => {
    const { projectWithoutReturns } = await import('./calc');
    expect(projectWithoutReturns({ start: 15000, monthly: 400, months: 60, target: null })).toMatchObject({ valid: true, contributions: 24000, total: 39000, gapAtEnd: null });
    expect(projectWithoutReturns({ start: 15000, monthly: 400, months: 60, target: 50000 })).toMatchObject({ gapAtEnd: 11000, requiredMonthly: 584 });
    expect(projectWithoutReturns({ start: -1, monthly: 0, months: 0, target: 0 }).valid).toBe(false);
  });
});

describe('projectWealthComparison', () => {
  it('returns separate Savings and TFSA Savings series and leaves the fund optional', () => {
    const result = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 100, years: 1, customRate: null });
    expect(result.valid).toBe(true);
    expect(result.customRate).toBeNull();
    expect(result.tfsaSavingsRate).toBe(0.3);
    expect(result.totalContributions).toBe(2200);
    expect(result.yearlyBreakdown).toHaveLength(2);
    expect(result.yearlyBreakdown[0]).toMatchObject({
      year: 0,
      contributions: 1000,
      contributionsOnly: 1000,
      savingsAccount: 1000,
      tfsaSavings: 1000,
      gicBenchmark: 1000,
      illustrativeFund: null,
    });
    expect(result.yearlyBreakdown[1]).toMatchObject({
      year: 1,
      contributions: 2200,
      contributionsOnly: 2200,
      gicBenchmark: 2236,
    });
    expect(result.yearlyBreakdown[1].savingsAccount).toBeGreaterThan(2200);
    expect(result.yearlyBreakdown[1].tfsaSavings).toBe(result.yearlyBreakdown[1].savingsAccount);
    expect(result.options.some((option) => option.id === 'illustrativeFund')).toBe(false);
    expect(result.options.find((option) => option.id === 'gicBenchmark')).toMatchObject({
      annualRate: 3.6,
      endingBalance: 2236,
      totalGrowth: 36,
    });
  });

  it('treats an entered fund rate as an effective annual return', () => {
    const result = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 0, years: 1, customRate: 12 });
    const fund = result.options.find((option) => option.id === 'illustrativeFund');
    expect(fund?.endingBalance).toBe(1120);
    expect(fund?.rateDescription).toMatch(/effective annual return/i);
  });

  it('applies an editable TFSA Savings annual-rate assumption independently', () => {
    const result = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 0, years: 1, tfsaSavingsRate: 6, customRate: null });
    expect(result.options.find((option) => option.id === 'tfsaSavings')).toMatchObject({ annualRate: 6, endingBalance: 1061.68 });
    expect(result.options.find((option) => option.id === 'savingsAccount')?.annualRate).toBe(0.3);
  });

  describe('calculateMortgageScenario', () => {
    it('uses Canadian semi-annual compounding for monthly and biweekly payment estimates', () => {
      const monthly = calculateMortgageScenario({
        mode: 'payment',
        homePrice: 500_000,
        downPayment: 100_000,
        annualRate: 4.79,
        amortizationYears: 25,
      });
      expect(monthly).toMatchObject({
        valid: true,
        mortgageAmount: 400_000,
        annualRate: 4.79,
        amortizationYears: 25,
        paymentFrequency: 'monthly',
        termYears: 5,
      });
      expect(monthly.regularPayment).toBeGreaterThan(2200);
      expect(monthly.regularPayment).toBeLessThan(2400);
      expect(monthly.principalPaidInTerm).toBeGreaterThan(0);
      expect(monthly.interestPaidInTerm).toBeGreaterThan(monthly.principalPaidInTerm);
      expect(monthly.totalPaymentsInTerm).toBeCloseTo(monthly.principalPaidInTerm + monthly.interestPaidInTerm, 1);

      const biweekly = calculateMortgageScenario({
        mode: 'payment',
        mortgageAmount: 400_000,
        annualRate: 4.79,
        amortizationYears: 25,
        paymentFrequency: 'biweekly',
      });
      expect(biweekly.valid).toBe(true);
      expect(biweekly.regularPayment).toBeGreaterThan(1000);
      expect(biweekly.regularPayment).toBeLessThan(monthly.regularPayment);
      expect(Math.abs(biweekly.monthlyPayment - monthly.monthlyPayment)).toBeLessThan(5);
    });

    it('estimates affordability from GDS/TDS limits and rejects invalid figures', () => {
      const estimate = calculateMortgageScenario({
        mode: 'affordability',
        annualIncome: 120_000,
        monthlyDebts: 500,
        downPayment: 50_000,
        annualRate: 4.79,
      });
      expect(estimate.valid).toBe(true);
      expect(estimate.gdsMonthlyLimit).toBe(3900);
      expect(estimate.tdsMonthlyLimit).toBe(3900);
      expect(estimate.monthlyHousingPaymentLimit).toBe(3900);
      expect(estimate.maxPurchasePrice).toBeGreaterThan(estimate.maxMortgageAmount);
      expect(estimate.monthlyPayment).toBe(3900);
      expect(calculateMortgageScenario({ mode: 'payment', homePrice: 100_000, downPayment: 120_000 }).valid).toBe(false);
      expect(calculateMortgageScenario({ mode: 'affordability', annualIncome: -1 }).valid).toBe(false);
    });
  });

  it('selects the 3-year and 5-year GIC benchmark rates and rejects invalid horizons', () => {
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 3 }).options.find((o) => o.id === 'gicBenchmark')?.annualRate).toBe(3.95);
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 10 }).options.find((o) => o.id === 'gicBenchmark')?.annualRate).toBe(4.05);
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 0 }).valid).toBe(false);
  });
});
