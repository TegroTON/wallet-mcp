import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { zodToJsonSchema } from "zod-to-json-schema";

import { DESCRIPTION, NAME, TITLE, VERSION } from "./meta.js";
import { TonApiError } from "./tonapi.js";
import { findTool, tools } from "./tools.js";

const MAX_BODY = 64 * 1024; // 64 KiB — tool args are tiny; reject anything larger

/** OpenAPI 3.1 spec generated from the toolset — consumable by ChatGPT GPT Actions and any HTTP AI. */
function openapi(baseUrl: string) {
  const paths: Record<string, unknown> = {};
  for (const t of tools) {
    paths[`/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.description,
        requestBody: {
          required: true,
          content: { "application/json": { schema: zodToJsonSchema(t.schema, { target: "openApi3" }) } },
        },
        responses: { "200": { description: "Result", content: { "application/json": { schema: { type: "object" } } } } },
      },
    };
  }
  return { openapi: "3.1.0", info: { title: TITLE, version: VERSION, description: DESCRIPTION }, servers: [{ url: baseUrl }], paths };
}

/** Read the request body with a hard cap; resolves null if the cap is exceeded (caller sends 413). */
async function readBody(req: IncomingMessage): Promise<string | null> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) return null; // stop accumulating — bounded memory; respond 413
  }
  return raw;
}

const STATUS_FOR: Record<string, number> = {
  rate_limited: 429,
  not_found: 404,
  timeout: 504,
  upstream_error: 502,
  network_error: 502,
};

/**
 * Start the HTTP/OpenAPI surface (ChatGPT Actions, universal AI). Read-only.
 * Binds 127.0.0.1 by default — pass an explicit host (e.g. 0.0.0.0) to expose it, behind your
 * own auth/rate-limit/proxy. Set PUBLIC_URL so the OpenAPI `servers` URL is correct behind a proxy.
 */
export function runHttp(port = Number(process.env.PORT ?? 8787), host = process.env.HOST ?? "127.0.0.1"): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "POST,GET,OPTIONS",
    };
    const json = (code: number, obj: unknown) => {
      res.writeHead(code, { "content-type": "application/json", ...cors });
      res.end(JSON.stringify(obj, null, 2));
    };

    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }
    if (url.pathname === "/health") return json(200, { ok: true, name: NAME, version: VERSION });
    if (url.pathname === "/openapi.json") {
      const base = process.env.PUBLIC_URL ?? `${url.protocol}//${req.headers.host ?? `${host}:${port}`}`;
      return json(200, openapi(base));
    }
    if (url.pathname === "/")
      return json(200, { name: NAME, version: VERSION, description: DESCRIPTION, tools: tools.map((t) => t.name), openapi: "/openapi.json" });

    if (url.pathname.startsWith("/tools/") && req.method === "POST") {
      const t = findTool(url.pathname.slice("/tools/".length));
      if (!t) return json(404, { error: "unknown_tool" });
      const raw = await readBody(req);
      if (raw === null) return json(413, { error: "payload_too_large" });
      let args: unknown = {};
      try {
        args = raw ? JSON.parse(raw) : {};
      } catch {
        return json(400, { error: "invalid_json" });
      }
      const parsed = t.schema.safeParse(args);
      if (!parsed.success) return json(400, { error: "invalid_params", details: parsed.error.issues });
      try {
        return json(200, await t.handler(parsed.data));
      } catch (e) {
        if (e instanceof TonApiError) return json(STATUS_FOR[e.code] ?? 502, { error: e.code });
        console.error(`[tegro-mcp] tool ${t.name} failed:`, (e as Error)?.message);
        return json(502, { error: "internal_error" });
      }
    }
    return json(404, { error: "not_found" });
  });

  server.requestTimeout = 15_000;
  server.headersTimeout = 16_000;
  server.listen(port, host, () =>
    console.error(`${NAME} v${VERSION} — HTTP on ${host}:${port}  (GET /openapi.json)${host === "127.0.0.1" ? "  [localhost-only; pass a host to expose]" : ""}`),
  );
}
