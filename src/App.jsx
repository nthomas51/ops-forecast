import React, { useState } from 'react';
import { getSeed } from './lib/dataSource.js';
import { DEFAULT_TIME_STANDARDS } from './lib/model.js';
import OverviewTab from './components/OverviewTab.jsx';
import OrdersTab from './components/OrdersTab.jsx';
import OnFlexTab from './components/OnFlexTab.jsx';
import StaffingTab from './components/StaffingTab.jsx';
import TimeStandardsTab from './components/TimeStandardsTab.jsx';

const TABS = ['Overview', 'Orders', 'On-Flex', 'Staffing', 'Time Standards'];

export default function App() {
  const seed = getSeed();
  const [tab, setTab] = useState('Overview');
  const [timeStandards, setTimeStandards] = useState(DEFAULT_TIME_STANDARDS);

  return (
    <div className="app">
      <header>
        <h1>Flexcar Ops Forecast</h1>
        <div className="meta">
          Window {seed.meta.window.start} to {seed.meta.window.end} &middot; seed
          generated {seed.meta.generated_at}
        </div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t}
              className={t === tab ? 'tab active' : 'tab'}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'Overview' && <OverviewTab seed={seed} ts={timeStandards} />}
      {tab === 'Orders' && <OrdersTab seed={seed} />}
      {tab === 'On-Flex' && <OnFlexTab seed={seed} />}
      {tab === 'Staffing' && <StaffingTab seed={seed} />}
      {tab === 'Time Standards' && (
        <TimeStandardsTab ts={timeStandards} onChange={setTimeStandards} />
      )}
    </div>
  );
}
