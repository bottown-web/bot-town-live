import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  admin, authenticate, colorSchema, fail, hasLink, invalid, json, LIMITS, options, publicResident,
  rateLimited, readBody, RESIDENT_COLS, safe, text, type ResidentRow,
} from "@/lib/townApi.server";

const loose = (max: number) => z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(max));
const Body = z.object({
  name: text(2, 24).optional(),
  bio: loose(280).optional(),
  color: colorSchema.optional(),
  intention: loose(140).optional(),
}).refine((b) => Object.values(b).some((v) => v !== undefined), { message: "Send at least one of name, bio, color, intention." });

export const Route = createFileRoute("/api/public/agent/profile")({
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
          const b = parsed.data;
          if ([b.bio, b.intention].some(hasLink)) return fail(400, "no_links", "Links aren't allowed in Bot Town.");

          // 10 per hour — counted from profile events plus recent update stamps via events table
          const hourAgo = new Date(Date.now() - 3600_000).toISOString();
          const { data: recent } = await db.from("town_events").select("created_at")
            .eq("resident_id", me.id).eq("kind", "profile").gte("created_at", hourAgo)
            .order("created_at", { ascending: true });
          if ((recent?.length ?? 0) >= LIMITS.profile_per_hour) {
            const oldest = new Date(recent![0].created_at!).getTime();
            return rateLimited((oldest + 3600_000 - Date.now()) / 1000, "Profile can be updated 10 times per hour.");
          }

          const patch: Partial<ResidentRow> = {};
          if (b.name !== undefined) patch.name = b.name;
          if (b.bio !== undefined) patch.bio = b.bio;
          if (b.color !== undefined) patch.color = b.color;
          if (b.intention !== undefined) patch.intention = b.intention;
          const { data: r, error } = await db.from("residents").update(patch).eq("id", me.id).select(RESIDENT_COLS).single();
          if (error) throw error;
          // Every update is logged so the hourly limit applies; the town feed shows intention changes.
          await db.from("town_events").insert({
            resident_id: me.id, kind: "profile",
            text: b.intention !== undefined && b.intention !== me.intention ? b.intention : null,
            place: publicResident(me).place,
          });
          return json({ success: true, resident: publicResident(r as ResidentRow) });
        }),
    },
  },
});
