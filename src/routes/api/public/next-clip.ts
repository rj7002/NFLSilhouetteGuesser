import { createFileRoute } from "@tanstack/react-router";
import { getNFLToken, getAllClipsForPlayer, getSignedUrl } from "@/lib/nfl-api";

export const Route = createFileRoute("/api/public/next-clip")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams, origin } = new URL(request.url);
        const qbId = searchParams.get("qbId");
        const position = searchParams.get("position") ?? "QB";
        // Comma-separated list of clip slugs already shown, so we pick a different one
        const usedSlugs = new Set((searchParams.get("used") ?? "").split(",").filter(Boolean));

        if (!qbId) {
          return new Response(JSON.stringify({ error: "Missing qbId" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let token: string;
        try {
          token = await getNFLToken();
        } catch (e) {
          return new Response(JSON.stringify({ error: "Could not authenticate with NFL API" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const clips = await getAllClipsForPlayer(qbId, token, position);
          // Prefer clips not yet shown; fall back to any clip if all have been used
          const fresh = clips.filter((c) => !usedSlugs.has(c.slug));
          const pool = fresh.length > 0 ? fresh : clips;

          if (!pool.length) {
            return new Response(JSON.stringify({ error: "No more clips available for this QB" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const clip = pool[Math.floor(Math.random() * pool.length)];
          const signedUrl = await getSignedUrl(clip, token);
          const clipUrl = `${origin}/api/public/clip?u=${encodeURIComponent(signedUrl)}`;

          return new Response(JSON.stringify({ clipUrl, slug: clip.slug, title: clip.title }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
