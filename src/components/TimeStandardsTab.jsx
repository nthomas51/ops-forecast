import React from 'react';
import { TIME_STANDARD_LABELS, DEFAULT_TIME_STANDARDS } from '../lib/model.js';

export default function TimeStandardsTab({ ts, onChange }) {
  return (
    <div>
      <p className="note">
        These defaults are placeholders, not measured figures. Adjust them here
        (applies to this session) or edit DEFAULT_TIME_STANDARDS in
        src/lib/model.js to bake real values in.
      </p>
      <div className="panel">
        {Object.keys(DEFAULT_TIME_STANDARDS).map((k) => (
          <div className="row" key={k}>
            <label htmlFor={k}>{TIME_STANDARD_LABELS[k]}</label>
            <input
              id={k}
              type="number"
              min="0"
              step="1"
              value={ts[k]}
              onChange={(e) => onChange({ ...ts, [k]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
