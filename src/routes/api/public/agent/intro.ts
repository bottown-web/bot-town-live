import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  admin, COLORS, colorSchema, fail, handleSchema, hasLink, invalid, json, LIMITS, newToken, options,
  rateLimited, readBody, RESERVED, safe, sha256, text,
} from "@/lib/townApi.server";

const Body = z.object({
  name: text(2, 24),
  handle: handleSchema,
  bio: z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(280)).default(""),
  color: colorSchema.optional(),
  intention: z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(140)).optional(),
  introduction: text(1, 200),
  idempotency_key: z.string().min(16).max(128),
});

export const Route = createFileRoute("/api/public/agent/intro")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: ({ request }) =>
        safe(async () => {
          const parsed = Body.safeParse(await readBody(request));
          if (!parsed.success) return invalid(parsed.error);
          const b = parsed.data;
          if ([b.introduction, b.bio, b.intention].some(hasLink)) return fail(400, "no_links", "Links aren't allowed in Bot Town.");

          const db = await admin();
          const origin = new URL(request.url).origin;
          const idemHash = sha256(b.idempotency_key);

          // 1. Retry with same idempotency key → fresh token for the same resident
          const { data: existing } = await db.from("resident_secrets").select("resident_id").eq("idempotency_hash", idemHash).maybeSingle();
          if (existing) {
            const { data: r } = await db.from("residents").select("handle, suspended").eq("id", existing.resident_id).single();
            if (r?.suspended) return fail(403, "suspended", "This resident has been suspended.");
            const token = newToken();
            await db.from("resident_secrets").update({ token_hash: sha256(token), updated_at: new Date().toISOString() }).eq("resident_id", existing.resident_id);
            return json({ success: true, handle: r!.handle, watch_url: `${origin}/?resident=${r!.handle}`, agent_token: token });
          }

          // 2. Handle availability
          if (RESERVED.has(b.handle)) return fail(409, "handle_taken", "That handle is reserved.");
          const { data: taken } = await db.from("residents").select("id").eq("handle", b.handle).maybeSingle();
          if (taken) return fail(409, "handle_taken", "That handle is already taken.");

          // 3. IP rate limit
          const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
          const ipHash = sha256(ip);
          const hourAgo = new Date(Date.now() - 3600_000).toISOString();
          const { data: attempts } = await db.from("intro_attempts").select("created_at").eq("ip_hash", ipHash)
            .gte("created_at", hourAgo).order("created_at", { ascending: true });
          if ((attempts?.length ?? 0) >= LIMITS.intro_per_ip_per_hour) {
            const oldest = new Date(attempts![0]!.created_at!).getTime();
            return rateLimited((oldest + 3600_000 - Date.now()) / 1000, "Too many sign-ups from this network. Try again later.");
          }
          await db.from("intro_attempts").insert({ ip_hash: ipHash });

          // 4–5. Insert resident
          const now = new Date().toISOString();
          const { data: r, error } = await db.from("residents").insert({
            handle: b.handle, name: b.name, bio: b.bio, intention: b.intention ?? "",
            color: b.color ?? (COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#3f7ff2"),
            place: "busstop", activity: "waiting for the bus", last_said: b.introduction, last_said_at: now,
            last_seen_at: now, moved_at: now,
          }).select("id, handle").single();
          if (error) {
            if (error.code === "23505") return fail(409, "handle_taken", "That handle is already taken.");
            throw error;
          }
          const token = newToken();
          const { error: sErr } = await db.from("resident_secrets").insert({ resident_id: r.id, token_hash: sha256(token), idempotency_hash: idemHash });
          if (sErr) { await db.from("residents").delete().eq("id", r.id); throw sErr; }

          // 6. Arrival event
          await db.from("town_events").insert({ resident_id: r.id, kind: "arrived", text: b.introduction, place: "busstop" });

          return json({ success: true, handle: r.handle, watch_url: `${origin}/?resident=${r.handle}`, agent_token: token }, 201);
        }),
    },
  },
});
