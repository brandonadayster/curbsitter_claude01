# Route-Cell Activation Runbook — DRAFT

> Resolves OPEN_DECISIONS #3 (process; the specific cells/dates are owner data).
> Config touchpoints: `route_cells` table (state, capacity, geometry,
> activation_inputs) and `SERVICE_AREA.publicActiveCells`.

A route cell is only opened when the economics and operations support it — not on
a "five neighbors" hunch (PROJECT_TRUTH route-density rule).

## Route-cell states (already in the system)

`research → waitlist → opening → active → capacity_full → premium_review → closed`

Public availability and the address checker read directly from this state. Only an
administrator moves a cell to `active`.

## Activation criteria (all should be met)

1. **Demand:** `[N]` verified waitlist leads or committed signups on compatible
   collection days within the cell.
2. **Density/geography:** stops are clusterable into a viable route (target drive
   time between stops `[≤ X min]`).
3. **Contribution:** projected `route_contribution` and `revenue_per_route_hour`
   meet target `[$__/route-hour]` after direct labor, mileage, payment/message
   cost, and an exception buffer (see OPERATIONS_PLAYBOOK route economics).
4. **Capacity:** a runner and vehicle can cover the cell within the service
   window with buffer.
5. **Access/legal:** lawful solicitation, gate/manager access where needed, and no
   known unsafe-access blockers for the core cluster.

## Activation steps

1. Confirm criteria with current data; set the cell's `capacity` and target
   collection day(s).
2. Draw/confirm the cell `geometry` (GeoJSON) so the eligibility engine matches
   addresses correctly; verify a few known addresses resolve as expected.
3. In `/admin/route-cells`, set the cell to `active` with capacity. (This is
   audited.)
4. Contact the waitlist for the cell first; then run the route-opening marketing
   (matched postcard/door hanger, local social) only if financially approved.
5. Approve pending serviceability reviews for the cell as signups arrive.
6. Generate cycles/tasks and build the first published routes.
7. Watch capacity utilization; move to `capacity_full` before overcommitting.

## Deactivation / capacity management

- `capacity_full`: still visible, accepts waitlist only.
- `premium_review`: eligible only via approved premium quote.
- `closed`: not serviced; the checker shows an honest unavailable/waitlist state.

## Guardrails

- Do not mark a cell `active` on marketing enthusiasm; require the criteria.
- Never display fabricated progress or counts (D-015).
- Do not promise a route will open "tomorrow" based on referral counts.

## Owner to confirm

- Target values for `[N]`, drive time, and `$/route-hour`.
- The first cell(s), their capacity, and start date(s).
