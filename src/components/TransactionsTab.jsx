import React, { useState } from 'react';
import {
  TXN_TYPES, FIRM_DAYS, bookedOrders, lastWeekOrders, onFlexVisits,
  serviceHours, retentionCalls, orderedSites, dayLabel, fmt,
} from '../lib/model.js';

export default function TransactionsTab({ seed, standards }) {
  const sites = orderedSites(seed);
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
      </div>
      <div className="cards">
        <div className="card">
          <strong>Days 4-7 forecast - last week's actuals</strong>
          <p>
            Forecast days carry last week's same-weekday fulfilled orders
            ({seed.demand.lastWeekActuals.days[FIRM_DAYS]} onward as references). On-flex visits and
            service hours still show booked values on those days until the seed carries their actuals.
          </p>
        </div>
        <div className="card">
          <strong>Seed refresh</strong>
          <p>
            Data refreshes when the daily Claude job commits a new seed.json - generated {seed.meta.generated_at}.
          </p>
        </div>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Stream</th>
              {days.map((d, i) => <th key={d} className={i >= FIRM_DAYS ? 'faded' : ''}>{dayLabel(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {TXN_TYPES.map((t) => (
              <tr key={t}>
                <td className="site">{t} (booked)</td>
                {days.map((d) => <td key={d}>{bookedOrders(seed, site, t, d)}</td>)}
              </tr>
            ))}
            {TXN_TYPES.map((t) => (
              <tr key={t + 'lw'} className="lwrow">
                <td className="site">{t} - last wk actual</td>
                {days.map((d, i) => <td key={d}>{lastWeekOrders(seed, site, t, i) ?? ''}</td>)}
              </tr>
            ))}
            <tr>
              <td className="site">On-flex visits (active)</td>
              {days.map((d) => <td key={d}>{onFlexVisits(seed, site, d)}</td>)}
            </tr>
            <tr>
              <td className="site">Service hours (booked)</td>
              {days.map((d) => <td key={d}>{fmt(serviceHours(seed, site, d))}</td>)}
            </tr>
            <tr>
              <td className="site">Retention calls (model)</td>
              {days.map((d, i) => <td key={d}>{retentionCalls(seed, site, i, standards, 'model')}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
