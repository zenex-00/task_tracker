'use client';

import type { HourType } from '@/types';

interface HourBreakdownSectionProps {
  hourTypes: HourType[];
  onManage: () => void;
}

export function HourBreakdownSection({ hourTypes, onManage }: HourBreakdownSectionProps) {
  return (
    <div className="hour-breakdown-section mt-4">
      <div className="section-subhead">
        <h3>Hour Breakdown</h3>
        <button type="button" className="btn-ghost" onClick={onManage}>
          Edit
        </button>
      </div>

      <div>
        {hourTypes.map((ht) => {
          return (
            <div key={ht.code} className="hour-row">
              <span className="hour-row-label" style={{ color: ht.color }}>{ht.name}</span>
              <input id={`hr-${ht.code.toLowerCase()}`} type="number" step="0.25" min="0" defaultValue="0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
