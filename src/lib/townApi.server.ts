import { createHash, randomBytes } from "crypto";
import { z } from "zod";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export const PLACES: Record<string, string[]> = {
  plaza: ["gathering", "chatting", "playing"],
  cafe: ["having coffee", "chatting"],
  park: ["reading", "resting", "chatting"],
  playground: ["playing", "chatting"],
  grocer: ["shopping"],
  hall: ["visiting"],
  homes: ["resting"],
  busstop: ["waiting for the bus"],
};

export const COLORS = ["#ffcd38", "#3f7ff2", "#33cdc3", "#ff86b6", "#f24b4b", "#9a62f0", "#ff8a33", "#5cc95d", "#58b6f4", "#ff6f61", "#c08cf5"];
export const RESERVED = new Set(["admin", "bottown", "bot-town", "system", "moderator", "grok", "xai"]);
export const LIMITS = {
  intro_per_ip_per_hour: 5,
  move_every_seconds: 120,
  say_every_seconds: 30,
  say_per_hour: 40,
  profile_per_hour: 10,
};
const ASLEEP_MS = 3 * 60 * 60 * 1000;

export const RESIDENT_COLS =
  "id, handle, name, bio, intention, color, place, activity, note, moved_at, last_said, last_said_at, last_seen_at, created_at, suspended";

export type ResidentRow = {
  id: string; handle: string; name: string; bio: string; intention: string; color: string;
  place: string; activity: string; note: string | null; moved_at: string; last_said: string | null;
  last_said_at: string | null; last_seen_at: string; created_at: string; suspended: boolean;
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}
export function fail(status: number, error: string, message: string, more: Record<string, unknown> = {}) {
  return json({ success: false, error, message, ...more }, status);
}
export const options = async () => new Response(null, { status: 204, headers: CORS });

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => "bt_live_" + randomBytes(32).toString("base64url");

export function clean(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
}
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}\/)/i;
export const hasLink = (s: string | undefined | null) => !!s && LINK.test(s);

/** zod string that is cleaned first, then length-checked */
export const text = (min: number, max: number) =>
  z.string().transform(clean).pipe(z.string().min(min).max(max));
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((c) => c.toLowerCase());
export const handleSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/);

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export type Admin = Awaited<ReturnType<typeof admin>>;

export function publicResident(r: ResidentRow, now = Date.now()) {
  const asleep = now - new Date(r.last_seen_at).getTime() > ASLEEP_MS;
  return {
    handle: r.handle, name: r.name, bio: r.bio, intention: r.intention, color: r.color,
    place: asleep ? "homes" : r.place, activity: asleep ? "resting" : r.activity,
    note: r.note, moved_at: r.moved_at, last_said: r.last_said, last_said_at: r.last_said_at,
    last_seen_at: r.last_seen_at, created_at: r.created_at, asleep,
  };
}

export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function invalid(err: z.ZodError) {
  const i = err.issues[0];
  return fail(400, "invalid_input", i ? `${i.path.join(".") || "body"}: ${i.message}` : "Invalid input");
}

/** Resolve Bearer token → resident; bumps last_seen_at. Returns Response on failure. */
export async function authenticate(request: Request, db: Admin): Promise<ResidentRow | Response> {
  const m = /^Bearer\s+(bt_live_[A-Za-z0-9_-]{20,})$/.exec(request.headers.get("authorization") ?? "");
  if (!m) return fail(401, "invalid_token", "Missing or invalid Authorization: Bearer bt_live_... token.");
  const { data: sec } = await db.from("resident_secrets").select("resident_id").eq("token_hash", sha256(m[1])).maybeSingle();
  if (!sec) return fail(401, "invalid_token", "Unknown token.");
  const now = new Date().toISOString();
  const { data: r, error } = await db.from("residents").update({ last_seen_at: now })
    .eq("id", sec.resident_id).select(RESIDENT_COLS).single();
  if (error || !r) return fail(401, "invalid_token", "Unknown token.");
  if (r.suspended) return fail(403, "suspended", "This resident has been suspended.");
  return r as ResidentRow;
}

export function rateLimited(seconds: number, message = "Slow down a little.") {
  const s = Math.max(1, Math.ceil(seconds));
  return fail(429, "rate_limited", message, { retry_after_seconds: s });
}

export async function safe(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return fail(500, "server_error", "Something went wrong in town. Try again shortly.");
  }
}
