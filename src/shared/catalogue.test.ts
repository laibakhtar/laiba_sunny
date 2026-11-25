import { describe, expect, it } from 'vitest';
import { CATALOGUE_REFERENCE_SOURCES, offerIsCurrentAsOf, TANGERINE_CATALOGUE, TANGERINE_OFFERS } from './catalogue';
import { getEntry, retrieve } from './knowledge';
import { eligiblePromotionIds, getOffering, initialOfferingIds, namedOfferingIds, OFFERINGS, offeringPlan, offeringReasons, offeringUrl, offeringsFor, SIGNUP_PRODUCT_IDS, validateOfferingIds } from './offerings';

describe('Tangerine product catalogue', () => {
  it('covers the major personal product families with unique ids and official sources', () => {
    expect(TANGERINE_CATALOGUE.length).toBeGreaterThanOrEqual(15);
    expect(new Set(TANGERINE_CATALOGUE.map((product) => product.id)).size).toBe(TANGERINE_CATALOGUE.length);
    expect(new Set(TANGERINE_CATALOGUE.map((product) => product.sourceId)).size).toBe(TANGERINE_CATALOGUE.length);
    const sourceIds = [
      ...TANGERINE_CATALOGUE.map((product) => product.sourceId),
      ...TANGERINE_OFFERS.map((offer) => offer.sourceId),
      ...CATALOGUE_REFERENCE_SOURCES.map((source) => source.id),
    ];
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    for (const product of TANGERINE_CATALOGUE) {
      expect(product.sourceUrl).toMatch(/^https:\/\/www\.tangerine\.ca\//);
      expect(product.customerFit.length).toBeGreaterThan(0);
      expect(product.eligibility.length).toBeGreaterThan(0);
      expect(product.rates.length).toBeGreaterThan(0);
      for (const sourceId of product.relatedSourceIds) expect(getEntry(sourceId)).toBeDefined();
    }
    for (const offer of TANGERINE_OFFERS) {
      expect(offer.sourceUrl).toMatch(/^https:\/\/www\.tangerine\.ca\//);
      expect(offer.eligibility.length).toBeGreaterThan(0);
      expect(offer.conditions.length).toBeGreaterThan(0);
    }
    expect(CATALOGUE_REFERENCE_SOURCES.every((source) => source.url.startsWith('https://www.tangerine.ca/'))).toBe(true);
  });

  it('states that Tangerine does not currently offer an FHSA', () => {
    const fhsa = TANGERINE_CATALOGUE.find((product) => product.id === 'fhsa-status');
    expect(fhsa?.availability).toBe('unavailable');
    expect(fhsa?.sourceUrl).toBe('https://www.tangerine.ca/en/ai-information');
    expect(fhsa?.summary).toMatch(/does not currently offer/i);
    expect(getEntry('tng-fhsa-status')?.content).toMatch(/Tangerine does not currently offer.*FHSA/);
    expect(getEntry('tng-fhsa-status')?.content).toMatch(/Tangerine.*TFSA or RSP/i);
    expect(getEntry('tng-first-home-article')?.content).toMatch(/Home Buyers’ Plan/);
  });

  it('makes every verified catalogue product browsable without broadening the recommendation shortlist', () => {
    const browseIds = validateOfferingIds(OFFERINGS.map((offering) => offering.id));
    for (const product of TANGERINE_CATALOGUE.filter((entry) => entry.id !== 'fhsa-status')) {
      const offeringId = product.id === 'savings'
        ? 'savings-account'
        : product.id === 'moneyback-card'
          ? 'money-back-card'
          : product.id === 'moneyback-world-card'
            ? 'money-back-world'
            : product.id;
      expect(browseIds).toContain(offeringId);
      const offering = OFFERINGS.find((item) => item.id === offeringId)!;
      expect(offering.rates?.length).toBeGreaterThan(0);
      expect(offering.conditions.length).toBeGreaterThan(0);
      expect(offering.sources[0]).toBe(product.sourceId);
    }
    expect(browseIds.length).toBe(OFFERINGS.length);
    expect(OFFERINGS.find((offering) => offering.id === 'fhsa-status')).toBeUndefined();
    expect(OFFERINGS.find((offering) => offering.id === 'money-back-card')?.sources[0]).toBe('tng-money-back-card');
    expect(OFFERINGS.find((offering) => offering.id === 'money-back-world')?.sources[0]).toBe('tng-money-back-world');
    expect(OFFERINGS.find((offering) => offering.id === 'rewards-world-elite')?.sources[0]).toBe('tng-rewards-world-elite');
    expect(offeringsFor('accessible_interest').map((offering) => offering.id)).not.toContain('mortgage');
    expect(namedOfferingIds('Tell me about Tangerine mortgages')).toContain('mortgage');
  });

  it('surfaces current promotions only when the customer confirms the relevant eligibility facts', () => {
    expect(eligiblePromotionIds(
      ['chequing'],
      'I am new to Tangerine and want to move my payroll there.',
      '2026-11-09',
    )).toEqual(['chequing-payroll-bonus']);
    expect(eligiblePromotionIds(
      ['money-back-card'],
      'I have never had a Tangerine credit card.',
      '2026-11-09',
    )).toEqual(['moneyback-ten-percent']);
    expect(eligiblePromotionIds(['chequing'], 'I want to switch my payroll.', '2026-11-09')).toEqual([]);
    expect(eligiblePromotionIds(['money-back-card'], 'I want a Tangerine credit card.', '2026-11-09')).toEqual([]);
    expect(eligiblePromotionIds(['chequing'], 'I am new to Tangerine and want to move my payroll.', '2026-11-17')).toEqual([]);
  });

  it('returns exactly three initial products with a separate rationale for every product', () => {
    const cases = [
      [null, null],
      ['build_wealth', null],
      ['accessible_interest', 'under_1_year'],
      ['build_wealth', '1_to_5_years'],
      ['build_wealth', 'over_5_years'],
      ['build_wealth', 'not_sure'],
      ['first_home', 'over_5_years'],
    ] as const;
    for (const [goal, horizon] of cases) {
      const { ids } = offeringPlan(goal, horizon);
      expect(ids).toHaveLength(3);
      expect(initialOfferingIds(goal, horizon)).toHaveLength(3);
      expect(Object.keys(offeringReasons(ids, goal, horizon))).toHaveLength(3);
    }
    expect(initialOfferingIds(null, null, ['mortgage'])).toEqual(['mortgage']);
  });

  it('keeps targeted product requests focused and groups generic credit-card requests by family', () => {
    const creditCards = 'What Tangerine credit card offerings do you have?';
    expect(initialOfferingIds(null, null, namedOfferingIds(creditCards), creditCards)).toEqual([
      'money-back-card',
      'money-back-world',
      'rewards-world-elite',
    ]);

    const moneyBack = 'Tell me about the Tangerine Money-Back Credit Card.';
    expect(initialOfferingIds(null, null, namedOfferingIds(moneyBack), moneyBack)).toEqual(['money-back-card']);
    expect(initialOfferingIds(null, null)).toHaveLength(3);
  });

  it('only treats chequing as a product when the customer asks about the account itself', () => {
    expect(namedOfferingIds('There is money in my chequing account.')).not.toContain('chequing');
    expect(namedOfferingIds('Open a Tangerine Chequing Account.')).toContain('chequing');
    expect(namedOfferingIds('Compare chequing account features.')).toContain('chequing');
  });

  it('has a direct official Tangerine URL for every supported next-step product', () => {
    for (const id of SIGNUP_PRODUCT_IDS) {
      const product = getOffering(id);
      expect(product, id).toBeDefined();
      expect(offeringUrl(product!), id).toMatch(/^https:\/\/www\.tangerine\.ca\//);
    }
  });

  it('keeps TFSA Savings access distinct from TFSA GIC maturity restrictions', () => {
    const tfsa = getOffering('tfsa')!;
    expect(tfsa.features.join(' ')).toMatch(/TFSA Savings is generally accessible/);
    expect(tfsa.features.join(' ')).toMatch(/TFSA GICs are generally locked until maturity/);
    expect(tfsa.features.join(' ')).not.toMatch(/withdraw any time/i);
  });

  it('uses the optional account signals to shape exploratory plans', () => {
    expect(offeringPlan(null, 'not_sure', { chequingSurplusSignal: true }).ids).toEqual(['savings-account', 'tfsa', 'gic']);
    expect(offeringPlan('first_home', '1_to_5_years').ids).toEqual(['tfsa', 'gic', 'savings-account']);
    expect(offeringPlan('build_wealth', 'over_5_years').ids).toEqual(['tfsa', 'rsp', 'investment-funds']);
    expect(offeringPlan(null, '1_to_5_years', { hasUnassignedCash: true }).ids).toEqual(['gic', 'tfsa', 'savings-account']);
    expect(offeringPlan(null, 'over_5_years', { hasUnassignedCash: true }).ids).toEqual(['tfsa', 'rsp', 'investment-funds']);
    expect(offeringPlan(null, null).ids).toEqual(['savings-account', 'tfsa', 'gic']);
    expect(offeringReasons(['money-back-card'], null, null)['money-back-card']).toMatch(/third 2% category/);
  });

  it('keeps current-rate values live and exposes catalogue facts to Sunny retrieval', () => {
    const chequing = TANGERINE_CATALOGUE.find((product) => product.id === 'chequing')!;
    expect(chequing.rates[0].value).toBeNull();
    expect(chequing.relatedSourceIds).toContain('tng-live-rates');
    expect(getEntry(chequing.sourceId)?.conditions.join(' ')).toMatch(/no monthly fee or minimum balance/i);
    expect(retrieve('Tangerine line of credit prime rate', 7, [], false).some((entry) => entry.id === 'tng-catalogue-line-of-credit')).toBe(true);
  });

  it('retrieves Tangerine literacy entries by topic and keeps government sources opt-in', () => {
    const topics = [
      ['compound interest', 'tng-edu-compound-interest'],
      ['TFSA vs. RSP', 'tng-edu-tfsa-vs-rrsp'],
      ['account container and holdings', 'tng-edu-container-vs-holdings'],
      ['MER and administration fees', 'tng-edu-mer-and-fees'],
      ['fixed vs. variable rates', 'tng-edu-fixed-vs-variable'],
      ['credit-card grace period and minimum payment', 'tng-edu-credit-basics'],
      ['emergency fund', 'tng-edu-emergency-fund'],
    ] as const;
    for (const [query, id] of topics) {
      expect(retrieve(query).some((entry) => entry.id === id && entry.kind === 'tangerine'), query).toBe(true);
    }

    expect(retrieve('What is a TFSA?').every((entry) => entry.kind === 'tangerine')).toBe(true);
    const statutory = retrieve('TFSA contribution room', 7, [], true);
    expect(statutory[0].kind).toBe('tangerine');
    expect(statutory.some((entry) => entry.id === 'gov-tfsa' && entry.kind === 'government')).toBe(true);
  });

  it('records promotion conditions and suppresses stale or out-of-window offers', () => {
    const cardOffer = TANGERINE_OFFERS.find((offer) => offer.id === 'moneyback-ten-percent')!;
    expect(cardOffer.endsOn).toBe('2026-11-30');
    expect(cardOffer.conditions.join(' ')).toMatch(/60-day/);
    expect(offerIsCurrentAsOf(cardOffer, '2026-11-09')).toBe(true);
    expect(offerIsCurrentAsOf(cardOffer, '2026-12-01')).toBe(false);
    expect(offerIsCurrentAsOf(cardOffer, '2026-11-17')).toBe(false);
  });
});
