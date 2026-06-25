// NFL API helpers — server-side only (uses Playwright for auth token)
// Never import this file from client components.

export type Clip = {
  title: string;
  slug: string;
  mcpID: string | null;
  week?: string;
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

// ---------- Token cache (valid ~4h) ----------
let cachedToken: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 4 * 60 * 60_000; // 4 hours

// ---------- Per-player clip cache (lasts entire server session) ----------
const clipCache = new Map<string, Clip[]>();

async function fetchTokenViaPlaywright(): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let token: string | null = null;

  page.on("response", async (response) => {
    if (response.url().includes("identity") && response.url().includes("token")) {
      try {
        const body = (await response.json()) as Record<string, unknown>;
        if (typeof body.accessToken === "string") {
          token = body.accessToken;
        }
      } catch {
        // ignore parse errors
      }
    }
  });

  await page.goto("https://www.nfl.com/videos/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);
  await browser.close();

  if (!token) throw new Error("Could not obtain NFL auth token from Playwright");
  return token;
}

export async function getNFLToken(forceRefresh = false): Promise<string> {
  if (cachedToken && !forceRefresh && Date.now() - cachedToken.at < TOKEN_TTL_MS) {
    return cachedToken.value;
  }
  console.log("[nfl-api] Fetching NFL auth token via Playwright...");
  const value = await fetchTokenViaPlaywright();
  cachedToken = { value, at: Date.now() };
  console.log("[nfl-api] Token obtained and cached.");
  return value;
}

// ---------- Get signed HLS URL for a clip ----------
export async function getSignedUrl(clip: Clip, token: string): Promise<string> {
  let mcpID = clip.mcpID;

  // Fallback: scrape mcpID from clip page
  if (!mcpID && clip.slug) {
    const res = await fetch(`https://www.nfl.com/videos/${clip.slug}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const s of scripts) {
      if (s.includes("mcpID") && s.includes("playlist")) {
        try {
          const pl = JSON.parse(s).playlist as Array<{ mcpID?: string | number }>;
          if (pl?.[0]?.mcpID) {
            mcpID = String(pl[0].mcpID);
            break;
          }
        } catch {
          // not JSON
        }
      }
    }
  }

  if (!mcpID) throw new Error(`Could not find mcpID for clip: ${clip.slug}`);

  const body = {
    asset: { mcpID: String(mcpID), slug: clip.slug, videoSource: "nfl.com" },
    autoplay: true,
    init: true,
    live: false,
  };

  let resp = await fetch(`https://api.nfl.com/play/v1/asset/${mcpID}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "*/*",
      Referer: "https://www.nfl.com/",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (resp.status === 401) {
    const freshToken = await getNFLToken(true);
    resp = await fetch(`https://api.nfl.com/play/v1/asset/${mcpID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${freshToken}`,
        "Content-Type": "application/json",
        Accept: "*/*",
        Referer: "https://www.nfl.com/",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  }

  if (!resp.ok) throw new Error(`NFL play API returned ${resp.status}`);
  const data = (await resp.json()) as { accessUrl?: string };
  if (!data.accessUrl) throw new Error("No accessUrl in NFL play API response");
  return data.accessUrl;
}

// ---------- Play-type filters by position ----------
const BLOCK_KEYWORDS = [
  "best plays", "highlights", "press conference", "interview", "insiders",
  "gmfb", "good morning football", "nfl now", "top 5", "top five",
  "reasons why", "nfl total access", "nfl gameday", "nfl network",
  "mic'd up", "mic'd", "hard knocks", "sound fx", "training camp",
  "minicamp", "ota", "contract", "extension", "trade", "draft",
  "workout", "combine", "injury", "update", "nfl films", "classic",
  "throwback", "career", "week in review", "game recap", "analysis",
  "preview", "prediction", "breakdown", "watch:", "listen:", "podcast",
  "get ready", "what to watch", "keys to the game", "game of the week",
  "sunday night football", "monday night football", "thursday night football",
  " snf ", " mnf ", " tnf ", "nfl on ", "tonight on", "tune in",
  "must-see", "must see", "don't miss", "don't miss",
  "nfl films", "nfl 360", "nfl rewind", "nfl turning point",
  "mic check", "did you know", "game plan", "matchup",
];

// QB clips must positively match a passing keyword — titles are QB-centric so this works well.
// WR/RB clips are already player-tagged, so just block non-game content; don't require keywords.
const QB_KEYWORDS = [
  "pass", "throw", "touchdown pass", "td pass", "completion", "completes",
  "connects", "finds", "fires", "airs", "aerial", "strike", "yard gain",
  "yard td", "-yard td", "catch", "reception", "pinpoints", "targets",
];

const QB_BLOCKS = [" rush", "rushing", " run ", " runs ", "scramble", "scrambles", "screen", "screens", "screen pass"];

// Minimum yards for a play to be included (filters short TDs, checkdowns, etc.)
const MIN_YARDS = 10;

// Short TD punch-ins / goal-line stuff — RB and WR specific
const SHORT_TD_KEYWORDS = [
  "plunges", "punches", "pushes", "barrels", "powers", "dives",
  "leaps", "sneaks", "quarterback sneak", "goal line", "goal-line",
  "1-yard td", "2-yard td", "1 yard td", "2 yard td",
];

// Block incomplete passes and no-gain plays
const NEGATIVE_PLAY_KEYWORDS = [
  "incomplete", "incompletion", "no gain", "loss of", "sacked", "sack",
  "false start", "penalty", "interception", "intercepted", "fumble",
];

function extractYards(title: string): number | null {
  // Match patterns like "41-yard", "41 yard", "41 yards"
  const m = title.match(/\b(\d+)[\s-]yard/i);
  return m ? parseInt(m[1], 10) : null;
}

// Video channels that are clearly game-play content
const GAME_CHANNELS = new Set([
  "game-highlights-vc",
  "plays-vc",
  "top-plays-vc",
]);

// Video channels that are talk shows / studio content — always block
const BLOCKED_CHANNELS = new Set([
  "good-morning-football-vc",
  "nfl-now-vc",
  "nfl-total-access-vc",
  "nfl-gameday-vc",
  "nfl-network-vc",
  "around-the-nfl-vc",
  "nfl-fantasy-live-vc",
  "nfl-360-vc",
  "the-pivot-vc",
  "path-to-the-draft-vc",
  "nfl-turning-point-vc",
]);

function isPlayForPosition(
  title: string,
  position: string,
  tags: Array<{ slug?: string; externalSourceName?: string }>,
): boolean {
  const t = title.toLowerCase();

  // Block studio/talk-show video channels
  const channelSlugs = tags
    .filter((tag) => tag.externalSourceName === "customentity.videochannel")
    .map((tag) => tag.slug ?? "");
  if (channelSlugs.some((s) => BLOCKED_CHANNELS.has(s))) return false;

  if (BLOCK_KEYWORDS.some((kw) => t.includes(kw))) return false;
  if (NEGATIVE_PLAY_KEYWORDS.some((kw) => t.includes(kw))) return false;

  // If a yardage is mentioned, require it to meet the minimum
  const yards = extractYards(t);
  if (yards !== null && yards < MIN_YARDS) return false;

  if (position === "QB") {
    if (QB_BLOCKS.some((kw) => t.includes(kw))) return false;
    return QB_KEYWORDS.some((kw) => t.includes(kw));
  }

  // WR/RB: filter out short TD punch-ins
  if (SHORT_TD_KEYWORDS.some((kw) => t.includes(kw))) return false;
  return true;
}

type GameItem = {
  title?: string;
  slug?: string;
  mcpPlaybackId?: string | null;
  tags?: Array<{ slug?: string; externalSourceName?: string }>;
};

// ---------- Get clips tagged with a player slug for one season ----------
// Scans ALL games each week in parallel — no team lookup needed, works across team changes.
export async function getQBClips(playerSlug: string, season: number, token: string, position = "QB"): Promise<Clip[]> {
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "User-Agent": HEADERS["User-Agent"],
  };

  // Build list of all (seasonType, week) combos to scan
  const weekJobs: Array<{ seasonType: number; week: number; stype: string }> = [];
  for (const seasonType of [2, 3]) {
    const maxWeek = seasonType === 2 ? 19 : 5;
    const stype = seasonType === 2 ? "reg" : "post";
    for (let week = 1; week < maxWeek; week++) {
      weekJobs.push({ seasonType, week, stype });
    }
  }

  // Fetch all weeks in parallel
  const weekClips = await Promise.all(
    weekJobs.map(async ({ seasonType, week, stype }) => {
      // Step 1: get game tags from ESPN scoreboard
      let gameTags: string[] = [];
      try {
        const espnUrl =
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
          `?seasontype=${seasonType}&week=${week}&dates=${season}`;
        const r = await fetch(espnUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!r.ok) return [];
        const data = (await r.json()) as {
          events?: Array<{
            competitions?: Array<{
              competitors?: Array<{ homeAway: string; team: { displayName: string } }>;
            }>;
          }>;
        };
        for (const e of data.events ?? []) {
          const comp = e.competitions?.[0];
          if (!comp?.competitors) continue;
          const home = comp.competitors.find((t) => t.homeAway === "home")?.team.displayName;
          const away = comp.competitors.find((t) => t.homeAway === "away")?.team.displayName;
          if (!home || !away) continue;
          gameTags.push(
            `${away.toLowerCase().replace(/ /g, "-")}-at-${home.toLowerCase().replace(/ /g, "-")}-${season}-${stype}-${week}`,
          );
        }
      } catch {
        return [];
      }
      if (!gameTags.length) return [];

      // Step 2: fetch clips for all games in parallel
      const gameResults = await Promise.all(
        gameTags.map(async (gameTag) => {
          try {
            const r = await fetch(
              `https://api.nfl.com/content/v1/videos?tag=${gameTag}&limit=200`,
              { headers: authHeaders, signal: AbortSignal.timeout(10000) },
            );
            if (!r.ok) return [] as GameItem[];
            const data = (await r.json()) as { items?: GameItem[] };
            return (data.items ?? []).filter((item) =>
              (item.tags ?? []).some((t) => t.slug === playerSlug),
            );
          } catch {
            return [] as GameItem[];
          }
        }),
      );

      const label = `${season} ${stype.toUpperCase()} Wk${week}`;
      return gameResults.flat().map((item) => ({ item, label }));
    }),
  );

  const seenSlugs = new Set<string>();
  const allClips: Clip[] = [];
  for (const week of weekClips) {
    for (const { item, label } of week) {
      const slug = item.slug ?? "";
      if (seenSlugs.has(slug)) continue;
      const title = item.title ?? "";
      if (!isPlayForPosition(title, position, item.tags ?? [])) continue;
      seenSlugs.add(slug);
      allClips.push({ title, slug, mcpID: item.mcpPlaybackId ?? null, week: label });
    }
  }

  return allClips;
}

const ALL_TEAM_ABBRS = [
  "ari","atl","bal","buf","car","chi","cin","cle","dal","den",
  "det","gb","hou","ind","jax","kc","lv","lac","lar","mia",
  "min","ne","no","nyg","nyj","phi","pit","sf","sea","tb","ten","wsh",
];

// Cache: "playerSlug:season" → team slug (or null)
const teamSeasonCache = new Map<string, string | null>();

async function getTeamForPlayerInSeason(playerSlug: string, season: number, token: string): Promise<string | null> {
  const cacheKey = `${playerSlug}:${season}`;
  if (teamSeasonCache.has(cacheKey)) return teamSeasonCache.get(cacheKey)!;

  // First try the NFL tag lookup (only works if the player has any clips at all)
  try {
    const r = await fetch(
      `https://api.nfl.com/content/v1/videos?tag=${playerSlug}&limit=10`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": HEADERS["User-Agent"] }, signal: AbortSignal.timeout(8000) },
    );
    if (r.ok) {
      const data = (await r.json()) as {
        items?: Array<{ tags?: Array<{ slug?: string; externalSourceName?: string }> }>;
      };
      for (const item of data.items ?? []) {
        for (const tag of item.tags ?? []) {
          if (tag.externalSourceName === "teams" && tag.slug) {
            // This gives the current team; only use it if season is recent enough
            // We'll still fall through to ESPN for historical accuracy
            break;
          }
        }
      }
    }
  } catch { /* ignore */ }

  // ESPN historical roster lookup: scan all 32 teams for this player in this season
  const playerName = playerSlug.replace(/-/g, " ").toLowerCase();
  const results = await Promise.all(
    ALL_TEAM_ABBRS.map(async (abbr) => {
      try {
        const r = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${abbr}/roster?season=${season}`,
          { headers: HEADERS, signal: AbortSignal.timeout(8000) },
        );
        if (!r.ok) return null;
        const d = (await r.json()) as {
          athletes?: Array<{ items?: Array<{ fullName?: string; displayName?: string }> }>;
          team?: { displayName?: string };
        };
        const athletes = (d.athletes ?? []).flatMap((g) => g.items ?? []);
        const match = athletes.find((a) => {
          const name = (a.fullName ?? a.displayName ?? "").toLowerCase();
          return name === playerName || name.startsWith(playerName.split(" ").pop()!);
        });
        if (match) {
          return d.team?.displayName?.toLowerCase().replace(/ /g, "-") ?? null;
        }
        return null;
      } catch {
        return null;
      }
    }),
  );

  const found = results.find((r) => r !== null) ?? null;
  teamSeasonCache.set(cacheKey, found);
  if (found) console.log(`[nfl-api] ${playerSlug} in ${season}: team = ${found}`);
  else console.warn(`[nfl-api] ${playerSlug} in ${season}: team not found`);
  return found;
}

// ---------- Clip fetch filtered to passing plays only (all available seasons) ----------
export async function getClipsByPlayerTag(playerSlug: string, token: string, position = "QB"): Promise<Clip[]> {
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "User-Agent": HEADERS["User-Agent"],
  };

  const clips: Clip[] = [];
  const seenSlugs = new Set<string>();

  // Page through all results — NFL API supports cursor-based pagination via `shield.after`
  let url: string | null =
    `https://api.nfl.com/content/v1/videos?tag=${playerSlug}&limit=200`;

  while (url) {
    let r: Response;
    try {
      r = await fetch(url, { headers: authHeaders, signal: AbortSignal.timeout(12000) });
    } catch {
      break;
    }

    if (r.status === 401) {
      const freshToken = await getNFLToken(true);
      return getClipsByPlayerTag(playerSlug, freshToken, position);
    }
    if (!r.ok) break;

    const data = (await r.json()) as {
      items?: Array<{ title?: string; slug?: string; mcpPlaybackId?: string | null }>;
      shield?: { after?: string };
    };

    for (const item of data.items ?? []) {
      const slug = item.slug ?? "";
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      const title = item.title ?? "";
      if (!isPlayForPosition(title, position, item.tags ?? [])) continue;
      clips.push({ title, slug, mcpID: item.mcpPlaybackId ?? null });
    }

    // Follow cursor if present; stop after 5 pages (~1000 clips) to avoid runaway fetches
    const after = data.shield?.after;
    if (after && clips.length < 1000) {
      url = `https://api.nfl.com/content/v1/videos?tag=${playerSlug}&limit=200&shield.after=${encodeURIComponent(after)}`;
    } else {
      url = null;
    }
  }

  console.log(`[nfl-api] ${playerSlug}: ${clips.length} passing clips found`);
  return clips;
}

// ---------- Comprehensive clip fetch with caching ----------
// Scans recent seasons game-by-game (thorough) and caches per player.
const CURRENT_NFL_SEASON = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const SCAN_SEASONS = Array.from({ length: CURRENT_NFL_SEASON - 2018 + 1 }, (_, i) => CURRENT_NFL_SEASON - i);

export async function getAllClipsForPlayer(
  playerSlug: string,
  token: string,
  position = "QB",
): Promise<Clip[]> {
  const cacheKey = `${playerSlug}:${position}`;
  if (clipCache.has(cacheKey)) {
    const cached = clipCache.get(cacheKey)!;
    console.log(`[nfl-api] ${playerSlug}: ${cached.length} clips (cache hit)`);
    return cached;
  }

  console.log(`[nfl-api] Scanning ${SCAN_SEASONS.join(",")} for ${playerSlug}...`);

  // Run all seasons in parallel
  const seasonResults = await Promise.all(
    SCAN_SEASONS.map(async (season) => {
      try {
        const clips = await getQBClips(playerSlug, season, token, position);
        console.log(`[nfl-api] ${playerSlug} ${season}: ${clips.length} clips`);
        return clips;
      } catch (e) {
        console.warn(`[nfl-api] ${playerSlug} ${season} failed:`, e);
        return [] as Clip[];
      }
    }),
  );

  const seenSlugs = new Set<string>();
  const all: Clip[] = [];
  for (const seasonClips of seasonResults) {
    for (const c of seasonClips) {
      if (!seenSlugs.has(c.slug)) {
        seenSlugs.add(c.slug);
        all.push(c);
      }
    }
  }

  console.log(`[nfl-api] ${playerSlug}: ${all.length} total clips found (all seasons)`);
  clipCache.set(cacheKey, all);
  return all;
}
