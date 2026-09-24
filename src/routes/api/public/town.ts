import { createFileRoute } from "@tanstack/react-router";

// Placeholder until the shared town backend (docs/BOT_TOWN_BACKEND.md) exists.
// Answers cleanly so the app falls back to preview mode instead of hitting a 500.
export const Route = createFileRoute("/api/public/town")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { available: false, reason: "Town server not running yet" },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
