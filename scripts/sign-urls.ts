/**
 * Pre-signs all clip URLs in the DB.
 * Run after ingest, and again every ~3h to refresh expiring URLs.
 * Run: npx tsx scripts/sign-urls.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../nfl-clips.db");
const db = new Database(DB_PATH);

const URL_TTL_MS = 3 * 60 * 60_000; // 3 hours
const URL_TTL_S = URL_TTL_MS / 1000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

// ---------- Auth ----------
async function fetchToken(): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let token = "";
  page.on("response", async (res) => {
    if (res.url().includes("identity") && res.url().includes("token")) {
      try {
        const b = (await res.json()) as Record<string, unknown>;
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

// ---------- Sign one clip ----------
async function signClip(mcpId: string, slug: string, token: string): Promise<string | null> {
  const body = {
    asset: { mcpID: String(mcpId), slug, videoSource: "nfl.com" },
    autoplay: true, init: true, live: false,
  };
  try {
    let resp = await fetch(`https://api.nfl.com/play/v1/asset/${mcpId}`, {
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
    if (!resp.ok) return null;
    const data = (await resp.json()) as { accessUrl?: string };
    return data.accessUrl ?? null;
  } catch {
    return null;
  }
}

// ---------- Concurrency pool ----------
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

const updateUrl = db.prepare("UPDATE clips SET clip_url = ?, url_expires_at = ? WHERE id = ?");

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const expiryCutoff = now + 60 * 30; // only re-sign if expiring within 30 min

  type Row = { id: number; mcp_id: string; slug: string };
  const rows = db.prepare(`
    SELECT id, mcp_id, slug FROM clips
    WHERE mcp_id IS NOT NULL
      AND (clip_url IS NULL OR url_expires_at IS NULL OR url_expires_at < ?)
    ORDER BY RANDOM()
  `).all(expiryCutoff) as Row[];

  if (!rows.length) {
    console.log("[sign-urls] All URLs are fresh. Nothing to do.");
    db.close();
    return;
  }

  console.log(`[sign-urls] ${rows.length} clips need signing. Fetching token...`);
  let token = await fetchToken();
  console.log("[sign-urls] Token ready. Signing...");

  let tokenFetchedAt = Date.now();
  let signed = 0, failed = 0;

  const tasks = rows.map((row) => async () => {
    // Refresh token every 3h
    if (Date.now() - tokenFetchedAt > URL_TTL_MS) {
      console.log("[sign-urls] Refreshing token...");
      token = await fetchToken();
      tokenFetchedAt = Date.now();
    }

    const url = await signClip(row.mcp_id, row.slug, token);
    if (url) {
      updateUrl.run(url, Math.floor(Date.now() / 1000) + URL_TTL_S, row.id);
      signed++;
      if (signed % 100 === 0) console.log(`  ${signed}/${rows.length} signed`);
    } else {
      failed++;
    }
  });

  await pool(tasks, 200);

  console.log(`[sign-urls] Done. ${signed} signed, ${failed} failed.`);
  const fresh = (db.prepare("SELECT COUNT(*) as n FROM clips WHERE clip_url IS NOT NULL AND url_expires_at > ?").get(now) as { n: number }).n;
  console.log(`[sign-urls] DB has ${fresh} clips with valid URLs.`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
