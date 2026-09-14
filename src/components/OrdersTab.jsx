import React, { useState } from 'react';

const TYPES = ['Pickup', 'Swap', 'Delivery', 'Return'];

export default function OrdersTab({ seed }) {
  const [week, setWeek] = useState('this');
  const thisDays = seed.meta.window.days;
  const lastDays = seed.demand.lastWeekActuals.days;
  const days = week === 'this' ? thisDays : lastDays;
  const source = week === 'this' ? seed.demand.orders : seed.demand.lastWeekActuals.orders;
  const sites = seed.meta.dashboard_sites;

  return (
    <div>
      <div className="controls">
        <label>
          Week:{' '}
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="this">This week (booked)</option>
            <option value="last">Last week (actuals)</option>
          </select>
        </label>
        <span>P / S / D / R per site per day</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Site</th>
              {days.map((d) => <th key={d}>{d.slice(5)}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              let tot = 0;
              return (
                <tr key={s}>
                  <td className="site">{s}</td>
                  {days.map((d) => {
                    const o = source[s][d];
                    tot += TYPES.reduce((a, t) => a + (o[t] || 0), 0);
                    return (
                      <td key={d}>
                        {TYPES.map((t) => o[t] || 0).join(' / ')}
                      </td>
                    );
                  })}
                  <td>{tot}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
