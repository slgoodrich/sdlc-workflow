# Designing for Self-Running Operations

The goal: build a system that heals itself when things break and only
needs you for planned work, not firefighting. Not zero maintenance,
but on your terms, not the machine's.

---

## The Core Loop

<!-- CUSTOMIZE: Draw your project's core data/control loop. Example:
     ExternalSource → IngestionWorker → DataStore → ProcessingLayer → UserInterface → Users
-->

Every piece should be automated, monitored, and resilient.

### Critical Architecture Decision: No Runtime API Dependencies

The product should make **zero external API calls at request time**.
All external dependencies should be batch processes:

```
BATCH (async, scheduled):          RUNTIME (sync, user-facing):
┌─────────────────────┐            ┌─────────────────────┐
│  External sources   │            │                     │
│  Batch ingestion    │ ──────►    │   Your database     │ ──────► API ──► Users
│  Enrichment jobs    │  enrich    │  (your data)        │
└─────────────────────┘            └─────────────────────┘
     Can fail                           Fails independently
     Can be slow                        Always fast
     Rate limited                       No external limits
```

**Why this matters:**

- **External source goes down?** Users don't notice. Data is a few
  hours stale at worst.
- **Third-party API rate limits you?** Enrichment retries later. The
  product keeps serving.
- **Download/fetch fails?** Record still exists in the system, just
  partially enriched. Flag for retry.
- **Traffic spikes?** You're only hitting your own database, no
  third-party costs.

Data sources feed you. Dependencies can kill you. Keep them separate.

<!-- CUSTOMIZE: List the runtime dependencies that would take the product
     down if they fail (database, compute, frontend host). -->

<!-- CUSTOMIZE: List async external calls that are NOT on the request
     path (email delivery, enrichment APIs, etc.) and acceptable
     degradation for each. -->

**Worst case scenario**: <!-- CUSTOMIZE: describe what happens if your
primary data source is down for a week. What does the user still
see? What's the only loss? -->

---

## Component-by-Component Automation

<!-- CUSTOMIZE: List your project's components and how automated they
     are. Use this table structure: -->

| Component | Automation Level | What Could Break | Mitigation |
|---|---|---|---|
| **{component-1}** | {percent} | {risks} | {mitigation strategy} |
| **{component-2}** | {percent} | {risks} | {mitigation strategy} |
| **{component-3}** | {percent} | {risks} | {mitigation strategy} |

---

## What Actually Needs Human Attention

### Weekly

<!-- CUSTOMIZE: project-specific weekly tasks. Common items:
     - Check dashboards (ingestion counts, success rates, delivery)
     - Check billing / revenue / failed payments
     - Skim support inbox
     - Content work (marketing, community) -->

### Monthly

<!-- CUSTOMIZE: project-specific monthly tasks. Common items:
     - Review product quality metrics
     - Review third-party API changelogs
     - Review costs vs budget -->

### Quarterly/Yearly

<!-- CUSTOMIZE: project-specific quarterly/yearly tasks. Common items:
     - Dependency and infrastructure updates
     - Pricing adjustments
     - Tax/legal compliance
     - Security review -->

### Unpredictable (rare but spiky)

<!-- CUSTOMIZE: project-specific unpredictable risks. Common items:
     - Upstream API breaking changes
     - Pricing or deprecation of key dependencies
     - Security vulnerability in your stack
     - Viral moment (good or bad) -->

---

## Design Principles for Maximum Automation

### 1. Graceful Degradation

If an upstream source is down, serve existing data. If enrichment
fails, show the record without the enriched data. If a third-party
API is down, queue the operation for later. Users would rather have
partial data than an error page.

### 2. Idempotent Pipelines

Every pipeline stage must be safe to retry. Processing the same
input twice should not create duplicates (use unique external IDs).
Webhooks processed twice should not double-fire side effects.

### 3. Narrow Scope

Every feature you add is a thing that can break. Resist scope creep.

Questions to ask before adding anything:

- Does this increase ongoing maintenance?
- Can this break at 3am?
- Will users complain if this feature degrades?

### 4. Managed Infrastructure

Let other companies handle ops:

<!-- CUSTOMIZE: List your project's managed infrastructure providers.
     Common stack:
     - Frontend: Vercel / Netlify / Cloudflare Pages
     - Backend: Render / Fly.io / Railway
     - Database: Supabase / Neon / PlanetScale
     - Billing: Stripe
     - Email: Resend / Postmark / SendGrid
     - Monitoring: Sentry / Datadog / structured logs -->

You shouldn't be patching servers or managing Kubernetes.

### 5. Automated Deploys with Gates

CI/CD runs tests and linting before every deploy. If tests fail,
code doesn't ship. No manual deploys. The deploy pipeline is itself
infrastructure that must not require babysitting.

### 6. Minimize Support Surface

- Good docs and self-explanatory UX answer most questions before
  they're asked
- Email for account/billing only
- No phone support, no live chat
- Set expectations upfront: "Support responses within 1-2 business
  days"

### 7. Pipeline Observability

Track these metrics to know the system is healthy without babysitting
it:

<!-- CUSTOMIZE: project-specific metrics. Examples:
     - Records ingested per polling cycle (should be consistent; zero is an alarm)
     - Enrichment success rate (target: >90%)
     - Delivery success rate (target: >99%)
     - API response times (<200ms for dashboard queries) -->

Alert when any of these fall outside normal ranges. Don't alert on
expected variance.

### 8. Alerting

<!-- CUSTOMIZE: Does your primary data source have a public status
     page? If not, you need to detect outages yourself. Define the
     alert conditions below. -->

**Critical (alert immediately):**

<!-- CUSTOMIZE: critical alert conditions. Examples:
     - Primary source returns errors or zero results for 2+ consecutive cycles
     - Background worker crashes and doesn't restart
     - Delivery failure rate spikes above 5% -->

**Warning (alert within hours):**

<!-- CUSTOMIZE: warning alert conditions. Examples:
     - Enrichment success rate drops below 90%
     - Processing queue backs up
     - Polling returns significantly fewer results than baseline -->

**Informational (daily digest to yourself):**

<!-- CUSTOMIZE: informational metrics. Examples:
     - Records ingested today vs 7-day average
     - Third-party API costs for the day
     - Any retries that eventually succeeded (early sign of instability) -->

When a source is confirmed down, show a banner on the dashboard so
users know it's upstream, not you.

---

## What Could Kill the Dream

<!-- CUSTOMIZE: List the project-specific risks that could kill the
     product. For each, document the mitigation. Common categories: -->

### 1. <!-- CUSTOMIZE: Primary upstream dependency -->

**Risk**: <!-- CUSTOMIZE: describe the risk -->

**Mitigation**:

- <!-- CUSTOMIZE: mitigation strategies -->

### 2. <!-- CUSTOMIZE: Third-party service cost/quality -->

**Risk**: <!-- CUSTOMIZE: describe the risk -->

**Mitigation**:

- <!-- CUSTOMIZE: mitigation strategies -->

### 3. <!-- CUSTOMIZE: Platform or competitor risk -->

**Risk**: <!-- CUSTOMIZE: describe the risk -->

**Mitigation**:

- <!-- CUSTOMIZE: mitigation strategies -->

### 4. Your Own Burnout

**Risk**: Even modest weekly maintenance feels like a burden if you
resent it.

**Mitigation**:

- Automate the annoying parts first
- Accept that some things won't be perfect
- Take breaks — the system will survive a week of inattention
- If a component becomes a maintenance burden, simplify or cut it

---

## Checklist: Is It Self-Running?

Before launching, ask:

<!-- CUSTOMIZE: Add project-specific checklist items. Generic items below. -->

- [ ] Can the primary ingestion pipeline recover from failure
      automatically (retry + backoff)?
- [ ] Does a failed enrichment step degrade gracefully (record still
      visible, just without enriched data)?
- [ ] Does a failed third-party call get queued for retry, not
      dropped?
- [ ] Are webhook handlers idempotent (processing same event twice is
      safe)?
- [ ] Are there alerts for anomalies (zero records ingested,
      enrichment rate drop)?
- [ ] Can the API serve existing data if all upstream sources are
      down?
- [ ] Is billing 100% automated (no manual invoicing)?
- [ ] Is the product self-explanatory enough that most users never
      need support?
- [ ] Can you ignore it for a week without anything breaking?
- [ ] Can you ignore it for a month with only minor degradation
      (stale data, not errors)?

If yes to all: the system runs itself. "Self-running" doesn't mean
zero work. It means chosen work on your schedule, not reactive
firefighting.
