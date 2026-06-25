/**
 * NFL clip ingestion — fully parallelized.
 * Run: npx tsx scripts/ingest.ts [--season 2024] [--position WR]
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../nfl-clips.db");

// ---------- DB ----------
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS clips (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_slug TEXT NOT NULL,
    player_name TEXT NOT NULL,
    position    TEXT NOT NULL,
    season      INTEGER NOT NULL,
    week        TEXT NOT NULL,
    title       TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    mcp_id      TEXT,
    ingested_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_player ON clips(player_slug);
  CREATE INDEX IF NOT EXISTS idx_position ON clips(position);
  CREATE INDEX IF NOT EXISTS idx_season ON clips(season);
`);

const insertClip = db.prepare(`
  INSERT OR IGNORE INTO clips (player_slug, player_name, position, season, week, title, slug, mcp_id)
  VALUES (@player_slug, @player_name, @position, @season, @week, @title, @slug, @mcp_id)
`);

// ---------- CLI args ----------
const args = process.argv.slice(2);
const seasonArg = args.includes("--season") ? parseInt(args[args.indexOf("--season") + 1]) : null;
const positionArg = args.includes("--position") ? args[args.indexOf("--position") + 1] : null;
const SEASONS = seasonArg ? [seasonArg] : [2018,2019,2020,2021,2022,2023,2024,2025];
const POSITIONS = positionArg ? [positionArg] : ["QB","RB","WR"];

// ---------- Concurrency limiter ----------
function pool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(tasks.length);
    let idx = 0, done = 0;
    const run = () => {
      if (idx >= tasks.length) return;
      const i = idx++;
      tasks[i]().then(r => {
        results[i] = r;
        done++;
        if (done === tasks.length) resolve(results);
        else run();
      }).catch(reject);
    };
    for (let i = 0; i < Math.min(concurrency, tasks.length); i++) run();
    if (!tasks.length) resolve([]);
  });
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

// ---------- Auth token ----------
let currentToken = "";

async function fetchToken(): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let token = "";
  page.on("response", async (res) => {
    if (res.url().includes("identity") && res.url().includes("token")) {
      try {
        const b = (await res.json()) as Record<string,unknown>;
        if (typeof b.accessToken === "string") token = b.accessToken;
      } catch {}
    }
  });
  await page.goto("https://www.nfl.com/videos/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  await browser.close();
  if (!token) throw new Error("Could not get NFL token");
  return token;
}

function authHeaders() {
  return { Authorization: `Bearer ${currentToken}`, ...HEADERS };
}

// ---------- Filters ----------
const BLOCK_KW = [
  "best plays","highlights","press conference","interview","insiders","gmfb",
  "good morning football","nfl now","top 5","top five","reasons why",
  "nfl total access","nfl gameday","nfl network","mic'd up","hard knocks",
  "sound fx","training camp","minicamp","ota","contract","extension","trade",
  "draft","workout","combine","injury","update","nfl films","classic",
  "throwback","career","week in review","game recap","analysis","preview",
  "prediction","breakdown","watch:","listen:","podcast","get ready",
  "what to watch","keys to the game","sunday night football",
  "monday night football","thursday night football"," snf "," mnf "," tnf ",
  "nfl on ","tonight on","tune in","must-see","must see","don't miss",
];
const NEG_KW = [
  "incomplete","incompletion","no gain","loss of","sacked","sack",
  "false start","penalty","interception","intercepted","fumble",
];
const QB_KW = [
  "pass","throw","touchdown pass","td pass","completion","completes",
  "connects","finds","fires","airs","aerial","strike","yard gain",
  "yard td","-yard td","catch","reception","pinpoints","targets",
];
const QB_BLOCK = [" rush","rushing"," run "," runs ","scramble","scrambles","screen","screen pass"];
const SHORT_TD = [
  "plunges","punches","pushes","barrels","powers","dives","leaps","sneaks",
  "quarterback sneak","goal line","goal-line","1-yard td","2-yard td",
];
const BLOCKED_CH = new Set([
  "good-morning-football-vc","nfl-now-vc","nfl-total-access-vc","nfl-gameday-vc",
  "nfl-network-vc","around-the-nfl-vc","nfl-fantasy-live-vc","nfl-360-vc",
  "the-pivot-vc","path-to-the-draft-vc","nfl-turning-point-vc",
]);

type Tag = { slug?: string; externalSourceName?: string };

function isValid(title: string, position: string, tags: Tag[]): boolean {
  const t = title.toLowerCase();
  const ch = tags.filter(tg => tg.externalSourceName === "customentity.videochannel").map(tg => tg.slug ?? "");
  if (ch.some(s => BLOCKED_CH.has(s))) return false;
  if (BLOCK_KW.some(k => t.includes(k))) return false;
  if (NEG_KW.some(k => t.includes(k))) return false;
  const m = t.match(/\b(\d+)[\s-]yard/i);
  if (m && parseInt(m[1]) < 10) return false;
  if (position === "QB") {
    if (QB_BLOCK.some(k => t.includes(k))) return false;
    return QB_KW.some(k => t.includes(k));
  }
  if (SHORT_TD.some(k => t.includes(k))) return false;
  return true;
}

// ---------- Players ----------
type Player = { slug: string; name: string; position: string };

async function loadPlayers(): Promise<Player[]> {
  const ABBRS = [
    "ari","atl","bal","buf","car","chi","cin","cle","dal","den",
    "det","gb","hou","ind","jax","kc","lv","lac","lar","mia",
    "min","ne","no","nyg","nyj","phi","pit","sf","sea","tb","ten","wsh",
  ];
  const POS_MAP: Record<string,string> = { QB:"QB", RB:"RB", HB:"RB", WR:"WR" };
  const posSet = new Set(POSITIONS);
  const SUFFIX = /\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i;
  const toSlug = (n: string) =>
    n.replace(SUFFIX,"").toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-");

  const seen = new Set<string>();
  const players: Player[] = [];

  await Promise.all(ABBRS.map(async abbr => {
    try {
      const r = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${abbr}/depthcharts`,
        { headers: HEADERS, signal: AbortSignal.timeout(10000) },
      );
      if (!r.ok) return;
      const data = (await r.json()) as {
        depthchart?: Record<string, { positions?: Record<string, { athletes?: Array<{ displayName: string }> }> }>;
      };
      for (const formation of Object.values(data.depthchart ?? {})) {
        for (const [pk, pd] of Object.entries(formation.positions ?? {})) {
          const pos = POS_MAP[pk.toUpperCase()];
          if (!pos || !posSet.has(pos)) continue;
          for (const a of pd.athletes ?? []) {
            const slug = toSlug(a.displayName);
            if (!slug || seen.has(slug)) continue;
            seen.add(slug);
            players.push({ slug, name: a.displayName, position: pos });
          }
        }
      }
    } catch {}
  }));

  console.log(`[ingest] ${players.length} players loaded`);
  return players;
}

// ---------- Game tags from ESPN ----------
async function getGameTags(season: number, seasonType: number, week: number): Promise<string[]> {
  const stype = seasonType === 2 ? "reg" : "post";
  try {
    const r = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}&dates=${season}`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return [];
    const data = (await r.json()) as {
      events?: Array<{ competitions?: Array<{ competitors?: Array<{ homeAway: string; team: { displayName: string } }> }> }>;
    };
    return (data.events ?? []).flatMap(e => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === "home")?.team.displayName;
      const away = comp?.competitors?.find(c => c.homeAway === "away")?.team.displayName;
      if (!home || !away) return [];
      return [`${away.toLowerCase().replace(/ /g,"-")}-at-${home.toLowerCase().replace(/ /g,"-")}-${season}-${stype}-${week}`];
    });
  } catch { return []; }
}

// ---------- Fetch clips for one game ----------
type GameItem = { title?: string; slug?: string; mcpPlaybackId?: string | null; tags?: Tag[] };

async function fetchGameClips(gameTag: string): Promise<GameItem[]> {
  try {
    const r = await fetch(
      `https://api.nfl.com/content/v1/videos?tag=${gameTag}&limit=200`,
      { headers: authHeaders(), signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return [];
    const data = (await r.json()) as { items?: GameItem[] };
    return data.items ?? [];
  } catch { return []; }
}

// ---------- Process one week ----------
async function processWeek(
  season: number, seasonType: number, week: number,
  players: Player[], playerBySlug: Map<string, Player>,
): Promise<number> {
  const label = `${season} ${seasonType === 2 ? "REG" : "POST"} Wk${week}`;
  const gameTags = await getGameTags(season, seasonType, week);
  if (!gameTags.length) return 0;

  const gameClipArrays = await Promise.all(gameTags.map(fetchGameClips));
  const allClips = gameClipArrays.flat();
  if (!allClips.length) return 0;

  let inserted = 0;
  for (const clip of allClips) {
    const title = clip.title ?? "";
    const slug = clip.slug ?? "";
    if (!slug || !title) continue;
    const clipTags = clip.tags ?? [];

    for (const tag of clipTags) {
      const player = playerBySlug.get(tag.slug ?? "");
      if (!player) continue;
      if (!isValid(title, player.position, clipTags)) continue;
      const res = insertClip.run({
        player_slug: player.slug,
        player_name: player.name,
        position: player.position,
        season,
        week: label,
        title,
        slug,
        mcp_id: clip.mcpPlaybackId ?? null,
      });
      if (res.changes > 0) inserted++;
    }
  }

  if (inserted > 0) console.log(`  [${label}] +${inserted} clips`);
  return inserted;
}

// ---------- Main ----------
async function main() {
  console.log(`[ingest] Seasons: ${SEASONS.join(",")} | Positions: ${POSITIONS.join(",")}`);

  currentToken = await fetchToken();
  console.log("[ingest] Token ready. Loading players...");

  const players = await loadPlayers();
  const playerBySlug = new Map(players.map(p => [p.slug, p]));

  // Build all week jobs across all seasons
  const weekJobs: Array<() => Promise<number>> = [];
  for (const season of SEASONS) {
    for (let w = 1; w <= 19; w++)
      weekJobs.push(() => processWeek(season, 2, w, players, playerBySlug));
    for (let w = 1; w <= 5; w++)
      weekJobs.push(() => processWeek(season, 3, w, players, playerBySlug));
  }

  console.log(`[ingest] ${weekJobs.length} week jobs queued. Running with concurrency=20...`);

  // Refresh token every 3h in background
  const tokenTimer = setInterval(async () => {
    console.log("[ingest] Refreshing token...");
    currentToken = await fetchToken();
    console.log("[ingest] Token refreshed.");
  }, 3 * 60 * 60_000);

  const results = await pool(weekJobs, 20);
  clearInterval(tokenTimer);

  const total = results.reduce((a, b) => a + b, 0);
  console.log(`\n[ingest] Done. ${total} clips inserted into ${DB_PATH}`);

  const count = (db.prepare("SELECT COUNT(*) as n FROM clips").get() as { n: number }).n;
  console.log(`[ingest] DB total: ${count} clips`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
