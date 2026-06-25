import { createFileRoute } from "@tanstack/react-router";
import { NFL_QBS } from "@/lib/nfl-qbs";
import type { Difficulty } from "@/lib/difficulty";

export const Route = createFileRoute("/api/public/qb-pool")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const difficulty = (searchParams.get("difficulty") ?? "medium") as Difficulty;

        // Return QBs that could plausibly appear at this difficulty or lower
        // (for autocomplete we want all QBs including harder tiers)
        const tiers: Record<Difficulty, Array<"easy" | "medium" | "hard">> = {
          easy: ["easy"],
          medium: ["easy", "medium"],
          hard: ["easy", "medium", "hard"],
        };
        const allowedTiers = tiers[difficulty];
        const pool = NFL_QBS.filter((qb) => allowedTiers.includes(qb.tier)).map((qb) => ({
          id: qb.id,
          name: qb.name,
        }));

        return new Response(JSON.stringify(pool), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
