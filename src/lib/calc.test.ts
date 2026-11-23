import { describe, expect, it } from 'vitest';
import { bandForMonths, calculateScenario, homeSavingsAfterReserve, monthlyCashFlow, parseAmount, projectWealthComparison } from './calc';

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
  it('returns monthly-compounded savings and fund series plus the annual GIC benchmark', () => {
    const result = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 100, years: 1, customRate: 5 });
    expect(result.valid).toBe(true);
    expect(result.customRate).toBe(5);
    expect(result.totalContributions).toBe(2200);
    expect(result.yearlyBreakdown).toHaveLength(2);
    expect(result.yearlyBreakdown[0]).toMatchObject({
      year: 0,
      contributions: 1000,
      contributionsOnly: 1000,
      savingsAccount: 1000,
      tfsaSavings: 1000,
      gicBenchmark: 1000,
      illustrativeFund: 1000,
    });
    expect(result.yearlyBreakdown[1]).toMatchObject({
      year: 1,
      contributions: 2200,
      contributionsOnly: 2200,
      gicBenchmark: 2236,
    });
    expect(result.yearlyBreakdown[1].savingsAccount).toBeGreaterThan(2200);
    expect(result.yearlyBreakdown.map((year) => year.tfsaSavings)).toEqual(result.yearlyBreakdown.map((year) => year.savingsAccount));
    expect(result.options.find((option) => option.id === 'tfsaSavings')).toMatchObject({ annualRate: 0.3, endingBalance: result.yearlyBreakdown[1].savingsAccount });
    expect(result.options.find((option) => option.id === 'savingsAccount')?.annualRate).toBe(0.3);
    expect(result.yearlyBreakdown[1].illustrativeFund!).toBeGreaterThan(result.yearlyBreakdown[1].savingsAccount);
    expect(result.options.find((option) => option.id === 'gicBenchmark')).toMatchObject({
      annualRate: 3.6,
      endingBalance: 2236,
      totalGrowth: 36,
    });
  });

  it('omits fund projections until a valid hypothetical return is entered', () => {
    const input = { startingAmount: 1000, monthlyContribution: 100, years: 1 };
    const empty = projectWealthComparison(input);
    expect(empty.valid).toBe(true);
    expect(empty.customRate).toBeNull();
    expect(empty.options.map((o) => o.id)).toEqual(['contributionsOnly', 'savingsAccount', 'tfsaSavings', 'gicBenchmark']);
    expect(empty.yearlyBreakdown.every((year) => year.illustrativeFund === null)).toBe(true);
    for (const rate of [-5, 0, 5]) {
      const result = projectWealthComparison({ ...input, customRate: rate });
      expect(result.valid).toBe(true);
      expect(result.options.find((o) => o.id === 'illustrativeFund')?.annualRate).toBe(rate);
    }
    expect(projectWealthComparison({ ...input, customRate: -100 }).valid).toBe(false);
  });

  it.each([[12, 1120], [0, 1000], [-50, 500], [-99.99, 0.1]])(
    'uses %s%% as the effective annual fund return', (customRate, expected) => {
      const result = projectWealthComparison({ startingAmount: 1000, monthlyContribution: 0, years: 1, customRate });
      expect(result.options.find((option) => option.id === 'illustrativeFund')?.endingBalance).toBeCloseTo(expected, 2);
    },
  );

  it('adds fund contributions at each month-end using the equivalent monthly rate', () => {
    const result = projectWealthComparison({ startingAmount: 0, monthlyContribution: 100, years: 1, customRate: 12 });
    const monthlyFactor = 1.12 ** (1 / 12);
    const expected = 100 * (1.12 - 1) / (monthlyFactor - 1);
    expect(result.options.find((option) => option.id === 'illustrativeFund')?.endingBalance).toBeCloseTo(expected, 2);
  });

  it('selects the 3-year and 5-year GIC benchmark rates and rejects invalid horizons', () => {
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 3 }).options.find((o) => o.id === 'gicBenchmark')?.annualRate).toBe(3.95);
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 10 }).options.find((o) => o.id === 'gicBenchmark')?.annualRate).toBe(4.05);
    expect(projectWealthComparison({ startingAmount: 0, monthlyContribution: 0, years: 0 }).valid).toBe(false);
  });
});
