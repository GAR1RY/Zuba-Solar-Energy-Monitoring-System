import React, { useState } from 'react';
import { MeterLog } from '../../types';

interface ProductionChartProps {
  logs: MeterLog[];
  todayPredictedKwh: number;
}

export const ProductionChart: React.FC<ProductionChartProps> = ({ logs, todayPredictedKwh }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Take the last 7 entries
  const last7 = logs.slice(0, 7).reverse();

  // If fewer than 7 days, backfill or present available
  const displayData = last7.length > 0 ? last7 : [
    {
      id: 'today',
      systemId: '',
      date: new Date().toISOString().split('T')[0],
      totalDayGenerationKwh: Number((todayPredictedKwh * 0.96).toFixed(2)),
      energyConsumedKwh: Number((todayPredictedKwh * 0.45).toFixed(2)),
      eveningRemainingKwh: 8.5,
      netKwh: Number((todayPredictedKwh * 0.96).toFixed(2)),
      predictedKwh: todayPredictedKwh,
      deltaKwh: Number((todayPredictedKwh * -0.04).toFixed(2)),
      auditStatus: 'Verified' as const,
    },
  ];

  const maxVal = Math.max(...displayData.map((d) => Math.max(d.netKwh, d.predictedKwh)), 5.0) * 1.25;

  const width = 640;
  const height = 180;
  const paddingX = 40;
  const paddingY = 24;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const pointsCount = displayData.length;
  const step = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth / 2;

  const actualCoords = displayData.map((d, i) => {
    const x = pointsCount === 1 ? width / 2 : paddingX + i * step;
    const y = height - paddingY - (d.netKwh / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const predictedCoords = displayData.map((d, i) => {
    const x = pointsCount === 1 ? width / 2 : paddingX + i * step;
    const y = height - paddingY - (d.predictedKwh / maxVal) * chartHeight;
    return { x, y, data: d };
  });

  const actualPath = actualCoords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const predictedPath = predictedCoords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const areaPath = `${actualPath} L ${actualCoords[actualCoords.length - 1].x} ${height - paddingY} L ${actualCoords[0].x} ${height - paddingY} Z`;

  const hoveredItem = hoverIndex !== null ? displayData[hoverIndex] : null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Seven-Day Generation History
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Verified inverter net energy output compared against predictive model baseline
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded-full" />
            <span className="text-neutral-700 dark:text-neutral-300">Actual (kWh)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-t border-dashed border-neutral-400 dark:border-neutral-500" />
            <span className="text-neutral-700 dark:text-neutral-300">Predicted (kWh)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[640/200] max-h-[220px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Subtle grid lines */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-neutral-200 dark:text-neutral-800"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={height - paddingY - chartHeight * 0.5}
            x2={width - paddingX}
            y2={height - paddingY - chartHeight * 0.5}
            stroke="currentColor"
            className="text-neutral-100 dark:text-neutral-800/50"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#actualGradient)" opacity="0.12" />

          {/* Predicted Line */}
          <path
            d={predictedPath}
            fill="none"
            stroke="#a3a3a3"
            strokeWidth="1.8"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* Actual Line */}
          <path
            d={actualPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive Nodes */}
          {actualCoords.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === i ? 5 : 3.5}
                className="fill-amber-500 transition-all cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="18"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
            </g>
          ))}

          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover Tooltip */}
        {hoveredItem && (
          <div className="absolute top-2 right-2 sm:right-6 bg-neutral-900/90 dark:bg-neutral-800/90 backdrop-blur-md text-white px-3 py-2 rounded-lg text-xs shadow-lg pointer-events-none tabular-nums">
            <div className="font-semibold text-neutral-200">{hoveredItem.date}</div>
            <div className="flex items-center gap-3 mt-1 text-[11px]">
              <div>
                Actual:{' '}
                <span className="font-bold text-amber-400">{hoveredItem.netKwh} kWh</span>
              </div>
              <div>
                Predicted:{' '}
                <span className="font-bold text-neutral-400">{hoveredItem.predictedKwh} kWh</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* X-Axis Day Labels */}
      <div className="flex justify-between items-center text-[11px] font-medium text-neutral-400 dark:text-neutral-500 px-6 sm:px-10 mt-1">
        {displayData.map((d, idx) => {
          const dateObj = new Date(d.date + 'T12:00:00');
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          return <span key={idx}>{dayName}</span>;
        })}
      </div>
    </div>
  );
};
