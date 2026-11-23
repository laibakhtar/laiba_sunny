# Sunny: proactive wealth-building assistant (concept prototype)

An interactive concept prototype for the Ivey MSc Advanced Field Project with Scotiabank/Tangerine.

> **Sunny turns banking activity into timely conversations that help customers understand their options and make progress toward their financial goals.**

> **Academic prototype · Synthetic data.** Not an official Tangerine application, not a production system, and not financial advice. Nothing here has been reviewed or approved by Tangerine. Use only synthetic customer data and public sources.

## Sunny's voice

Sunny is friendly, clear and approachable. It explains financial concepts in plain language, responds to stress without judgment, and is confident about verified information while being open about uncertainty and limitations. Sunny speaks as “I” when describing its help and uses “we” and “our” for verified Tangerine products and services. It encourages customers to explore without pressuring them to choose or buy anything.

## What makes Sunny valuable within Tangerine’s environment?

- **Account context.** Sunny lives inside the banking app. With the customer’s permission, it can use their real balances and activity instead of generic advice.
- **Timely initiation.** A deterministic signal (a chequing balance that stayed elevated for 90 days) gives Sunny a *reason to ask*. The customer doesn’t have to know what to ask first.
- **Relevant education.** Sunny answers the customer’s own questions first: saving vs investing, risk, TFSAs and RRSPs, GICs, funds and fees, in plain language with sources. Tangerine pages are prioritized for facts they cover; official government and agency sources are brought in when customers ask to explore beyond Tangerine.
- **Product discovery.** Vague requests to explore products get three relevant Tangerine starting options, with a “why it’s included” rationale and material trade-offs for each. Specific product or product-family questions stay focused on the item(s) asked about—for example, a credit-card question is answered with Tangerine credit cards, not unrelated savings accounts or GICs. Each of the three Tangerine credit cards has a clickable official next-step card; the prototype never collects underwriting details or submits applications. Tangerine does not currently offer an FHSA; its first-home education discusses FHSA, TFSA and RSP context without recommending an account. **Browse all Tangerine offerings** deterministically displays the complete catalogue. Eligibility, product risk and customer choice remain explicit, without repeating a generic suitability disclaimer on every turn.
- **Signup and offer next steps.** A signup prompt appears only for products Sunny has just shown (or when a customer directly asks to open/apply). Current payroll or credit-card offers are shown only when the customer explicitly confirms the relevant new-client or no-previous-Tangerine-card facts, the offer is current, and the related product is visible. Offer cards link to Tangerine’s terms and clearly say they do not confirm eligibility. Any application is completed on Tangerine’s site; Sunny does not collect application data, check approval or guarantee eligibility.
- **Continuity.** Sunny remembers the confirmed goal and the chosen next step, and picks it up on a later visit. The customer can change, snooze or stop this.

## Quick start

Requires Node.js 22.18+ (tested with Node 24).

```bash
cd "/Users/sally/Downloads/Scotia AFP/sunny-prototype"
npm install          # first time only
npm run dev          # open http://localhost:5173
```

With `GEMINI_API_KEY` in `.env.local`, Sunny uses **live AI (Google Gemini)**. Without it, Sunny runs as a clearly labelled **scripted demo**, and the whole demo loop works in both modes.

### Live AI setup (Google Gemini, free tier)

1. Create a key in Google AI Studio: https://aistudio.google.com/app/apikey (preferably in a project without billing).
2. Run `cp .env.example .env.local`, then set `GEMINI_API_KEY=...` (and optionally `GEMINI_MODEL`; the default is `gemini-3.5-flash-lite`).
3. Run `npm run ai:check`, then restart `npm run dev`.

The key is read only by the local server, never sent to the browser, and never logged. Free-tier content may be used by Google to improve its products, which is another reason to use only synthetic data. There is no paid fallback.

## The demo loop

**Account signal → optional product exploration or goal conversation → customer-confirmed context → education and product exploration → customer-chosen next step → simulated later check-in.**

1. **Dashboard.** Shows chequing and savings balances, a 90-day balance view, recent activity, any confirmed goal, and one Sunny insight card. **Explore three products** opens a direct, optional product comparison with reasons and no inferred offer eligibility; **Explore with Sunny** starts the goal conversation. **This money is already set aside** and **Not now** remain available, along with a *Why am I seeing this?* disclosure built from the actual signal evidence. The bottom **Ask Sunny** entry remains available.
2. **Permission, per conversation.** In the goal conversation, Sunny explains the observation, then asks to use account details. *Keep it general* works too. The product-exploration entry does not send account details to the AI. Permission lasts for the current conversation only: a later visit asks again, and **Stop using my account details** (under the chat) revokes it immediately. Messages containing account details are never sent to the AI without current permission.
3. **What’s the money for?** Natural answers are understood: “I need $3,000 for bills and $10,000 for emergencies”, “That money is for tuition”, “I’m buying a home next year”, “I don’t have a plan”, “I have debt at another bank”. For Alex: $28,000 − $3,000 − $10,000 = **$15,000 not yet assigned to a purpose**. The $12,000 savings balance is not added. Allocations above the balance trigger a clarification.
4. **Goal.** “What would you like this money to help you do?” There is no forced numerical target.
5. **Education and offerings.** Sunny explains first and asks one follow-up (time horizon), then shows verified Tangerine offerings with features, fees, risks and official links. The initial set follows a shared goal + timeline rule (within a year: access and stability first; longer term: investment funds can appear; not sure: flexible options), and **Browse all Tangerine offerings** shows the full catalogue. Sunny tracks offerings it *showed* separately from ones the customer *opened*.
   Questions can be asked at any point. After each answer Sunny offers 3–4 fresh, related follow-ups (never the question just answered), and **Explore other topics** under the chat opens the full topic menu without losing your place.
6. **Next step.** The customer chooses one: learn about risk, compare options, explore a scenario (contributions only, no return forecasts), read the official pages, prepare questions for a person, save for later, or not now. Nothing real happens.
7. **Summary.** Covers what prompted the conversation, what was confirmed, the goal, topics, offerings viewed, the next step and what’s still unknown. It can be printed.
8. **Later visit (simulated).** Use **Demo settings → Simulate a later visit (+30 days)**. Sunny says, for example: *“Last time, you wanted to understand investment risk before deciding what to do. Would you like to pick that up?”*. The options are **I did this** (recorded as done and not prompted again), **Continue**, **Choose another next step**, **Remind me later**, **Change my goal** and **Stop these check-ins**. This is a simulated clock; there is no background monitoring and no real notifications.

### Scenarios (Demo settings)

| Scenario | Synthetic data | What it shows |
|---|---|---|
| **A · Alex** | Chequing $28,000 (above $25,000 all 90 days), savings $12,000, income $5,200/mo, expenses $3,600/mo | The full wealth loop |
| **B · Priya** | Chequing above $25,000, saved for tuition | Sunny acknowledges the money is committed and doesn’t nudge again |
| **C · Sam** | Chequing rises and falls with pay and bills | No qualifying signal and no nudge; Sunny is still available via *Ask Sunny* |

Demo settings also include the signal rule (threshold, window, review flag, data availability, with a live check list), simulated time, the conversation engine (Live AI vs scripted), and **Reset this scenario** / **Reset all demo data**. Each scenario keeps separate synthetic memory in this browser only; reset clears it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | App and local API at http://localhost:5173 |
| `npm run build` / `npm start` | Production build, then app and API at http://localhost:3000 |
| `npm run ai:check` | Is Gemini configured and reachable? (prints no secrets) |
| `npm test` | All tests (model responses mocked) |
| `npm run check` | Type check, lint, tests and build |

## Prototype vs. production

| Works in the prototype | A production version would still need |
|---|---|
| Signal rule over 90+ days of synthetic daily balances, computed in the browser | Real data pipelines, validated thresholds, analytics and model-risk governance, consent records |
| Permission before account details reach the AI; minimum data sent | Real consent and privacy management, data residency and retention controls, audit logs |
| Validated tools: allocations, goals, horizon, next step, offerings, calculations | Integration with real product, eligibility and suitability processes; compliance review of all wording |
| Curated, source-cited knowledge base (checked Oct 21 and 24, 2026) | Content ownership, an approval workflow and scheduled re-verification |
| Simulated later visit using saved goal and next step | Real scheduling, notification preferences and frequency caps; no background monitoring exists here |
| Concept support preview; nothing is sent or booked | Real handoff to Tangerine Advisors or other support channels |
| Local server with a rate limit; Gemini free tier | Enterprise model hosting, security review, monitoring, SLAs |

## Limitations

- Live Gemini behaviour was tested on a limited set of conversations (see HANDOVER.md). Wording varies, and Google’s free tier can return “high demand” or quota errors; the app explains these and offers *Try again*.
- Scripted mode understands a fixed set of phrasings.
- Only one signal rule exists. Thresholds are prototype assumptions, not Tangerine policy.
- Sunny can’t see accounts outside Tangerine and doesn’t ask for them unless relevant.
- English only; no formal accessibility audit.
