// Read-only TON / GRAM on-chain data via TonAPI v2. No private keys, no signing — public reads only.
// The native token rebranded Toncoin → Gram (ticker TON → GRAM, 2026-06-15); balances are 1:1,
// the network/addresses stay "TON". This client surfaces amounts as GRAM, network as TON.

const BASE = (process.env.TONAPI_BASE ?? "https://tonapi.io/v2").replace(/\/+$/, "");
const KEY = (process.env.TONAPI_KEY ?? "").trim();
const TIMEOUT_MS = 12_000;

function headers(): Record<string, string> {
  return KEY ? { Authorization: `Bearer ${KEY}` } : {};
}

/** Stable, client-safe upstream error — details (path, user input) are logged, never surfaced. */
export class TonApiError extends Error {
  constructor(
    public readonly code: "rate_limited" | "not_found" | "upstream_error" | "timeout" | "network_error",
    public readonly status: number | null,
  ) {
    super(code);
    this.name = "TonApiError";
  }
}

/** Fetch JSON from TonAPI with a timeout. Throws a sanitized TonApiError; logs detail to stderr. */
async function tapi<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: headers(), signal: ctrl.signal });
    if (!res.ok) {
      console.error(`[tegro-wallet-mcp] TonAPI ${res.status} ${path}`);
      const code = res.status === 429 ? "rate_limited" : res.status === 404 ? "not_found" : "upstream_error";
      throw new TonApiError(code, res.status);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof TonApiError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new TonApiError("timeout", null);
    console.error(`[tegro-wallet-mcp] TonAPI request failed ${path}:`, (e as Error)?.message);
    throw new TonApiError("network_error", null);
  } finally {
    clearTimeout(timer);
  }
}

const NANO = 1_000_000_000n;

/** nanotons (string|number|bigint) → GRAM decimal string, exact BigInt math (no float). */
export function toGram(nano: string | number | bigint, dp = 4): string {
  // Note: a JS `number` from JSON.parse is already IEEE-754; for amounts > 2^53 nanotons
  // (~9M GRAM) prefer passing the raw string. BigInt math below is exact for the input it gets.
  const n = BigInt(typeof nano === "number" ? Math.trunc(nano) : nano);
  const neg = n < 0n;
  const a = neg ? -n : n;
  const whole = a / NANO;
  if (dp <= 0) return `${neg ? "-" : ""}${whole}`;
  const frac = (a % NANO).toString().padStart(9, "0").slice(0, dp);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export type Account = {
  address: string;
  balanceGram: string;
  balanceNano: string;
  status: string;
  name: string | null;
  isWallet: boolean;
  network: "TON";
};

export async function getAccount(address: string): Promise<Account> {
  const a = await tapi<{
    address: string;
    balance: number;
    status: string;
    name?: string;
    is_wallet?: boolean;
  }>(`/accounts/${encodeURIComponent(address)}`);
  return {
    address: a.address,
    balanceGram: toGram(a.balance),
    balanceNano: String(a.balance),
    status: a.status,
    name: a.name ?? null,
    isWallet: a.is_wallet ?? false,
    network: "TON",
  };
}

export type Jetton = {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  master: string;
  /** unit price in the requested fiat currency */
  priceFiat: number | null;
  /** holding value in the requested fiat currency */
  valueFiat: number | null;
  verified: boolean;
};

export async function getJettons(address: string, currency = "usd"): Promise<Jetton[]> {
  const cur = currency.toLowerCase();
  const data = await tapi<{ balances?: any[] }>(
    `/accounts/${encodeURIComponent(address)}/jettons?currencies=${encodeURIComponent(cur)}`,
  );
  return (data.balances ?? [])
    .map((b): Jetton => {
      const dec = b.jetton?.decimals ?? 9;
      const amount = Number(b.balance) / 10 ** dec;
      const price = b.price?.prices?.[cur.toUpperCase()] ?? b.price?.prices?.[cur] ?? null;
      return {
        symbol: b.jetton?.symbol ?? "",
        name: b.jetton?.name ?? "",
        balance: amount.toLocaleString("en-US", { maximumFractionDigits: 4 }),
        decimals: dec,
        master: b.jetton?.address ?? "",
        priceFiat: price,
        valueFiat: price ? amount * price : null,
        verified: b.jetton?.verification === "whitelist",
      };
    })
    .filter((j) => j.symbol);
}

export type Tx = {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  amountGram: string | null;
  counterparty: string | null;
  comment: string | null;
};

export async function getTransactions(address: string, limit = 10): Promise<Tx[]> {
  const data = await tapi<{ events?: any[] }>(
    `/accounts/${encodeURIComponent(address)}/events?limit=${Math.min(Math.max(limit, 1), 100)}`,
  );
  return (data.events ?? []).map((ev): Tx => {
    const a = ev.actions?.[0] ?? {};
    const t = a.TonTransfer ?? a.JettonTransfer ?? null;
    return {
      id: ev.event_id,
      timestamp: ev.timestamp ?? 0,
      type: a.type ?? "Unknown",
      description: a.simple_preview?.description ?? a.type ?? "",
      amountGram: a.TonTransfer?.amount != null ? toGram(a.TonTransfer.amount) : null,
      counterparty: t?.recipient?.address ?? t?.sender?.address ?? null,
      comment: t?.comment ?? null,
    };
  });
}

export type Rate = { token: string; currency: string; price: number; diff24h: string | null };

export async function getRate(token = "ton", currency = "usd"): Promise<Rate> {
  const cur = currency.toLowerCase();
  const data = await tapi<{ rates?: Record<string, any> }>(
    `/rates?tokens=${encodeURIComponent(token)}&currencies=${encodeURIComponent(cur)}`,
  );
  const key = Object.keys(data.rates ?? {})[0];
  const r = key ? data.rates![key] : null;
  const price = r?.prices?.[cur.toUpperCase()] ?? r?.prices?.[cur] ?? null;
  if (price == null) throw new Error(`no rate for ${token}/${currency}`);
  return {
    token: token.toLowerCase() === "ton" ? "GRAM" : token,
    currency: cur.toUpperCase(),
    price,
    diff24h: r?.diff_24h?.[cur.toUpperCase()] ?? r?.diff_24h?.[cur] ?? null,
  };
}

export type JettonInfo = {
  master: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  verified: boolean;
  image: string | null;
};

export async function getJettonInfo(master: string): Promise<JettonInfo> {
  const j = await tapi<any>(`/jettons/${encodeURIComponent(master)}`);
  return {
    master: j.metadata?.address ?? master,
    symbol: j.metadata?.symbol ?? "",
    name: j.metadata?.name ?? "",
    decimals: Number(j.metadata?.decimals ?? 9),
    totalSupply: j.total_supply ?? "0",
    verified: j.verification === "whitelist",
    image: j.metadata?.image ?? null,
  };
}

export type Nft = { address: string; name: string; collection: string | null; image: string | null };

export async function getNfts(address: string, limit = 20): Promise<Nft[]> {
  const data = await tapi<{ nft_items?: any[] }>(
    `/accounts/${encodeURIComponent(address)}/nfts?limit=${Math.min(Math.max(limit, 1), 100)}&indirect_ownership=false`,
  );
  return (data.nft_items ?? []).map((n): Nft => ({
    address: n.address,
    name: n.metadata?.name ?? "NFT",
    collection: n.collection?.name ?? null,
    image: n.previews?.find((p: any) => p.resolution === "500x500")?.url ?? n.metadata?.image ?? null,
  }));
}

export async function resolveDns(name: string): Promise<{ name: string; address: string | null }> {
  const dns = name.endsWith(".ton") ? name : `${name}.ton`;
  try {
    const r = await tapi<{ wallet?: { address?: string } }>(`/dns/${encodeURIComponent(dns)}/resolve`);
    return { name: dns, address: r.wallet?.address ?? null };
  } catch (e) {
    if (e instanceof TonApiError && e.code === "not_found") return { name: dns, address: null };
    throw e; // surface timeouts / upstream errors instead of masking them as "no address"
  }
}
