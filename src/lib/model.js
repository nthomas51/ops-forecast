// Capacity model.
//
// House groups follow the ops classification:
//   FOH (member-facing)   = mcMea bucket. Demand: orders + retention calls.
//   MOH (prep/QA/handoff) = opsSpec bucket. Supply shown; no modeled demand in seed v1.
//   BOH (service)         = techB + techC. Demand: on-flex estimated minutes.
//   Tech A                = visible, excluded from capacity math.
//   FLP                   = visible, excluded from FOH capacity by default.
//
// TIME STANDARDS BELOW ARE PLACEHOLDERS. Set real figures on the Time
// Standards tab (session-local) or edit the defaults here to bake them in.
export const DEFAULT_TIME_STANDARDS = {
  minsPerPickup: 45,
  minsPerSwap: 45,
  minsPerDelivery: 60,
  minsPerReturn: 30,
  minsPerRetentionCall: 10,
};

export const TIME_STANDARD_LABELS = {
  minsPerPickup: 'Minutes per pickup',
  minsPerSwap: 'Minutes per swap',
  minsPerDelivery: 'Minutes per delivery',
  minsPerReturn: 'Minutes per return',
  minsPerRetentionCall: 'Minutes per retention call',
};

// Retention calls landing on `day`:
//  - days 1-3 of the window come pre-computed in the seed (from pre-horizon
//    Pickup/Swap/Delivery, 3-day lag),
//  - later days are derived from in-window orders 3 days earlier.
export function retentionCalls(seed, site, day) {
  const days = seed.meta.window.days;
  const seeded = seed.demand.retentionSeed.bySite[site]?.impliedCalls?.[day] || 0;
  const idx = days.indexOf(day);
  const lag = seed.demand.retentionSeed.lagDays;
  let derived = 0;
  if (idx >= lag) {
    const src = seed.demand.orders[site][days[idx - lag]];
    derived = (src.Pickup || 0) + (src.Swap || 0) + (src.Delivery || 0);
  }
  return seeded + derived;
}

export function fohDemandHours(seed, ts, site, day) {
  const o = seed.demand.orders[site][day];
  const calls = retentionCalls(seed, site, day);
  const mins =
    o.Pickup * ts.minsPerPickup +
    o.Swap * ts.minsPerSwap +
    o.Delivery * ts.minsPerDelivery +
    o.Return * ts.minsPerReturn +
    calls * ts.minsPerRetentionCall;
  return mins / 60;
}

export function bohDemandHours(seed, site, day) {
  return (seed.demand.onFlex[site][day].activeEstMin || 0) / 60;
}

export function fohSupplyHours(seed, site, day) {
  return seed.staffing[site][day].byBucket.mcMea || 0;
}

export function bohSupplyHours(seed, site, day) {
  const b = seed.staffing[site][day].byBucket;
  return (b.techB || 0) + (b.techC || 0);
}

export function utilization(demand, supply) {
  if (!supply) return demand > 0 ? Infinity : 0;
  return demand / supply;
}

export function utilClass(u) {
  if (u === 0) return 'util-idle';
  if (u > 1) return 'util-over';
  if (u > 0.85) return 'util-tight';
  return 'util-ok';
}

export function fmt(n, dp = 1) {
  return Number(n).toFixed(dp);
}
