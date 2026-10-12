/** Talks to the Something Good MCP server (github.com/gooddaynightgit/Alexagood) over Streamable HTTP. */

export const SG_MCP_URL = process.env.NEXT_PUBLIC_SG_MCP_URL ?? "https://alexagood.vercel.app/mcp";
const PROTOCOL = "2025-11-25";

export type SgRate = "medium" | "slow" | "x-slow";
export type SgPhase = "in" | "hold" | "out";
export type SgStep = {
  text: string;
  rate: SgRate;
  pauseMs: number;
  phase?: SgPhase;
  group?: "ask";
  /** Say only these parts aloud; the card still shows `text`. */
  speak?: string[];
  speakPauseMs?: number;
};
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
export const sgFinish = (named: string, country?: string) =>
  callTool("finish_something_good", { named, ...(country ? { country } : {}) });

export type SgCheck = {
  status: "ok" | "nudge" | "block" | "crisis";
  ok: boolean;
  message: string;
  maxChars: number;
  support?: { name: string; phone: string; note: string; emergency: string; url: string };
};

/** Check the perfect result against the shared rules (same rules Alexa uses). */
export async function sgCheck(text: string, country?: string): Promise<SgCheck> {
  await ensureInitialized();
  const result = await rpc("tools/call", { name: "check_perfect_result", arguments: { text, ...(country ? { country } : {}) } });
  return result.structuredContent as SgCheck;
}

/** Best guess at the person's country from their phone settings; nothing is asked or stored. */
export function sgCountry(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Africa/Johannesburg") return "ZA";
    if (tz === "Europe/London") return "GB";
    if (tz === "Europe/Dublin") return "IE";
    if (tz.startsWith("Australia/")) return "AU";
    if (tz === "Pacific/Auckland" || tz === "Pacific/Chatham") return "NZ";
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit)/.test(tz)) return "CA";
    if (/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky)|Pacific\/Honolulu)/.test(tz)) return "US";
  } catch {
    /* fall through to language */
  }
  const region = navigator.language?.split("-")[1];
  return region ? region.toUpperCase() : undefined;
}

export type SgSpelling = { corrected: string; changed: boolean; fixes: { from: string; to: string }[] };

/** Spelling suggestions from the Something Good server. Never applied without the person's yes. */
export async function sgSpell(text: string): Promise<SgSpelling> {
  await ensureInitialized();
  const result = await rpc("tools/call", { name: "suggest_spelling", arguments: { text } });
  return result.structuredContent as SgSpelling;
}
