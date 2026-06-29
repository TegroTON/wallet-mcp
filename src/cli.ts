#!/usr/bin/env node
import { runHttp } from "./http.js";
import { runMcp } from "./mcp.js";

// `tegro-wallet-mcp`                  → MCP server over stdio (Claude, Cursor, Claude Code, Hermes…)
// `tegro-wallet-mcp http [port] [host]` → HTTP/OpenAPI surface (ChatGPT Actions, universal)
//   default host 127.0.0.1 (localhost-only) — pass 0.0.0.0 to expose, behind your own auth/proxy.
const mode = process.argv[2];

if (mode === "http") {
  const port = process.argv[3] ? Number(process.argv[3]) : undefined;
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    console.error(`invalid port: ${process.argv[3]} (expected 1–65535)`);
    process.exit(1);
  }
  runHttp(port, process.argv[4]);
} else {
  runMcp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
