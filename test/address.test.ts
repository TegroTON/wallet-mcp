import { describe, expect, it } from "vitest";

import { isValidAddress, parseAddress } from "../src/address.js";

// Local CRC16-CCITT to build a self-consistent valid friendly address (no network, no magic constants).
function crc16(data: Uint8Array): number {
  let crc = 0;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc & 0xffff;
}
function toB64Url(b: Uint8Array): string {
  const bin = String.fromCharCode(...b);
  return Buffer.from(bin, "binary").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function buildFriendly(tag: number, wc: number, hash: Uint8Array): string {
  const body = new Uint8Array(34);
  body[0] = tag;
  body[1] = wc === -1 ? 0xff : wc;
  body.set(hash, 2);
  const crc = crc16(body);
  const full = new Uint8Array(36);
  full.set(body);
  full[34] = crc >> 8;
  full[35] = crc & 0xff;
  return toB64Url(full);
}

const hash = Uint8Array.from({ length: 32 }, (_, i) => (i * 7) & 0xff);

describe("parseAddress — raw", () => {
  it("accepts a valid raw address", () => {
    const r = parseAddress(`0:${"a".repeat(64)}`);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("raw");
    expect(r.workchain).toBe(0);
    expect(r.raw).toBe(`0:${"a".repeat(64)}`);
  });
  it("rejects bad hex length", () => {
    expect(parseAddress("0:abc").valid).toBe(false);
  });
  it("rejects garbage", () => {
    expect(isValidAddress("not-an-address")).toBe(false);
    expect(isValidAddress("")).toBe(false);
  });
});

describe("parseAddress — friendly (CRC)", () => {
  it("accepts a CRC-valid bounceable mainnet address and normalizes to raw", () => {
    const a = buildFriendly(0x11, 0, hash);
    const r = parseAddress(a);
    expect(r.valid).toBe(true);
    expect(r.format).toBe("friendly");
    expect(r.bounceable).toBe(true);
    expect(r.testnet).toBe(false);
    expect(r.raw).toBe(`0:${Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("")}`);
  });
  it("reads non-bounceable + testnet flags", () => {
    const r = parseAddress(buildFriendly(0x51 | 0x80, 0, hash));
    expect(r.valid).toBe(true);
    expect(r.bounceable).toBe(false);
    expect(r.testnet).toBe(true);
  });
  it("rejects a CRC mismatch", () => {
    const good = buildFriendly(0x11, 0, hash);
    const bad = `${good.slice(0, 47)}${good[47] === "A" ? "B" : "A"}`;
    const r = parseAddress(bad);
    expect(r.valid).toBe(false);
  });
});
