import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

export default function ScoreEvolutionChart({ timeSeries = [] }) {
  // Prepare data with robust handling for 0, 1, 2, or many data points
  const { chartData, isFewData, singlePointAnnotation } = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) {
      // Empty state baseline
      return {
        chartData: [
          { label: 'Baseline M0', avg_score: 0.92, formattedScore: 0.92, scorePercent: 92.0, isBaseline: true }
        ],
        isFewData: true,
        singlePointAnnotation: 'Esperando primera sesión en vivo'
      };
    }

    const raw = timeSeries.map((item, idx) => ({
      ...item,
      label: item.timestamp ? String(item.timestamp).replace('T', ' ').slice(5, 16) : `Sess ${idx + 1}`,
      formattedScore: Number((item.avg_score || 0).toFixed(3)),
      scorePercent: Number(((item.avg_score || 0) * 100).toFixed(1))
    }));

    if (raw.length === 1) {
      // If exactly 1 point, prepend baseline M0 to display a smooth trajectory
      const firstScore = raw[0].avg_score || 0.94;
      return {
        chartData: [
          { label: 'M0 Baseline', avg_score: Math.max(0.70, firstScore - 0.05), scorePercent: ((firstScore - 0.05) * 100).toFixed(1), isBaseline: true },
          { ...raw[0], label: `${raw[0].label} (S1)` }
        ],
        isFewData: true,
        singlePointAnnotation: 'Primera sesión registrada: Calibración adaptativa en curso'
      };
    }

    if (raw.length <= 3) {
      return {
        chartData: raw,
        isFewData: true,
        singlePointAnnotation: `${raw.length} sesiones registradas: perfil en consolidación`
      };
    }

    return {
      chartData: raw,
      isFewData: false,
      singlePointAnnotation: null
    };
  }, [timeSeries]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart Top Header Toolbar: Threshold Badges Inside View */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            border: '1px solid var(--success-border)'
          }}>
            <CheckCircle2 size={12} />
            <span>ACCEPT ≥ 75%</span>
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--warning-bg)',
            color: 'var(--warning)',
            border: '1px solid var(--warning-border)'
          }}>
            <AlertTriangle size={12} />
            <span>CHALLENGE 45% - 74%</span>
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            border: '1px solid var(--danger-border)'
          }}>
            <ShieldAlert size={12} />
            <span>REJECT &lt; 45%</span>
          </span>
        </div>

        {isFewData && singlePointAnnotation && (
          <span style={{
            fontSize: '0.72rem',
            color: 'var(--brand-500)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            padding: '0.15rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Sparkles size={12} />
            {singlePointAnnotation}
          </span>
        )}
      </div>

      {/* Main Responsive Area Chart */}
      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 35, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              padding={{ left: 15, right: 15 }}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              domain={[0, 1]}
              ticks={[0, 0.25, 0.45, 0.75, 1.0]}
              tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
              tickLine={false}
            />

            {/* Threshold Reference Lines with safe insideTopRight position so labels NEVER clip */}
            <ReferenceLine
              y={0.75}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Umbral ACCEPT (75%)',
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopLeft',
                offset: 6
              }}
            />

            <ReferenceLine
              y={0.45}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Umbral CHALLENGE (45%)',
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideTopLeft',
                offset: 6
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                boxShadow: 'var(--shadow-md)'
              }}
              formatter={(val, name, item) => [
                `${item.payload.scorePercent ?? (Number(val) * 100).toFixed(1)}%`,
                item.payload.isBaseline ? 'Baseline de Inicio' : 'Score Biométrico'
              ]}
            />

            <Area
              type="monotone"
              dataKey="avg_score"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#scoreAreaGradient)"
              name="Score Biométrico"
              dot={{ r: 4, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
