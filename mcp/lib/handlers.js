// MCP JSON-RPC 2.0 request handling, transport-agnostic and testable. Implements the minimal
// method set an MCP client needs: initialize, tools/list, tools/call (+ ignores notifications).

const { TOOLS, runTool } = require("./tools");

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "formy", version: "0.1.0" };

function result(id, value) {
  return { jsonrpc: "2.0", id, result: value };
}

function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Handle one parsed JSON-RPC message. Returns a response object, or null for notifications
 * (messages with no `id`) which must not be answered.
 * @param {object} msg
 * @param {{ apiBase: string, fetchImpl?: typeof fetch }} ctx
 */
async function handleMessage(msg, ctx) {
  if (!msg || msg.jsonrpc !== "2.0") {
    return msg && msg.id !== undefined ? error(msg.id ?? null, -32600, "Invalid Request") : null;
  }

  // Notifications (e.g. notifications/initialized) carry no id and get no response.
  const isNotification = msg.id === undefined || msg.id === null;

  switch (msg.method) {
    case "initialize":
      return result(msg.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "tools/list":
      return result(msg.id, { tools: TOOLS });

    case "tools/call": {
      const params = msg.params || {};
      const name = params.name;
      try {
        const output = await runTool(name, params.arguments, ctx);
        return result(msg.id, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        });
      } catch (err) {
        return result(msg.id, {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case "ping":
      return result(msg.id, {});

    default:
      if (isNotification) return null;
      return error(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

module.exports = { handleMessage, PROTOCOL_VERSION, SERVER_INFO };
