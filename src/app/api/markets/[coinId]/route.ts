import { NextResponse } from 'next/server';

const MARKET_ENDPOINT = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  data: { detail: unknown; chart: unknown };
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

export async function GET(request: Request, context: { params: { coinId: string } }) {
  const { coinId } = context.params;
  const url = new URL(request.url);
  const days = url.searchParams.get('days') ?? '1';
  const cacheKey = `${coinId}:${days}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: { 'x-cache': 'hit' } });
  }

  try {
    const [detailRes, chartRes] = await Promise.all([
      fetch(
        `${MARKET_ENDPOINT}/coins/${coinId}?localization=false&tickers=false&market_data=true&sparkline=false`,
        { cache: 'no-store' },
      ),
      fetch(`${MARKET_ENDPOINT}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
        { cache: 'no-store' },
      ),
    ]);

    if (!detailRes.ok) {
      if (cached) {
        return NextResponse.json(cached.data, { headers: { 'x-cache': 'stale' } });
      }
      return NextResponse.json(
        { error: `Detail request failed (${detailRes.status}).` },
        { status: detailRes.status },
      );
    }
    if (!chartRes.ok) {
      if (cached) {
        return NextResponse.json(cached.data, { headers: { 'x-cache': 'stale' } });
      }
      return NextResponse.json(
        { error: `Chart request failed (${chartRes.status}).` },
        { status: chartRes.status },
      );
    }

    const detail = await detailRes.json();
    const chart = await chartRes.json();

    const payload = { detail, chart };
    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload, { headers: { 'x-cache': 'miss' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load coin data.';
    if (cached) {
      return NextResponse.json(cached.data, { headers: { 'x-cache': 'stale' } });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
