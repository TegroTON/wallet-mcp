# Tegro Wallet MCP — TON / GRAM

[![npm](https://img.shields.io/npm/v/@tegroton/wallet-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/@tegroton/wallet-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@tegroton/wallet-mcp?color=cb3837)](https://www.npmjs.com/package/@tegroton/wallet-mcp)
[![CI](https://github.com/TegroTON/wallet-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/TegroTON/wallet-mcp/actions/workflows/ci.yml)
[![MCP server](https://img.shields.io/badge/MCP-server-2563eb)](https://modelcontextprotocol.io)
[![Built on TON](https://img.shields.io/badge/Built%20on-TON-0098EA?logo=ton&logoColor=white)](https://ton.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-3ad29f)](LICENSE)

> **The TON & GRAM wallet MCP.** Give any AI assistant read-only, real-time access to TON on-chain
> data — wallet balances, tokens, transactions, prices, NFTs, TON DNS and address validation — with
> **no private keys and no signing.** One server, every major AI client.

**Read-only [Model Context Protocol](https://modelcontextprotocol.io) server for [TON](https://ton.org) wallets and the GRAM token** (formerly Toncoin). Works out of the box with **Claude Desktop, Claude Code, Cursor, Hermes Agent** (MCP) and **ChatGPT** (GPT Actions via OpenAPI).

*Part of the [Tegro](https://wallet.tegro.finance) open ecosystem — see [`@tegroton/tegro-finance`](https://www.npmjs.com/package/@tegroton/tegro-finance) (DEX) and [`@tegroton/tegro-money`](https://www.npmjs.com/package/@tegroton/tegro-money) (payments).*

> 🔁 The TON native token rebranded **Toncoin → Gram** (ticker **TON → GRAM**, 2026‑06‑15). Balances are 1:1, the network and addresses stay **TON**. This server surfaces amounts as **GRAM** and the network as **TON**.

## Tools

| Tool | What it returns |
|---|---|
| `ton_get_account` | GRAM balance, status, wallet flag for an address |
| `ton_get_jettons` | Jetton (token) balances with fiat value |
| `ton_get_transactions` | Recent transactions — type, GRAM amount, counterparty, comment |
| `ton_get_rate` | GRAM (or any jetton) price in a fiat currency + 24h change |
| `ton_get_jetton_info` | Jetton metadata by master address (symbol, supply, verification) |
| `ton_get_nfts` | NFTs owned by an address |
| `ton_resolve_dns` | TON DNS name → wallet address |
| `ton_validate_address` | Validate + normalize an address offline (CRC16, bounceable/testnet flags) |

Every tool maps 1:1 to an MCP tool and an HTTP `POST /tools/<name>` operation in the OpenAPI spec — the two surfaces are generated from one definition.

### Example output

```jsonc
// ton_get_rate { "token": "ton", "currency": "usd" }
{ "token": "GRAM", "currency": "USD", "price": 1.58, "diff24h": "+1.39%" }

// ton_get_account { "address": "UQ…" }
{ "address": "0:…", "balanceGram": "12.8400", "balanceNano": "12840000000",
  "status": "active", "isWallet": true, "network": "TON" }

// ton_validate_address { "address": "EQ…" }   ← offline, no network
{ "valid": true, "format": "friendly", "raw": "0:…", "workchain": 0,
  "bounceable": true, "testnet": false }
```

Ask an AI assistant: *"What's the GRAM price, and how much is in foundation.ton?"* — it resolves the
DNS name, reads the balance, and answers with live data.

## Quick start

```bash
npx @tegroton/wallet-mcp           # MCP server over stdio
npx @tegroton/wallet-mcp http 8787 # HTTP + OpenAPI on :8787 (for ChatGPT / universal)
```

No configuration is required. To lift the public rate limit, set a [TonAPI](https://tonconsole.com) key: `TONAPI_KEY=...`.

## Connect it

### Claude Desktop / Claude Code / Cursor (MCP)

Add to your MCP config (`claude_desktop_config.json`, Cursor `~/.cursor/mcp.json`, or `claude mcp add`):

```json
{
  "mcpServers": {
    "tegro-wallet-mcp": {
      "command": "npx",
      "args": ["-y", "@tegroton/wallet-mcp"],
      "env": { "TONAPI_KEY": "" }
    }
  }
}
```

Claude Code one-liner: `claude mcp add tegro-wallet-mcp -- npx -y @tegroton/wallet-mcp`

### Hermes Agent (MCP)

Hermes Agent connects any MCP server. Add `@tegroton/wallet-mcp` as an MCP server in its MCP config / registry with the same `command`/`args` as above, then enable it via `hermes tools`.

### ChatGPT (GPT Actions)

Run the HTTP surface (self-host — see below) and point a custom GPT's **Action** at `https://<your-host>/openapi.json`. Each tool becomes an operation the GPT can call. Read-only, so no auth is required (add your own if you host it privately).

## Self-host the HTTP surface

```bash
# from source
npm i && npm run build && node dist/cli.js http 8787

# docker
docker build -t tegro-wallet-mcp . && docker run -p 8787:8787 -e TONAPI_KEY=... tegro-wallet-mcp
```

Endpoints: `GET /` (info), `GET /health`, `GET /openapi.json`, `POST /tools/<name>` (JSON body).

```bash
curl -s localhost:8787/tools/ton_get_rate -d '{"token":"ton","currency":"usd"}'
# → {"token":"GRAM","currency":"USD","price":1.58,"diff24h":"+1.39%"}
```

## Safety

- **Read-only.** No private keys, no seed phrases, no signing, no transactions — the server only reads public on-chain data via [TonAPI](https://docs.tonconsole.com).
- No secrets are required or stored. An optional `TONAPI_KEY` (yours) only raises the rate limit.
- Non-custodial by design: it cannot move funds.

## Programmatic use

```ts
import { getAccount, getRate } from "@tegroton/wallet-mcp";
const acc = await getAccount("UQ…");   // { balanceGram, status, network: "TON", … }
const rate = await getRate("ton", "usd"); // { token: "GRAM", price, diff24h }
```

## Contributing & support

- [Contributing guide](CONTRIBUTING.md) — setup, tests, adding a tool
- [Security policy](SECURITY.md) — report privately to `security@tegro.finance`
- [Changelog](CHANGELOG.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- Issues and feature requests: [GitHub issues](https://github.com/TegroTON/wallet-mcp/issues)

## Ecosystem

Part of the **[Tegro](https://wallet.tegro.finance)** open ecosystem — a non-custodial TON/GRAM wallet with a crypto card. Sister packages:

- [`@tegroton/tegro-finance`](https://www.npmjs.com/package/@tegroton/tegro-finance) — Tegro Finance DEX SDK
- [`@tegroton/tegro-money`](https://www.npmjs.com/package/@tegroton/tegro-money) — Tegro.Money payments SDK

## License

[MIT](LICENSE) © TegroTON
