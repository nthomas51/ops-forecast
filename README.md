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
- Time standards (minutes per pickup, swap, delivery, return, retention call)
  are placeholders. Set real figures on the Time Standards tab or edit
  `DEFAULT_TIME_STANDARDS` in `src/lib/model.js`.

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
