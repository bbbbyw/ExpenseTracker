"use client";

import React from "react";

type BarChartProps = {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
};

export function BarChart({ data, height = 200 }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  // Constrain chart width: minimum 40px per bar, maximum 600px total width
  const minBarWidth = 40;
  const maxTotalWidth = 600;
  const calculatedWidth = Math.min(data.length * minBarWidth, maxTotalWidth);
  const barWidth = calculatedWidth / data.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${calculatedWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-48 w-full min-w-0"
        style={{ maxWidth: `${calculatedWidth}px` }}
      >
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * height : 0;
          const x = index * barWidth;
          const color = item.color || "#3b82f6";

          return (
            <g key={index}>
              <rect
                x={x + 2}
                y={height - barHeight}
                width={barWidth - 4}
                height={barHeight}
                fill={color}
                rx="4"
                className="transition-all duration-300 hover:opacity-80"
              />
              <text
                x={x + barWidth / 2}
                y={height - barHeight - 5}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
                className="font-medium"
              >
                {item.value.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        className="mt-2 grid gap-0 text-xs text-zinc-500 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${data.length}, ${barWidth}px)`,
          maxWidth: `${calculatedWidth}px`,
          width: 'fit-content'
        }}
      >
        {data.map((item, index) => (
          <span key={index} className="truncate text-center px-1" title={item.label}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type LineChartProps = {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
};

export function LineChart({ data, height = 200, color = "#3b82f6" }: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = height - ((item.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${points} ${100},${height} 0,${height}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-64 w-full">
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={color}
          fillOpacity="0.1"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1 || 1)) * 100;
          const y = height - ((item.value - minValue) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              className="transition-all duration-300 hover:r-4"
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        {data.map((item, index) => (
          <span key={index} className="truncate" style={{ width: `${100 / data.length}%` }}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type PieChartProps = {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
};

export function PieChart({ data, size = 200 }: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data available
      </div>
    );
  }

  const colors = [
    "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
  ];

  let currentAngle = -90;
  const radius = size / 2 - 10;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row">
      <svg width={size} height={size} className="shrink-0">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const largeArc = angle > 180 ? 1 : 0;

          const x1 = center + radius * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = center + radius * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = center + radius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
          const y2 = center + radius * Math.sin(((currentAngle + angle) * Math.PI) / 180);

          const pathData = [
            `M ${center} ${center}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z"
          ].join(" ");

          const color = item.color || colors[index % colors.length];
          const startAngle = currentAngle;
          currentAngle += angle;

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={color}
                className="transition-all duration-300 hover:opacity-80"
              />
            </g>
          );
        })}
      </svg>
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          const color = item.color || colors[index % colors.length];
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {item.label}: {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
