import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { zodToJsonSchema } from "zod-to-json-schema";

import { DESCRIPTION, NAME, TITLE, VERSION } from "./meta.js";
import { findTool, tools } from "./tools.js";

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

/** Start the HTTP/OpenAPI surface (ChatGPT Actions, webhooks, universal AI). Read-only. */
export function runHttp(port = Number(process.env.PORT ?? 8787)): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
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
    if (url.pathname === "/openapi.json") return json(200, openapi(`${url.protocol}//${req.headers.host}`));
    if (url.pathname === "/")
      return json(200, { name: NAME, version: VERSION, description: DESCRIPTION, tools: tools.map((t) => t.name), openapi: "/openapi.json" });

    if (url.pathname.startsWith("/tools/") && req.method === "POST") {
      const t = findTool(url.pathname.slice("/tools/".length));
      if (!t) return json(404, { error: "unknown tool" });
      let raw = "";
      for await (const chunk of req) raw += chunk;
      let args: unknown = {};
      try {
        args = raw ? JSON.parse(raw) : {};
      } catch {
        return json(400, { error: "invalid JSON body" });
      }
      const parsed = t.schema.safeParse(args);
      if (!parsed.success) return json(400, { error: "invalid params", details: parsed.error.issues });
      try {
        return json(200, await t.handler(parsed.data));
      } catch (e) {
        return json(502, { error: (e as Error).message });
      }
    }
    return json(404, { error: "not found" });
  });

  server.listen(port, () => console.error(`${NAME} v${VERSION} — HTTP on :${port}  (GET /openapi.json)`));
}
