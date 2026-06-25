import { createFileRoute } from "@tanstack/react-router";
import { NFL_QBS } from "@/lib/nfl-qbs";
import { getNFLToken, getClipsByPlayerTag } from "@/lib/nfl-api";

export const Route = createFileRoute("/api/public/clip-count")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const qbId = searchParams.get("qbId"); // optional — omit to check all

        const token = await getNFLToken();

        const targets = qbId
          ? NFL_QBS.filter((q) => q.id === qbId)
          : NFL_QBS;

        const results: Array<{ id: string; name: string; tier: string; clips: number }> = [];

        for (const qb of targets) {
          try {
            const clips = await getClipsByPlayerTag(qb.id, token);
            results.push({ id: qb.id, name: qb.name, tier: qb.tier, clips: clips.length });
            console.log(`[clip-count] ${qb.name}: ${clips.length} passing clips`);
          } catch {
            results.push({ id: qb.id, name: qb.name, tier: qb.tier, clips: -1 });
          }
        }

        results.sort((a, b) => b.clips - a.clips);

        return new Response(JSON.stringify(results, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
