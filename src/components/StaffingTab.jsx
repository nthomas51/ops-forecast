import React, { useState } from 'react';

const BUCKETS = ['opsSpec', 'mcMea', 'flp', 'techA', 'techB', 'techC', 'other'];
const BUCKET_LABELS = {
  opsSpec: 'Ops Spec (MOH)', mcMea: 'MC/MEA (FOH)', flp: 'FLP',
  techA: 'Tech A', techB: 'Tech B', techC: 'Tech C', other: 'Other',
};

export default function StaffingTab({ seed }) {
  const sites = seed.meta.dashboard_sites;
  const days = seed.meta.window.days;
  const [site, setSite] = useState(sites[0]);

  return (
    <div>
      <div className="controls">
        <label>
          Site:{' '}
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            {sites.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <span>Scheduled coverage hours by role bucket. Tech A and Other are shown but excluded from capacity math.</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Bucket</th>
              {days.map((d) => <th key={d}>{d.slice(5)}</th>)}
              <th>Week</th>
            </tr>
          </thead>
          <tbody>
            {BUCKETS.map((b) => {
              let wk = 0;
              return (
                <tr key={b}>
                  <td className="site">{BUCKET_LABELS[b]}</td>
                  {days.map((d) => {
                    const v = seed.staffing[site][d].byBucket[b] || 0;
                    wk += v;
                    return <td key={d}>{v ? v.toFixed(1) : ''}</td>;
                  })}
                  <td>{wk.toFixed(1)}</td>
                </tr>
              );
            })}
            <tr>
              <td className="site">Time off (hrs)</td>
              {days.map((d) => {
                const t = seed.timeOff[site][d];
                const v = Object.values(t).reduce((a, x) => a + x, 0);
                return <td key={d}>{v ? v.toFixed(1) : ''}</td>;
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="subhead">Role detail (byType), first day with coverage</h3>
      <RoleDetail seed={seed} site={site} days={days} />
    </div>
  );
}

function RoleDetail({ seed, site, days }) {
  const day = days.find((d) => Object.keys(seed.staffing[site][d].byType).length) || days[0];
  const rows = Object.entries(seed.staffing[site][day].byType).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p>No published coverage for {site} this week.</p>;
  return (
    <div className="scroll" style={{ maxWidth: 420 }}>
      <table>
        <thead>
          <tr><th className="site">Type ({day})</th><th>Hours</th></tr>
        </thead>
        <tbody>
          {rows.map(([t, h]) => (
            <tr key={t}><td className="site">{t}</td><td>{h.toFixed(1)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
