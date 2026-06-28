# Contributing

Thanks for helping improve the Tegro TON/GRAM MCP server.

## Setup

```bash
git clone https://github.com/TegroTON/tegro-mcp && cd tegro-mcp
npm install
npm run dev          # MCP over stdio (tsx)
npm run dev -- http  # HTTP/OpenAPI surface
```

## Before opening a PR

```bash
npm run typecheck && npm test && npm run build
```

- Keep the server **read-only** — no keys, no signing, no state. New tools must only read public data.
- Add a test for every new tool or behaviour (`test/*.test.ts`, network is mocked — tests never hit TonAPI).
- One tool = one entry in `src/tools.ts`; the MCP and HTTP/OpenAPI surfaces are generated from it automatically.
- Match the existing style; conventional commit messages appreciated.

## Adding a tool

1. Add the data function to `src/tonapi.ts` (or `src/address.ts` for offline helpers).
2. Register it in `src/tools.ts` with a Zod schema and a clear description.
3. Add a test. Update the README tool table and `CHANGELOG.md`.
