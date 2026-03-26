'use client';

import Link from 'next/link';
import React from 'react';
import { Line } from 'react-chartjs-2';
import { useParams } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ensureChartJs } from '@/components/charts/ensureChartJs';
import { CHART_COLORS } from '@/components/charts/theme';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

ensureChartJs();

type CoinDetail = {
  id: string;
  symbol: string;
  name: string;
  image: { large: string };
  market_cap_rank?: number;
  hashing_algorithm?: string | null;
  genesis_date?: string | null;
  categories?: string[];
  description?: { en?: string };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    fully_diluted_valuation?: { usd: number };
    market_cap_change_24h?: number | null;
    market_cap_change_percentage_24h?: number | null;
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_percentage_24h: number | null;
    price_change_percentage_7d?: number | null;
    price_change_percentage_30d?: number | null;
    price_change_percentage_1y?: number | null;
    price_change_percentage_14d?: number | null;
    price_change_percentage_60d?: number | null;
    price_change_percentage_200d?: number | null;
    ath?: { usd: number };
    ath_change_percentage?: { usd: number };
    ath_date?: { usd: string };
    atl?: { usd: number };
    atl_change_percentage?: { usd: number };
    atl_date?: { usd: string };
    circulating_supply: number | null;
    total_supply?: number | null;
    max_supply?: number | null;
  };
  links: {
    homepage: string[];
    blockchain_site?: string[];
    official_forum_url?: string[];
    subreddit_url?: string | null;
    repos_url?: { github?: string[] };
  };
};

type MarketChart = {
  prices: [number, number][];
};

const WATCHLIST_STORAGE_KEY = 'market-watchlist';
const RANGE_OPTIONS = [
  { id: '1', label: '24H' },
  { id: '7', label: '7D' },
  { id: '30', label: '1M' },
  { id: '90', label: '3M' },
  { id: '365', label: '1Y' },
  { id: 'max', label: 'Max' },
] as const;

type RangeOption = (typeof RANGE_OPTIONS)[number]['id'];

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function formatUsd(value: number, compact = false) {
  if (!Number.isFinite(value)) return '-';
  return compact ? compactFormatter.format(value) : usdFormatter.format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(2)}%`;
}

function changeTone(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text-zinc-400';
  return value >= 0 ? 'text-emerald-300' : 'text-red-300';
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

function uniqueLinks(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((item) => (item ?? '').trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function ratioValue(numerator?: number | null, denominator?: number | null) {
  if (!numerator || !denominator || denominator === 0) return '-';
  const value = numerator / denominator;
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(3);
}

function percentValue(numerator?: number | null, denominator?: number | null) {
  if (!numerator || !denominator || denominator === 0) return '-';
  const value = (numerator / denominator) * 100;
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(2)}%`;
}

export default function MarketDetailPage() {
  const params = useParams();
  const coinId = typeof params.coinId === 'string' ? params.coinId : '';

  const [detail, setDetail] = React.useState<CoinDetail | null>(null);
  const [chart, setChart] = React.useState<MarketChart | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [range, setRange] = React.useState<RangeOption>('1');
  const [chartLoading, setChartLoading] = React.useState(false);

  React.useEffect(() => {
    const stored = typeof window === 'undefined' ? null : localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setWatchlist(parsed.filter((id) => typeof id === 'string'));
    } catch {
      // Ignore corrupted storage.
    }
  }, []);

  React.useEffect(() => {
    if (!coinId) return;
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const response = await fetch(`/api/markets/${coinId}?days=${range}`);
        if (!response.ok) throw new Error(`Detail request failed (${response.status}).`);

        const payload = (await response.json()) as { detail: CoinDetail; chart: MarketChart };

        if (!active) return;
        setDetail(payload.detail);
        setChart(payload.chart);
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load coin data.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [coinId, range]);

  React.useEffect(() => {
    if (!coinId) return;
    let active = true;
    const interval = window.setInterval(async () => {
      setChartLoading(true);
      try {
        const response = await fetch(`/api/markets/${coinId}?days=${range}`);
        if (!response.ok) throw new Error(`Chart request failed (${response.status}).`);
        const payload = (await response.json()) as { detail: CoinDetail; chart: MarketChart };
        if (!active) return;
        setDetail(payload.detail);
        setChart(payload.chart);
        setLastUpdated(new Date());
      } catch {
        // Keep last chart on refresh failure.
      } finally {
        if (!active) return;
        setChartLoading(false);
      }
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [coinId, range]);

  function toggleWatchlist() {
    setWatchlist((prev) => {
      const next = prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId];
      if (typeof window !== 'undefined') {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  const chartData = React.useMemo(() => {
    if (!chart) return null;
    const labels = chart.prices.map((point) => {
      const date = new Date(point[0]);
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    });
    const values = chart.prices.map((point) => point[1]);
    return {
      labels,
      datasets: [
        {
          label: 'Price (USD)',
          data: values,
          borderColor: CHART_COLORS.expense,
          backgroundColor: 'rgba(248, 113, 113, 0.2)',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
        },
      ],
    };
  }, [chart]);

  const chartOptions = React.useMemo(
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
        },
      },
      scales: {
        x: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid } },
        y: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid } },
      },
    }),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="app-surface overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.28),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_40%),linear-gradient(135deg,rgba(24,24,27,0.92),rgba(9,9,11,0.96))] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <div className="text-xs text-zinc-400">
              <Link href="/app/markets" className="hover:text-zinc-200">
                Markets
              </Link>
              <span className="px-2 text-zinc-700">/</span>
              <span className="text-zinc-200">{detail ? detail.name : 'Loading...'}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {detail?.image?.large ? (
                <img
                  src={detail.image.large}
                  alt={detail.name}
                  className="h-12 w-12 rounded-2xl border border-white/10"
                />
              ) : null}
              <div>
                <div className="text-[13px] text-zinc-400 sm:text-sm">Coin detail</div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
                  {detail ? detail.name : 'Loading...'}
                </h1>
                <div className="text-xs text-zinc-500">
                  {detail ? detail.symbol.toUpperCase() : ''}
                  {detail?.market_cap_rank ? `  |  Rank #${detail.market_cap_rank}` : ''}
                </div>
              </div>
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Price</div>
                <div className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {detail ? formatUsd(detail.market_data.current_price.usd) : '-'}
                </div>
                <div className={cn('mt-1 text-sm', changeTone(detail?.market_data.price_change_percentage_24h))}>
                  {detail ? formatPercent(detail.market_data.price_change_percentage_24h) : '-'}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">24h range</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {detail
                    ? `${formatUsd(detail.market_data.low_24h.usd)} - ${formatUsd(detail.market_data.high_24h.usd)}`
                    : '-'}
                </div>
                <div className="mt-1 text-xs text-zinc-400">Low to high</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Market cap</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {detail ? formatUsd(detail.market_data.market_cap.usd, true) : '-'}
                </div>
                <div className={cn('mt-1 text-xs', changeTone(detail?.market_data.market_cap_change_percentage_24h))}>
                  {detail?.market_data.market_cap_change_percentage_24h !== undefined
                    ? `${formatPercent(detail.market_data.market_cap_change_percentage_24h)} in 24h`
                    : 'USD total'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Volume (24h)</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {detail ? formatUsd(detail.market_data.total_volume.usd, true) : '-'}
                </div>
                <div className="mt-1 text-xs text-zinc-400">Total volume</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {uniqueLinks([
                detail?.links.homepage?.[0],
                detail?.links.official_forum_url?.[0],
                detail?.links.subreddit_url ?? undefined,
                detail?.links.blockchain_site?.[0],
                detail?.links.repos_url?.github?.[0],
              ]).slice(0, 6).map((link) => (
                <a
                  key={`quick-${link}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:text-blue-100">
                  {link.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              ))}
              {uniqueLinks([
                detail?.links.homepage?.[0],
                detail?.links.official_forum_url?.[0],
                detail?.links.subreddit_url ?? undefined,
                detail?.links.blockchain_site?.[0],
                detail?.links.repos_url?.github?.[0],
              ]).length === 0 ? (
                <div className="text-xs text-zinc-500">No links available.</div>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-[220px] flex-col items-end gap-3">
            {lastUpdated ? (
              <div className="text-[11px] text-zinc-400 sm:text-xs">
                Updated {formatDateTime(lastUpdated)}
              </div>
            ) : null}
            <div
              className={cn(
                'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                chartLoading
                  ? 'border-amber-900/40 bg-amber-500/10 text-amber-200'
                  : 'border-emerald-900/40 bg-emerald-500/10 text-emerald-200',
              )}>
              {chartLoading ? 'Refreshing' : 'Live'}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant={watchlist.includes(coinId) ? 'secondary' : 'ghost'}
                onClick={toggleWatchlist}
                disabled={!coinId}>
                {watchlist.includes(coinId) ? 'Saved' : 'Watch'}
              </Button>
              {detail?.links.homepage?.[0] ? (
                <a
                  href={detail.links.homepage[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-200 hover:text-blue-100">
                  Website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className="app-surface">
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5 sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">Market cap</div>
            <div className="mt-2 text-lg font-semibold text-zinc-100">
              {detail ? formatUsd(detail.market_data.market_cap.usd, true) : '-'}
            </div>
            <div className={cn('mt-1 text-xs', changeTone(detail?.market_data.market_cap_change_percentage_24h))}>
              {detail?.market_data.market_cap_change_percentage_24h !== undefined
                ? `${formatPercent(detail.market_data.market_cap_change_percentage_24h)} in 24h`
                : '-'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">Volume (24h)</div>
            <div className="mt-2 text-lg font-semibold text-zinc-100">
              {detail ? formatUsd(detail.market_data.total_volume.usd, true) : '-'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Total volume</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">24h range</div>
            <div className="mt-2 text-sm font-semibold text-zinc-100">
              {detail
                ? `${formatUsd(detail.market_data.low_24h.usd)} - ${formatUsd(detail.market_data.high_24h.usd)}`
                : '-'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Low to high</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">FDV</div>
            <div className="mt-2 text-lg font-semibold text-zinc-100">
              {detail?.market_data.fully_diluted_valuation?.usd
                ? formatUsd(detail.market_data.fully_diluted_valuation.usd, true)
                : '-'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Fully diluted valuation</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">Rank</div>
            <div className="mt-2 text-lg font-semibold text-zinc-100">
              {detail?.market_cap_rank ? `#${detail.market_cap_rank}` : '-'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">Global ranking</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="flex flex-col gap-6">
          <section className="app-surface overflow-hidden">
            <div className="app-panel-header">
              <div>
                <div className="text-sm font-semibold">Price trend</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Range: {RANGE_OPTIONS.find((option) => option.id === range)?.label ?? '24H'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    size="sm"
                    variant={range === option.id ? 'secondary' : 'ghost'}
                    onClick={() => setRange(option.id)}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <div className="h-72">
                {loading || !chartData ? (
                  <div className="text-sm text-zinc-500">Loading chart...</div>
                ) : (
                  <div className={cn(chartLoading ? 'opacity-80' : null)}>
                    <Line data={chartData} options={chartOptions} />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="app-surface">
            <div className="app-panel-header">
              <div>
                <div className="text-sm font-semibold">Performance</div>
                <div className="mt-1 text-xs text-zinc-500">Price change across time ranges.</div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">24h</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_24h))}>
                  {detail ? formatPercent(detail.market_data.price_change_percentage_24h) : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">7d</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_7d))}>
                  {detail?.market_data.price_change_percentage_7d !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_7d)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">14d</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_14d))}>
                  {detail?.market_data.price_change_percentage_14d !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_14d)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">30d</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_30d))}>
                  {detail?.market_data.price_change_percentage_30d !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_30d)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">60d</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_60d))}>
                  {detail?.market_data.price_change_percentage_60d !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_60d)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">200d</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_200d))}>
                  {detail?.market_data.price_change_percentage_200d !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_200d)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">1y</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.price_change_percentage_1y))}>
                  {detail?.market_data.price_change_percentage_1y !== undefined
                    ? formatPercent(detail.market_data.price_change_percentage_1y)
                    : '-'}
                </div>
              </div>
            </div>
          </section>

          <section className="app-surface">
            <div className="app-panel-header">
              <div>
                <div className="text-sm font-semibold">About</div>
                <div className="mt-1 text-xs text-zinc-500">Official description and links.</div>
              </div>
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.6fr)] sm:px-6">
              <div className="text-sm text-zinc-300">
                {detail?.description?.en ? stripHtml(detail.description.en) : 'No description provided.'}
              </div>
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Links</div>
                <div className="flex flex-col gap-2 text-sm">
                  {uniqueLinks([
                    detail?.links.homepage?.[0],
                    detail?.links.official_forum_url?.[0],
                    detail?.links.subreddit_url ?? undefined,
                    detail?.links.blockchain_site?.[0],
                    detail?.links.repos_url?.github?.[0],
                  ]).map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-blue-200 hover:text-blue-100">
                      {link}
                    </a>
                  ))}
                  {uniqueLinks([
                    detail?.links.homepage?.[0],
                    detail?.links.official_forum_url?.[0],
                    detail?.links.subreddit_url ?? undefined,
                    detail?.links.blockchain_site?.[0],
                    detail?.links.repos_url?.github?.[0],
                  ]).length === 0 ? (
                    <div className="text-xs text-zinc-500">No links available.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="text-sm font-semibold">Supply</div>
            <div className="mt-1 text-xs text-zinc-500">Circulating and total supply.</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-zinc-500">Circulating supply</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {detail?.market_data.circulating_supply
                    ? compactFormatter.format(detail.market_data.circulating_supply)
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total supply</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {detail?.market_data.total_supply
                    ? compactFormatter.format(detail.market_data.total_supply)
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Max supply</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {detail?.market_data.max_supply
                    ? compactFormatter.format(detail.market_data.max_supply)
                    : '-'}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold">Profile</div>
            <div className="mt-1 text-xs text-zinc-500">Chain metadata and links.</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-zinc-500">Genesis date</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {detail?.genesis_date ? formatDateTime(new Date(detail.genesis_date)) : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Hashing algorithm</div>
                <div className="text-lg font-semibold text-zinc-100">
                  {detail?.hashing_algorithm || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Categories</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(detail?.categories ?? []).slice(0, 6).map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-200">
                      {category}
                    </span>
                  ))}
                  {detail?.categories && detail.categories.length === 0 ? (
                    <span className="text-xs text-zinc-500">-</span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <section className="app-surface">
            <div className="app-panel-header">
              <div>
                <div className="text-sm font-semibold">Market stats</div>
                <div className="mt-1 text-xs text-zinc-500">More detailed stats for this coin.</div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">All-time high</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {detail?.market_data.ath?.usd ? formatUsd(detail.market_data.ath.usd) : '-'}
                </div>
                <div className={cn('mt-1 text-xs', changeTone(detail?.market_data.ath_change_percentage?.usd))}>
                  {detail?.market_data.ath_change_percentage?.usd !== undefined
                    ? `${formatPercent(detail.market_data.ath_change_percentage.usd)} from ATH`
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">All-time low</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {detail?.market_data.atl?.usd ? formatUsd(detail.market_data.atl.usd) : '-'}
                </div>
                <div className={cn('mt-1 text-xs', changeTone(detail?.market_data.atl_change_percentage?.usd))}>
                  {detail?.market_data.atl_change_percentage?.usd !== undefined
                    ? `${formatPercent(detail.market_data.atl_change_percentage.usd)} from ATL`
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">Market cap change (24h)</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.market_cap_change_percentage_24h))}>
                  {detail?.market_data.market_cap_change_percentage_24h !== undefined
                    ? formatPercent(detail.market_data.market_cap_change_percentage_24h)
                    : '-'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">Market cap change (USD)</div>
                <div className={cn('mt-2 text-lg font-semibold', changeTone(detail?.market_data.market_cap_change_24h))}>
                  {detail?.market_data.market_cap_change_24h !== undefined &&
                  detail?.market_data.market_cap_change_24h !== null
                    ? formatUsd(detail.market_data.market_cap_change_24h)
                    : '-'}
                </div>
              </div>
            </div>
          </section>

          <section className="app-surface">
            <div className="app-panel-header">
              <div>
                <div className="text-sm font-semibold">Key ratios</div>
                <div className="mt-1 text-xs text-zinc-500">Liquidity and valuation ratios.</div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">Volume / Market cap</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {ratioValue(detail?.market_data.total_volume?.usd, detail?.market_data.market_cap?.usd)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">FDV / Market cap</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {ratioValue(
                    detail?.market_data.fully_diluted_valuation?.usd,
                    detail?.market_data.market_cap?.usd,
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500">Circulating / Max supply</div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {percentValue(detail?.market_data.circulating_supply, detail?.market_data.max_supply)}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
