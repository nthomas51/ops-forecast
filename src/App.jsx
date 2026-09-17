import React, { useState } from 'react';
import { getSeed } from './lib/dataSource.js';
import { DEFAULT_STANDARDS, seedVolumes } from './lib/model.js';
import OrderMatrixTab from './components/OrderMatrixTab.jsx';
import CoverageTab from './components/CoverageTab.jsx';
import TransactionsTab from './components/TransactionsTab.jsx';
import HeadcountTab from './components/HeadcountTab.jsx';
import TimeStandardsTab from './components/TimeStandardsTab.jsx';

const TABS = ['Order matrix', 'Coverage', 'Transactions', 'Headcount', 'Time standards'];

export default function App() {
  const seed = getSeed();
  const [tab, setTab] = useState('Order matrix');
  const [standards, setStandards] = useState(DEFAULT_STANDARDS);
  const [volumes, setVolumes] = useState(() => seedVolumes(seed));
  const [flpRole, setFlpRole] = useState('FOH');

  return (
    <div className="app">
      <header>
        <h1>Flexcar Ops Forecast</h1>
        <div className="meta">
          Window {seed.meta.window.start} to {seed.meta.window.end} - seed generated {seed.meta.generated_at}
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      {tab === 'Order matrix' && <OrderMatrixTab seed={seed} standards={standards} />}
      {tab === 'Coverage' && (
        <CoverageTab seed={seed} standards={standards} volumes={volumes} flpRole={flpRole} setFlpRole={setFlpRole} />
      )}
      {tab === 'Transactions' && <TransactionsTab seed={seed} standards={standards} />}
      {tab === 'Headcount' && <HeadcountTab seed={seed} standards={standards} volumes={volumes} flpRole={flpRole} />}
      {tab === 'Time standards' && (
        <TimeStandardsTab seed={seed} standards={standards} onChange={setStandards} volumes={volumes} onVolumes={setVolumes} />
      )}
    </div>
  );
}
