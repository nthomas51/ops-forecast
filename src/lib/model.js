// Capacity model, ported from the original site-capacity-dashboard.jsx artifact.
//
// Internal roles: FOH = MC/MEA (member-facing), OpsSpec = MOH (prep/QA/handoff),
// Tech = BOH (Tech B + C; Tech A visible but excluded). FLPs count toward the
// role selected by the FLP toggle.
//
// Demand streams per site-day:
//   orders (P/R/S/D)          x minutes[type][role]
//   on-flex visits            x svcVisitMin -> FOH; tech time arrives via service hours
//   service hours (booked)    -> Tech 1:1 (from maintenance_bookings estimated minutes)
//   retention calls           -> FOH x retentionMin (P/S/D 3 days earlier; first 3 days seeded)
//   infleets / repossessions  x otherMinutes[event][role] (volumes are config knobs)
//
// Model view: booked counts on days 1-3 (FIRM_DAYS), last week's same-weekday
// actuals on days 4-7. The seed currently carries last-week actuals for orders
// only; on-flex visits and service hours fall back to booked on forecast days
// (seed v2 item).

export const ROLES = ["FOH", "OpsSpec", "Tech"];
export const ROLE_LABELS = { FOH: "FOH (MC/MEA)", OpsSpec: "MOH (Ops Spec)", Tech: "BOH (Tech)" };
export const TXN_TYPES = ["Pickup", "Return", "Swap", "Delivery"];
export const OTHER_TYPES = ["Infleets", "Repossessions"];
export const FIRM_DAYS = 3;

// Excel palette carried over from the Orders-by-Day sheet (per-site column groups)
export const MX_HEAD = ["#4472C4", "#ED7D31", "#70AD47", "#FFC000", "#7030A0", "#C00000", "#264478", "#9E480E", "#43682B", "#595959", "#7F6000"];
export const MX_SUB  = ["#B4C7E7", "#F8CBAD", "#C6E0B4", "#FFE699", "#CCC0DA", "#F4B8B8", "#ACB9CA", "#DDC5AE", "#C6D5B4", "#D9D9D9", "#FFE699"];
export const MX_BODY = ["#D9E1F2", "#FCE4D6", "#E2EFDA", "#FFF2CC", "#E4DFEC", "#FCE0E0", "#D6DCE4", "#EDE0D4", "#EAF0E2", "#F2F2F2", "#FFF2CC"];
export const MX_TOTAL = "#DDEBF7";

// Time standards. Values marked [placeholder] are not measured; the rest were
// confirmed in the original artifact (retention 5 min; infleet Ops Spec 60 min
// = telematics 25 + photos 15 + handling).
export const DEFAULT_STANDARDS = {
  minutes: {
    Pickup:   { FOH: 45, OpsSpec: 30, Tech: 0 },   // FOH/OpsSpec [placeholder]; Tech 0 = only if booked into service (already in service hours)
    Return:   { FOH: 30, OpsSpec: 30, Tech: 30 },  // [placeholder]
    Swap:     { FOH: 45, OpsSpec: 30, Tech: 30 },  // [placeholder]; OpsSpec is day-before prep
    Delivery: { FOH: 60, OpsSpec: 0,  Tech: 0 },   // FOH [placeholder]; Tech 0 = conditional via service hours
  },
  otherMinutes: {
    Infleets:      { FOH: 0, OpsSpec: 60, Tech: 0 },  // OpsSpec confirmed 60
    Repossessions: { FOH: 0, OpsSpec: 45, Tech: 0 },  // [placeholder]
  },
  svcVisitMin: 15,      // FOH minutes per on-flex visit [placeholder]
  retentionMin: 5,      // confirmed
  upliftPct: 0,         // fallback only, for sites with no last-week history
};

// Infleet forecast allocator: monthly infleets by market (Target Forecast tab,
// Flex Transfer Tracker) -> site splits -> daily volumes. August figures; the
// ATL 450-vs-750 question is still open. LA (El Monte) and IAH have no
// allocation yet. Morrow/Marietta 15/15 was an assumption, not a rule.
export const SEED_FORECAST = {
  days: 31,
  markets: [
    { m: "ATL", monthly: 450, splits: [["Stone Mountain", 70], ["Morrow", 15], ["Marietta", 15]] },
    { m: "BOS", monthly: 350, splits: [["New England", 100]] },
    { m: "NY",  monthly: 180, splits: [["Larchmont", 100]] },
    { m: "BNA", monthly: 30,  splits: [["West Nashville", 100]] },
    { m: "CLT", monthly: 100, splits: [["South Charlotte", 100]] },
    { m: "SJC", monthly: 520, splits: [["San Jose", 80], ["Richmond", 20]] },
    { m: "DFW", monthly: 150, splits: [["Dallas", 100]] },
  ],
};

export function allocateForecast(fcast, volumes) {
  const add = {};
  fcast.markets.forEach((mk) => {
    mk.splits.forEach(([site, pct]) => {
      add[site] = (add[site] || 0) + (mk.monthly * pct) / 100 / (fcast.days || 31);
    });
  });
  const next = JSON.parse(JSON.stringify(volumes));
  Object.keys(add).forEach((s) => {
    next[s] = { ...(next[s] || {}), Infleets: Math.round(add[s] * 10) / 10 };
  });
  return next;
}

export const PREP_TXNS = ["Pickup", "Swap"]; // OpsSpec component lands the day before when prep timing = day-before

export function dayLabel(d) {
  const dt = new Date(d + "T12:00:00Z");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", timeZone: "UTC" });
}

/* ---------------- stream accessors (seed-backed) ---------------- */

// booked order count
export function bookedOrders(seed, site, type, day) {
  return seed.demand.orders[site][day][type] || 0;
}

// last week same-weekday actual (windows are aligned Tue-Mon, index i -> i)
export function lastWeekOrders(seed, site, type, dayIdx) {
  const lw = seed.demand.lastWeekActuals;
  const d = lw.days[dayIdx];
  const row = lw.orders[site] && lw.orders[site][d];
  return row ? row[type] || 0 : null;
}

// model view: booked on firm days, last-week actuals on forecast days
export function modelOrders(seed, site, type, dayIdx, standards) {
  const day = seed.meta.window.days[dayIdx];
  if (dayIdx < FIRM_DAYS) return bookedOrders(seed, site, type, day);
  const lw = lastWeekOrders(seed, site, type, dayIdx);
  if (lw !== null && lw !== undefined) return lw;
  const uplift = 1 + (standards ? standards.upliftPct : 0) / 100;
  return Math.round(bookedOrders(seed, site, type, day) * uplift);
}

export function onFlexVisits(seed, site, day) {
  return seed.demand.onFlex[site][day].activeBookings || 0;
}

export function serviceHours(seed, site, day) {
  return (seed.demand.onFlex[site][day].activeEstMin || 0) / 60;
}

export function retentionCalls(seed, site, dayIdx, standards, source) {
  const days = seed.meta.window.days;
  const day = days[dayIdx];
  const seeded = (seed.demand.retentionSeed.bySite[site] || {}).impliedCalls?.[day] || 0;
  const lag = seed.demand.retentionSeed.lagDays;
  let derived = 0;
  if (dayIdx >= lag) {
    derived = ["Pickup", "Swap", "Delivery"].reduce(
      (a, t) => a + (source === "model"
        ? modelOrders(seed, site, t, dayIdx - lag, standards)
        : bookedOrders(seed, site, t, days[dayIdx - lag])),
      0
    );
  }
  return seeded + derived;
}

/* ---------------- coverage math (ported) ---------------- */

// Demand hours by role for one site-day, with per-driver breakdown rows.
export function demandFor(seed, site, dayIdx, standards, volumes, source, prepTiming) {
  const days = seed.meta.window.days;
  const day = days[dayIdx];
  const byRole = { FOH: 0, OpsSpec: 0, Tech: 0 };
  const breakdown = [];
  const add = (name, count, minsByRole, note) => {
    const row = { name, count, note, total: 0 };
    ROLES.forEach((r) => {
      const hrs = (count * (minsByRole[r] || 0)) / 60;
      byRole[r] += hrs;
      row[r] = hrs;
      row.total += hrs;
    });
    breakdown.push(row);
  };

  TXN_TYPES.forEach((t) => {
    const n = source === "model" ? modelOrders(seed, site, t, dayIdx, standards) : bookedOrders(seed, site, t, day);
    const mins = { ...standards.minutes[t] };
    // day-before prep: OpsSpec portion of prep transactions moves to d-1
    if (prepTiming === "day-before" && PREP_TXNS.includes(t)) {
      const nNext = dayIdx + 1 < days.length
        ? (source === "model" ? modelOrders(seed, site, t, dayIdx + 1, standards) : bookedOrders(seed, site, t, days[dayIdx + 1]))
        : 0;
      const prepMins = mins.OpsSpec || 0;
      mins.OpsSpec = 0;
      add(t, n, mins, dayIdx >= FIRM_DAYS && source === "model" ? "last wk actual" : undefined);
      add(t + " prep (for tomorrow)", nNext, { OpsSpec: prepMins }, undefined);
      return;
    }
    add(t, n, mins, dayIdx >= FIRM_DAYS && source === "model" ? "last wk actual" : undefined);
  });

  add("On-flex visit", onFlexVisits(seed, site, day), { FOH: standards.svcVisitMin }, "tech time arrives as service hours");
  const svcHrs = serviceHours(seed, site, day);
  byRole.Tech += svcHrs;
  breakdown.push({ name: "Service booking", count: seed.demand.onFlex[site][day].activeBookings, note: "booked hours land on Tech 1:1", FOH: 0, OpsSpec: 0, Tech: svcHrs, total: svcHrs });
  add("Retention calls", retentionCalls(seed, site, dayIdx, standards, source), { FOH: standards.retentionMin }, "P/S/D 3 days earlier");
  OTHER_TYPES.forEach((k) => add(k, (volumes[site] && volumes[site][k]) || 0, standards.otherMinutes[k], "config volume"));

  return { byRole, breakdown };
}

// Staffed hours by role from the seed's scheduled buckets. Tech A excluded.
export function supplyFor(seed, site, day, flpRole) {
  const b = seed.staffing[site][day].byBucket;
  const byRole = {
    FOH: b.mcMea || 0,
    OpsSpec: b.opsSpec || 0,
    Tech: (b.techB || 0) + (b.techC || 0),
  };
  if (flpRole !== "excluded") byRole[flpRole] += b.flp || 0;
  return byRole;
}

export function evaluateCell(demand, supply, mode) {
  const dTot = ROLES.reduce((s, r) => s + demand[r], 0);
  const sTot = ROLES.reduce((s, r) => s + supply[r], 0);
  let unmet = 0;
  if (mode === "pooled") {
    unmet = Math.max(0, dTot - sTot);
  } else {
    ROLES.forEach((r) => { unmet += Math.max(0, demand[r] - supply[r]); });
  }
  const util = sTot > 0 ? (dTot / sTot) * 100 : dTot > 0 ? Infinity : 0;
  let status = "green";
  if (unmet > 0.05 || util > 100) status = "red";
  else if (util >= 85) status = "amber";
  return { util, unmet, dTot, sTot, slack: sTot - dTot, status };
}

export const STATUS_STYLES = {
  green: { bg: "#EDF7F0", text: "#166534", bar: "#15803D" },
  amber: { bg: "#FCF4E6", text: "#92400E", bar: "#B45309" },
  red:   { bg: "#FBEDEC", text: "#991B1B", bar: "#B91C1C" },
};

// Sites ordered New England first, then busiest to quietest by booked week orders
export function orderedSites(seed) {
  const days = seed.meta.window.days;
  const load = (s) => days.reduce((a, d) => a + TXN_TYPES.reduce((x, t) => x + bookedOrders(seed, s, t, d), 0), 0);
  const rest = seed.meta.dashboard_sites.filter((s) => s !== "New England").sort((a, b) => load(b) - load(a));
  return ["New England", ...rest];
}

export function fmt(n, dp = 1) {
  if (n === Infinity) return "inf";
  return Number(n).toFixed(dp);
}
