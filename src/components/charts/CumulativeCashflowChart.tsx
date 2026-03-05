'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import type { Transaction } from '@/lib/types';
import { buildDailyCumulativeSeries } from '@/lib/insights';
import { formatIDR, formatIDRCompact } from '@/lib/money';
import { ensureChartJs } from './ensureChartJs';
import { CHART_COLORS } from './theme';

ensureChartJs();

export function CumulativeCashflowChart({
  monthId,
  monthTransactions,
}: {
  monthId: string;
  monthTransactions: Transaction[];
}) {
  const series = React.useMemo(
    () => buildDailyCumulativeSeries(monthTransactions, monthId),
    [monthTransactions, monthId],
  );

  const data = React.useMemo(
    () => ({
      labels: series.labels,
      datasets: [
        {
          label: 'Income (kumulatif)',
          data: series.incomeCumulative,
          borderColor: CHART_COLORS.income,
          backgroundColor: CHART_COLORS.income,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
        },
        {
          label: 'Expense (kumulatif)',
          data: series.expenseCumulative,
          borderColor: CHART_COLORS.expense,
          backgroundColor: CHART_COLORS.expense,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
        },
        {
          label: 'Net (kumulatif)',
          data: series.netCumulative,
          borderColor: CHART_COLORS.net,
          backgroundColor: CHART_COLORS.net,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.35,
        },
      ],
    }),
    [series],
  );

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: CHART_COLORS.mutedText,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'rectRounded' as const,
          },
        },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          callbacks: {
            label: (ctx: TooltipItem<'line'>) => {
              const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
              return `${ctx.dataset.label ?? '—'}: ${formatIDR(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.mutedText, maxTicksLimit: 16 },
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
    <div className="h-80 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
