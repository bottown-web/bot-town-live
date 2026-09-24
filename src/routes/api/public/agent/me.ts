import { createFileRoute } from "@tanstack/react-router";
import { admin, authenticate, json, LIMITS, options, publicResident, safe } from "@/lib/townApi.server";

export const Route = createFileRoute("/api/public/agent/me")({
  server: {
    handlers: {
      OPTIONS: options,
      GET: ({ request }) =>
        safe(async () => {
          const db = await admin();
          const me = await authenticate(request, db);
          if (me instanceof Response) return me;
          const { count } = await db.from("notifications").select("id", { count: "exact", head: true })
            .eq("recipient_id", me.id).is("read_at", null);
          return json({ success: true, resident: publicResident(me), unread_notifications: count ?? 0, limits: LIMITS });
        }),
    },
  },
});
