'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import type { Transaction } from '@/lib/types';
import { expenseBreakdownByCategory } from '@/lib/insights';
import { formatIDR } from '@/lib/money';
import { ensureChartJs } from './ensureChartJs';
import { CATEGORY_PALETTE, CHART_COLORS } from './theme';

ensureChartJs();

export function ExpenseByCategoryChart({
  monthTransactions,
}: {
  monthTransactions: Transaction[];
}) {
  const breakdown = React.useMemo(
    () => expenseBreakdownByCategory(monthTransactions),
    [monthTransactions],
  );

  const labels = breakdown.items.map((i) => i.category);
  const values = breakdown.items.map((i) => i.amount);
  const colors = values.map((_, idx) => CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length]);

  const data = React.useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: 'rgba(9, 9, 11, 1)',
          borderWidth: 2,
        },
      ],
    }),
    [labels, values, colors],
  );

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          callbacks: {
            label: (ctx: TooltipItem<'doughnut'>) => {
              const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
              const label = ctx.label ?? '—';
              return `${label}: ${formatIDR(value)}`;
            },
          },
        },
      },
    }),
    [],
  );

  if (breakdown.totalExpense <= 0) {
    return (
      <div className="text-sm text-zinc-400">
        Belum ada expense untuk breakdown kategori.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
      <div className="h-56 w-full">
        <Doughnut data={data} options={options} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-zinc-400">Total expense</div>
        <div className="text-lg font-semibold">{formatIDR(breakdown.totalExpense)}</div>
        <div className="mt-3 grid gap-2">
          {breakdown.items.map((item, idx) => (
            <div key={item.category} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: colors[idx] }}
                />
                <div className="truncate text-sm font-semibold">{item.category}</div>
              </div>
              <div className="shrink-0 text-sm text-zinc-300">
                {formatIDR(item.amount)}{' '}
                <span className="text-xs text-zinc-500">
                  ({Math.round(item.percent * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
