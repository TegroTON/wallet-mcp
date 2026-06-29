// TON address validation + normalization — zero dependencies.
// Handles raw ("0:<64 hex>") and user-friendly base64url (48 chars) forms, with a real
// CRC16-CCITT check on friendly addresses (not just a regex).

function crc16(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc & 0xffff;
}

function fromBase64Url(s: string): Uint8Array | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin =
      typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export type AddressInfo = {
  valid: boolean;
  /** "raw" (0:hex) | "friendly" (EQ/UQ…) | null when unrecognized */
  format: "raw" | "friendly" | null;
  /** normalized raw form, "0:<hex>" */
  raw: string | null;
  workchain: number | null;
  /** friendly only */
  bounceable: boolean | null;
  testnet: boolean | null;
  reason?: string;
};

const RAW_RX = /^(-1|0):[0-9a-fA-F]{64}$/;
const FRIENDLY_RX = /^[A-Za-z0-9_-]{48}$/;

/** Parse + validate a TON address. Never throws (incl. non-string input). */
export function parseAddress(input: unknown): AddressInfo {
  const s = (typeof input === "string" ? input : "").trim();
  const base: AddressInfo = { valid: false, format: null, raw: null, workchain: null, bounceable: null, testnet: null };

  if (RAW_RX.test(s)) {
    const [wc, hex] = s.split(":");
    return { ...base, valid: true, format: "raw", raw: `${Number(wc)}:${hex.toLowerCase()}`, workchain: Number(wc) };
  }

  if (FRIENDLY_RX.test(s)) {
    const bytes = fromBase64Url(s);
    if (!bytes || bytes.length !== 36) return { ...base, format: "friendly", reason: "bad byte length" };
    const want = (bytes[34] << 8) | bytes[35];
    if (crc16(bytes.subarray(0, 34)) !== want) return { ...base, format: "friendly", reason: "CRC mismatch" };
    const tag = bytes[0];
    // valid tags: 0x11 (bounceable) + 0x40 (non-bounceable) + 0x80 (testnet) → 0x11/0x51/0x91/0xD1
    if ((tag & 0x3f) !== 0x11) return { ...base, format: "friendly", reason: "invalid address tag" };
    if (bytes[1] !== 0x00 && bytes[1] !== 0xff) return { ...base, format: "friendly", reason: "unsupported workchain" };
    const wc = bytes[1] === 0xff ? -1 : 0;
    return {
      ...base,
      valid: true,
      format: "friendly",
      raw: `${wc}:${toHex(bytes.subarray(2, 34))}`,
      workchain: wc,
      bounceable: (tag & 0x40) === 0,
      testnet: (tag & 0x80) !== 0,
    };
  }

  return { ...base, reason: "unrecognized address format" };
}

export const isValidAddress = (input: string): boolean => parseAddress(input).valid;
