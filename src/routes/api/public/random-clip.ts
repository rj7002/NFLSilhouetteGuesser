import { createFileRoute } from "@tanstack/react-router";
import { getPlayerPool, type Position } from "@/lib/nfl-roster";
import { getNFLToken, getAllClipsForPlayer, getSignedUrl } from "@/lib/nfl-api";
import type { Difficulty } from "@/lib/difficulty";

function proxyUrl(origin: string, nflUrl: string): string {
  return `${origin}/api/public/clip?u=${encodeURIComponent(nflUrl)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type RandomClipResponse = {
  answer: { id: string; name: string; position: Position; tier: Difficulty };
  playerPool: Array<{ id: string; name: string }>;
  clipUrl: string;
};

export const Route = createFileRoute("/api/public/random-clip")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams, origin } = new URL(request.url);
        const difficulty = (searchParams.get("difficulty") ?? "medium") as Difficulty;
        const position = (searchParams.get("position") ?? "QB") as Position;

        const allPlayers = await getPlayerPool();

        const tierOrder: Difficulty[] = ["easy", "medium", "hard"];
        const tierIndex = tierOrder.indexOf(difficulty);
        const poolTiers = tierOrder.slice(0, tierIndex + 1);

        const playerPool = allPlayers
          .filter((p) => p.position === position && poolTiers.includes(p.tier))
          .map((p) => ({ id: p.id, name: p.name }));

        const candidates = allPlayers.filter(
          (p) => p.position === position && p.tier === difficulty,
        );

        if (!candidates.length) {
          return new Response(JSON.stringify({ error: "No players for this position/difficulty" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let token: string;
        try {
          token = await getNFLToken();
        } catch (e) {
          console.error("[random-clip] Failed to get NFL token:", e);
          return new Response(
            JSON.stringify({ error: "Could not authenticate with NFL API — try again shortly" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        for (let attempt = 0; attempt < Math.min(5, shuffled.length); attempt++) {
          const player = shuffled[attempt];
          console.log(`[random-clip] Trying ${position}: ${player.name} (${player.id})`);

          try {
            const clips = await getAllClipsForPlayer(player.id, token, position);
            if (!clips.length) {
              console.log(`[random-clip] No clips for ${player.name}`);
              continue;
            }

            const clip = pick(clips);
            console.log(`[random-clip] Got clip: "${clip.title}" for ${player.name}`);

            const signedUrl = await getSignedUrl(clip, token);
            const clipUrl = proxyUrl(origin, signedUrl);

            return new Response(
              JSON.stringify({ answer: player, playerPool, clipUrl } satisfies RandomClipResponse),
              { headers: { "Content-Type": "application/json" } },
            );
          } catch (e) {
            console.warn(`[random-clip] attempt ${attempt + 1} failed for ${player.name}:`, e);
          }
        }

        return new Response(
          JSON.stringify({ error: "Could not find a playable clip — try again" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
