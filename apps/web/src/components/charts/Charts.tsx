'use client';

/**
 * Chart Components
 * Simple chart components using SVG (no external dependencies)
 * For production, consider using Recharts or Chart.js
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// LINE CHART
// ============================================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function LineChart({
  data,
  height = 200,
  color = '#4F46E5',
  showGrid = true,
  showLabels = true,
  formatValue = (v) => v.toLocaleString(),
  className,
}: LineChartProps) {
  const { path, points } = useMemo(() => {
    if (data.length === 0) return { path: '', points: [], maxValue: 0, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values) * 1.1;
    const min = Math.min(0, ...values);
    const range = max - min || 1;

    const width = 100;
    const padding = 5;
    const chartHeight = height - 40;

    const pts = data.map((d, i) => ({
      x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
      y: chartHeight - ((d.value - min) / range) * (chartHeight - 20) + 10,
      value: d.value,
      label: d.label,
    }));

    const pathData = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { path: pathData, points: pts, maxValue: max, minValue: min };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ height }}
      >
        Нет данных
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="text-muted-foreground/20">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="5"
                y1={10 + (y / 100) * (height - 50)}
                x2="95"
                y2={10 + (y / 100) * (height - 50)}
                stroke="currentColor"
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        <path
          d={`${path} L ${points[points.length - 1]?.x || 0} ${height - 30} L ${points[0]?.x || 0} ${height - 30} Z`}
          fill={`${color}15`}
        />

        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={color}
            className="cursor-pointer hover:r-4"
          >
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </circle>
        ))}
      </svg>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex justify-between px-2 mt-1">
          {data.map((d, i) => (
            i % Math.ceil(data.length / 7) === 0 && (
              <span key={i} className="text-xs text-muted-foreground">
                {d.label}
              </span>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BAR CHART
// ============================================================================

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  horizontal?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function BarChart({
  data,
  height = 200,
  color = '#4F46E5',
  horizontal = false,
  showValues = true,
  formatValue = (v) => v.toLocaleString(),
  className,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ height }}
      >
        Нет данных
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{item.label}</span>
              {showValues && (
                <span className="text-muted-foreground ml-2">
                  {formatValue(item.value)}
                </span>
              )}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          {showValues && (
            <span className="text-xs text-muted-foreground">
              {formatValue(item.value)}
            </span>
          )}
          <div
            className="w-full rounded-t transition-all duration-500 min-h-[4px]"
            style={{
              height: `${(item.value / maxValue) * (height - 40)}px`,
              backgroundColor: item.color || color,
            }}
          />
          <span className="text-xs text-muted-foreground truncate max-w-full">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PIE/DONUT CHART
// ============================================================================

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  donut?: boolean;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function PieChart({
  data,
  size = 200,
  donut = false,
  showLegend = true,
  formatValue = (v) => v.toLocaleString(),
  className,
}: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 10;
  const innerRadius = donut ? radius * 0.6 : 0;
  const center = size / 2;

  const segments = useMemo(() => {
    let currentAngle = -90;
    return data.map((item) => {
      const percentage = total > 0 ? item.value / total : 0;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = ((startAngle + angle) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const ix1 = center + innerRadius * Math.cos(startRad);
      const iy1 = center + innerRadius * Math.sin(startRad);
      const ix2 = center + innerRadius * Math.cos(endRad);
      const iy2 = center + innerRadius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = donut
        ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
        : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return {
        ...item,
        path,
        percentage,
      };
    });
  }, [data, total, radius, innerRadius, center, donut]);

  if (data.length === 0 || total === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ height: size }}
      >
        Нет данных
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, i) => (
          <path
            key={i}
            d={segment.path}
            fill={segment.color}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <title>{`${segment.label}: ${formatValue(segment.value)} (${(segment.percentage * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        {donut && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-bold fill-foreground"
          >
            {formatValue(total)}
          </text>
        )}
      </svg>

      {showLegend && (
        <div className="space-y-2">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm truncate">{segment.label}</span>
              <span className="text-sm text-muted-foreground ml-auto">
                {(segment.percentage * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs прошлый период',
  icon,
  color = '#4F46E5',
  className,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className={cn('bg-card border rounded-xl p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  !isPositive && !isNegative && 'text-muted-foreground',
                )}
              >
                {isPositive && '+'}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SPARKLINE (Mini chart)
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = '#4F46E5',
  className,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 4) - 2,
    }));

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} className={className}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default { LineChart, BarChart, PieChart, StatCard, Sparkline };
