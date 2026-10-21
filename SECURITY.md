# Security Policy

`@tegroton/wallet-mcp` is **read-only**: it holds no private keys, never signs or broadcasts
transactions, and cannot move funds. It only reads public on-chain data via TonAPI.

## Reporting a vulnerability

Please report security issues **privately**, not via public issues:

- Open a [GitHub security advisory](https://github.com/TegroTON/wallet-mcp/security/advisories/new).

We aim to acknowledge within 72 hours. Please include reproduction steps and the affected version.

## Scope

In scope: input handling, dependency vulnerabilities, the HTTP surface (SSRF/abuse), and any
path that could leak a user-supplied `TONAPI_KEY`. Out of scope: TonAPI itself and rate limits.
