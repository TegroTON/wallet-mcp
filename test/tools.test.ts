import { describe, expect, it } from "vitest";

import { findTool, tools } from "../src/tools.js";

describe("tool registry", () => {
  it("exposes 8 uniquely-named tools", () => {
    expect(tools).toHaveLength(8);
    expect(new Set(tools.map((t) => t.name)).size).toBe(8);
  });

  it("every tool is namespaced ton_* and has a non-trivial description", () => {
    for (const t of tools) {
      expect(t.name).toMatch(/^ton_[a-z_]+$/);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it("address schema rejects garbage and accepts a valid raw address", () => {
    const acc = findTool("ton_get_account");
    expect(acc).toBeDefined();
    expect(acc!.schema.safeParse({ address: "nope" }).success).toBe(false);
    expect(acc!.schema.safeParse({ address: `0:${"0".repeat(64)}` }).success).toBe(true);
  });

  it("ton_validate_address runs offline and normalizes", async () => {
    const v = findTool("ton_validate_address");
    const r = (await v!.handler({ address: `0:${"a".repeat(64)}` })) as { valid: boolean; format: string };
    expect(r.valid).toBe(true);
    expect(r.format).toBe("raw");
  });

  it("findTool returns undefined for an unknown name", () => {
    expect(findTool("nope")).toBeUndefined();
  });
});
