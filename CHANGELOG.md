# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-28

### Added
- Read-only TON / GRAM MCP server (stdio) and HTTP/OpenAPI surface from one core.
- Tools: `ton_get_account`, `ton_get_jettons`, `ton_get_transactions`, `ton_get_rate`,
  `ton_get_jetton_info`, `ton_get_nfts`, `ton_resolve_dns`, `ton_validate_address`.
- GRAM-aware formatting (Toncoin → Gram rebrand): native token surfaced as **GRAM**, network as **TON**.
- Offline TON address validation with CRC16 (`ton_validate_address`).
- Config snippets for Claude Desktop, Claude Code, Cursor, Hermes Agent and ChatGPT (GPT Actions).
- Test suite (Vitest, network mocked), CI, Dockerfile, MIT license.
