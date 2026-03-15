'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import type { Transaction } from '@/lib/types';
import { buildDailyExpenseSeries, parseMonthId } from '@/lib/insights';
import { monthIdFromDate } from '@/lib/date';
import { formatIDR, formatIDRCompact } from '@/lib/money';
import { ensureChartJs } from './ensureChartJs';
import { CHART_COLORS } from './theme';

ensureChartJs();

export function CumulativeCashflowChart({
  monthId,
  transactions,
  range,
}: {
  monthId: string;
  transactions: Transaction[];
  range: '7d' | '1m' | '3m' | '6m';
}) {
  const { startDate, endDate } = React.useMemo(() => {
    const parsed = parseMonthId(monthId);
    const today = new Date();
    const todayId = monthIdFromDate(today);
    const monthEnd = parsed ? new Date(parsed.year, parsed.month, 0) : today;
    const end = parsed && monthId === todayId ? today : monthEnd;
    end.setHours(0, 0, 0, 0);

    if (range === '7d') {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { startDate: start, endDate: end };
    }

    const rangeMonths = range === '1m' ? 1 : range === '3m' ? 3 : 6;
    const start = new Date(end.getFullYear(), end.getMonth() - (rangeMonths - 1), 1);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, [monthId, range]);

  const series = React.useMemo(
    () => buildDailyExpenseSeries(transactions, startDate, endDate),
    [transactions, startDate, endDate],
  );

  const maxTicksLimit = series.labels.length <= 12 ? series.labels.length : 12;

  const data = React.useMemo(
    () => ({
      labels: series.labels,
      datasets: [
        {
          label: 'Expense harian',
          data: series.values,
          borderColor: CHART_COLORS.expense,
          backgroundColor: CHART_COLORS.expense,
          borderWidth: 2,
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
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
            label: (ctx: TooltipItem<'line'>) => {
              const value = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
              return `Expense: ${formatIDR(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.mutedText, maxTicksLimit },
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
    [maxTicksLimit],
  );

  return (
    <div className="h-80 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
