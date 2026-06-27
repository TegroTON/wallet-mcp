import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { NAME, VERSION } from "./meta.js";
import { tools } from "./tools.js";

/** Start the MCP server over stdio (Claude Desktop, Claude Code, Cursor, Hermes Agent, …). */
export async function runMcp(): Promise<void> {
  const server = new McpServer({ name: NAME, version: VERSION });

  for (const t of tools) {
    server.tool(t.name, t.description, t.schema.shape, async (args: Record<string, unknown>) => {
      try {
        const result = await t.handler(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    });
  }

  await server.connect(new StdioServerTransport());
}
