import React from 'react';
import React2 from 'react';
import { ROLES, ROLE_LABELS, TXN_TYPES, OTHER_TYPES, orderedSites, SEED_FORECAST, allocateForecast } from '../lib/model.js';

export default function TimeStandardsTab({ seed, standards, onChange, volumes, onVolumes }) {
  const set = (patch) => onChange({ ...standards, ...patch });
  const setMin = (t, r, v) =>
    set({ minutes: { ...standards.minutes, [t]: { ...standards.minutes[t], [r]: v } } });
  const setOther = (k, r, v) =>
    set({ otherMinutes: { ...standards.otherMinutes, [k]: { ...standards.otherMinutes[k], [r]: v } } });
  const sites = orderedSites(seed);

  return (
    <div>
      <p className="note">
        Confirmed figures: retention call 5 min, infleet Ops Spec 60 min (telematics 25 + photos 15 + handling).
        Everything else is a placeholder until you send real figures. Values apply to this session; edit
        DEFAULT_STANDARDS in src/lib/model.js to bake them in.
      </p>
      <h3 className="subhead">Minutes per transaction, by role</h3>
      <div className="scroll" style={{ maxWidth: 640 }}>
        <table>
          <thead>
            <tr><th className="site">Transaction</th>{ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}</tr>
          </thead>
          <tbody>
            {TXN_TYPES.map((t) => (
              <tr key={t}>
                <td className="site">{t}</td>
                {ROLES.map((r) => (
                  <td key={r}>
                    <input type="number" min="0" value={standards.minutes[t][r]}
                      onChange={(e) => setMin(t, r, Number(e.target.value))} style={{ width: 70 }} />
                  </td>
                ))}
              </tr>
            ))}
            {OTHER_TYPES.map((k) => (
              <tr key={k}>
                <td className="site">{k} (per event)</td>
                {ROLES.map((r) => (
                  <td key={r}>
                    <input type="number" min="0" value={standards.otherMinutes[k][r]}
                      onChange={(e) => setOther(k, r, Number(e.target.value))} style={{ width: 70 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Tech shows 0 for Pickup/Delivery because tech time only applies when the car is booked into assigned
        service - that work already arrives through the service-hours stream, so minutes here would double-count it.
      </p>
      <h3 className="subhead">Other standards</h3>
      <div className="panel">
        <div className="row"><label>Minutes per on-flex visit (FOH)</label>
          <input type="number" min="0" value={standards.svcVisitMin} onChange={(e) => set({ svcVisitMin: Number(e.target.value) })} /></div>
        <div className="row"><label>Minutes per retention call (FOH)</label>
          <input type="number" min="0" value={standards.retentionMin} onChange={(e) => set({ retentionMin: Number(e.target.value) })} /></div>
        <div className="row"><label>Forecast uplift fallback % (sites with no last-week history)</label>
          <input type="number" value={standards.upliftPct} onChange={(e) => set({ upliftPct: Number(e.target.value) })} /></div>
      </div>
      <h3 className="subhead">Infleet forecast to daily volumes</h3>
      <ForecastAllocator volumes={volumes} onVolumes={onVolumes} />
      <h3 className="subhead">Daily volumes - infleets and repossessions (config, per site per day)</h3>
      <div className="scroll" style={{ maxWidth: 520 }}>
        <table>
          <thead><tr><th className="site">Site</th>{OTHER_TYPES.map((k) => <th key={k}>{k}/day</th>)}</tr></thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s}>
                <td className="site">{s}</td>
                {OTHER_TYPES.map((k) => (
                  <td key={k}>
                    <input type="number" min="0" value={(volumes[s] && volumes[s][k]) || 0}
                      onChange={(e) => onVolumes({ ...volumes, [s]: { ...(volumes[s] || {}), [k]: Number(e.target.value) } })}
                      style={{ width: 70 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Repossessions: measured per-site dailies come from recovery_cases (trailing 90 days) - a monthly
        seed-job refresh item; enter or adjust working volumes here meanwhile. Infleets: use the allocator
        above, then hand-tune per site.
      </p>
    </div>
  );
}

function ForecastAllocator({ volumes, onVolumes }) {
  const [fcast, setFcast] = React2.useState(SEED_FORECAST);
  const [msg, setMsg] = React2.useState('');
  const setMonthly = (i, v) => setFcast((p) => {
    const n = JSON.parse(JSON.stringify(p)); n.markets[i].monthly = v; return n;
  });
  const setSplit = (i, j, v) => setFcast((p) => {
    const n = JSON.parse(JSON.stringify(p)); n.markets[i].splits[j][1] = v; return n;
  });
  const apply = () => {
    onVolumes(allocateForecast(fcast, volumes));
    setMsg('Applied - Infleets/day rewritten below (monthly / ' + fcast.days + ' days).');
  };
  return (
    <div className="panel" style={{ maxWidth: 720 }}>
      <p className="footnote" style={{ marginTop: 0 }}>
        Monthly targets by market from the Target Forecast tab of the Flex Transfer Tracker. ATL sends 70%
        to Stone Mountain per your rule (15/15 Morrow-Marietta is an assumption); SJC 80/20 San Jose-Richmond.
        LA (El Monte) and IAH have no dashboard allocation yet. The ATL 450-vs-750 question is still open.
      </p>
      <table>
        <thead>
          <tr><th className="site">Market</th><th>Monthly</th><th colSpan={3}>Site splits %</th></tr>
        </thead>
        <tbody>
          {fcast.markets.map((mk, i) => (
            <tr key={mk.m}>
              <td className="site">{mk.m}</td>
              <td><input type="number" min="0" value={mk.monthly} onChange={(e) => setMonthly(i, Number(e.target.value))} style={{ width: 70 }} /></td>
              {mk.splits.map(([site, pct], j) => (
                <td key={site} style={{ textAlign: 'left' }}>
                  {site} <input type="number" min="0" max="100" value={pct} onChange={(e) => setSplit(i, j, Number(e.target.value))} style={{ width: 55 }} />
                </td>
              ))}
              {Array.from({ length: 3 - mk.splits.length }).map((_, k) => <td key={'e' + k} />)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="controls" style={{ marginTop: 10, marginBottom: 0 }}>
        <label>Days in month: <input type="number" min="1" value={fcast.days} onChange={(e) => setFcast({ ...fcast, days: Number(e.target.value) })} style={{ width: 60 }} /></label>
        <button className="btn" onClick={apply}>Apply to volumes</button>
        <span>{msg}</span>
      </div>
    </div>
  );
}
