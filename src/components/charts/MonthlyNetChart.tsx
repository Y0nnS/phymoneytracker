'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import type { Transaction } from '@/lib/types';
import { lastNMonthIds, monthIdLabel, monthlyTotals } from '@/lib/insights';
import { formatIDR, formatIDRCompact } from '@/lib/money';
import { ensureChartJs } from './ensureChartJs';
import { CHART_COLORS } from './theme';

ensureChartJs();

export function MonthlyNetChart({
  monthId,
  transactions,
  rangeMonths = 6,
}: {
  monthId: string;
  transactions: Transaction[];
  rangeMonths?: number;
}) {
  const monthIds = React.useMemo(() => lastNMonthIds(monthId, rangeMonths), [monthId, rangeMonths]);
  const totals = React.useMemo(
    () => monthlyTotals(transactions, monthIds),
    [transactions, monthIds],
  );

  const labels = totals.map((t) => monthIdLabel(t.monthId));
  const values = totals.map((t) => t.net);
  const colors = values.map((v) => (v >= 0 ? CHART_COLORS.net : CHART_COLORS.expense));

  const data = React.useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Net',
          data: values,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false as const,
        },
      ],
    }),
    [labels, values, colors],
  );

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) =>
              `Net: ${formatIDR(
                typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0,
              )}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.mutedText },
          grid: { color: CHART_COLORS.grid },
        },
        y: {
          ticks: {
            color: CHART_COLORS.mutedText,
            callback: (value: string | number) => formatIDRCompact(Number(value)),
          },
          grid: { color: CHART_COLORS.grid },
        },
      },
    }),
    [],
  );

  return (
    <div className="h-64 w-full">
      <Bar data={data} options={options} />
    </div>
  );
}
