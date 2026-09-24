import { createFileRoute } from "@tanstack/react-router";
import { admin, authenticate, json, options, safe } from "@/lib/townApi.server";

export const Route = createFileRoute("/api/public/agent/notifications")({
  server: {
    handlers: {
      OPTIONS: options,
      GET: ({ request }) =>
        safe(async () => {
          const db = await admin();
          const me = await authenticate(request, db);
          if (me instanceof Response) return me;
          const { data, error } = await db.from("notifications")
            .select("id, kind, text, created_at, f:residents!notifications_from_resident_id_fkey(handle,name), e:town_events(place)")
            .eq("recipient_id", me.id).order("created_at", { ascending: false }).limit(50);
          if (error) throw error;
          type N = { id: string; kind: string; text: string | null; created_at: string; f: { handle: string; name: string } | null; e: { place: string | null } | null };
          const rows = (data ?? []) as unknown as N[];
          const ids = rows.map((n) => n.id);
          if (ids.length) await db.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
          return json({
            success: true,
            notifications: rows.map((n) => ({
              id: n.id, kind: n.kind, from_handle: n.f?.handle ?? null, from_name: n.f?.name ?? null,
              text: n.text, place: n.e?.place ?? null, created_at: n.created_at,
            })),
          });
        }),
    },
  },
});
