import React, { useState } from 'react';
import {
  ROLES, ROLE_LABELS, FIRM_DAYS, STATUS_STYLES,
  demandFor, supplyFor, evaluateCell, orderedSites, dayLabel, fmt,
} from '../lib/model.js';

export default function CoverageTab({ seed, standards, volumes, flpRole, setFlpRole }) {
  const [mode, setMode] = useState('locked');      // role-locked vs pooled
  const [prepTiming, setPrepTiming] = useState('day-before');
  const [sel, setSel] = useState(null);            // {site, dayIdx}
  const days = seed.meta.window.days;
  const sites = orderedSites(seed);

  const cellFor = (site, dayIdx) => {
    const d = demandFor(seed, site, dayIdx, standards, volumes, 'model', prepTiming);
    const s = supplyFor(seed, site, days[dayIdx], flpRole);
    return { d, s, ev: evaluateCell(d.byRole, s, mode) };
  };

  // 3-day booked-window KPIs
  let kD = 0, kS = 0, kUnmet = 0;
  sites.forEach((site) => {
    for (let i = 0; i < FIRM_DAYS; i++) {
      const { ev } = cellFor(site, i);
      kD += ev.dTot; kS += ev.sTot; kUnmet += ev.unmet;
    }
  });

  const selCell = sel ? cellFor(sel.site, sel.dayIdx) : null;

  return (
    <div>
      <div className="kpis">
        <div className="kpi"><div className="kpi-n">{fmt(kD, 0)}</div><div>Demand hrs, days 1-3</div></div>
        <div className="kpi"><div className="kpi-n">{fmt(kS, 0)}</div><div>Staffed hrs, days 1-3</div></div>
        <div className="kpi"><div className="kpi-n">{fmt(kS - kD, 0)}</div><div>Slack hrs, days 1-3</div></div>
        <div className="kpi"><div className="kpi-n">{fmt(kUnmet, 0)}</div><div>Unmet hrs, days 1-3</div></div>
      </div>
      <div className="controls">
        <label>
          Coverage mode:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="locked">Role-locked (roles don't cover each other)</option>
            <option value="pooled">Pooled</option>
          </select>
        </label>
        <label>
          FLPs count as:{' '}
          <select value={flpRole} onChange={(e) => setFlpRole(e.target.value)}>
            <option value="FOH">FOH</option>
            <option value="OpsSpec">MOH</option>
            <option value="Tech">BOH</option>
            <option value="excluded">Excluded</option>
          </select>
        </label>
        <label>
          Ops Spec prep:{' '}
          <select value={prepTiming} onChange={(e) => setPrepTiming(e.target.value)}>
            <option value="day-before">Day before</option>
            <option value="same-day">Same day</option>
          </select>
        </label>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site pin">Site</th>
              {days.map((d, i) => (
                <th key={d} className={i >= FIRM_DAYS ? 'faded' : ''}>{dayLabel(d)}{i >= FIRM_DAYS ? ' *' : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site}>
                <td className="site pin">{site}</td>
                {days.map((d, i) => {
                  const { ev } = cellFor(site, i);
                  const st = STATUS_STYLES[ev.status];
                  const isSel = sel && sel.site === site && sel.dayIdx === i;
                  return (
                    <td
                      key={d}
                      className={'covcell' + (i >= FIRM_DAYS ? ' faded' : '') + (isSel ? ' selcell' : '')}
                      style={{ background: st.bg, color: st.text }}
                      onClick={() => setSel(isSel ? null : { site, dayIdx: i })}
                    >
                      <div className="covnum">{ev.util === Infinity ? 'inf' : fmt(ev.util, 0) + '%'}</div>
                      <div className="covslack">{ev.slack >= 0 ? '+' : ''}{fmt(ev.slack)} h</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Cells show utilization% and slack hours; click a cell for the breakdown. * faded days 4-7 are the
        forecast: last week's same-weekday order actuals (on-flex and service hours still booked - seed v2).
        FLPs currently count as {flpRole === 'excluded' ? 'excluded' : ROLE_LABELS[flpRole]}.
      </p>
      {selCell && (
        <Breakdown site={sel.site} day={days[sel.dayIdx]} cell={selCell} onClose={() => setSel(null)} />
      )}
    </div>
  );
}

function Breakdown({ site, day, cell, onClose }) {
  return (
    <div className="panel" style={{ maxWidth: 760, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{site} - {dayLabel(day)}</strong>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
      <table style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th className="site">Driver</th><th>Count</th>
            {ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}
            <th>Total h</th>
          </tr>
        </thead>
        <tbody>
          {cell.d.breakdown.map((row) => (
            <tr key={row.name}>
              <td className="site">{row.name}{row.note ? <span className="notecell"> - {row.note}</span> : null}</td>
              <td>{fmt(row.count, 0)}</td>
              {ROLES.map((r) => <td key={r}>{fmt(row[r])}</td>)}
              <td>{fmt(row.total)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td className="site">Demand</td><td />
            {ROLES.map((r) => <td key={r}>{fmt(cell.d.byRole[r])}</td>)}
            <td>{fmt(cell.ev.dTot)}</td>
          </tr>
          <tr style={{ fontWeight: 700 }}>
            <td className="site">Staffed</td><td />
            {ROLES.map((r) => <td key={r}>{fmt(cell.s[r])}</td>)}
            <td>{fmt(cell.ev.sTot)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

