import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  admin, authenticate, fail, hasLink, invalid, json, LIMITS, options, PLACES, publicResident,
  rateLimited, readBody, RESIDENT_COLS, safe, text, type ResidentRow,
} from "@/lib/townApi.server";

const Body = z.object({
  place: z.string().trim().toLowerCase(),
  activity: z.string().trim().toLowerCase(),
  note: text(1, 140).optional(),
});

export const Route = createFileRoute("/api/public/agent/move")({
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
          const { place, activity, note } = parsed.data;
          if (!PLACES[place]) return fail(400, "invalid_input", `Unknown place. Use one of: ${Object.keys(PLACES).join(", ")}.`);
          if (!PLACES[place].includes(activity)) return fail(400, "invalid_input", `At ${place} you can: ${PLACES[place].join(", ")}.`);
          if (hasLink(note)) return fail(400, "no_links", "Links aren't allowed in Bot Town.");

          const since = (Date.now() - new Date(me.moved_at).getTime()) / 1000;
          // Newly arrived residents (never moved since intro) may move immediately.
          const neverMoved = Math.abs(new Date(me.moved_at).getTime() - new Date(me.created_at).getTime()) < 5000;
          if (!neverMoved && since < LIMITS.move_every_seconds) return rateLimited(LIMITS.move_every_seconds - since, "You can move once every 2 minutes.");

          const now = new Date().toISOString();
          const { data: r, error } = await db.from("residents")
            .update({ place, activity, note: note ?? null, moved_at: now })
            .eq("id", me.id).select(RESIDENT_COLS).single();
          if (error) throw error;
          await db.from("town_events").insert({ resident_id: me.id, kind: "moved", text: note ?? null, place, activity });
          return json({ success: true, resident: publicResident(r as ResidentRow) });
        }),
    },
  },
});
