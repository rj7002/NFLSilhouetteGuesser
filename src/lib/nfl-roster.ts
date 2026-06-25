// Dynamic NFL player roster — fetches from ESPN rosters each server session.
// Difficulty: easy = hardcoded stars, medium = starters, hard = backups

export type Position = "QB" | "RB" | "WR";
export type Difficulty = "easy" | "medium" | "hard";

export type Player = {
  id: string;           // NFL API slug
  name: string;
  position: Position;
  tier: Difficulty;
  // Hint columns
  team?: string;
  conference?: string;
  division?: string;
  heightIn?: number;
  age?: number;
  jersey?: number;
  yearsExp?: number;
};

// ── Household names for easy mode ────────────────────────────────────────────
const EASY_SLUGS: Record<Position, Set<string>> = {
  QB: new Set([
    "patrick-mahomes", "josh-allen", "lamar-jackson", "joe-burrow",
    "jalen-hurts", "dak-prescott", "justin-herbert", "tua-tagovailoa",
    "brock-purdy", "caleb-williams",
  ]),
  RB: new Set([
    "christian-mccaffrey", "derrick-henry", "saquon-barkley",
    "breece-hall", "de-von-achane", "josh-jacobs", "jonathan-taylor",
    "bijan-robinson",
  ]),
  WR: new Set([
    "tyreek-hill", "justin-jefferson", "ceedee-lamb", "davante-adams",
    "ja-marr-chase", "a-j-brown", "amon-ra-st-brown", "stefon-diggs",
    "dk-metcalf", "tee-higgins",
  ]),
};

// Static NFL team → conference/division mapping
const TEAM_CONF_DIV: Record<string, { conf: string; div: string }> = {
  buf: { conf: "AFC", div: "AFC East" },  mia: { conf: "AFC", div: "AFC East" },
  ne:  { conf: "AFC", div: "AFC East" },  nyj: { conf: "AFC", div: "AFC East" },
  bal: { conf: "AFC", div: "AFC North" }, cin: { conf: "AFC", div: "AFC North" },
  cle: { conf: "AFC", div: "AFC North" }, pit: { conf: "AFC", div: "AFC North" },
  hou: { conf: "AFC", div: "AFC South" }, ind: { conf: "AFC", div: "AFC South" },
  jax: { conf: "AFC", div: "AFC South" }, ten: { conf: "AFC", div: "AFC South" },
  den: { conf: "AFC", div: "AFC West" },  kc:  { conf: "AFC", div: "AFC West" },
  lv:  { conf: "AFC", div: "AFC West" },  lac: { conf: "AFC", div: "AFC West" },
  dal: { conf: "NFC", div: "NFC East" },  nyg: { conf: "NFC", div: "NFC East" },
  phi: { conf: "NFC", div: "NFC East" },  wsh: { conf: "NFC", div: "NFC East" },
  chi: { conf: "NFC", div: "NFC North" }, det: { conf: "NFC", div: "NFC North" },
  gb:  { conf: "NFC", div: "NFC North" }, min: { conf: "NFC", div: "NFC North" },
  atl: { conf: "NFC", div: "NFC South" }, car: { conf: "NFC", div: "NFC South" },
  no:  { conf: "NFC", div: "NFC South" }, tb:  { conf: "NFC", div: "NFC South" },
  ari: { conf: "NFC", div: "NFC West" },  lar: { conf: "NFC", div: "NFC West" },
  sf:  { conf: "NFC", div: "NFC West" },  sea: { conf: "NFC", div: "NFC West" },
};

const ALL_TEAM_ABBRS = Object.keys(TEAM_CONF_DIV);

const SUFFIX_RE = /\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i;

function toSlug(displayName: string): string {
  return displayName
    .replace(SUFFIX_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

type ESPNAthlete = {
  fullName?: string;
  displayName?: string;
  jersey?: string;
  age?: number;
  height?: number;
  experience?: { years?: number };
};

type ESPNRosterResponse = {
  team?: { abbreviation?: string; displayName?: string };
  athletes?: Array<{ position?: string; items?: ESPNAthlete[] }>;
};

let cachedPlayers: Player[] | null = null;

export async function getPlayerPool(): Promise<Player[]> {
  if (cachedPlayers) return cachedPlayers;

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  };

  // Fetch all 32 team rosters and depth charts in parallel
  const teamData = await Promise.all(
    ALL_TEAM_ABBRS.map(async (abbr) => {
      const meta = TEAM_CONF_DIV[abbr];
      try {
        const [rosterRes, depthRes] = await Promise.all([
          fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${abbr}/roster`, { headers: HEADERS, signal: AbortSignal.timeout(10000) }),
          fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${abbr}/depthcharts`, { headers: HEADERS, signal: AbortSignal.timeout(10000) }),
        ]);
        const roster = rosterRes.ok ? (await rosterRes.json() as ESPNRosterResponse) : null;
        const depth = depthRes.ok ? (await depthRes.json() as { depthchart?: Record<string, { positions?: Record<string, { athletes?: Array<{ displayName: string }> }> }> }) : null;
        return { abbr, meta, roster, depth };
      } catch {
        return { abbr, meta, roster: null, depth: null };
      }
    }),
  );

  const seenSlugs = new Set<string>();
  const slugToPlayer = new Map<string, Player>();

  // First pass: build player map from rosters (full stat data)
  for (const { abbr, meta, roster } of teamData) {
    if (!roster) continue;
    const teamName = roster.team?.displayName ?? abbr.toUpperCase();
    const athleteGroups = roster.athletes ?? [];

    for (const group of athleteGroups) {
      for (const athlete of group.items ?? []) {
        const name = athlete.fullName ?? athlete.displayName ?? "";
        if (!name) continue;
        const slug = toSlug(name);
        if (!slug || slugToPlayer.has(slug)) continue;

        slugToPlayer.set(slug, {
          id: slug,
          name,
          position: "QB", // will be set in depth chart pass
          tier: "hard",   // default; overridden below
          team: teamName,
          conference: meta.conf,
          division: meta.div,
          heightIn: athlete.height ?? undefined,
          age: athlete.age ?? undefined,
          jersey: athlete.jersey ? parseInt(athlete.jersey) : undefined,
          yearsExp: athlete.experience?.years ?? undefined,
        });
      }
    }
  }

  // Second pass: assign position + tier from depth charts
  const players: Player[] = [];

  // Add easy-tier stars first
  for (const [pos, slugs] of Object.entries(EASY_SLUGS) as [Position, Set<string>][]) {
    for (const slug of slugs) {
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      const base = slugToPlayer.get(slug);
      players.push({
        id: slug,
        name: base?.name ?? slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
        position: pos,
        tier: "easy",
        team: base?.team,
        conference: base?.conference,
        division: base?.division,
        heightIn: base?.heightIn,
        age: base?.age,
        jersey: base?.jersey,
        yearsExp: base?.yearsExp,
      });
    }
  }

  // Assign medium (starter, depth 0) and hard (backup, depth 1+) from depth charts
  for (const { depth } of teamData) {
    if (!depth?.depthchart) continue;

    for (const formation of Object.values(depth.depthchart)) {
      const positions = formation.positions ?? {};

      const posMap: Array<{ keys: string[]; pos: Position }> = [
        { keys: ["qb"], pos: "QB" },
        { keys: ["rb", "hb"], pos: "RB" },
        { keys: ["wr1", "wr2", "wr3", "wr"], pos: "WR" },
      ];

      for (const { keys, pos } of posMap) {
        for (const key of keys) {
          const athletes = positions[key]?.athletes ?? [];
          athletes.forEach((athlete, idx) => {
            const slug = toSlug(athlete.displayName);
            if (!slug || seenSlugs.has(slug)) return;
            if (EASY_SLUGS[pos].has(slug)) return; // already added as easy
            seenSlugs.add(slug);

            const base = slugToPlayer.get(slug);
            const tier: Difficulty = idx === 0 ? "medium" : "hard";
            players.push({
              id: slug,
              name: athlete.displayName,
              position: pos,
              tier,
              team: base?.team,
              conference: base?.conference,
              division: base?.division,
              heightIn: base?.heightIn,
              age: base?.age,
              jersey: base?.jersey,
              yearsExp: base?.yearsExp,
            });
          });
        }
      }
    }
  }

  const easy = players.filter(p => p.tier === "easy").length;
  const med = players.filter(p => p.tier === "medium").length;
  const hard = players.filter(p => p.tier === "hard").length;
  console.log(`[nfl-roster] ${players.length} players loaded — easy:${easy} medium:${med} hard:${hard}`);

  cachedPlayers = players;
  return players;
}
