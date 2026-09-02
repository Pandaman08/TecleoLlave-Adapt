import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { Sliders } from 'lucide-react';

const DEFAULT_FEATURE_IMPORTANCE = [
  { feature: 'Hold Time: dígrafo "se"', weight: 0.185, category: 'hold' },
  { feature: 'Flight Time: transición "la"→"se"', weight: 0.162, category: 'flight' },
  { feature: 'Varianza rítmica inter-tecla', weight: 0.148, category: 'variance' },
  { feature: 'Hold Time: tecla "Space"', weight: 0.134, category: 'hold' },
  { feature: 'Latencia dígrafo "ad"→"pr"', weight: 0.118, category: 'flight' },
  { feature: 'Ratio aceleración de pulsación', weight: 0.095, category: 'rhythm' },
  { feature: 'Hold Time: tecla "Ó" / "O"', weight: 0.088, category: 'hold' },
  { feature: 'Consistencia de Release (KeyUp)', weight: 0.070, category: 'variance' }
];

export default function FeatureImportanceChart({ data = DEFAULT_FEATURE_IMPORTANCE }) {
  // Sort descending by weight
  const sorted = [...data].sort((a, b) => b.weight - a.weight);

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 0.22]}
            tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
            stroke="var(--text-muted)"
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="feature"
            stroke="var(--text-secondary)"
            fontSize={11}
            width={170}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-primary)'
            }}
            formatter={(val) => [`${(Number(val) * 100).toFixed(1)}% peso en vector de decisión`, 'Importancia']}
          />
          <Bar
            dataKey="weight"
            radius={[0, 4, 4, 0]}
            barSize={14}
          >
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#4f46e5' : index < 3 ? '#6366f1' : '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
