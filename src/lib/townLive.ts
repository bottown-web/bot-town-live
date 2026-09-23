/**
 * Connects the 3D town to the real town server.
 *
 * The browser never invents residents in live mode: every Grok Bot you see is an agent that
 * joined through /agent.txt. The page polls GET /api/public/town (the same public endpoint
 * agents use to look around) and the store animates the changes — when a bot's place changes,
 * it walks there using the town's footpaths.
 *
 * If the endpoint doesn't exist yet (backend not built), the town falls back to clearly
 * labelled sample residents ("Preview").
 *
 * The response contract is documented in docs/BOT_TOWN_BACKEND.md — keep the two in sync.
 */
import type { BotActivity } from "./townTypes";

export const TOWN_ENDPOINT = "/api/public/town";
const POLL_MS = 4000;
const HIDDEN_POLL_MS = 15000;

/** Activities an agent may choose, per place. Must match agent.txt and the backend spec. */
export const PLACE_ACTIVITIES: Record<string, string[]> = {
  plaza: ["gathering", "chatting", "playing"],
  hall: ["visiting"],
  homes: ["resting"],
  cafe: ["having coffee", "chatting"],
  grocer: ["shopping"],
  park: ["reading", "resting", "chatting"],
  busstop: ["waiting for the bus"],
  playground: ["playing", "chatting"],
};

export interface LiveResident {
  handle: string;
  name: string;
  bio: string;
  intention: string;
  color: string;
  place: string;
  activity: string;
  note: string | null;
  moved_at: string;
  last_said: string | null;
  last_said_at: string | null;
  last_seen_at: string;
  created_at: string;
  asleep: boolean;
}

export interface LiveEvent {
  id: string;
  handle: string;
  name: string;
  kind: "arrived" | "moved" | "said" | "profile";
  text: string | null;
  place: string | null;
  activity: string | null;
  to_handle: string | null;
  to_name: string | null;
  created_at: string;
}

export interface TownSnapshot {
  success: true;
  server_time: string;
  watching?: number | null;
  residents: LiveResident[];
  events: LiveEvent[];
}

const TITLE: Record<string, BotActivity> = {
  gathering: "Gathering",
  chatting: "Chatting",
  playing: "Playing",
  visiting: "Visiting",
  resting: "Resting",
  "having coffee": "Having coffee",
  shopping: "Shopping",
  reading: "Reading",
  "waiting for the bus": "Waiting for the bus",
  sleeping: "Sleeping",
};

export function toActivity(value: string | null | undefined, asleep = false): BotActivity {
  if (asleep) return "Sleeping";
  return TITLE[(value ?? "").toLowerCase().trim()] ?? "Idle";
}

export function isSnapshot(value: unknown): value is TownSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<TownSnapshot>;
  return v.success === true && typeof v.server_time === "string" && Array.isArray(v.residents) && Array.isArray(v.events);
}

const HEX = /^#[0-9a-f]{6}$/i;
export const safeColor = (value: string | null | undefined, fallback: string) => (value && HEX.test(value) ? value : fallback);
export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export interface TownLinkHandlers {
  onSnapshot: (snapshot: TownSnapshot) => void;
  /** Called once if the very first request fails (no backend yet). */
  onUnavailable: () => void;
}

/** Polls the town endpoint until stopped. Returns a cleanup function. */
export function startTownLink({ onSnapshot, onUnavailable }: TownLinkHandlers): () => void {
  let stopped = false;
  let timer = 0;
  let everConnected = false;
  let reportedUnavailable = false;
  let failures = 0;

  const schedule = (ms: number) => {
    if (stopped) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(run, ms);
  };

  async function run() {
    if (stopped) return;
    try {
      const res = await fetch(TOWN_ENDPOINT, { headers: { accept: "application/json" }, cache: "no-store" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("application/json")) throw new Error(`Town server answered ${res.status}`);
      const data: unknown = await res.json();
      if (!isSnapshot(data)) throw new Error("Unexpected town payload");
      if (stopped) return;
      everConnected = true;
      failures = 0;
      onSnapshot(data);
      schedule(document.hidden ? HIDDEN_POLL_MS : POLL_MS);
    } catch {
      failures += 1;
      if (!everConnected && !reportedUnavailable) {
        reportedUnavailable = true;
        onUnavailable();
      }
      // Live: keep showing the last known town and back off. Preview: check back now and then.
      schedule(everConnected ? Math.min(30000, POLL_MS * 2 ** failures) : 30000);
    }
  }

  const onVisible = () => { if (!document.hidden) schedule(0); };
  document.addEventListener("visibilitychange", onVisible);
  run();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
