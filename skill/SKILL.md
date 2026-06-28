---
name: ton-gram
description: Query TON (The Open Network) and GRAM on-chain data — wallet balances, token holdings, transactions, GRAM/Toncoin price, NFTs, and TON DNS. Use whenever the user asks about a TON address, a .ton name, the GRAM/TON price, or a jetton. Backed by the read-only tegro-mcp MCP server.
---

# TON / GRAM on-chain queries

Answer questions about **The Open Network (TON)** and its native token **GRAM** (formerly Toncoin, ticker TON → GRAM since 2026‑06‑15) using the **`tegro-mcp`** MCP server. Read-only, no keys, cannot move funds.

## Prerequisite

The `tegro-mcp` MCP server must be connected:

```
claude mcp add tegro-mcp -- npx -y @tegroton/tegro-mcp
```

## Tools

- `ton_get_account(address)` — GRAM balance, status, wallet flag
- `ton_get_jettons(address, currency?)` — jetton (token) balances + fiat value
- `ton_get_transactions(address, limit?)` — recent activity (GRAM amounts, comments)
- `ton_get_rate(token?, currency?)` — GRAM (default) or jetton price + 24h change
- `ton_get_jetton_info(master)` — token metadata by master address
- `ton_get_nfts(address, limit?)` — NFTs owned
- `ton_resolve_dns(name)` — `.ton` name → wallet address

## How to answer

- A `.ton` name (e.g. `foundation.ton`) → call `ton_resolve_dns` first, then use the returned address.
- "How much is GRAM / Toncoin / TON?" → `ton_get_rate` (token defaults to `ton`, returned as **GRAM**).
- "What's in wallet X?" → `ton_get_account` + `ton_get_jettons`; add `ton_get_nfts` only if asked.
- Always name the native token **GRAM**; the network and addresses stay **TON** (e.g. "TON address").
- This is read-only — never offer to send, sign, or move funds.
