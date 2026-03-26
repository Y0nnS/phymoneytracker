import { NextResponse } from 'next/server';

const MARKET_ENDPOINT = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 60_000;

let cachedMarkets:
  | {
      data: { coins: unknown; global: unknown };
      timestamp: number;
    }
  | null = null;

export async function GET() {
  if (cachedMarkets && Date.now() - cachedMarkets.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedMarkets.data, {
      headers: { 'x-cache': 'hit' },
    });
  }
  try {
    const [coinsRes, globalRes] = await Promise.all([
      fetch(
        `${MARKET_ENDPOINT}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=75&page=1&sparkline=true&price_change_percentage=24h`,
        { cache: 'no-store' },
      ),
      fetch(`${MARKET_ENDPOINT}/global`, { cache: 'no-store' }),
    ]);

    if (!coinsRes.ok) {
      if (cachedMarkets) {
        return NextResponse.json(cachedMarkets.data, {
          headers: { 'x-cache': 'stale' },
        });
      }
      return NextResponse.json(
        { error: `Market request failed (${coinsRes.status}).` },
        { status: coinsRes.status },
      );
    }
    if (!globalRes.ok) {
      if (cachedMarkets) {
        return NextResponse.json(cachedMarkets.data, {
          headers: { 'x-cache': 'stale' },
        });
      }
      return NextResponse.json(
        { error: `Global request failed (${globalRes.status}).` },
        { status: globalRes.status },
      );
    }

    const coins = await coinsRes.json();
    const globalJson = await globalRes.json();

    const payload = { coins, global: globalJson.data };
    cachedMarkets = { data: payload, timestamp: Date.now() };
    return NextResponse.json(payload, { headers: { 'x-cache': 'miss' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load market data.';
    if (cachedMarkets) {
      return NextResponse.json(cachedMarkets.data, {
        headers: { 'x-cache': 'stale' },
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
