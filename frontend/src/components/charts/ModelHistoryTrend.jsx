import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Layers } from 'lucide-react';

export function ModelSparkline({ values = [70, 75, 82, 90, 94], color = '#4f46e5' }) {
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const width = 64;
  const height = 18;

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1 || 1)) * width;
    const y = height - ((val - min) / (max - min)) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', verticalAlign: 'middle' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / (max - min)) * (height - 4) - 2}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function ModelHistoryTrend({ models = [] }) {
  // Sort ascending by version_id for chronological trend
  const trendData = useMemo(() => {
    if (!models || models.length === 0) return [];
    const sorted = [...models].sort((a, b) => Number(a.version_id) - Number(b.version_id));
    return sorted.map((m) => ({
      version: `v${m.version_id}`,
      allowRate: Number(((m.allow_rate || 0) * 100).toFixed(1)),
      avgScore: Number((((m.avg_score || 0)) * 100).toFixed(1)),
      samples: m.training_samples || 0,
      isActive: m.is_active
    }));
  }, [models]);

  if (trendData.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No hay suficientes versiones de modelo registradas para proyectar la curva evolutiva.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="allowTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="version"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            domain={[50, 100]}
            tickFormatter={(val) => `${val}%`}
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
            formatter={(val, name) => [`${val}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '4px' }} />
          <Area
            type="monotone"
            dataKey="avgScore"
            name="Score Promedio Biométrico"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#scoreTrendGrad)"
            dot={{ r: 4, fill: '#4f46e5' }}
            activeDot={{ r: 6 }}
          />
          <Area
            type="monotone"
            dataKey="allowRate"
            name="Tasa de Aceptación (%)"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#allowTrendGrad)"
            dot={{ r: 3, fill: '#10b981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
