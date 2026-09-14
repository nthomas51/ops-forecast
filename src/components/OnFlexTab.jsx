import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

export default function OnFlexTab({ seed }) {
  const sites = seed.meta.dashboard_sites;
  const days = seed.meta.window.days;
  const [site, setSite] = useState(sites[0]);

  const chartData = days.map((d) => ({
    day: d.slice(5),
    hours: Math.round(((seed.demand.onFlex[site][d].activeEstMin || 0) / 60) * 10) / 10,
    bookings: seed.demand.onFlex[site][d].activeBookings || 0,
  }));

  return (
    <div>
      <div className="controls">
        <label>
          Site:{' '}
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            {sites.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <span>Active bookings exclude CANCELLED; cancelled counts stay visible below.</span>
      </div>
      <div className="chartbox">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis label={{ value: 'Est. hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="hours" fill="#3b6ea5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h3 className="subhead">All sites, by day</h3>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th className="site">Site</th>
              {days.map((d) => <th key={d}>{d.slice(5)}</th>)}
              <th>Wk bookings</th>
              <th>Wk est hrs</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              let nb = 0; let mins = 0;
              return (
                <tr key={s}>
                  <td className="site">{s}</td>
                  {days.map((d) => {
                    const c = seed.demand.onFlex[s][d];
                    nb += c.activeBookings; mins += c.activeEstMin;
                    const canc = c.byStatus.CANCELLED ? c.byStatus.CANCELLED.n : 0;
                    return (
                      <td key={d}>
                        {c.activeBookings}
                        {canc ? <span style={{ color: '#b3541e' }}> (+{canc}c)</span> : null}
                      </td>
                    );
                  })}
                  <td>{nb}</td>
                  <td>{Math.round(mins / 60)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
