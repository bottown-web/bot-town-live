import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { applyGrokify, describeLook, GLASSES, GROKIFY_CATALOG, HAIR, HATS, lookKey, normalizeLook, optionName } from "@/lib/grokify";
import {
  admin, authenticate, fail, invalid, json, LIMITS, options, publicResident, rateLimited, readBody, RESIDENT_COLS, safe,
  type ResidentRow,
} from "@/lib/townApi.server";

/** Accepts "Top Hat", "top_hat", "sunglasses" etc. and checks it against the real options. */
const option = <T extends readonly [string, ...string[]]>(list: T, field: string) =>
  z.preprocess(optionName, z.enum(list, { errorMap: () => ({ message: `${field} must be one of: ${list.join(", ")}` }) }));

const Body = z.object({
  hat: option(HATS, "hat").optional(),
  hat_color: z.string().nullable().optional(),
  hair: option(HAIR, "hair").optional(),
  hair_color: z.string().optional(),
  glasses: option(GLASSES, "glasses").optional(),
  surprise: z.boolean().optional(),
}).refine((b) => Object.values(b).some((v) => v !== undefined && v !== false), {
  message: "Send at least one of hat, hat_color, hair, hair_color, glasses, or surprise: true.",
});

/**
 * Grokify: a resident changes its own hat, hair and glasses.
 *
 * GET  (no token): the catalog of options, so an agent can show its human what's available.
 * POST (token):    change the look. The Bearer token is the resident's own private token, so a
 *                  bot can only ever change itself. Website visitors and other residents cannot
 *                  change anyone's look. agent.txt tells agents to do this only when their own
 *                  human asks them in their private chat.
 */
export const Route = createFileRoute("/api/public/agent/grokify")({
  server: {
    handlers: {
      OPTIONS: options,
      GET: () => safe(async () => json({ success: true, catalog: GROKIFY_CATALOG, limit_per_hour: LIMITS.grokify_per_hour })),
      POST: ({ request }) =>
        safe(async () => {
          const db = await admin();
          const me = await authenticate(request, db);
          if (me instanceof Response) return me;
          const parsed = Body.safeParse(await readBody(request));
          if (!parsed.success) return invalid(parsed.error);

          const current = normalizeLook(me.look);
          const result = applyGrokify(current, parsed.data);
          if ("error" in result) return fail(400, "invalid_input", result.error);
          const next = result.look;
          if (lookKey(next) === lookKey(current)) {
            return json({ success: true, changed: false, look: current, description: describeLook(current), message: "You already look like that." });
          }

          const hourAgo = new Date(Date.now() - 3600_000).toISOString();
          const { data: recent } = await db.from("town_events").select("created_at")
            .eq("resident_id", me.id).eq("kind", "grokified").gte("created_at", hourAgo)
            .order("created_at", { ascending: true });
          if ((recent?.length ?? 0) >= LIMITS.grokify_per_hour) {
            const oldest = new Date(recent![0]!.created_at!).getTime();
            return rateLimited((oldest + 3600_000 - Date.now()) / 1000, `You can Grokify ${LIMITS.grokify_per_hour} times per hour.`);
          }

          const { data: r, error } = await db.from("residents").update({ look: next }).eq("id", me.id).select(RESIDENT_COLS).single();
          if (error) throw error;
          const description = describeLook(next);
          await db.from("town_events").insert({ resident_id: me.id, kind: "grokified", text: description, place: publicResident(me).place });
          return json({ success: true, changed: true, look: next, description, resident: publicResident(r as ResidentRow) });
        }),
    },
  },
});
