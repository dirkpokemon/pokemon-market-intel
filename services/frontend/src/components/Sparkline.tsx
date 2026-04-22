'use client';

/**
 * Sparkline — tiny inline SVG price trend chart.
 * Pure SVG, no Chart.js dependency. Used on deal cards.
 *
 * Colour convention (from a buyer's perspective):
 *   green  = price trending down  → good deal
 *   red    = price trending up    → act now or wait
 *   gray   = flat / insufficient data
 */

interface SparklineProps {
  /** Ordered list of avg prices (oldest → newest). */
  data: number[];
  width?: number;
  height?: number;
  /** Override automatic trend colour. */
  color?: string;
  /** Show a small % change label next to the line. */
  showChange?: boolean;
}

export default function Sparkline({
  data,
  width = 72,
  height = 24,
  color,
  showChange = false,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // Normalise to SVG coords; add 1px padding top/bottom
  const pad = 2;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = range === 0
        ? height / 2
        : pad + ((max - v) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const change = data[data.length - 1] - data[0];
  const changePct = data[0] !== 0 ? (change / data[0]) * 100 : 0;

  const autoColor =
    change < -0.01 ? '#10b981' :  // price fell → green (good for buyer)
    change > 0.01  ? '#ef4444' :  // price rose → red
    '#9ca3af';                     // flat → gray

  const lineColor = color ?? autoColor;

  // Fill area under the line
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="flex-shrink-0 overflow-visible"
      >
        <defs>
          <linearGradient id={`sg-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points={fillPoints}
          fill={`url(#sg-${lineColor.replace('#', '')})`}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        {data.length > 0 && (() => {
          const lastX = width;
          const lastY = range === 0
            ? height / 2
            : pad + ((max - data[data.length - 1]) / range) * (height - pad * 2);
          return (
            <circle cx={lastX} cy={lastY} r="2" fill={lineColor} />
          );
        })()}
      </svg>

      {showChange && Math.abs(changePct) >= 0.5 && (
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: lineColor }}
        >
          {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
        </span>
      )}
    </span>
  );
}
