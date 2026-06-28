// Programmatic API — use the read-only TON/GRAM data layer or start a surface directly.
export * from "./tonapi.js";
export { parseAddress, isValidAddress, type AddressInfo } from "./address.js";
export { tools, findTool, type Tool } from "./tools.js";
export { runMcp } from "./mcp.js";
export { runHttp } from "./http.js";
export { NAME, VERSION, TITLE, DESCRIPTION } from "./meta.js";
