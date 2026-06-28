import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccount, getRate, toGram } from "../src/tonapi.js";

afterEach(() => vi.unstubAllGlobals());

function mockFetch(json: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status, json: async () => json })),
  );
}

const RAW = `0:${"0".repeat(64)}`;

describe("toGram — exact string math", () => {
  it("formats without float loss", () => {
    expect(toGram("1500000000")).toBe("1.5000");
    expect(toGram(0)).toBe("0.0000");
    expect(toGram("12840000000")).toBe("12.8400");
    expect(toGram("999999999999999999")).toBe("999999999.9999"); // would lose precision via Number
    expect(toGram("-1500000000")).toBe("-1.5000");
  });
});

describe("getRate", () => {
  it("labels the native token GRAM and returns the price", async () => {
    mockFetch({ rates: { TON: { prices: { USD: 1.58 }, diff_24h: { USD: "+1.39%" } } } });
    const r = await getRate("ton", "usd");
    expect(r.token).toBe("GRAM");
    expect(r.currency).toBe("USD");
    expect(r.price).toBe(1.58);
    expect(r.diff24h).toBe("+1.39%");
  });
});

describe("getAccount", () => {
  it("formats GRAM balance and reports network TON", async () => {
    mockFetch({ address: RAW, balance: 12840000000, status: "active", is_wallet: true });
    const a = await getAccount(RAW);
    expect(a.balanceGram).toBe("12.8400");
    expect(a.network).toBe("TON");
    expect(a.isWallet).toBe(true);
  });
});

describe("error handling", () => {
  it("throws a clean error on a non-2xx response", async () => {
    mockFetch({}, false, 429);
    await expect(getAccount(RAW)).rejects.toThrow(/429/);
  });
});
