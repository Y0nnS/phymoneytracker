'use client';

import Link from 'next/link';
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { ensureChartJs } from '@/components/charts/ensureChartJs';
import { CHART_COLORS } from '@/components/charts/theme';

ensureChartJs();

type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
};

type GlobalMarket = {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
};

type AlertConfig = {
  id: string;
  targetPrice?: number;
  change24h?: number;
  enabled: boolean;
};

type PortfolioItem = {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  avgPrice: number;
};

const WATCHLIST_STORAGE_KEY = 'market-watchlist';
const ALERTS_STORAGE_KEY = 'market-alerts';
const PORTFOLIO_STORAGE_KEY = 'market-portfolio';
const ALERTS_BROWSER_STORAGE_KEY = 'market-alerts-browser';

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

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function marketMood(change24h: number | null) {
  if (change24h === null || Number.isNaN(change24h)) {
    return { label: 'Neutral', tone: 'text-zinc-300' };
  }
  if (change24h >= 2) return { label: 'Bullish', tone: 'text-emerald-300' };
  if (change24h <= -2) return { label: 'Bearish', tone: 'text-red-300' };
  return { label: 'Neutral', tone: 'text-zinc-300' };
}

function alertTriggered(coin: CoinMarket, alert: AlertConfig) {
  if (!alert.enabled) return false;
  const targetHit = alert.targetPrice !== undefined && coin.current_price >= alert.targetPrice;
  const changeHit =
    alert.change24h !== undefined &&
    (coin.price_change_percentage_24h ?? -999) >= alert.change24h;
  return Boolean(targetHit || changeHit);
}

function csvEscape(value: string) {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
}

function sparklinePath(prices: number[], width = 84, height = 24) {
  if (!prices.length) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  return prices
    .map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function Sparkline({
  prices,
  tone,
}: {
  prices?: number[];
  tone: 'up' | 'down' | 'flat';
}) {
  if (!prices || prices.length < 2) {
    return <div className="h-6 w-[84px] rounded bg-white/5" />;
  }
  const path = sparklinePath(prices);
  const stroke = tone === 'up' ? '#34d399' : tone === 'down' ? '#f87171' : '#a1a1aa';
  return (
    <svg viewBox="0 0 84 24" className="h-6 w-[84px]" aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export default function MarketsPage() {
  const toast = useToast();
  const triggeredRef = React.useRef<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [coins, setCoins] = React.useState<CoinMarket[]>([]);
  const [global, setGlobal] = React.useState<GlobalMarket | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const [query, setQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<'market_cap' | 'change' | 'volume'>('market_cap');
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [alerts, setAlerts] = React.useState<Record<string, AlertConfig>>({});
  const [portfolio, setPortfolio] = React.useState<PortfolioItem[]>([]);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = React.useState(false);

  const [minMarketCap, setMinMarketCap] = React.useState('');
  const [minVolume, setMinVolume] = React.useState('');
  const [minChange, setMinChange] = React.useState('');
  const [maxChange, setMaxChange] = React.useState('');
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');

  const [portfolioCoin, setPortfolioCoin] = React.useState('');
  const [portfolioAmount, setPortfolioAmount] = React.useState('');
  const [portfolioAvg, setPortfolioAvg] = React.useState('');

  React.useEffect(() => {
    const stored = typeof window === 'undefined' ? null : localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setWatchlist(parsed.filter((id) => typeof id === 'string'));
      } catch {
        // Ignore corrupted storage.
      }
    }

    const storedAlerts = typeof window === 'undefined' ? null : localStorage.getItem(ALERTS_STORAGE_KEY);
    if (storedAlerts) {
      try {
        const parsed = JSON.parse(storedAlerts);
        if (parsed && typeof parsed === 'object') setAlerts(parsed);
      } catch {
        // Ignore corrupted storage.
      }
    }

    const storedPortfolio = typeof window === 'undefined' ? null : localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (storedPortfolio) {
      try {
        const parsed = JSON.parse(storedPortfolio);
        if (Array.isArray(parsed)) setPortfolio(parsed);
      } catch {
        // Ignore corrupted storage.
      }
    }

    const storedBrowserAlerts = typeof window === 'undefined' ? null : localStorage.getItem(ALERTS_BROWSER_STORAGE_KEY);
    if (storedBrowserAlerts === 'true') setBrowserAlertsEnabled(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ALERTS_BROWSER_STORAGE_KEY, browserAlertsEnabled ? 'true' : 'false');
  }, [browserAlertsEnabled]);

  const loadMarket = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/markets');
      if (!response.ok) {
        throw new Error(`Market request failed (${response.status}).`);
      }

      const payload = (await response.json()) as { coins: CoinMarket[]; global: GlobalMarket };
      setCoins(payload.coins);
      setGlobal(payload.global);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  const filteredCoins = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const capMin = parseNumber(minMarketCap);
    const volMin = parseNumber(minVolume);
    const changeMin = parseNumber(minChange);
    const changeMax = parseNumber(maxChange);
    const priceMin = parseNumber(minPrice);
    const priceMax = parseNumber(maxPrice);

    const base = needle
      ? coins.filter((coin) =>
          coin.name.toLowerCase().includes(needle) ||
          coin.symbol.toLowerCase().includes(needle),
        )
      : coins;

    const filtered = base.filter((coin) => {
      if (capMin !== null && coin.market_cap < capMin) return false;
      if (volMin !== null && coin.total_volume < volMin) return false;
      if (priceMin !== null && coin.current_price < priceMin) return false;
      if (priceMax !== null && coin.current_price > priceMax) return false;
      const change = coin.price_change_percentage_24h ?? null;
      if (changeMin !== null && change !== null && change < changeMin) return false;
      if (changeMax !== null && change !== null && change > changeMax) return false;
      return true;
    });

    return filtered.slice().sort((a, b) => {
      if (sortKey === 'change') {
        return (b.price_change_percentage_24h ?? -999) - (a.price_change_percentage_24h ?? -999);
      }
      if (sortKey === 'volume') return b.total_volume - a.total_volume;
      return b.market_cap - a.market_cap;
    });
  }, [coins, query, sortKey, minMarketCap, minVolume, minChange, maxChange, minPrice, maxPrice]);

  const watchlistCoins = React.useMemo(() => {
    const watchSet = new Set(watchlist);
    return coins.filter((coin) => watchSet.has(coin.id));
  }, [coins, watchlist]);

  const topGainers = React.useMemo(
    () =>
      coins
        .filter((coin) => coin.price_change_percentage_24h !== null)
        .slice()
        .sort((a, b) => (b.price_change_percentage_24h ?? -999) - (a.price_change_percentage_24h ?? -999))
        .slice(0, 6),
    [coins],
  );

  const topLosers = React.useMemo(
    () =>
      coins
        .filter((coin) => coin.price_change_percentage_24h !== null)
        .slice()
        .sort((a, b) => (a.price_change_percentage_24h ?? 999) - (b.price_change_percentage_24h ?? 999))
        .slice(0, 6),
    [coins],
  );

  const mood = marketMood(global?.market_cap_change_percentage_24h_usd ?? null);

  function toggleWatchlist(id: string) {
    setWatchlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function updateAlert(id: string, patch: Partial<AlertConfig>) {
    setAlerts((prev) => ({
      ...prev,
      [id]: {
        id,
        targetPrice: prev[id]?.targetPrice,
        change24h: prev[id]?.change24h,
        enabled: prev[id]?.enabled ?? false,
        ...patch,
      },
    }));
  }

  function removePortfolio(id: string) {
    setPortfolio((prev) => prev.filter((item) => item.id !== id));
  }

  function addPortfolioItem() {
    const coin = coins.find((item) => item.id === portfolioCoin);
    if (!coin) return;
    const amount = parseNumber(portfolioAmount);
    const avgPrice = parseNumber(portfolioAvg);
    if (amount === null || avgPrice === null) return;

    setPortfolio((prev) => {
      const next = prev.filter((item) => item.id !== coin.id);
      return [
        ...next,
        {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          amount,
          avgPrice,
        },
      ];
    });
    setPortfolioCoin('');
    setPortfolioAmount('');
    setPortfolioAvg('');
  }

  function requestBrowserAlerts() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setBrowserAlertsEnabled(true);
      return;
    }
    if (Notification.permission === 'denied') {
      setBrowserAlertsEnabled(false);
      return;
    }
    Notification.requestPermission().then((result) => {
      setBrowserAlertsEnabled(result === 'granted');
    });
  }

  function exportPortfolioCsv() {
    const rows: string[][] = [
      ['id', 'name', 'symbol', 'amount', 'avgPrice'],
      ...portfolio.map((row) => [
        row.id,
        row.name,
        row.symbol,
        String(row.amount),
        String(row.avgPrice),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'portfolio.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onImportPortfolioFile(file: File) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return;
    const rows = lines.slice(1).map((line) => parseCsvLine(line));
    const next: PortfolioItem[] = [];
    rows.forEach((row) => {
      const [id, name, symbol, amountRaw, avgPriceRaw] = row;
      const amount = Number(amountRaw);
      const avgPrice = Number(avgPriceRaw);
      if (!Number.isFinite(amount) || !Number.isFinite(avgPrice)) return;
      const idResolved = id || coins.find((coin) => coin.symbol.toLowerCase() === (symbol || '').toLowerCase())?.id;
      if (!idResolved) return;
      const coin = coins.find((item) => item.id === idResolved);
      next.push({
        id: idResolved,
        name: name || coin?.name || idResolved,
        symbol: symbol || coin?.symbol || idResolved,
        amount,
        avgPrice,
      });
    });
    if (next.length) setPortfolio(next);
  }

  const portfolioRows = React.useMemo(() => {
    return portfolio.map((item) => {
      const coin = coins.find((c) => c.id === item.id);
      const currentPrice = coin?.current_price ?? 0;
      const cost = item.amount * item.avgPrice;
      const value = item.amount * currentPrice;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...item, currentPrice, cost, value, pnl, pnlPct };
    });
  }, [portfolio, coins]);

  const portfolioTotal = portfolioRows.reduce((sum, row) => sum + row.value, 0);
  const portfolioPnl = portfolioRows.reduce((sum, row) => sum + row.pnl, 0);
  const portfolioCost = portfolioRows.reduce((sum, row) => sum + row.cost, 0);
  const portfolioPnlPct = portfolioCost > 0 ? (portfolioPnl / portfolioCost) * 100 : 0;

  const portfolioChartData = React.useMemo(() => {
    const labels = portfolioRows.map((row) => row.symbol.toUpperCase());
    const values = portfolioRows.map((row) => row.value);
    return {
      labels,
      datasets: [
        {
          label: 'Allocation',
          data: values,
          backgroundColor: ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#22d3ee', '#f472b6'],
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
        },
      ],
    };
  }, [portfolioRows]);

  const portfolioChartOptions = React.useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: 'bottom' as const, labels: { color: CHART_COLORS.mutedText } },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          callbacks: {
            label: (ctx: { label?: string; parsed: number }) =>
              `${ctx.label ?? ''}: ${formatUsd(ctx.parsed)}`,
          },
        },
      },
    }),
    [],
  );

  React.useEffect(() => {
    if (loading || watchlistCoins.length === 0) return;
    const nextTriggered = new Set<string>();
    watchlistCoins.forEach((coin) => {
      const alert = alerts[coin.id];
      if (!alert) return;
      const triggered = alertTriggered(coin, alert);
      if (!triggered) return;
      const key = `${coin.id}:${alert.targetPrice ?? 'x'}:${alert.change24h ?? 'y'}`;
      nextTriggered.add(key);
      if (!triggeredRef.current.has(key)) {
        const detailParts = [];
        if (alert.targetPrice !== undefined) detailParts.push(`>= ${formatUsd(alert.targetPrice)}`);
        if (alert.change24h !== undefined) detailParts.push(`>= ${alert.change24h}%`);
        const detail = detailParts.length ? `(${detailParts.join(' or ')})` : '';
        toast.success(`${coin.name} alert triggered ${detail}`.trim());
        if (
          browserAlertsEnabled &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(`${coin.name} alert triggered`, {
            body: `Price: ${formatUsd(coin.current_price)} | 24h: ${formatPercent(coin.price_change_percentage_24h)}`,
          });
        }
      }
    });
    triggeredRef.current = nextTriggered;
  }, [alerts, browserAlertsEnabled, loading, toast, watchlistCoins]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-zinc-400 sm:text-sm">Market explorer</div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Crypto Markets</h1>
          <p className="mt-2 text-[13px] text-zinc-500 sm:text-sm">
            Data from CoinGecko. Use this for learning and watchlist tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated ? (
            <div className="text-[11px] text-zinc-500 sm:text-xs">
              Updated {formatDateTime(lastUpdated)}
            </div>
          ) : null}
          <Button variant="secondary" onClick={loadMarket} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className="app-strip">
        <div className="app-strip-grid md:grid-cols-5">
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
              Total market cap
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {global ? formatUsd(global.total_market_cap.usd, true) : '-'}
            </div>
            <div className={cn('mt-1 text-[12px] sm:text-sm', changeTone(global?.market_cap_change_percentage_24h_usd))}>
              {global
                ? `${formatPercent(global.market_cap_change_percentage_24h_usd)} in 24h`
                : 'Loading market cap'}
            </div>
          </div>
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
              24h volume
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {global ? formatUsd(global.total_volume.usd, true) : '-'}
            </div>
            <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">Across tracked coins</div>
          </div>
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
              BTC dominance
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {global ? formatPercent(global.market_cap_percentage.btc) : '-'}
            </div>
            <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">ETH {global ? formatPercent(global.market_cap_percentage.eth) : '-'}</div>
          </div>
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
              Market mood
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              <span className={mood.tone}>{mood.label}</span>
            </div>
            <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">Proxy via 24h cap change</div>
          </div>
          <div className="app-strip-cell">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
              Watchlist
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">
              {watchlist.length}
            </div>
            <div className="mt-1 text-[12px] text-zinc-400 sm:text-sm">Coins tracked</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Market snapshot</div>
              <div className="mt-1 text-xs text-zinc-500">Top coins by market cap.</div>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[220px_160px]">
              <Input
                label="Search"
                placeholder="BTC, ETH, Solana..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select
                label="Sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as 'market_cap' | 'change' | 'volume')}>
                <option value="market_cap">Market cap</option>
                <option value="change">24h change</option>
                <option value="volume">24h volume</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 border-b border-white/10 px-4 py-4 sm:grid-cols-3 sm:px-6">
            <Input
              label="Min market cap (USD)"
              type="number"
              value={minMarketCap}
              onChange={(e) => setMinMarketCap(e.target.value)}
            />
            <Input
              label="Min 24h volume (USD)"
              type="number"
              value={minVolume}
              onChange={(e) => setMinVolume(e.target.value)}
            />
            <Input
              label="Min price (USD)"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              label="Max price (USD)"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <Input
              label="Min 24h change (%)"
              type="number"
              value={minChange}
              onChange={(e) => setMinChange(e.target.value)}
            />
            <Input
              label="Max 24h change (%)"
              type="number"
              value={maxChange}
              onChange={(e) => setMaxChange(e.target.value)}
            />
          </div>

          <div className="app-list">
            {loading ? (
              <div className="app-list-row text-sm text-zinc-500">Loading market data...</div>
            ) : filteredCoins.length === 0 ? (
              <div className="app-list-row text-sm text-zinc-500">No coins matched your search.</div>
            ) : (
              filteredCoins.map((coin) => (
                <div
                  key={coin.id}
                  className="app-list-row grid items-center gap-3 sm:grid-cols-[minmax(0,1.2fr)_110px_120px_90px_110px_120px_80px]">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="h-8 w-8 rounded-full border border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        <Link href={`/app/markets/${coin.id}`} className="hover:text-white">
                          {coin.name}
                        </Link>
                        <span className="ml-2 text-xs text-zinc-500">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <div className="text-xs text-zinc-500">Rank #{coin.market_cap_rank}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {formatUsd(coin.current_price)}
                  </div>
                  <div className={cn('text-sm font-semibold', changeTone(coin.price_change_percentage_24h))}>
                    {formatPercent(coin.price_change_percentage_24h)}
                  </div>
                  <div className="hidden sm:block">
                    <Sparkline
                      prices={coin.sparkline_in_7d?.price}
                      tone={
                        coin.price_change_percentage_24h === null
                          ? 'flat'
                          : coin.price_change_percentage_24h >= 0
                            ? 'up'
                            : 'down'
                      }
                    />
                  </div>
                  <div className="text-sm text-zinc-400">
                    {formatUsd(coin.market_cap, true)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {formatUsd(coin.total_volume, true)}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant={watchlist.includes(coin.id) ? 'secondary' : 'ghost'}
                      onClick={() => toggleWatchlist(coin.id)}>
                      {watchlist.includes(coin.id) ? 'Saved' : 'Watch'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="text-sm font-semibold">Heatmap: top movers</div>
            <div className="mt-1 text-xs text-zinc-500">Top gainers and losers by 24h change.</div>
            <div className="mt-4 grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Gainers</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {topGainers.map((coin) => (
                  <div
                    key={`gainer-${coin.id}`}
                    className="rounded-xl border border-emerald-900/40 bg-emerald-500/10 px-3 py-2">
                    <div className="text-sm font-semibold text-zinc-100">{coin.symbol.toUpperCase()}</div>
                    <div className="text-xs text-emerald-200">
                      {formatPercent(coin.price_change_percentage_24h)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Losers</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {topLosers.map((coin) => (
                  <div
                    key={`loser-${coin.id}`}
                    className="rounded-xl border border-red-900/40 bg-red-500/10 px-3 py-2">
                    <div className="text-sm font-semibold text-zinc-100">{coin.symbol.toUpperCase()}</div>
                    <div className="text-xs text-red-200">
                      {formatPercent(coin.price_change_percentage_24h)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold">Watchlist</div>
            <div className="mt-1 text-xs text-zinc-500">Quick glance for your tracked coins.</div>
            <div className="mt-4 space-y-3">
              {watchlistCoins.length === 0 ? (
                <div className="text-sm text-zinc-500">Add coins to your watchlist.</div>
              ) : (
                watchlistCoins.map((coin) => (
                  <div key={coin.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {coin.name}
                        <span className="ml-2 text-xs text-zinc-500">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <div className="text-xs text-zinc-500">{formatUsd(coin.current_price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn('text-xs font-semibold', changeTone(coin.price_change_percentage_24h))}>
                        {formatPercent(coin.price_change_percentage_24h)}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleWatchlist(coin.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Alerts</div>
                <div className="mt-1 text-xs text-zinc-500">Set a price target or % change for watchlist.</div>
              </div>
              <Button
                size="sm"
                variant={browserAlertsEnabled ? 'secondary' : 'ghost'}
                onClick={requestBrowserAlerts}>
                {browserAlertsEnabled ? 'Browser alerts on' : 'Enable browser alerts'}
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {watchlistCoins.length === 0 ? (
                <div className="text-sm text-zinc-500">Add watchlist coins to configure alerts.</div>
              ) : (
                watchlistCoins.map((coin) => {
                  const alert = alerts[coin.id] ?? { id: coin.id, enabled: false };
                  const triggered = alertTriggered(coin, alert);
                  return (
                    <div key={`alert-${coin.id}`} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-zinc-100">
                          {coin.name}
                          <span className="ml-2 text-xs text-zinc-500">{coin.symbol.toUpperCase()}</span>
                        </div>
                        <Button
                          size="sm"
                          variant={alert.enabled ? 'secondary' : 'ghost'}
                          onClick={() => updateAlert(coin.id, { enabled: !alert.enabled })}>
                          {alert.enabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Target price (USD)"
                          type="number"
                          value={alert.targetPrice?.toString() ?? ''}
                          onChange={(e) =>
                            updateAlert(coin.id, {
                              targetPrice: parseNumber(e.target.value) ?? undefined,
                            })
                          }
                        />
                        <Input
                          placeholder="24h change >= (%)"
                          type="number"
                          value={alert.change24h?.toString() ?? ''}
                          onChange={(e) =>
                            updateAlert(coin.id, {
                              change24h: parseNumber(e.target.value) ?? undefined,
                            })
                          }
                        />
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {triggered ? 'Alert triggered by latest data.' : 'No trigger yet.'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <section className="app-surface overflow-hidden">
          <div className="app-panel-header">
            <div>
              <div className="text-sm font-semibold">Portfolio tracker</div>
              <div className="mt-1 text-xs text-zinc-500">Add holdings to see PnL and allocation.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={exportPortfolioCsv}>
                Export CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}>
                Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  onImportPortfolioFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <div className="grid gap-3 border-b border-white/10 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_160px_160px_auto] sm:px-6">
            <Select
              label="Coin"
              value={portfolioCoin}
              onChange={(e) => setPortfolioCoin(e.target.value)}>
              <option value="">Select coin</option>
              {coins.map((coin) => (
                <option key={`portfolio-${coin.id}`} value={coin.id}>
                  {coin.name} ({coin.symbol.toUpperCase()})
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              value={portfolioAmount}
              onChange={(e) => setPortfolioAmount(e.target.value)}
            />
            <Input
              label="Avg buy (USD)"
              type="number"
              value={portfolioAvg}
              onChange={(e) => setPortfolioAvg(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={addPortfolioItem} disabled={!portfolioCoin}>
                Add
              </Button>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 sm:grid-cols-3 sm:px-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Total value</div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">{formatUsd(portfolioTotal)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">PnL</div>
              <div className={cn('mt-2 text-lg font-semibold', portfolioPnl >= 0 ? 'text-emerald-200' : 'text-red-200')}>
                {formatUsd(portfolioPnl)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">PnL %</div>
              <div className={cn('mt-2 text-lg font-semibold', portfolioPnlPct >= 0 ? 'text-emerald-200' : 'text-red-200')}>
                {formatPercent(portfolioPnlPct)}
              </div>
            </div>
          </div>

          <div className="app-list">
            {portfolioRows.length === 0 ? (
              <div className="app-list-row text-sm text-zinc-500">Add holdings to see your portfolio.</div>
            ) : (
              portfolioRows.map((row) => (
                <div
                  key={`portfolio-row-${row.id}`}
                  className="app-list-row grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_110px_120px_120px_90px]">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      {row.name}
                      <span className="ml-2 text-xs text-zinc-500">{row.symbol.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{row.amount} units at {formatUsd(row.avgPrice)}</div>
                  </div>
                  <div className="text-sm text-zinc-100">{formatUsd(row.currentPrice)}</div>
                  <div className={cn('text-sm font-semibold', row.pnl >= 0 ? 'text-emerald-200' : 'text-red-200')}>
                    {formatUsd(row.pnl)}
                  </div>
                  <div className="text-sm text-zinc-400">{formatUsd(row.value)}</div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => removePortfolio(row.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <Card>
          <div className="text-sm font-semibold">Portfolio allocation</div>
          <div className="mt-1 text-xs text-zinc-500">Breakdown by current value.</div>
          <div className="mt-4 h-64">
            {portfolioRows.length === 0 ? (
              <div className="text-sm text-zinc-500">Allocation chart will appear here.</div>
            ) : (
              <Doughnut data={portfolioChartData} options={portfolioChartOptions} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}