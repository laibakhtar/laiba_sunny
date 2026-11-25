import { useId, useState } from 'react';
import { TOPICS, type TopicId } from '../data/education';
import { PURPOSE_LABEL } from '../domain/allocations';
import type { DailyBalance } from '../domain/history';
import type { SignalResult } from '../domain/signal';
import {
  MAX_AMOUNT,
  MAX_WEALTH_YEARS,
  calculateMortgageScenario,
  projectWealthComparison,
  projectWithoutReturns,
  type WealthOptionId,
  type WealthYearlyBreakdown,
} from '../lib/calc';
import { money } from '../lib/format';
import { offerIsCurrentAsOf } from '../shared/catalogue';
import { getEntry, type KnowledgeEntry } from '../shared/knowledge';
import { getCatalogueOffer, getOffering, offeringUrl, signupChecklist, SUPPORT_LINKS, type SignupProductId } from '../shared/offerings';
import type { AllocationSnapshot, ScenarioFacts } from '../conversation/types';
import type { MortgageScenarioDTO, ScenarioDTO } from '../shared/api';

/** Key points for a scripted educational answer (the answer itself is the message text). */
export function EducationCard({ topic }: { topic: TopicId }) {
  const t = TOPICS[topic];
  if (!t.points) return null;
  return (
    <div className="card edu-card" aria-label={`${t.title}: key points`}>
      <ul>
        {t.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
export const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
const shortDate = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Compact, expandable list of validated knowledge-base sources. */
export function SourceList({ ids }: { ids: string[] }) {
  const entries = ids.map(getEntry).filter((e): e is KnowledgeEntry => Boolean(e));
  if (!entries.length) return null;
  return (
    <details className="sources">
      <summary>Sources ({entries.length})</summary>
      <ul>
        {entries.map((e) => (
          <li key={e.id}>
            <span className={`source-kind source-${e.kind}`}>{e.kind === 'tangerine' ? 'Tangerine' : 'Government / agency'}</span>
            <a href={e.url} target="_blank" rel="noopener noreferrer">
              {e.publisher}: {e.pageTitle}
            </a>
            {e.resources?.length ? (
              <p className="source-resources">
                Related resources:{' '}
                {e.resources.map((resource, index) => (
                  <span key={resource.url}>
                    {index > 0 && ' · '}
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.label}</a>
                  </span>
                ))}
              </p>
            ) : null}
            <span className="source-date">Reviewed {formatDate(e.reviewed)}</span>
          </li>
        ))}
      </ul>
      <p className="source-note">These public pages support Sunny’s explanation. They don’t mean Tangerine reviewed or approved this prototype.</p>
    </details>
  );
}

export function FactsUpdatedCard({ changes }: { changes: string[] }) {
  return (
    <p className="facts-updated" role="status">
      <span aria-hidden="true">✓</span> Noted: {changes.join('; ')}
    </p>
  );
}

export function SupportChannelsCard() {
  return (
    <div className="card support-channels-card" aria-label="Tangerine support options">
      <p className="card-kicker">Connect with Tangerine</p>
      <p>Choose a direct support option. These links open Tangerine; nothing is sent or booked by Sunny.</p>
      <div className="support-channel-links">
        {SUPPORT_LINKS.map((link) => (
          <a key={link.sourceId} className="btn btn-secondary" href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function OfferPromotion({ promotionId, offeringId }: { promotionId: string; offeringId: string }) {
  const offer = getCatalogueOffer(promotionId);
  const currentDay = new Date().toISOString().slice(0, 10);
  const catalogueId = offeringId === 'money-back-card'
    ? 'moneyback-card'
    : offeringId === 'money-back-world'
      ? 'moneyback-world-card'
      : offeringId;
  if (!offer || !offer.relatedProductIds.includes(catalogueId) || !offerIsCurrentAsOf(offer, currentDay)) return null;
  return (
    <div className="offering-promo">
      <p className="offering-promo-label">An offer to review</p>
      <strong>{offer.name}</strong>
      <p>{offer.summary}</p>
      <p>Based on what you shared, this may be relevant. It is not confirmation that you qualify; check the current terms.</p>
      <ul>
        {[...offer.eligibility, ...offer.conditions].map((condition) => <li key={condition}>{condition}</li>)}
      </ul>
      <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer">Review Tangerine’s offer terms</a>
    </div>
  );
}

/** Daily closing chequing balances with the threshold line (decorative chart + text alternative). */
export function BalanceTrend({ points, threshold, label }: { points: DailyBalance[]; threshold?: number; label: string }) {
  const id = useId();
  if (points.length < 2) return null;
  const values = points.map((p) => p.chequing);
  const lo = Math.min(...values, threshold ?? Infinity) * 0.97;
  const hi = Math.max(...values, threshold ?? -Infinity) * 1.02;
  const w = 300;
  const h = 72;
  const x = (i: number) => (i / (points.length - 1)) * w;
  const y = (v: number) => h - ((v - lo) / (hi - lo || 1)) * h;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const desc = `${label}: from ${money(values[0])} on ${shortDate.format(new Date(`${points[0].date}T00:00:00Z`))} to ${money(values.at(-1)!)} today; lowest ${money(Math.min(...values))}, highest ${money(Math.max(...values))}.`;
  return (
    <figure className="trend">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-labelledby={`${id}-d`}>
        <desc id={`${id}-d`}>{desc}</desc>
        <path d={`${path} L${w},${h} L0,${h} Z`} className="trend-fill" />
        <path d={path} className="trend-line" />
        {threshold !== undefined && <line x1="0" x2={w} y1={y(threshold)} y2={y(threshold)} className="trend-threshold" />}
      </svg>
      <figcaption>
        <span>{shortDate.format(new Date(`${points[0].date}T00:00:00Z`))}</span>
        {threshold !== undefined && <span className="trend-key">— — {money(threshold)}</span>}
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

export function SignalCard({ signal, observationDays }: { signal: SignalResult; observationDays: number }) {
  const e = signal.evidence;
  if (e.minBalance === null) return null;
  return (
    <div className="card signal-card" aria-label="What Sunny noticed">
      <p className="card-kicker">What Sunny noticed</p>
      <dl className="figures">
        <div>
          <dt>Days observed</dt>
          <dd>{observationDays}</dd>
        </div>
        <div>
          <dt>Lowest daily balance</dt>
          <dd>{money(e.minBalance)}</dd>
        </div>
        <div>
          <dt>Highest daily balance</dt>
          <dd>{money(e.maxBalance)}</dd>
        </div>
        <div>
          <dt>Days below {money(e.threshold)}</dt>
          <dd>{e.daysBelowThreshold}</dd>
        </div>
      </dl>
      <p className="card-note">A reason to ask a question, not a judgment about what the money is for.</p>
    </div>
  );
}

export function AllocationCard({ snapshot }: { snapshot: AllocationSnapshot }) {
  const { balance, items, unassigned, savingsBalance } = snapshot;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / (balance || 1)) * 100))}%`;
  return (
    <div className="card alloc-card" aria-label="Your chequing balance, by purpose">
      <p className="card-kicker">Chequing balance by purpose</p>
      <div className="alloc-bar" role="img" aria-label={`${items.map((a) => `${PURPOSE_LABEL[a.purpose]} ${money(a.amount)}`).join(', ')}${items.length ? ', ' : ''}not yet assigned ${money(unassigned)}, of ${money(balance)}.`}>
        {items.map((a) => (
          <span key={a.purpose} className={`alloc-seg alloc-${a.purpose}`} style={{ width: pct(a.amount) }} />
        ))}
        <span className="alloc-seg alloc-unassigned" style={{ width: pct(unassigned) }} />
      </div>
      <dl className="facts">
        {items.map((a) => (
          <div className="fact" key={a.purpose}>
            <dt>
              <i className={`key alloc-${a.purpose}`} aria-hidden="true" /> {PURPOSE_LABEL[a.purpose]}
            </dt>
            <dd>{money(a.amount)}</dd>
          </div>
        ))}
        <div className="fact fact-strong">
          <dt>
            <i className="key alloc-unassigned" aria-hidden="true" /> Not yet assigned to a purpose
          </dt>
          <dd>{money(unassigned)}</dd>
        </div>
        <div className="fact">
          <dt>Chequing balance</dt>
          <dd>{money(balance)}</dd>
        </div>
      </dl>
      <p className="card-note">Your {money(savingsBalance)} savings balance is separate and isn’t counted here.</p>
    </div>
  );
}

export function OfferingsCard({ ids, reason, reasons, featuredId, promotionIds = [], onExplore }: { ids: string[]; reason: string; reasons?: Record<string, string>; featuredId?: string; promotionIds?: string[]; onExplore?: (id: string) => void }) {
  const list = ids.map(getOffering).filter((o): o is NonNullable<typeof o> => Boolean(o));
  if (!list.length) return null;
  const conciseReason = reason.replace(/\s*Account signals considered:[\s\S]*$/i, '').trim();
  return (
    <div className="card offerings-card" aria-label="Tangerine offerings to learn about">
      <p className="card-kicker">Tangerine products to explore</p>
      <p className="offerings-reason">{conciseReason || 'Compare the features, terms and trade-offs for these Tangerine options.'}</p>
      <div className="offerings">
        {list.map((o) => {
          const url = offeringUrl(o);
          const reviewed = getEntry(o.sources[0])?.reviewed;
          return (
            <details key={o.id} className="offering" open={o.id === featuredId} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && onExplore?.(o.id)}>
              <summary>
                {o.id === featuredId && <span className="tag">Explore first</span>}
                {o.availability === 'unconfirmed' && <span className="tag">Availability unconfirmed</span>}
                <strong>{o.name}</strong>
                <span>{o.summary}</span>
                {reasons?.[o.id] && <span><strong>Why it’s included:</strong> {reasons[o.id]}</span>}
              </summary>
              <div className="offering-body">
                <p className="offering-h">Features</p>
                <ul>
                  {o.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {!!o.rates?.length && (
                  <>
                    <p className="offering-h">Rates</p>
                    <ul>
                      {o.rates.map((rate) => <li key={rate}>{rate}</li>)}
                    </ul>
                  </>
                )}
                {promotionIds.map((id) => <OfferPromotion key={id} promotionId={id} offeringId={o.id} />)}
                {o.conditions.length > 0 && (
                  <>
                    <p className="offering-h">Eligibility, fees and limitations</p>
                    <ul>
                      {o.conditions.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </>
                )}
                {o.risks.length > 0 && (
                  <>
                    <p className="offering-h">Risks</p>
                    <ul>
                      {o.risks.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="offering-links">
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => onExplore?.(o.id)}>
                      {o.availability === 'unconfirmed' ? 'Tangerine information' : 'Official product page'}
                    </a>
                  )}
                  {o.sources.slice(1).map((id) => {
                    const source = getEntry(id);
                    return source?.kind === 'tangerine' ? (
                      <span key={id}> · <a href={source.url} target="_blank" rel="noopener noreferrer">{source.pageTitle}</a></span>
                    ) : null;
                  })}
                  {reviewed && <span className="source-date"> · Verified {formatDate(reviewed)}</span>}
                </p>
              </div>
            </details>
          );
        })}
      </div>
      <p className="card-note">These are options to explore, not decisions. Review the details before acting; choosing none is fine.</p>
    </div>
  );
}

export function SignupCard({ productId, promotionIds = [] }: { productId: SignupProductId; promotionIds?: string[] }) {
  const product = getOffering(productId);
  if (!product) return null;
  const url = offeringUrl(product);
  if (!url) return null;
  return (
    <div className="card signup-card" aria-label={`Next steps for ${product.name}`}>
      <p className="card-kicker">Your next step: {product.name}</p>
      {promotionIds.map((id) => <OfferPromotion key={id} promotionId={id} offeringId={productId} />)}
      <ul>
        {signupChecklist(productId).map((item) => <li key={item}>{item}</li>)}
      </ul>
      <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
        Open / Apply on Tangerine.ca
      </a>
      <p className="card-note">
        The link opens Tangerine’s product page. Any application is completed directly with Tangerine; Sunny never collects your SIN, personal income details, login credentials or application information, and cannot check eligibility or guarantee approval.
      </p>
    </div>
  );
}

export function MortgageCalculatorCard({ scenario }: { scenario: MortgageScenarioDTO }) {
  const id = useId();
  const [values, setValues] = useState({
    mode: scenario.mode,
    homePrice: String(scenario.homePrice),
    downPayment: String(scenario.downPayment),
    annualIncome: String(scenario.annualIncome),
    monthlyDebts: String(scenario.monthlyDebts),
    annualRate: String(scenario.annualRate),
    amortizationYears: String(scenario.amortizationYears),
    paymentFrequency: scenario.paymentFrequency,
  });
  const number = (value: string) => value.trim() ? Number(value) : Number.NaN;
  const projection = calculateMortgageScenario({
    mode: values.mode,
    homePrice: number(values.homePrice),
    downPayment: number(values.downPayment),
    annualIncome: number(values.annualIncome),
    monthlyDebts: number(values.monthlyDebts),
    annualRate: number(values.annualRate),
    amortizationYears: number(values.amortizationYears),
    paymentFrequency: values.paymentFrequency,
  });
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const fields: {
    key: 'homePrice' | 'downPayment' | 'annualIncome' | 'monthlyDebts' | 'annualRate' | 'amortizationYears';
    label: string;
    min: number;
    max: number;
    step: number;
    rangeMax: number;
    rangeStep: number;
    prefix?: string;
    suffix?: string;
  }[] = [
    { key: 'homePrice', label: 'Home Price ($)', min: 0, max: MAX_AMOUNT, step: 1000, rangeMax: 1_500_000, rangeStep: 10_000, prefix: '$' },
    { key: 'downPayment', label: 'Down Payment ($)', min: 0, max: MAX_AMOUNT, step: 1000, rangeMax: 500_000, rangeStep: 5_000, prefix: '$' },
    { key: 'annualIncome', label: 'Annual Income ($)', min: 0, max: MAX_AMOUNT, step: 1000, rangeMax: 500_000, rangeStep: 5_000, prefix: '$' },
    { key: 'monthlyDebts', label: 'Monthly Debts ($)', min: 0, max: MAX_AMOUNT, step: 50, rangeMax: 10_000, rangeStep: 100, prefix: '$' },
    { key: 'annualRate', label: 'Interest Rate (%)', min: 0, max: 100, step: 0.01, rangeMax: 15, rangeStep: 0.05, suffix: '%' },
    { key: 'amortizationYears', label: 'Amortization (Years)', min: 1, max: 40, step: 1, rangeMax: 40, rangeStep: 1, suffix: 'years' },
  ];

  return (
    <div className="card mortgage-calculator-card" aria-label="Interactive mortgage calculator">
      <div className="card-head">
        <p className="card-kicker">Mortgage Explorer &amp; Calculator</p>
        <span className="tag">Illustrative only</span>
      </div>
      <section className="mortgage-overview" aria-label="Tangerine fixed and variable mortgage overview">
        <div className="mortgage-overview-options">
          <div>
            <h3>Fixed rate</h3>
            <p>Tangerine offers closed mortgages with fixed-rate options. Compare available terms and current rates on Tangerine’s live rate page.</p>
          </div>
          <div>
            <h3>Variable rate</h3>
            <p>Tangerine also offers closed mortgages with variable-rate options. Rates and terms depend on the selected mortgage; this illustration does not forecast rate changes.</p>
          </div>
        </div>
        <p className="card-note">
          Tangerine lists a rate hold of up to 120 days before closing and prepayment options. It says to allow at least 15 business days from application submission to funding.
        </p>
      </section>
      <p className="mortgage-reference-rate">
        Illustrative reference rate: <strong>4.79%</strong> — not a live Tangerine rate or quote.
      </p>
      <div className="mortgage-mode" role="group" aria-label="Mortgage calculation type">
        <button type="button" className={`chip${values.mode === 'payment' ? ' chip-primary' : ''}`} aria-pressed={values.mode === 'payment'} onClick={() => set('mode', 'payment')}>Payment estimate</button>
        <button type="button" className={`chip${values.mode === 'affordability' ? ' chip-primary' : ''}`} aria-pressed={values.mode === 'affordability'} onClick={() => set('mode', 'affordability')}>Affordability estimate</button>
      </div>
      <div className="mortgage-controls">
        {fields
          .filter((field) => values.mode === 'payment'
            ? !['annualIncome', 'monthlyDebts'].includes(field.key)
            : field.key !== 'homePrice')
          .map((field) => {
            const current = number(values[field.key]);
            const rangeValue = Number.isFinite(current) ? Math.min(field.rangeMax, Math.max(field.min, current)) : field.min;
            const inputId = `${id}-${field.key}`;
            return (
              <div className="wealth-control" key={field.key}>
                <label htmlFor={inputId}>{field.label}</label>
                <div className="wealth-number-input">
                  {field.prefix && <span aria-hidden="true">{field.prefix}</span>}
                  <input id={inputId} type="number" min={field.min} max={field.max} step={field.step} value={values[field.key]} onChange={(event) => set(field.key, event.target.value)} />
                  {field.suffix && <span aria-hidden="true">{field.suffix}</span>}
                </div>
                <input type="range" min={field.min} max={field.rangeMax} step={field.rangeStep} value={rangeValue} aria-label={`Adjust ${field.label.toLowerCase()}`} onChange={(event) => set(field.key, event.target.value)} />
              </div>
            );
          })}
        <div className="wealth-control">
          <label htmlFor={`${id}-frequency`}>Payment Frequency</label>
          <select id={`${id}-frequency`} value={values.paymentFrequency} onChange={(event) => set('paymentFrequency', event.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="biweekly">Biweekly</option>
          </select>
        </div>
      </div>
      {projection.valid ? (
        <div className="mortgage-results" aria-live="polite">
          {values.mode === 'affordability' ? (
            <>
              <div><span>Illustrative maximum purchase price</span><strong>{money(projection.maxPurchasePrice)}</strong></div>
              <div><span>Estimated mortgage amount</span><strong>{money(projection.maxMortgageAmount)}</strong></div>
              <div><span>Monthly housing payment limit</span><strong>{money(projection.monthlyHousingPaymentLimit)}</strong></div>
              <p className="card-note">Uses 39% GDS / 44% TDS. Property taxes, heating, condo fees and mortgage insurance are not included.</p>
            </>
          ) : (
            <>
              <div><span>{values.paymentFrequency === 'monthly' ? 'Monthly payment' : 'Biweekly payment'}</span><strong>{money(projection.regularPayment)}</strong></div>
              <div><span>Principal paid in the first 5 years</span><strong>{money(projection.principalPaidInTerm)}</strong></div>
              <div><span>Interest paid in the first 5 years</span><strong>{money(projection.interestPaidInTerm)}</strong></div>
            </>
          )}
        </div>
      ) : <p className="field-error" role="alert">{Object.values(projection.errors)[0]}</p>}
      <p className="card-note">
        Uses Canadian semi-annual compounding. The affordability estimate uses 39% GDS / 44% TDS and excludes property taxes, heating, condo fees and mortgage insurance; it is not a qualification assessment.
      </p>
      <div className="mortgage-actions">
        <a className="btn btn-primary" href="https://www.tangerine.ca/en/rates/mortgage-rates" target="_blank" rel="noopener noreferrer">Check live mortgage rates</a>
        <a className="btn btn-secondary" href="https://www.tangerine.ca/en/personal/borrow/mortgage" target="_blank" rel="noopener noreferrer">Explore Tangerine Mortgages</a>
      </div>
    </div>
  );
}

export function ScenarioCard({ input, hypothetical = false, outdated = false }: { input: ScenarioFacts; hypothetical?: boolean; outdated?: boolean }) {
  const r = projectWithoutReturns(input);
  if (!r.valid) return null;
  return (
    <div className="card scenario-card" aria-label="Illustrative scenario">
      <div className="card-head">
        <p className="card-kicker">{hypothetical ? 'What-if scenario' : 'Illustrative scenario'}</p>
        {outdated && <span className="tag">Earlier figures · since updated</span>}
      </div>
      <dl className="figures">
        <div>
          <dt>Starting amount</dt>
          <dd>{money(input.start)}</dd>
        </div>
        <div>
          <dt>
            {money(input.monthly)}/mo × {input.months} mo
          </dt>
          <dd>+{money(r.contributions)}</dd>
        </div>
        <div className="figure-strong">
          <dt>Total before interest or returns</dt>
          <dd>{money(r.total)}</dd>
        </div>
        {input.target !== null && (
          <div className="figure-strong">
            <dt>{r.gapAtEnd ? 'Short of your target' : 'Target'}</dt>
            <dd>{r.gapAtEnd ? money(r.gapAtEnd) : 'Reached'}</dd>
          </div>
        )}
      </dl>
      <p className="card-note">Simple arithmetic with your numbers. Excludes interest, investment returns, fees and taxes; not a forecast.</p>
    </div>
  );
}

const WEALTH_SERIES: { id: WealthOptionId; label: string; color: string; dashed?: boolean }[] = [
  { id: 'contributionsOnly', label: 'Contributions Only', color: '#596579', dashed: true },
  { id: 'savingsAccount', label: 'Tangerine Savings Account', color: '#087e8b' },
  { id: 'tfsaSavings', label: 'Tangerine TFSA Savings Account', color: '#c1446b', dashed: true },
  { id: 'gicBenchmark', label: 'GIC Benchmark', color: '#d96616' },
  { id: 'illustrativeFund', label: 'Illustrative Fund / Custom Rate', color: '#7652a2' },
];

function WealthGrowthGraph({ years, yearlyBreakdown, visibleOptions }: {
  years: number;
  yearlyBreakdown: WealthYearlyBreakdown[];
  visibleOptions: WealthOptionId[];
}) {
  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 24, bottom: 42, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = yearlyBreakdown.flatMap((point) => visibleOptions.map((optionId) => point[optionId] ?? 0));
  const maxValue = Math.max(1, ...values);
  const x = (year: number) => margin.left + (year / years) * plotWidth;
  const y = (value: number) => margin.top + plotHeight - (value / maxValue) * plotHeight;
  const series = WEALTH_SERIES.filter((item) => visibleOptions.includes(item.id));
  const yearLabels = yearlyBreakdown.filter((point) => point.year === 0 || point.year === years || point.year % 5 === 0);

  return (
    <div className="wealth-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Projected balances from year 0 to year ${years}`}>
        <title>Illustrative year-by-year balance comparison</title>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = maxValue * fraction;
          const lineY = y(value);
          return (
            <g key={fraction} className="wealth-gridline">
              <line x1={margin.left} x2={width - margin.right} y1={lineY} y2={lineY} />
              <text x={margin.left - 10} y={lineY + 4} textAnchor="end">{money(value)}</text>
            </g>
          );
        })}
        <line className="wealth-axis" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
        {yearLabels.map((point) => (
          <text key={point.year} className="wealth-year-label" x={x(point.year)} y={height - 14} textAnchor="middle">
            {point.year}
          </text>
        ))}
        {series.map((item) => (
          <g key={item.id} className="wealth-series">
            <polyline
              points={yearlyBreakdown.map((point) => `${x(point.year)},${y(point[item.id] ?? 0)}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeDasharray={item.dashed ? '7 5' : undefined}
            />
            {yearlyBreakdown.map((point) => (
              <circle key={point.year} cx={x(point.year)} cy={y(point[item.id] ?? 0)} r="4" fill={item.color}>
                <title>{`${item.label}, year ${point.year}: ${money(point[item.id])}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="wealth-legend" aria-label="Chart legend">
        {series.map((item) => (
          <span key={item.id}>
            <i aria-hidden="true" style={{ backgroundColor: item.color }} /> {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WealthComparisonCard({ comparison }: { comparison: ScenarioDTO }) {
  const id = useId();
  const [values, setValues] = useState({
    startingAmount: String(comparison.startingAmount),
    monthlyContribution: String(comparison.monthlyContribution),
    years: String(comparison.years),
    tfsaSavingsRate: String(comparison.tfsaSavingsRate),
    customRate: comparison.customRate === null ? '' : String(comparison.customRate),
  });
  const numeric = (value: string) => value.trim() ? Number(value) : Number.NaN;
  const projected = projectWealthComparison({
    startingAmount: numeric(values.startingAmount),
    monthlyContribution: numeric(values.monthlyContribution),
    years: numeric(values.years),
    tfsaSavingsRate: numeric(values.tfsaSavingsRate),
    customRate: values.customRate.trim() ? numeric(values.customRate) : null,
  });
  const visibleOptions = comparison.compareTangerineOptions
    ? projected.options.map((option) => option.id)
    : ['contributionsOnly' as const];
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const controls = [
    { key: 'startingAmount' as const, label: 'Starting Amount ($)', min: 0, max: MAX_AMOUNT, step: 0.01, rangeMax: 1_000_000, rangeStep: 1_000, prefix: '$' },
    { key: 'monthlyContribution' as const, label: 'Monthly Contribution ($)', min: 0, max: MAX_AMOUNT, step: 0.01, rangeMax: 20_000, rangeStep: 100, prefix: '$' },
    { key: 'years' as const, label: 'Time Horizon (Years)', min: 1, max: MAX_WEALTH_YEARS, step: 1, rangeMax: MAX_WEALTH_YEARS, rangeStep: 1, prefix: '' },
    { key: 'tfsaSavingsRate' as const, label: 'TFSA Savings Annual Rate (%)', min: 0, max: 100, step: 0.01, rangeMax: 10, rangeStep: 0.05, prefix: '' },
    { key: 'customRate' as const, label: 'Custom Rate (%)', min: -99.99, max: 100, step: 0.01, rangeMax: 20, rangeStep: 0.25, prefix: '' },
  ];

  return (
    <div className="card wealth-comparison-card" aria-label="Wealth and savings growth calculator">
      <div className="card-head">
        <p className="card-kicker">Wealth &amp; Savings Growth Calculator</p>
        <span className="tag">Illustrative, not a forecast</span>
      </div>
      <p className="card-note">
        Adjust any value to update the chart. Regular Savings and TFSA Savings are separate alternatives, each using an editable illustrative 0.30% annual-rate assumption; this is not a universal TFSA return. GIC rates are benchmark assumptions, not a live quote. Enter a hypothetical effective annual return to show an investment fund illustration; it is assumed after fees, illustrative, and not guaranteed.
      </p>
      <div className="wealth-controls">
        {controls.map((control) => {
          const number = numeric(values[control.key]);
          const rangeValue = Number.isFinite(number) ? Math.min(control.rangeMax, Math.max(control.min, number)) : control.min;
          const fieldId = `${id}-${control.key}`;
          return (
            <div className="wealth-control" key={control.key}>
              <label htmlFor={fieldId}>{control.label}</label>
              <div className="wealth-number-input">
                {control.prefix && <span aria-hidden="true">{control.prefix}</span>}
                <input
                  id={fieldId}
                  type="number"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={values[control.key]}
                  onChange={(event) => update(control.key, event.target.value)}
                />
              </div>
              <input
                type="range"
                min={control.min}
                max={control.rangeMax}
                step={control.rangeStep}
                value={rangeValue}
                disabled={control.key === 'customRate' && !values.customRate.trim()}
                aria-label={`Adjust ${control.label.toLowerCase()}`}
                onChange={(event) => update(control.key, event.target.value)}
              />
            </div>
          );
        })}
      </div>

      {projected.valid ? (
        <>
          <WealthGrowthGraph
            years={projected.years}
            yearlyBreakdown={projected.yearlyBreakdown}
            visibleOptions={visibleOptions}
          />
          <div className="wealth-table-wrap">
            <table className="wealth-table">
              <caption>Comparison at year {projected.years}</caption>
              <thead>
                <tr>
                  <th scope="col">Option</th>
                  <th scope="col">Assumed annual rate</th>
                  <th scope="col">Ending Balance</th>
                  <th scope="col">Total Growth/Interest</th>
                  <th scope="col">Key Trade-Off</th>
                </tr>
              </thead>
              <tbody>
                {projected.options.filter((option) => visibleOptions.includes(option.id)).map((option) => (
                  <tr key={option.id}>
                    <th scope="row">{option.label}</th>
                    <td>{option.annualRate.toFixed(2)}% · {option.rateDescription}</td>
                    <td>{money(option.endingBalance)}</td>
                    <td>{money(option.totalGrowth)}</td>
                    <td>{option.tradeOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="field-error" role="alert">{Object.values(projected.errors)[0]}</p>
      )}
      <p className="card-note">
        The GIC model pools monthly contributions at each year-end; renewals beyond five years assume the same benchmark rate. No additional fees are deducted from the entered after-fee fund return. Check Tangerine’s current rates and terms before making decisions.
      </p>
      <p className="offering-links">
        Official details:{' '}
        <a href={getEntry('tng-savings-account')?.url} target="_blank" rel="noopener noreferrer">Savings Account</a>
        {' · '}
        <a href="https://www.tangerine.ca/en/rates/gic-rates" target="_blank" rel="noopener noreferrer">GIC rates</a>
        {' · '}
        <a href={getEntry('tng-investment-funds')?.url} target="_blank" rel="noopener noreferrer">Investment Funds</a>
      </p>
    </div>
  );
}
