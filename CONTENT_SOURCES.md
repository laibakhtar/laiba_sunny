# Content sources and review status

Runtime knowledge: `src/shared/knowledge.ts`. Offerings shown to customers: `src/shared/offerings.ts`, built only from the entries below. Scripted answers: `src/data/education.ts`, which cites the same entries.

- **Verification status:** every entry below was retrieved and checked by the team on the date shown (**2026-10-21** for the original entries, **2026-10-24** for the wealth entries). “Page date” is the date shown on the page, if any.
- **Approval:** nothing here has been reviewed or approved by Tangerine, Scotiabank, compliance or a content owner.
- **Data rule:** the prototype sends only synthetic customer data and these public sources to Google Gemini.

## Source priority in Sunny

Tangerine pages are Sunny’s first-party source of truth for Tangerine products, features, fees, availability and services. When a Tangerine page covers the question, Sunny should rely on and cite it first. CRA, FCAC and CDIC entries are not included in the live answer context by default: Sunny brings them in only when the customer asks for an agency or official/independent guidance, asks to compare beyond Tangerine, or agrees after Sunny explains a Tangerine source does not cover the question. When requested, external sources support general or regulatory facts that Tangerine pages do not establish; they do not replace Tangerine sources for Tangerine-specific product claims.

## Product catalogue (reviewed 2026-11-09)

The integration-ready catalogue is `src/shared/catalogue.ts`. It covers Chequing, CAD and USD Savings, TFSA, RSP, RIF, GICs, Investment Funds, three credit-card products, mortgage, HELOC, Line of Credit and RSP Loan. Each profile carries general use cases (not suitability recommendations), eligibility, rate handling, fees, limitations, open questions and official source links. These entries are also added to `src/shared/knowledge.ts` so live Sunny can retrieve and cite them.

Rates that vary or are shown dynamically are deliberately stored as `null` with a live Tangerine rates link rather than copied as stale values. Investment Fund management and administration fees are stored as shown on the reviewed Tangerine page. Promotions are separate records and include eligibility, conditions, and dates when published; they were observed on Tangerine pages on 2026-11-09. The catalogue includes the $250 payroll offer, a 4.50% new-client savings rate advertised for up to five months, credit-card bonuses, the 3% Tangerine Wealth bonus, the Refer a Friend bonus and a Shell fuel offer. Runtime retrieval suppresses cached promotions more than seven days after review and those outside a published date window. The savings offer page displayed a 4.50% rate, but its retrieved terms contained unresolved date/rate placeholders, so Sunny must direct customers to verify the applicable offer rather than promise the rate. The Money-Back Credit Card page retrieved on 2026-11-19 displayed a 20.95% purchase rate (not the 19.95% value in the initial request); the live page is authoritative for rates. The requested World and World Elite slugs returned 404, so the live credit-card comparison page’s official links were used instead: `world-credit-card` and `world-elite-mastercard`.

**Growth calculator assumptions (reviewed 2026-11-19):** Tangerine’s Savings Account calculator states a 0.30% current interest-rate assumption and warns that it may change. The live GIC rates page returned unresolved dynamic placeholders, so the calculator’s 3.60% (1-year), 3.95% (3-year) and 4.05% (5-year) values are prototype benchmarks, not verified live Tangerine quotes; the UI labels them accordingly and directs customers to check current rates. Fund illustrations require a customer-entered hypothetical effective annual return assumed after fees, converted to an equivalent monthly rate with end-of-month contributions; no additional fees are deducted. Returns are not guaranteed.

**FHSA status:** Tangerine does not currently offer an FHSA. Tangerine’s The Juice first-home article explains the FHSA and Home Buyers’ Plan in its educational context, while its AI-information page lists FHSAs as an education topic; neither means that Tangerine offers the account. Customers often explore Tangerine TFSA or RSP accounts for a first-home goal. CRA/FCAC details are used only when Tangerine’s sources do not cover a specific rule or the customer asks for government guidance.

## Tangerine (offerings and resources)

| Entry id | Page | URL | Reviewed | Used for |
|---|---|---|---|---|
| tng-savings-account | Savings Account | https://www.tangerine.ca/en/personal/save/savings-account | 2026-10-21 | No monthly fee or minimum; daily interest; up to 10 accounts; Automatic Savings Program |
| tng-tfsa-options | TFSAs | https://www.tangerine.ca/en/personal/invest/tfsa | 2026-10-21 | TFSA Savings / Tax-Free GIC / Tax-Free Investment Fund Account; no fees while funds stay; transfer-out fee |
| tng-tfsa-savings | TFSA Savings Account | https://www.tangerine.ca/en/personal/save/tfsa | 2026-10-21 | “Never locked in, no minimums” |
| tng-money-back-card | Money-Back Credit Card | https://www.tangerine.ca/en/personal/spend/credit-cards/money-back-credit-card | 2026-11-19 | $0 annual fee; 2% in 2 chosen categories (3 with rewards deposited to Tangerine Savings) and 0.5% otherwise; no total cash-back cap; 20.95% purchase and 22.95% cash-advance/standard balance-transfer rates; live rates/terms |
| tng-money-back-world | Money-Back World Mastercard | https://www.tangerine.ca/en/personal/spend/credit-cards/world-credit-card | 2026-11-19 | $0 annual fee; same unlimited 2% / 0.5% rewards; Rental Car Collision/Loss Damage and Mobile Device Insurance; Mastercard Travel Pass membership; $50,000 personal / $80,000 household / $250,000 assets-under-management eligibility thresholds |
| tng-rewards-world-elite | Rewards World Elite Mastercard | https://www.tangerine.ca/en/personal/spend/credit-cards/world-elite-mastercard | 2026-11-19 | $120 annual fee; 1.5 Scene+ points per $1 in 3 categories and 1 point otherwise; 4 annual lounge visits and insurance benefits; $80,000 personal / $150,000 household / $400,000 assets-under-management eligibility thresholds |
| tng-rsp-options | RSPs | https://www.tangerine.ca/en/personal/invest/rsp | 2026-10-24 | RSP Savings / RSP GIC / RSP Investment Fund Account; deductible contributions; taxable withdrawals with withholding; $50 transfer-out fee |
| tng-gic | Types of GICs | https://www.tangerine.ca/en/personal/invest/guaranteed-investments | 2026-10-21 | Terms; no minimum; not cashable before maturity except approved hardship |
| tng-investment-funds | Mutual Fund Investments in Canada | https://www.tangerine.ca/en/personal/invest/mutual-funds | 2026-10-24 | Core, Global ETF, Socially Responsible portfolios; Money Market Fund; management fees 0.80% / 0.50% / 0.55% + 0.15% administration fee; not guaranteed or CDIC-insured; risk of loss; account types |
| tng-advisors | Tangerine Advisors | https://www.tangerine.ca/en/personal/invest/advisors | 2026-10-24 | Phone/video consultations, booked online; no commissions based on what clients choose |
| tng-saving-vs-investing | What’s the difference between saving and investing? (Nov 22, 2023) | https://www.tangerine.ca/en/thejuice/invest/whats-the-difference-between-saving-and-investing | 2026-10-24 | Saving vs investing, timeframes, trade-offs |
| tng-beginners-guide | A beginner’s guide to investing (Jan 10, 2024) | https://www.tangerine.ca/en/thejuice/invest/a-beginners-guide-to-investing | 2026-10-24 | Account “container” vs products inside |
| tng-chequing-vs-savings | Chequing vs. savings accounts (June 20, 2024) | https://www.tangerine.ca/en/thejuice/save/chequing-vs-savings-accounts-your-questions-answered | 2026-10-24 | Purpose of chequing vs savings (answers “why not leave it in chequing?”) |
| tng-contact | Contact Us | https://www.tangerine.ca/en/help-centre/contact-us | 2026-10-21 | Phone numbers, live chat |
| tng-fhsa-status, tng-about | Official Information about Tangerine for AI Systems (Aug 2026) | https://www.tangerine.ca/en/ai-information | 2026-11-19 | Tangerine does not currently offer an FHSA; FHSA education topic; Scotiabank subsidiary, CDIC member |
| tng-mortgage | Mortgages: Fixed & Variable Mortgage Loans | https://www.tangerine.ca/en/personal/borrow/mortgage | 2026-10-21 | Optional first-home branch only |
| tng-first-home-article | How to save for your first home (July 8, 2024) | https://www.tangerine.ca/en/thejuice/borrow/how-to-save-for-your-first-home | 2026-11-19 | FHSA and HBP in educational context; dated government figures are not treated as current |

## Government and agencies (general education)

| Entry id | Publisher: page | URL | Reviewed | Page date |
|---|---|---|---|---|
| fcac-goals | FCAC: Setting savings and investment goals | https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/savings-investment-goals.html | 2026-10-24 | 2026-08-19 |
| fcac-investing-basics | FCAC: Basics of investing | https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/investing-basics.html | 2026-10-24 | 2025-10-20 |
| fcac-gic-rights | FCAC: GICs and term deposits: know your rights | https://www.canada.ca/en/financial-consumer-agency/services/rights-responsibilities/rights-investing/rights-guaranteed-investment-certificates.html | 2026-10-24 | 2025-10-15 |
| gov-rrsp | CRA: Registered Retirement Savings Plan (RRSP) | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/registered-retirement-savings-plan-rrsp.html | 2026-10-24 | 2026-05-07 |
| gov-tfsa | CRA: What is a TFSA | https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/what.html | 2026-10-21 | 2026-09-17 |
| cdic-coverage | CDIC: What’s covered | https://www.cdic.ca/your-coverage/whats-covered/ | 2026-10-21 | not shown |
| cdic-gic | CDIC: GICs | https://cdic.ca/?p=116 | 2026-10-21 | not shown |
| fcac-emergency-fund | FCAC: Limiting future debt | https://www.canada.ca/en/financial-consumer-agency/services/debt/limiting-debt.html | 2026-10-21 | 2025-10-14 |
| gov-fhsa-*, gov-hbp, fcac-down-payment, fcac-buying-home, fcac-preparing-mortgage | CRA / FCAC home-buying pages | see knowledge.ts | 2026-10-21 | various |

## Review gaps and open questions (Sunny is told not to fill these)

1. **FHSA at Tangerine:** Tangerine does not currently offer an FHSA. Its educational material discusses the account and Home Buyers’ Plan; current tax and contribution rules remain subject to CRA guidance.
2. **Investment funds:** minimum investment amounts and total MER figures aren’t on the reviewed page. Sunny states the listed management and administration fees, plus “other fund expenses”.
3. **Advisor service:** fees, minimums and eligibility aren’t stated. Individual advisor names on the page were deliberately not recorded.
4. **CDIC coverage of specific Tangerine products** isn’t stated on Tangerine pages. Sunny gives CDIC’s general rules only.
5. **Contact hours** conflict between two Tangerine pages, so Sunny avoids stating hours.
6. **Promotions:** the RSP and TFSA pages show promotional rates and bonuses. These were deliberately not recorded.
7. **Debt vs investing:** Sunny uses only the FCAC’s general statement; there’s no Tangerine-specific guidance.

## Copy needing client review

- Insight-card and nudge wording (`src/components/Dashboard.tsx`, `src/domain/signal.ts` `explainSignal`), and the check-in wording (`src/conversation/script.ts`).
- Scripted answers marked `draft: true` (only `why_asking`), and all answer framing in `education.ts`.
- Sunny’s system instructions (`server/prompt.ts`): advice boundary, “not yet assigned” language, and the availability rules.
- Live Gemini replies can paraphrase beyond the entries. A content owner should review sample transcripts.
