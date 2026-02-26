\

# RunwayCtrl — Front-End Guidelines (Console + Docs UI) (v0.1)

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Product    | RunwayCtrl                                                                  |
| Doc Type   | Front-End Guidelines                                                        |
| Version    | v0.1                                                                        |
| Date       | January 21, 2026                                                            |
| Applies To | RunwayCtrl Console (minimal read-only dashboard in v0.1, expanded in v0.2+) |
| Status     | Active — dashboard is in v0.1 scope                                         |

---

## 0) v0.1 Dashboard Scope

**Interactive read-only dashboard shipping in v0.1:**

- Actions list + detail view (with collapsible side panel drill-down)
- Attempts list + detail view
- Scoreboard (bento grid: duplicates prevented, retries governed, leases active, circuit health)
- **Integration Health Panel** (per-provider connection status + rate limit gauges for Jira / ServiceNow / GitHub)
- Insights / analytics screen (cost efficiency, tool performance, per-provider trends, rate limit impact)
- Command palette (Cmd+K / Ctrl+K) for global search
- Dark mode first, light mode toggle
- No editing/policy management (read-only)

**2026 Design Language:**
- Bento grid layout (asymmetric card grid for scoreboard + insights)
- Glassmorphism depth (subtle frosted glass on cards, layered shadows)
- Micro-interactions (hover reveals, animated number counters, pulsing status dots)
- Inline sparklines in table cells (latency trends, volume trends)
- Collapsible side panels for drill-down (no full-page navigation for quick forensics)
- Skeleton loading everywhere (no spinners)
- `prefers-reduced-motion` respected globally

Once we expand (v0.2+), front-end decisions become expensive to unwind. This document keeps the UI from turning into a "random walk of components."

Use this for:

- v0.1 minimal read-only dashboard
- v0.2+ expanded console
- design partner console
- eventual customer console
- docs site patterns (if integrated)

---

## 1) Product UI goals (what the console is for)

The RunwayCtrl Console exists to help teams **operate** governed execution:

1. **Forensics**: “What happened?” (action → attempts → events → tool calls)
2. **Control**: “What’s the policy doing?” (budgets, leases, backoff, circuiting)
3. **Confidence**: “Is it working?” (metrics, violations, drift, storms prevented)
4. **Safety**: “Are we about to melt prod?” (rate limits, queue depth, hot resources)

If the UI isn’t answering one of those, it’s probably decoration.

---

## 2) UX principles (non-negotiable)

1. **Operational clarity > visual flair**
   - Prefer tables, timelines, and clear labels over fancy charts.
2. **Make the happy path boring; make failures loud**
   - Success should be calm. Unknown/Failure should jump out.
3. **Everything is filterable**
   - Tool, action, tenant, time range, status, resource_key, attempt_id, trace_id.
4. **Every screen must have a “copy link”**
   - Operators share URLs in incidents; deep-links are critical.
5. **Time is the axis**
   - Most views should pivot around time and chronology.
6. **No dark patterns**
   - No confusing toggles, hidden defaults, or ambiguous destructive actions.

---

## 3) IA (Information Architecture) — recommended structure

### Primary navigation

- **Actions**
  - Search / list / detail (with side panel drill-down)
- **Attempts**
  - Search / list / detail
- **Scoreboard**
  - Bento grid: hero metrics + animated counters
- **Integrations**
  - Per-provider connection health (Jira / ServiceNow / GitHub)
  - Rate limit gauges (provider-specific: Jira 4-pool, ServiceNow shared, GitHub standard)
  - Integration status summary bar
- **Insights**
  - Cost efficiency, tool performance, trends, hotspots
  - Rate limit impact analysis
  - Per-provider breakout views
- **Policies**
  - Budgets, backoff, circuiting (view + versioning later)
- **Resources**
  - Hot resource keys, lease contention, coalescing stats
- **Observability**
  - Trace linking, metric dashboards (or links to OTel backend)
- **Admin**
  - Tenants, API keys, retention, redaction settings

Keep nav short. Anything else becomes a second-order page inside the above.

---

## 4) Canonical screen patterns

### 4.1 Actions List (table-first)

**Primary purpose:** find an action quickly, understand status and impact.

Columns (suggested):

- time (created/updated)
- tool / action
- status (SUCCESS / FAILURE / UNKNOWN / IN_FLIGHT)
- action_key (shortened)
- resource_key (shortened)
- attempts (count)
- latency (p50/p95 per action optional)
- tenant (if multi-tenant console)

Table requirements:

- sticky header
- column sorting
- server-side pagination
- “copy action_key” and “copy deep link” affordances
- status chips + icons

### 4.2 Action Detail (timeline + metadata)

**Primary purpose:** reconstruct “what happened” in minutes.

Layout:

- Header: tool + action + status + action_key + tenant + time range
- Key-value panel: resource_key, dedupe window, terminal outcome pointer
- Timeline: attempt events in chronological order
- Attempts section: each attempt expandable with tool request/response metadata
- Trace links: open in OTel backend (or local trace view)

### 4.3 Attempts List / Detail

Attempts are the unit of execution. Treat them like “flight recorder entries.”

Attempt detail should show:

- attempt_id, action_key, status, failure_class
- lease state changes
- governor decisions (budget remaining, backoff applied, circuit state)
- request hash / outcome pointer / outcome hash
- trace_id + span_id + “open in trace viewer”

### 4.4 Policy View (read-only first)

v0.2 should start with **read-only policy visibility** before editing:

- effective budgets per tool/resource
- current circuit states
- recent denials (why, when)
- backoff plans applied recently

Editing policies is powerful; don’t ship edits without versioning + audit.

### 4.5 Resource Hotspots

A “heat map” page that surfaces:

- most contended resource_keys
- highest retry rates
- highest UNKNOWN rates
- longest lease waits
- top 429/5xx tools and endpoints (if available)
### 4.5A Integration Health Screen (NEW — per-provider connection + rate limits)

> **This is the "hotel connection" dashboard** — each integration is a connection with health, latency, and quota status. Answers: "Are my integrations healthy? Am I about to hit a rate limit?"

**Layout:**

- **Top — Integration Summary Bar:**
  - 3 provider icons with live pulsing status dots: Jira (●) ServiceNow (●) GitHub (●)
  - Overall: "All healthy" / "1 degraded" / "2 rate-limited"
  - Click icon → scroll to provider card

- **Main — Provider Connection Cards** (one per configured integration, bento grid):

  - **Jira Cloud Card:**
    - Connection status: pulsing dot (green/amber/red) + last successful call timestamp
    - Success rate (last 1h): large % + sparkline
    - 4 radial gauges (Jira's points-based rate limit pools):
      - Global quota (`jira-quota-global-based`) — consumed/remaining
      - Tenant quota (`jira-quota-tenant-based`) — consumed/remaining
      - Burst budget (`jira-burst-based`) — consumed/remaining
      - Per-issue-on-write (`jira-per-issue-on-write`) — **amber border at > 60%** (most likely to bite)
    - Rate limit trend: mini line chart (quota consumption over last 1h)
    - Last 429: timestamp + action name (or "None in range")
    - Hover: expand raw header values from last response

  - **ServiceNow Card:**
    - Connection status: pulsing dot + last successful call timestamp
    - Success rate (last 1h): large % + sparkline
    - 1 radial gauge (shared instance pool):
      - Instance pool: estimated usage against ~100K req/hr shared pool
      - Thresholds: green (< 40%), amber (40–70%), red (> 70%)
      - Warning banner: "Shared instance — other apps count against this pool"
    - Last 429: timestamp + action (or "None")
    - Hover: expand raw header values

  - **GitHub Card:**
    - Connection status: pulsing dot + last successful call timestamp
    - Success rate (last 1h): large % + sparkline
    - 2 gauges:
      - Primary rate limit: `X-RateLimit-Remaining` / `X-RateLimit-Limit` radial gauge
      - Reset timer: countdown "resets in Xm Ys" (derived from `X-RateLimit-Reset`)
    - Last 403-rate-limit: timestamp + action (or "None")
    - Hover: expand raw header values

- **Bottom — Rate Limit Alerting (visual indicators, read-only):**
  - Amber badge when any gauge > 60%
  - Red badge when any gauge > 85%
  - Animated attention pulse on red (subtle, respects `prefers-reduced-motion`)

**UX notes:**

- Rate limit data is derived from captured response headers on attempts — not real-time API polling.
- If no recent data (> 1h since last call): "Stale — no recent activity" with dimmed gauge.
- Empty state: "No integration activity yet. Rate limit data will appear after the first tool execution."
- Radial gauges use CSS `conic-gradient` — no heavy chart library dependency.
- Each card can be expanded/collapsed independently (progressive disclosure).
### 4.6 Insights / Analytics Screen (Ledger Intelligence)

> Data source: `/v1/insights/*` endpoints (read from `execution_daily_stats`, never hot write path).

A cost optimization and execution intelligence dashboard that mines the durable ledger. **Interactive bento grid layout with per-provider breakout views.**

**Layout:**

- **Top row — Cost Efficiency Cards (bento grid, animated counters):**
  - Retry Waste % — `total_retry_waste / total_attempts` (lower is better; green/amber/red) + trend arrow (↑ worse / ↓ better vs previous period)
  - Replay Savings — count of `replay_hits` + "$ saved" estimate (configurable cost-per-call)
  - Budget Denial Rate — `budget_denials / total_actions` + per-tool breakdown on hover
  - Unknown Outcome Rate — `unknown_outcomes / total_actions` (pulsing amber border when > 5%)

- **Middle — Tool Efficiency Table (interactive):**
  - Columns: tool, action, success rate (cell-embedded bar chart), avg latency (sparkline), p95 latency, retry cost, replay rate
  - Sortable by any column (click header)
  - Filterable by tool (dropdown or command palette)
  - Inline sparklines in latency columns (last 7 data points per tool/action)
  - Row click → drill-down to per-action detail (filtered Actions List in side panel)
  - **Provider grouping toggle:** group rows by integration provider (Jira / ServiceNow / GitHub) with collapsible sections

- **Bottom left — Trend Charts (animated):**
  - Daily action volume (7d / 30d / 90d selector) — area chart with gradient fill
  - Daily retry waste trend — line chart with threshold indicator (red line at "wasteful" threshold)
  - Unknown outcome trend — line chart with danger zone shading (red fill above threshold)
  - **Per-provider volume overlay:** toggle to split trends by Jira / ServiceNow / GitHub (stacked area chart)

- **Bottom right — Hotspots Panel (interactive):**
  - Top 10 tools/actions by retry waste — horizontal bar chart, click to drill
  - Top 10 by lease contention — horizontal bar chart, click to drill
  - Visual indicators: efficiency scores (green/amber/red gradient bars)
  - **Provider-specific hotspot tabs:** separate views for Jira / ServiceNow / GitHub hotspots

- **NEW — Rate Limit Impact Panel:**
  - Correlation view: 429 events overlaid on action volume chart (dual-axis timeline)
  - Per-provider breakdown: which integration is causing the most 429s?
  - "Rate limit efficiency" metric: 429s prevented by RunwayCtrl governor vs. 429s that leaked through
  - Trend: rate limit events over time with provider color-coding

**UX notes:**

- Time range selector (7d, 30d, 90d) applies globally to all panels.
- Empty state: "No execution data yet — insights will appear after the first aggregation run."
- Loading: use skeleton cards matching the card layout (no spinners).
- All numbers should have tooltips explaining what they mean.
- Per-provider icons (Jira blue, ServiceNow green, GitHub gray) used consistently for color-coding.
- All drill-downs open in the collapsible side panel (no full-page navigation).

---

## 5) Visual design system (minimal, durable)

### 5.1 Tone

- Modern, clean, utilitarian.
- “Datadog-ish clarity” but with less noise.

### 5.2 Typography

- Use a highly-legible sans-serif.
- Prefer 14–16px base for readability.
- Monospace for IDs/hashes (attempt_id, action_key, trace_id).

### 5.3 Layout & spacing

- 8px spacing grid.
- Dense tables are okay, but never cramped:
  - 12–16px row padding for primary tables.
- Max content width for detail pages: ~1200px (avoid ultra-wide scanning fatigue).

### 5.4 Color semantics (status-first)

Colors must be tied to meaning, not vibes:

- SUCCESS: calm/positive
- FAILURE: urgent
- UNKNOWN: caution (distinct from failure)
- IN_FLIGHT: neutral/active

Also:

- RATE_LIMIT vs TIMEOUT vs AUTH errors should have distinct labels even if colors are shared.

### 5.5 Icons

Use a consistent icon set (single library).

- Icons should communicate state and action, not decoration.

---

## 6) Accessibility (ship it like you mean it)

Minimum target: **WCAG 2.1 AA**.

Requirements:

- Keyboard navigation for all interactive components
- Visible focus outlines
- Proper ARIA labels on icon buttons
- Color is never the only signal (pair with labels/icons)
- Tables: accessible headers and row/column associations
- Motion: reduce when “prefers-reduced-motion” is set

---

## 7) Performance guidelines (operational UI must be fast)

- Prefer server-side pagination and filtering for tables.
- Use virtualization for large tables when needed.
- Lazy-load heavy panels (e.g., attempt events timeline).
- Cache list queries; avoid refetch storms on filter changes (debounce).
- Keep page interactive within 1–2 seconds on typical corp laptops.

---

## 8) Data display and redaction (safety-by-default)

The console will inevitably display sensitive metadata.

Rules:

- Default to showing **hashes/pointers**, not raw payloads.
- Provide a redaction layer for:
  - email addresses, tokens, phone numbers, secrets
- Make “show raw payload” an explicit opt-in per tenant + role.

Never render secrets in the browser.

---

## 9) Copy and microcopy (operator-friendly)

- Use exact terms from the system: ActionKey, Attempt, ResourceKey, Lease.
- Avoid euphemisms (“oops!”) and avoid blamey language.
- Prefer: “Timed out — outcome unknown” vs “Failed.”
- For denials: always include “why” and “what to do next”
  - “Denied: budget exhausted. Retry after 38s.”

---

## 10) Front-end tech stack recommendation (when UI starts)

When you build the console, keep it boring where it matters and modern where users feel it:

- **Next.js (React)** for app shell and routing
- **TypeScript** everywhere
- **Tailwind CSS** for consistent utility styling
- **Component library**: shadcn/ui (Radix primitives) — for tables, dialogs, menus, command palette, toasts
- **Tables**: TanStack Table (with inline sparklines via custom cell renderers)
- **Data fetching**: TanStack Query (with background refetch for live-feel data)
- **Charts** (targeted): Recharts for area/line charts + trend sparklines; CSS `conic-gradient` for radial gauges (no heavy chart dependency for rate limit gauges)
- **Command palette**: cmdk (shadcn/ui wraps this) — Cmd+K global search
- **Animations**: Framer Motion for micro-interactions, route transitions, number counters (respect `prefers-reduced-motion`)
- **Auth**: simple token-based session in v0.2; SSO later
- **Dark mode**: Tailwind CSS dark variant + `next-themes` for system preference detection + toggle

This mirrors the dev-first ergonomics of the rest of RunwayCtrl.

---

## 11) Component checklist (build once, reuse forever)

**Core components:**
- Status chip (SUCCESS/FAILURE/UNKNOWN/IN_FLIGHT) with micro-animation (pulse on UNKNOWN)
- Copy-to-clipboard button with confirmation toast
- Time range picker (absolute + relative, sticky global)
- Filter bar (tool/action/status/tenant)
- ID renderer (monospace + truncation + copy)
- Timeline component (attempt events, animated expansion)
- Empty state component (with actionable guidance)
- Error banner (with correlation IDs + retry hints)
- "Open in Trace" link component

**New — 2026 interactive components:**
- Command palette (Cmd+K) — global fuzzy search across actions, attempts, resource_keys
- Collapsible side panel — slide-over detail view (right edge, 400px width, close on Escape)
- Animated number counter — smooth count-up on load, locale-formatted
- Inline sparkline — 7-point mini chart rendered in table cells (SVG, ~60×20px)
- Radial gauge — CSS `conic-gradient` based, configurable thresholds (green/amber/red)
- Provider status dot — live pulsing indicator (CSS animation, 3 states: healthy/degraded/down)
- Integration card — provider-specific card with connection health, gauges, and expandable detail
- Bento card — asymmetric grid card with glassmorphism depth (backdrop-filter: blur)
- Hover reveal panel — extra detail on hover (200ms delay, fade-in)
- Skeleton card — matches exact layout of target card (for loading states)
- Dark/light mode toggle — with smooth transition (150ms cross-fade on `<html>` class toggle)

---

## 12) Observability in the UI itself

Instrument the console so you can debug it:

Track:

- page load timings
- query latency
- error rates by endpoint
- user paths (anonymous, non-PII)
- “rage clicks” (optional) for UX tuning

Attach correlation IDs to every UI-initiated API call.

---

## 13) Rollout strategy (practical)

- v0.1: read-only console (Actions, Attempts, Scoreboard, Integration Health, Insights) — dark mode first, bento layout, command palette
- v0.2: design partner console (multi-tenant views, policy visibility, expanded analytics)
- v0.3: policy editing with versioning + approvals + audit trails
- v0.4: real-time WebSocket updates, advanced anomaly detection in Insights

---

## 14) Definition of Done (for any UI feature)

A UI feature is not “done” unless:

- it has deep-linking (shareable URL for incidents)
- it has filters/search where applicable (including command palette)
- it has empty/error/stale states
- it meets accessibility basics (WCAG 2.1 AA)
- it does not leak secrets or payloads
- it has UI telemetry hooks (basic)
- it works in dark mode and light mode
- it respects `prefers-reduced-motion`
- interactive elements (hover, drill-down, side panel) function correctly without mutations

---

## 15) Appendix — Standard status/failure taxonomy (UI labels)

### Status

- **SUCCESS**
- **FAILURE**
- **UNKNOWN**
- **IN_FLIGHT**
- **PENDING** (optional, for joins/subscriptions)

### Failure classes (examples)

- RATE_LIMIT
- TIMEOUT
- AUTH
- VALIDATION
- SERVER_ERROR
- BUDGET_DENIED
- LEASE_DENIED
- CIRCUIT_OPEN

Keep this taxonomy consistent between ledger, API, SDK, and UI labels.
