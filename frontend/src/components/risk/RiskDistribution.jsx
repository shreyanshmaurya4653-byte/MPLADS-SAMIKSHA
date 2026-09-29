import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export function RiskDistribution({ distribution }) {
  const data = distribution || [
    { name: 'High Risk', value: 3, color: '#ef4444' },
    { name: 'Medium Risk', value: 3, color: '#f59e0b' },
    { name: 'Low Risk', value: 3, color: '#10b981' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <h4 className="text-sm font-bold text-slate-900 mb-1">Risk Classification Share</h4>
      <p className="text-xs text-slate-400 mb-4">Proportion of active works categorized by anomaly severity</p>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={50}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: 'none',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
