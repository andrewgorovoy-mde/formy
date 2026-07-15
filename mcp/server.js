#!/usr/bin/env node
// Formy MCP server (stdio transport). Exposes the form registry to any MCP client (Claude
// Desktop, agents) as tools: search_forms, get_form, submit_form. Zero-dependency — speaks
// newline-delimited JSON-RPC 2.0 over stdin/stdout, consistent with the standalone demo agent.
//
//   FORMY_URL=http://localhost:3000 node mcp/server.js
//
// Claude Desktop config (claude_desktop_config.json):
//   { "mcpServers": { "formy": { "command": "node", "args": ["/abs/path/mcp/server.js"],
//     "env": { "FORMY_URL": "http://localhost:3000" } } } }

const { handleMessage } = require("./lib/handlers");

const apiBase = (process.env.FORMY_URL || "http://localhost:3000").replace(/\/$/, "");
const ctx = { apiBase };

function send(response) {
  if (response) process.stdout.write(JSON.stringify(response) + "\n");
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    if (!line) continue;

    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }

    handleMessage(msg, ctx)
      .then(send)
      .catch((err) => {
        const id = msg && msg.id !== undefined ? msg.id : null;
        send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(err.message || err) } });
      });
  }
});

process.stderr.write(`[formy-mcp] ready — proxying ${apiBase}\n`);
