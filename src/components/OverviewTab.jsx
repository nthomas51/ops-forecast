import React from 'react';
import {
  fohDemandHours, fohSupplyHours, bohDemandHours, bohSupplyHours,
  utilization, utilClass, fmt,
} from '../lib/model.js';

function dayLabel(d) {
  const dt = new Date(d + 'T12:00:00Z');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
}

export default function OverviewTab({ seed, ts }) {
  const days = seed.meta.window.days;
  const sites = seed.meta.dashboard_sites;
  return (
    <div>
      <div className="legend">
        <span className="util-ok">under 85%</span>
        <span className="util-tight">85 to 100%</span>
        <span className="util-over">over 100%</span>
        <span className="util-idle">no demand</span>
        <span>Cell shows demand / supply hours (FOH from orders + retention calls, BOH from on-flex minutes)</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Site</th>
              {days.map((d) => <th key={d}>{dayLabel(d)}</th>)}
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s}>
                <td className="site">{s}</td>
                {days.map((d) => {
                  const fd = fohDemandHours(seed, ts, s, d);
                  const fs = fohSupplyHours(seed, s, d);
                  const bd = bohDemandHours(seed, s, d);
                  const bs = bohSupplyHours(seed, s, d);
                  return (
                    <td key={d} className="cellpair">
                      <div className={utilClass(utilization(fd, fs))}>
                        FOH {fmt(fd)} / {fmt(fs)}
                      </div>
                      <div className={utilClass(utilization(bd, bs))}>
                        BOH {fmt(bd)} / {fmt(bs)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
