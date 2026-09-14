import React, { useState } from 'react';
import {
  TXN_TYPES, FIRM_DAYS, MX_HEAD, MX_SUB, MX_BODY, MX_TOTAL,
  modelOrders, bookedOrders, onFlexVisits, orderedSites, dayLabel,
} from '../lib/model.js';

const ON_FLEX = 'On-flex';
const MX_TYPES = [...TXN_TYPES, ON_FLEX];
const MX_LETTER = { Pickup: 'P', Return: 'R', Swap: 'S', Delivery: 'D', [ON_FLEX]: 'OF' };

export default function OrderMatrixTab({ seed, standards }) {
  const [mxSource, setMxSource] = useState('model'); // booked days 1-3 + last-week actuals days 4-7
  const [mxDetail, setMxDetail] = useState('type');  // P/R/S/D/OF columns vs one total per site
  const [msg, setMsg] = useState('');
  const days = seed.meta.window.days;
  const sites = orderedSites(seed);

  const mxVal = (site, t, dayIdx) => {
    const day = days[dayIdx];
    if (t === ON_FLEX) return onFlexVisits(seed, site, day); // seed v2: last-week visits for forecast days
    return mxSource === 'model'
      ? modelOrders(seed, site, t, dayIdx, standards)
      : bookedOrders(seed, site, t, day);
  };
  const mxCols = mxDetail === 'type' ? MX_TYPES : ['All'];
  const mxCell = (site, col, dayIdx) =>
    col === 'All' ? MX_TYPES.reduce((a, t) => a + mxVal(site, t, dayIdx), 0) : mxVal(site, col, dayIdx);
  const rowTot = (dayIdx) => sites.reduce((a, s) => a + MX_TYPES.reduce((x, t) => x + mxVal(s, t, dayIdx), 0), 0);
  const colTot = (site, col) => days.reduce((a, _, i) => a + mxCell(site, col, i), 0);
  const grand = days.reduce((a, _, i) => a + rowTot(i), 0);

  const copyTsv = () => {
    const h1 = ['Date', ...sites.flatMap((s) => mxCols.map((c, i) => (i === 0 ? s : ''))), 'Total'];
    const h2 = ['', ...sites.flatMap(() => mxCols.map((c) => (c === 'All' ? 'Total' : MX_LETTER[c]))), ''];
    const rows = days.map((d, i) => [
      dayLabel(d),
      ...sites.flatMap((s) => mxCols.map((c) => mxCell(s, c, i))),
      rowTot(i),
    ]);
    const tot = ['Total', ...sites.flatMap((s) => mxCols.map((c) => colTot(s, c))), grand];
    const tsv = [h1, h2, ...rows, tot].map((r) => r.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(
      () => setMsg('Copied as TSV — paste into the workbook.'),
      () => setMsg('Clipboard blocked by the browser.')
    );
  };

  return (
    <div>
      <div className="controls">
        <label>
          View:{' '}
          <select value={mxSource} onChange={(e) => setMxSource(e.target.value)}>
            <option value="model">Model (booked 1-3 + last wk actuals 4-7)</option>
            <option value="booked">Booked only</option>
          </select>
        </label>
        <label>
          Columns:{' '}
          <select value={mxDetail} onChange={(e) => setMxDetail(e.target.value)}>
            <option value="type">By type (P/R/S/D/OF)</option>
            <option value="site">Site totals</option>
          </select>
        </label>
        <button className="btn" onClick={copyTsv}>Copy for Excel</button>
        <span>{msg}</span>
      </div>
      <div className="scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="site pin">Date</th>
              {sites.map((s, si) => (
                <th key={s} colSpan={mxCols.length} style={{ background: MX_HEAD[si % MX_HEAD.length], color: '#fff' }}>{s}</th>
              ))}
              <th style={{ background: MX_TOTAL }}>Total</th>
            </tr>
            <tr>
              <th className="site pin"></th>
              {sites.flatMap((s, si) =>
                mxCols.map((c) => (
                  <th key={s + c} style={{ background: MX_SUB[si % MX_SUB.length] }}>
                    {c === 'All' ? 'Total' : MX_LETTER[c]}
                  </th>
                ))
              )}
              <th style={{ background: MX_TOTAL }}></th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => {
              const wk = mxSource === 'model' && i >= FIRM_DAYS;
              return (
                <tr key={d} className={wk ? 'wkrow' : ''}>
                  <td className="site pin">
                    {dayLabel(d)} {wk && <span className="wkmark">wk</span>}
                  </td>
                  {sites.flatMap((s, si) =>
                    mxCols.map((c) => (
                      <td key={s + c} style={{ background: MX_BODY[si % MX_BODY.length] }}>{mxCell(s, c, i)}</td>
                    ))
                  )}
                  <td style={{ background: MX_TOTAL, fontWeight: 600 }}>{rowTot(i)}</td>
                </tr>
              );
            })}
            <tr>
              <td className="site pin" style={{ fontWeight: 700 }}>Total</td>
              {sites.flatMap((s, si) =>
                mxCols.map((c) => (
                  <td key={s + c} style={{ background: MX_SUB[si % MX_SUB.length], fontWeight: 600 }}>{colTot(s, c)}</td>
                ))
              )}
              <td style={{ background: MX_TOTAL, fontWeight: 700 }}>{grand}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="footnote">
        "wk" rows carry last week's same-weekday actuals. On-flex shows booked visits on all days
        (last-week visit actuals are a seed v2 addition).
      </p>
    </div>
  );
}
