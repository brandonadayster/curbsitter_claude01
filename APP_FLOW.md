# Application Flow and Website Content Contract

## Global navigation

Public: Home, How It Works, Pricing, Service Areas, Who We Help, FAQ, For HOAs, Sign In, Check My Address.  
Authenticated navigation is role-based and separate from public navigation.

## Homepage

### Hero

**Eyebrow:** Local trash-day concierge in Prescott, Arizona  
**H1:** Trash day, handled.  
**Body:** We roll your bins to the curb before pickup, bring them back after collection, and photo-confirm every visit.  
**Primary CTA:** Check My Address  
**Secondary CTA:** See How It Works  
**Trust line:** Bins out. Bins back. Photo-confirmed.

The address field appears in or directly below the hero. Do not bury conversion behind a generic contact form.

### Problem-to-value strip

- Safer for steep driveways and limited mobility.
- Reliable while traveling or managing a property remotely.
- Fewer cans left out and fewer HOA headaches.
- Proof after every rollout and return.

### How it works

1. Tell us where your bins live.
2. We roll them out during the evening-before window.
3. We return them after collection.
4. You receive photo confirmation and any exception notes.

### Who we help

Cards link to seniors/caregivers, snowbirds, vacation rentals/property managers, HOAs, and homeowners.

### Pricing preview

Show Home ($65/month, or $55/month billed quarterly) and Complete ($85/month, or $75/month billed quarterly) with a Monthly/Quarterly toggle that swaps each card's per-month price, and CurbSitter Enterprise as a custom proposal. Keep CurbSitter onDemand ($25/service) below the subscription offer. Bulk Pickup Coordination was removed (D-007 retired). Do not lead with a giant option matrix.

### Proof and trust

At launch, use founder story, operating standards, insurance status once verified, real interface screenshots, and real service photos with consent. Testimonial components remain hidden until real approved reviews exist.

### Service areas

Show selected active route cells, waitlist areas, and a map legend. Do not imply an entire zip code is open.

### FAQ preview

- Do I need to be home?
- What if the truck is late or skips my street?
- What if you cannot access the bins?
- Can I buy this for a parent or another property?
- Can I pause or cancel?

### Final CTA

**Never miss trash day again.**  
CTA: Check My Address

## Required public pages

| Route | Purpose |
|---|---|
| `/` | Main conversion page |
| `/how-it-works` | Service windows, proof, exceptions, first-service review |
| `/pricing` | Plans, one-time services, complexity policy, no-surprise pricing |
| `/service-areas` | Active/waitlist route cells and address check |
| `/service-areas/prescott` | Core local SEO page |
| `/seniors` | Safety, independence, caregiver purchase |
| `/snowbirds` | Remote oversight, pause/resume, proof |
| `/vacation-rentals` | Multi-property, turnover exceptions, overflow reporting |
| `/hoa` | Pilot, resident opt-in, selected coverage, reporting |
| `/trash-day-ondemand` | $39 service, active-route/capacity rules, and proof |
| `/bulk-trash-pickup` | Coordination scope, exclusions, and physical-placement quote flow |
| `/faq` | Objection and policy handling |
| `/contact` | Sales/support pathways |
| `/waitlist` | Route progress and referral sharing |
| `/login` | Customer/runner/admin auth entry |
| `/terms`, `/privacy`, `/accessibility`, `/sms-terms` | Legal and compliance |

Create neighborhood pages only when they contain real service or waitlist data and unique local content. No thin doorway pages.

## Address qualification outcomes

### Active and available

Show plan selection and continue.

### Active but requires review

Explain what triggered review (for example, driveway/access/route edge) without exposing internal scoring. Collect details and payment authorization only if the owner-approved policy permits; otherwise collect a quote request.

### Waitlist

Show the actual route-cell status, personal referral link, current verified progress, and email/SMS preference. Never invent progress.

### Capacity full

Join priority list; do not accept a subscription the route cannot serve.

### Unavailable

Provide a plain explanation and waitlist/expansion-interest option. Do not pretend the route is "almost open."

## Four-stage onboarding

### Stage 1 - Where is the service?

- Address autocomplete.
- Unit/suite when applicable.
- Service for self or someone else.
- Route-cell eligibility result.

### Stage 2 - Who should we contact?

- Payer/account owner.
- Service recipient/property contact.
- Optional caregiver/property manager recipients.
- Email required.
- Mobile optional unless SMS selected.
- Transactional and marketing consent separated.

### Stage 3 - How does the property work?

- Plan or one-time service.
- Bin count and types.
- Collection provider and day(s), with "not sure" option for admin verification.
- Bin storage location.
- Curb placement notes.
- Driveway length/grade, stairs, gate, garage, lock, animals, lighting, and hazards.
- Secure access fields stored separately.
- Upload optional reference photos.
- One-Time Trash Day may replace a subscription selection. Bulk Pickup Coordination is secondary. Home Watch and Host Shield are not public launch choices.

### Stage 4 - Review and activate

- Plain-language summary.
- Monthly or prepaid-quarterly price, payment method, recurrence, one-time charges, credits, and next billing date.
- Service windows and first-service/admin-review notice.
- Terms, privacy, electronic communications, photo, and SMS consent.
- Stripe payment.
- Success status: `Pending property and route review` until approved.

## Customer portal routes

- `/app` overview.
- `/app/properties` and `/app/properties/[id]`.
- `/app/service-history`.
- `/app/exceptions`.
- `/app/billing` -> Stripe portal.
- `/app/notifications`.
- `/app/referrals`.
- `/app/support`.

## Runner routes

- `/runner` shift/route overview.
- `/runner/routes/[id]` ordered stops.
- `/runner/tasks/[id]` task execution.
- `/runner/offline` queued actions and retry status.
- `/runner/incidents/new` safety/incident report.

## Admin routes

- `/admin` operational dashboard.
- `/admin/reviews` serviceability approvals.
- `/admin/route-cells`.
- `/admin/routes` and `/admin/routes/[id]`.
- `/admin/cycles` and `/admin/exceptions`.
- `/admin/accounts`, `/admin/properties`, `/admin/subscriptions`.
- `/admin/waitlist` and `/admin/referrals`.
- `/admin/reports`.
- `/admin/config` guarded business configuration.

## Critical edge cases

- Hauler arrives early.
- Hauler is late, skips the street, or leaves one bin full.
- Holiday schedule changes.
- Gate code fails or customer changes access.
- Bin is missing, blocked, overweight, contaminated, damaged, or moved.
- Aggressive animal or unsafe weather/terrain.
- Customer pauses after tasks are generated.
- Payment fails after a route is scheduled.
- Duplicate webhook or duplicate photo upload.
- Runner loses signal mid-stop.
- Payer and service recipient disagree on instructions.
- Property changes collection provider/day.

Each edge case must have a state transition, customer message, admin owner, and retry/closure rule.
