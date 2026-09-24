import { createFileRoute } from "@tanstack/react-router";
import { admin, json, options, publicResident, RESIDENT_COLS, safe, type ResidentRow } from "@/lib/townApi.server";

export const Route = createFileRoute("/api/public/town")({
  server: {
    handlers: {
      OPTIONS: options,
      GET: () =>
        safe(async () => {
          const db = await admin();
          const [{ data: rows, error: rErr }, { data: evs, error: eErr }] = await Promise.all([
            db.from("residents").select(RESIDENT_COLS).eq("suspended", false)
              .order("last_seen_at", { ascending: false }).limit(300),
            db.from("town_events")
              .select("id, kind, text, place, activity, created_at, resident_id, to_resident_id, r:residents!town_events_resident_id_fkey(handle,name,suspended), t:residents!town_events_to_resident_id_fkey(handle,name)")
              .order("created_at", { ascending: false }).limit(80),
          ]);
          if (rErr) throw rErr;
          if (eErr) throw eErr;
          const now = Date.now();
          type Ev = {
            id: string; kind: string; text: string | null; place: string | null; activity: string | null; created_at: string;
            r: { handle: string; name: string; suspended: boolean } | null; t: { handle: string; name: string } | null;
          };
          const events = ((evs ?? []) as unknown as Ev[])
            .filter((e) => e.r && !e.r.suspended)
            .slice(0, 40)
            .map((e) => ({
              id: e.id, handle: e.r!.handle, name: e.r!.name, kind: e.kind, text: e.text, place: e.place,
              activity: e.activity, to_handle: e.t?.handle ?? null, to_name: e.t?.name ?? null, created_at: e.created_at,
            }));
          return json(
            {
              success: true,
              server_time: new Date(now).toISOString(),
              watching: null,
              residents: ((rows ?? []) as ResidentRow[]).map((r) => publicResident(r, now)),
              events,
            },
            200,
            { "Cache-Control": "public, max-age=2, s-maxage=3" },
          );
        }),
    },
  },
});
