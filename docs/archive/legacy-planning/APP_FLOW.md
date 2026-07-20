# APP_FLOW.md: Complete User Journey Maps & Content Requirements

## 1. Unauthenticated State (Landing & Marketing)

* **`/` (Home) Hero Section:** Deep Onyx (`#0A0F1D`) background with a prominent, centralized Glassmorphism container. Primary headline is "Never miss trash day again." Sub-copy reads: "Prescott’s premium trash concierge. Bins out. Bins back. Done." The primary CTA is a large glowing input field prompting "Check Availability" via a 5-digit zip code.
* **`/` (Home) Value Proposition Section:** Interactive grid highlighting physical safety (protecting homeowners on steep, icy driveways), HOA compliance (automated rollout prevents fine notices), and STR protection (absentee owner peace-of-mind). Includes a new "Wildlife & Javelina Mess Cleanup" add-on feature highlight.
* **`/` (Home) Social Proof & Footer:** Features glass-styled testimonial cards and a dynamic viral community indicator (e.g., "3 new routes activated and 57 homes added in the past 30 days"). The footer contains a secondary zip code checker, links to terms/privacy, and an explicit click-to-call link for immediate assistance at `(520) 225-9713`.
* **`/method` (The Technology-Driven Blueprint):** A sticky-scroll interactive phone mockup using Framer Motion. As the user scrolls, the interface transitions across 3 operational states: "Routing Sync" (live SVG route-line), "Real-time Dispatch" (simulated push banner for property access), and "GPS Photo Verification" (real-time thumbnail of returned bins with timestamp).
* **`/pricing` (Subscription Pricing Engine):** High-contrast glass container tables with a billing frequency slider.
* **Starter Tier ($49/mo):** Billed Quarterly via ACH. Covers standard residential needs with up to 2 cans, 1 collection day/week, and 14 days of photo history. Additional fees apply for specific access hurdles (gate/garage codes, long/unpaved driveways, locked side gates).
* **Premium / STR Tier ($59/mo):** Billed Quarterly via ACH. Covers up to 4 cans, up to 2 collection days/week, fully unlocked photo streams, and automated Twilio alert scripts.
* **Enterprise / HOA Pool:** Custom door-to-door bulk volume pricing.
* **B2B Add-On:** $175/mo/station for emptying HOA common area pet waste baskets and restocking trailhead/park bags.
* **On-Demand Add-Ons:** CanNow emergency rollout ($35), Overflow Bags ($10/bag), and Wildlife/Javelina Cleanup ($25 base fee).

---

## 2. The Checkout Funnel (`/onboarding`)

* **Step 1: Zip Validation & The Viral Velvet Rope Loop:** Users enter their zip code. If valid (`86301, 86303, 86305`), they advance. If invalid, the system intercepts and renders the "Viral Waitlist UI" showing neighborhood density needed to unlock the route. Features a massive 1-click clipboard button to share a neighborhood invite link.
* **Step 2: Property Metrics & Logistics Configuration:** Captures First Name, Last Name, and Property Type. Enforces an `OR` constraint for Contact (Email OR Phone Number) to reduce friction. Crucially captures "Gated Access / Secure Locks" (passcodes, lockbox combinations, hidden keys, custom route notes) to prevent Day-1 service failures. Address utilizes JavaScript autocomplete.
* **Step 3: Pricing Engine & Surcharges:** Visual summary panel with volume sliders. Features an "ACH Incentive Engine Toggle" defaulted to Quarterly Autopay. Switching to Monthly Credit Card displays a red warning (+$15 processing fee), while keeping Quarterly ACH triggers a green success glow highlighting a $10/mo savings plus a $5 Autopay credit.
* **Step 4: Secure Bank Integration Payment:** Stripe Elements container utilizing dark themes. Includes native modules for checking routing numbers and biometric pathways. Features an "Exit-Intent Fallback Trigger" that flashes an overlay modal offering immediate phone setup assistance if the cursor leaves the viewport.
* **Step 5: Onboarding Success Engine (The Viral Booster):** A full-screen container reading "Welcome to the Club. Your Trash Day is Off-Duty." Displays a summary of route milestones and payment receipts. Features a prominent "Give $20, Get $20" referral center with text, email, and social media sharing hooks.

---

## 3. Customer Portal Gateway (`/customer-dashboard`)

* **The Real-Time Exception Alert Center:** Mounted at the apex of the view layer as a glass card with an interactive neon red border. Only triggers for active issues (e.g., HOA changed a gate code, or bins are inaccessible due to a new lock on the side yard access gate, etc.)). Users are notified via SMS and email asking them to urgently resolve the exception directly within their account dashboard (includes a button to click, which will take them to the login screen for the dashboard).
* **Operational Overview Panel:** Neon stats displaying the next service date, assigned runner profile, subscription tier, any onDemand services scheduled for their next service, and a Referral Hub Preview that displays any referrals they have been credited to-date, shows their unique referral code (for sharing) with a click-to-copy button to easily copy their referral code, or we could even have a popup modal triggered when they click anywhere within the card. The  modal will include the click-to-copy unique referral code, as well as social icon links for sharing from their social accounts, etc. Note: However you think we can cover all the bases in the cleanest most uncomplicated way possible. Includes quick-action buttons for support and on-demand actions (CanNow or Extra Bags).
* **The Snowbird Toggle:** A stylized seasonal switch to pause service for travel or seasonal absence. Automatically suspends routing parameters and calculates fractional subscription pauses. Note: When they click the toggle for pausing service, trigger a popup modal that very succinctly and politely encourages them to consider keeping their service active while away so it gives the appearance of weekly activity on the property - rather than appearing to be vacant. We continue to take the bins out even though they're empty and would-be criminals are more likely to move on to the next house.
* **Historical Proof Photos Scrollable Feed:** A responsive gallery of all previous service visits photos featuring high-res images of returned bins with GPS location tags and precise timestamps clearly noting the date of the photo.
* **Account Management Hub:** This section should display all of their contact info and property info, with the option to edit any of the fields; however, some of the fields (such as property address should require approval by administrators before taking effect. When the customer edits any of the other property details that affect runner tasks, such as gate codes, and bin location, it should trigger an urgent alert when the runner arrives at the property for the next scheduled service. All of the original property details will remain in place, and will only be updated once the runner confirms that the new info is accurate. Should be handled with no input required from the runner - they simply click a button saying Yes or No, when asked if the new info was accurate. Includes a Referral Tracker to view clicked links and accumulated account credits, as well as an invoice history viewer.

---

## 4. Responsive Field Terminal (`/runner-app`)

* **Visual Design Environment:** Optimized strictly for high-glare sunlight and heavy work gloves. Pure Deep Black backgrounds, ultra-bold stark white typography, and massive neon execution nodes.
* **Shift Lifecycle Node:** Forces entry inputs for Odometer Start Reading and automated check-in timestamps. Features continuous "Break Protocol" floating actions for lunches or route resets.
* **Route Cluster Interface:** Stacked layout of algorithmically batched property location paths. Displays massive visual badges for critical contexts (`[STR Mode]`, `[HOA Gated Community]`, `[First Service Run]`).
* **Active Stop Execution Module:** Lock-steps progress vectors so runners cannot proceed until the current stop clears.
* **First-Visit Catch Loop:** If `is_first_visit == true`, a prompt forces the runner to "Log Bin Coordinates." Secures the exact latitude/longitude of the permanent bin storage area via `navigator.geolocation` before unlocking the camera.
* **The Integrated Multi-Photo Stream:** Supports capturing up to 50 individual photo streams per address. Crucial for "Property Home Watch" subscriptions to document cracked foundations, broken sprinklers, trespassers, or weather damage.
* **The Exception Node Panel:** A floating side panel to flag property anomalies. Includes triggers for Blocked Bins, Gate Locked, Wildlife Mess, and Overflow Surcharges. The overflow node includes a manual text field with massive "+" and "-" buttons for runners to quickly log extra bags and automatically trigger a Stripe API webhook for on-demand billing and client SMS approval.

---

## 5. Master Administration Center (`/admin`)

* **Mission Control Live Stream Panel:** A real-time updating array of finished property interactions, field images, matching coordinates, and duration stats from field teams.
* **Triage Radar Hub (Exceptions Monitor):** Tracks pending client exception overrides. Monitors active interactions for property owners responding with updated passcodes or confirming surcharge requests in real-time.
* **Waitlist Density Heatmap Center:** Maps geographical coordinate vectors derived from rejected zip codes. Visualizes neighborhood groupings to determine exactly where to open the next profitable territory.
* **Fleet Tracking:** Real-time view of runner clock-ins, breaks, and odometer mileage.
* **Financials & Integrations Hub:** High-level revenue overview driven by Stripe webhooks and a placeholder for upcoming STR Property Management Software API hooks (e.g., Hostfully integration).
