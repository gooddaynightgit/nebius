/** Talks to the Something Good MCP server (github.com/gooddaynightgit/Alexagood) over Streamable HTTP. */

export const SG_MCP_URL = process.env.NEXT_PUBLIC_SG_MCP_URL ?? "https://alexagood.vercel.app/mcp";
const PROTOCOL = "2025-11-25";

export type SgRate = "medium" | "slow" | "x-slow";
export type SgPhase = "in" | "hold" | "out";
export type SgStep = { text: string; rate: SgRate; pauseMs: number; phase?: SgPhase };
export type SgSession = { steps: SgStep[]; text: string; ssml: string };

let nextId = 1;
let initialized = false;

async function rpc(method: string, params?: Record<string, unknown>) {
  const res = await fetch(SG_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  if (!res.ok) throw new Error(`Something Good server answered ${res.status}`);
  const msg = await res.json();
  if (msg.error) throw new Error(msg.error.message ?? "Something Good server error");
  return msg.result;
}

async function ensureInitialized() {
  if (initialized) return;
  await rpc("initialize", {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: "gooddaynight-something-good", version: "1.0.0" },
  });
  initialized = true;
}

async function callTool(name: string, args: Record<string, unknown> = {}): Promise<SgSession> {
  await ensureInitialized();
  const result = await rpc("tools/call", { name, arguments: args });
  if (result?.isError || !result?.structuredContent?.steps) {
    throw new Error(result?.content?.[0]?.text ?? "Something Good could not answer");
  }
  return result.structuredContent as SgSession;
}

export const sgStart = (focus?: string) => callTool("start_something_good", focus ? { focus } : {});
export const sgFinish = (named: string) => callTool("finish_something_good", { named });
