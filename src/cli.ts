#!/usr/bin/env node
import { runHttp } from "./http.js";
import { runMcp } from "./mcp.js";

// `tegro-mcp`        → MCP server over stdio (Claude, Cursor, Claude Code, Hermes…)
// `tegro-mcp http [port]` → HTTP/OpenAPI surface (ChatGPT Actions, universal)
const mode = process.argv[2];

if (mode === "http") {
  runHttp(process.argv[3] ? Number(process.argv[3]) : undefined);
} else {
  runMcp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
