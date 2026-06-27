import { z } from "zod";

import * as ton from "./tonapi.js";

const addr = z.string().min(48).describe("TON wallet address (raw 0:… or friendly EQ…/UQ…)");

export type Tool = {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

/** The read-only TON/GRAM toolset, shared by the MCP server and the HTTP/OpenAPI surface. */
export const tools: Tool[] = [
  {
    name: "ton_get_account",
    description:
      "Get a TON account's GRAM balance (the native token, formerly Toncoin), status, and wallet flag. Network is TON; balances are 1:1 GRAM↔TON.",
    schema: z.object({ address: addr }),
    handler: (a) => ton.getAccount(a.address as string),
  },
  {
    name: "ton_get_jettons",
    description: "List jetton (token) balances held by a TON address, with fiat value where the token is priced.",
    schema: z.object({
      address: addr,
      currency: z.string().default("usd").describe("fiat code: usd, eur, rub, …"),
    }),
    handler: (a) => ton.getJettons(a.address as string, (a.currency as string) ?? "usd"),
  },
  {
    name: "ton_get_transactions",
    description: "Recent transactions/events for a TON address — type, GRAM amount, counterparty, comment.",
    schema: z.object({
      address: addr,
      limit: z.number().int().min(1).max(100).default(10),
    }),
    handler: (a) => ton.getTransactions(a.address as string, (a.limit as number) ?? 10),
  },
  {
    name: "ton_get_rate",
    description: "Current price of GRAM (the native TON token) or any jetton in a fiat currency, plus 24h change.",
    schema: z.object({
      token: z.string().default("ton").describe("'ton' (= GRAM) or a jetton master address"),
      currency: z.string().default("usd"),
    }),
    handler: (a) => ton.getRate((a.token as string) ?? "ton", (a.currency as string) ?? "usd"),
  },
  {
    name: "ton_get_jetton_info",
    description: "Metadata for a jetton (token) by its master contract address: symbol, name, supply, verification.",
    schema: z.object({ master: z.string().describe("jetton master contract address") }),
    handler: (a) => ton.getJettonInfo(a.master as string),
  },
  {
    name: "ton_get_nfts",
    description: "NFTs owned by a TON address (name, collection, image).",
    schema: z.object({
      address: addr,
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: (a) => ton.getNfts(a.address as string, (a.limit as number) ?? 20),
  },
  {
    name: "ton_resolve_dns",
    description: "Resolve a TON DNS name (e.g. foundation.ton) to its wallet address.",
    schema: z.object({ name: z.string().describe("TON DNS name, with or without the .ton suffix") }),
    handler: (a) => ton.resolveDns(a.name as string),
  },
];

export const findTool = (name: string): Tool | undefined => tools.find((t) => t.name === name);
