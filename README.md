# ops-forecast

Site capacity dashboard for Flexcar field operations. Renders a 7-day
demand-vs-supply view for 11 sites from a single data file, `src/data/seed.json`.

## How data gets here

The dashboard has no backend and no credentials. A scheduled Claude job runs
daily inside Claude (where the Assembled and Redshift connectors live), builds
a fresh `seed.json`, and commits it to this repo:

1. Assembled `get_schedule`, one call per site, 7-day window, master schedule
   (supply: scheduled hours by role).
2. Redshift `orders` (demand: Pickup / Swap / Delivery / Return counts, this
   week plus last week's actuals) and `maintenance_bookings` (on-flex service
   demand as booking counts and estimated minutes).
3. Shift segments are bucketed per day in each site's local timezone, folded
   to dashboard sites (Auburn + Chestnut Hill = New England, Charlotte = South
   Charlotte, Nashville = West Nashville), and written to
   `src/data/seed.json`.

Lovable syncs the commit; the published site reflects it on the next deploy.
Intraday updates are done by re-running the seed job.

## Tabs

- Order matrix (default): days as rows, each site a colour-coded group of
  P/R/S/D/OF columns matching the Orders-by-Day sheet palette, totals both
  directions, model vs booked toggle (model = booked days 1-3, last week's
  same-weekday actuals days 4-7 with a "wk" marker), by-type vs site-totals
  toggle, Copy-for-Excel TSV button. Sites order New England first, then
  busiest to quietest.
- Coverage: utilization% and slack hours per site-day, coloured
  green/amber/red (amber from 85%, red past 100% or any unmet hours). Days
  4-7 render faded as the forecast window. Click a cell for the per-driver
  breakdown. Toggles: pooled vs role-locked coverage, FLP house-group
  assignment, Ops Spec prep timing (day-before vs same-day).
- Transactions: raw streams per site (booked orders, last-week actuals,
  on-flex visits, service hours, retention calls).
- Headcount: Rippling CSV/TSV paste importer (authoritative HR roster),
  roster-to-scheduled-to-required by house group, applicability matrix.
- Time standards: minutes-per-transaction grid by role, on-flex visit and
  retention call minutes, uplift fallback, infleet/repossession volume knobs.

## Model conventions

- FOH (member-facing, MC/MEA bucket): demand comes from orders plus retention
  calls. Pickup, Swap, and Delivery each generate a retention call 3 days
  later; the first 3 days of the window carry pre-computed calls from
  pre-horizon orders inside the seed, later days are derived from in-window
  orders.
- MOH (Ops Specialists): supply is shown, no modeled demand in seed v1.
- BOH (Tech B + Tech C): demand is on-flex estimated minutes from
  `maintenance_bookings`, cancellations excluded from active totals but kept
  itemized by status.
- Tech A and FLP hours are visible but excluded from capacity math.
- Managers, coordinators, Site Leads, and Parts and Service land in the
  `other` bucket and are not counted as capacity. Every raw Assembled
  `type_name` is preserved under `staffing[site][day].byType` so buckets can
  be redefined without re-pulling data.
- Confirmed time standards: retention call 5 min; infleet Ops Spec 60 min
  (telematics 25 + photos 15 + handling). The remaining minutes are
  placeholders - set them on the Time standards tab or edit
  `DEFAULT_STANDARDS` in `src/lib/model.js`.
- Seed v2 items: last-week actuals for on-flex visits and service hours (so
  forecast days stop falling back to booked for those streams), infleet
  volumes from Redshift.

## Local development

```
npm install
npm run dev      # dev server
npm run build    # production build to dist/
```

## Repo layout

```
src/data/seed.json       daily data drop (committed by the seed job)
src/lib/dataSource.js    seed access; swap point for runtime fetching
src/lib/model.js         time standards + demand/supply/utilization math
src/components/          Overview, Orders, On-Flex, Staffing, Time Standards
```

Repossessions are intentionally absent from the daily seed (monthly cadence);
they belong in dashboard config when added.
