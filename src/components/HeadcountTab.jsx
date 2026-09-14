import React, { useState } from 'react';
import { ROLES, ROLE_LABELS, orderedSites, demandFor, supplyFor, fmt } from '../lib/model.js';

// House groups: roster comes from a pasted Rippling CSV export (authoritative HR),
// scheduled hours come from the seed, required hours from the demand model.
const HOUSE = [
  { key: 'FOH', label: 'FOH (MC/MEA)', match: /member concierge|member experience|mea|mc\b/i },
  { key: 'OpsSpec', label: 'MOH (Ops Specialist)', match: /ops.?special/i },
  { key: 'Tech', label: 'BOH (Tech)', match: /tech/i },
  { key: 'Lead', label: 'Leadership/Other', match: /lead|manager|mem|coordinator|parts/i },
];

const APPLICABILITY = [
  ['Pickup',          'x + call', 'prep',        'only if booked into service'],
  ['Return',          'x',        'x',           'x'],
  ['Swap',            'x + call', 'prep',        'x'],
  ['Delivery',        'x + call', '',            'only if booked into service'],
  ['On-flex visit',   'x',        '',            'tech time arrives as service hours'],
  ['Service booking', '',         '',            'booked hours land on Tech 1:1'],
  ['Infleet',         '',         'x',           ''],
  ['Repossession',    '',         'x',           ''],
];

function parseRoster(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const head = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const siteCol = head.findIndex((h) => /site|location|work location/.test(h));
  const roleCol = head.findIndex((h) => /title|role|job/.test(h));
  if (siteCol < 0 || roleCol < 0) return null;
  const out = {};
  for (const line of lines.slice(1)) {
    const cells = line.split(delim);
    const site = (cells[siteCol] || '').trim();
    const role = (cells[roleCol] || '').trim();
    if (!site || !role) continue;
    const g = HOUSE.find((h) => h.match.test(role));
    const key = g ? g.key : 'Lead';
    out[site] = out[site] || {};
    out[site][key] = (out[site][key] || 0) + 1;
  }
  return out;
}

export default function HeadcountTab({ seed, standards, volumes, flpRole }) {
  const sites = orderedSites(seed);
  const days = seed.meta.window.days;
  const [pasted, setPasted] = useState('');
  const [roster, setRoster] = useState(null);
  const [err, setErr] = useState('');
  const [shiftHours, setShiftHours] = useState(8);

  const doImport = () => {
    const r = parseRoster(pasted);
    if (!r) { setErr('Could not find site and title columns - paste the Rippling export with headers.'); return; }
    setErr(''); setRoster(r);
  };

  // week scheduled and required hours by role
  const weekly = (site) => {
    const sch = { FOH: 0, OpsSpec: 0, Tech: 0 };
    const req = { FOH: 0, OpsSpec: 0, Tech: 0 };
    days.forEach((d, i) => {
      const s = supplyFor(seed, site, d, flpRole);
      const dm = demandFor(seed, site, i, standards, volumes, 'model', 'day-before').byRole;
      ROLES.forEach((r) => { sch[r] += s[r]; req[r] += dm[r]; });
    });
    return { sch, req };
  };

  // fuzzy site match between Rippling names and dashboard names
  const rosterFor = (site) => {
    if (!roster) return null;
    const key = Object.keys(roster).find((k) => k.toLowerCase().includes(site.toLowerCase()) || site.toLowerCase().includes(k.toLowerCase()));
    return key ? roster[key] : null;
  };

  return (
    <div>
      <div className="cards">
        <div className="card" style={{ maxWidth: 560 }}>
          <strong>Rippling roster import (authoritative HR)</strong>
          <p>Paste the Rippling report export (CSV or TSV with headers including a site/location column and a title/role column).</p>
          <textarea rows={5} style={{ width: '100%' }} value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <div className="controls" style={{ marginTop: 8 }}>
            <button className="btn" onClick={doImport}>Import roster</button>
            <label>Shift hours: <input type="number" min="1" value={shiftHours} onChange={(e) => setShiftHours(Number(e.target.value))} style={{ width: 60 }} /></label>
            <span style={{ color: '#991B1B' }}>{err}</span>
          </div>
        </div>
      </div>
      <h3 className="subhead">Roster to scheduled to required, by house group (week)</h3>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Site</th>
              {ROLES.map((r) => <th key={r} colSpan={3}>{ROLE_LABELS[r]}</th>)}
            </tr>
            <tr>
              <th className="site"></th>
              {ROLES.flatMap((r) => [
                <th key={r + 'h'}>Heads</th>,
                <th key={r + 's'}>Sched h</th>,
                <th key={r + 'r'}>Req h</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => {
              const { sch, req } = weekly(site);
              const ros = rosterFor(site);
              return (
                <tr key={site}>
                  <td className="site">{site}</td>
                  {ROLES.flatMap((r) => {
                    const short = req[r] > sch[r] + 0.05;
                    return [
                      <td key={r + 'h'}>{ros ? ros[r] || 0 : '-'}</td>,
                      <td key={r + 's'}>{fmt(sch[r], 0)}</td>,
                      <td key={r + 'r'} style={short ? { background: '#FBEDEC', color: '#991B1B', fontWeight: 600 } : undefined}>{fmt(req[r], 0)}</td>,
                    ];
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Heads come from the pasted roster (dash until imported); scheduled hours from Assembled via the seed;
        required hours from the demand model. Red marks groups where required exceeds scheduled for the week.
        Implied heads at {shiftHours}h shifts: divide hours by {shiftHours * 5} for a 5-day week.
      </p>
      <h3 className="subhead">Applicability matrix - which work hits which group</h3>
      <div className="scroll" style={{ maxWidth: 760 }}>
        <table>
          <thead>
            <tr><th className="site">Event</th><th>FOH (MC/MEA)</th><th>MOH (Ops Spec)</th><th>BOH (Tech)</th></tr>
          </thead>
          <tbody>
            {APPLICABILITY.map((row) => (
              <tr key={row[0]}>
                <td className="site">{row[0]}</td>
                {row.slice(1).map((c, i) => <td key={i} className={c ? '' : 'notecell'}>{c || '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
