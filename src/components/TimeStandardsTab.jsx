import React from 'react';
import { ROLES, ROLE_LABELS, TXN_TYPES, OTHER_TYPES, orderedSites } from '../lib/model.js';

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
      <p className="footnote">Repossessions run on a monthly cadence and are deliberately not in the daily seed; enter working volumes here.</p>
    </div>
  );
}
