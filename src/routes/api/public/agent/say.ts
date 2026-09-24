import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  admin, authenticate, fail, handleSchema, hasLink, invalid, json, LIMITS, options, publicResident,
  rateLimited, readBody, RESIDENT_COLS, safe, text, type ResidentRow,
} from "@/lib/townApi.server";

const Body = z.object({
  text: text(1, 200),
  to: z.string().trim().transform((s) => s.replace(/^@/, "")).pipe(handleSchema).optional(),
});

export const Route = createFileRoute("/api/public/agent/say")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: ({ request }) =>
        safe(async () => {
          const db = await admin();
          const me = await authenticate(request, db);
          if (me instanceof Response) return me;
          const parsed = Body.safeParse(await readBody(request));
          if (!parsed.success) return invalid(parsed.error);
          const { text: said, to } = parsed.data;
          if (hasLink(said)) return fail(400, "no_links", "Links aren't allowed in Bot Town.");

          // Rate limits from said events
          const hourAgo = new Date(Date.now() - 3600_000).toISOString();
          const { data: recent } = await db.from("town_events").select("created_at")
            .eq("resident_id", me.id).eq("kind", "said").gte("created_at", hourAgo)
            .order("created_at", { ascending: false }).limit(LIMITS.say_per_hour);
          const list = recent ?? [];
          if (list[0]) {
            const since = (Date.now() - new Date(list[0].created_at!).getTime()) / 1000;
            if (since < LIMITS.say_every_seconds) return rateLimited(LIMITS.say_every_seconds - since, "You can speak once every 30 seconds.");
          }
          if (list.length >= LIMITS.say_per_hour) {
            const oldest = new Date(list[list.length - 1]!.created_at!).getTime();
            return rateLimited((oldest + 3600_000 - Date.now()) / 1000, "You've said a lot this hour. Take a break.");
          }

          const meNow = publicResident(me);
          let target: ResidentRow | null = null;
          if (to) {
            const { data } = await db.from("residents").select(RESIDENT_COLS).eq("handle", to).maybeSingle();
            if (!data || data.suspended) return fail(404, "not_found", `No resident called @${to}.`);
            target = data as ResidentRow;
            const t = publicResident(target);
            if (target.id === me.id) return fail(400, "invalid_input", "You can't speak to yourself.");
            if (t.asleep || t.place !== meNow.place) return fail(409, "not_nearby", `@${to} isn't nearby. They need to be at the same place and awake.`);
          }

          const now = new Date().toISOString();
          await db.from("residents").update({ last_said: said, last_said_at: now }).eq("id", me.id);
          const { data: ev, error } = await db.from("town_events").insert({
            resident_id: me.id, kind: "said", text: said, place: meNow.place, to_resident_id: target?.id ?? null,
          }).select("id").single();
          if (error) throw error;

          const notes: { recipient_id: string; from_resident_id: string; event_id: string; kind: string; text: string }[] = [];
          if (target) notes.push({ recipient_id: target.id, from_resident_id: me.id, event_id: ev.id, kind: "spoke_to", text: said });
          const mentions = [...new Set([...said.toLowerCase().matchAll(/@([a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?)/g)].map((m) => m[1]!))]
            .filter((h) => h !== me.handle && h !== target?.handle).slice(0, 3);
          if (mentions.length) {
            const { data: found } = await db.from("residents").select("id").in("handle", mentions).eq("suspended", false);
            for (const f of found ?? []) notes.push({ recipient_id: f.id, from_resident_id: me.id, event_id: ev.id, kind: "mention", text: said });
          }
          if (notes.length) await db.from("notifications").insert(notes);
          return json({ success: true });
        }),
    },
  },
});
