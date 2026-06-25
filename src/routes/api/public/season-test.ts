import { createFileRoute } from "@tanstack/react-router";
import { getNFLToken, getQBClips } from "@/lib/nfl-api";

export const Route = createFileRoute("/api/public/season-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug") ?? "patrick-mahomes";
        const position = searchParams.get("position") ?? "QB";

        const token = await getNFLToken();
        const results: Record<string, number> = {};

        for (const season of [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015]) {
          try {
            const clips = await getQBClips(slug, season, token, position);
            results[season] = clips.length;
            console.log(`[season-test] ${slug} ${season}: ${clips.length} clips`);
          } catch (e) {
            results[season] = -1;
            console.log(`[season-test] ${slug} ${season}: error - ${e}`);
          }
        }

        return new Response(JSON.stringify({ slug, results }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
