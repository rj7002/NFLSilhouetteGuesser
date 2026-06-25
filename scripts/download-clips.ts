/**
 * Signs and downloads all clips in one shot — sign right before ffmpeg so the
 * 15-minute URL window never expires mid-download.
 * Run: npx tsx scripts/download-clips.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../nfl-clips.db");
const VIDEOS_DIR = path.join(__dirname, "../public/videos");

fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const db = new Database(DB_PATH);
const setLocalPath = db.prepare("UPDATE clips SET local_path = ?, clip_url = ?, url_expires_at = ? WHERE id = ?");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

// ---------- Auth ----------
let currentToken = "";
let tokenFetchedAt = 0;

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

async function getToken(): Promise<string> {
  if (currentToken && Date.now() - tokenFetchedAt < 3 * 60 * 60_000) return currentToken;
  console.log("[download] Refreshing token...");
  currentToken = await fetchToken();
  tokenFetchedAt = Date.now();
  console.log("[download] Token ready.");
  return currentToken;
}

// ---------- Sign ----------
async function signClip(mcpId: string, slug: string): Promise<string | null> {
  const token = await getToken();
  const body = {
    asset: { mcpID: String(mcpId), slug, videoSource: "nfl.com" },
    autoplay: true, init: true, live: false,
  };
  try {
    const resp = await fetch(`https://api.nfl.com/play/v1/asset/${mcpId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "*/*",
        Referer: "https://www.nfl.com/",
        ...HEADERS,
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

// ---------- Pool ----------
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

// ---------- Download ----------
type Row = { id: number; slug: string; mcp_id: string };

async function downloadClip(row: Row): Promise<boolean> {
  const outPath = path.join(VIDEOS_DIR, `${row.slug}.mp4`);
  const relPath = `/videos/${row.slug}.mp4`;

  if (fs.existsSync(outPath)) {
    setLocalPath.run(relPath, null, null, row.id);
    return true;
  }

  // Sign right before download — URL valid for ~15 min, ffmpeg finishes in seconds
  const url = await signClip(row.mcp_id, row.slug);
  if (!url) return false;

  try {
    await exec("ffmpeg", [
      "-i", url,
      "-c", "copy",
      "-movflags", "+faststart",
      "-y",
      outPath,
    ], { timeout: 120000 });
    const expiresAt = Math.floor(Date.now() / 1000) + 900;
    setLocalPath.run(relPath, url, expiresAt, row.id);
    return true;
  } catch {
    // Clean up partial file
    try { fs.unlinkSync(outPath); } catch {}
    return false;
  }
}

// ---------- Main ----------
async function main() {
  await getToken();

  type CountRow = { n: number };
  const alreadyDone = (db.prepare("SELECT COUNT(*) as n FROM clips WHERE local_path IS NOT NULL").get() as CountRow).n;

  const rows = db.prepare(`
    SELECT id, slug, mcp_id FROM clips
    WHERE mcp_id IS NOT NULL AND local_path IS NULL
    ORDER BY RANDOM()
  `).all() as Row[];

  console.log(`[download] ${alreadyDone} already done, ${rows.length} remaining.`);
  if (!rows.length) { db.close(); return; }

  let done = 0, failed = 0;

  const tasks = rows.map((row) => async () => {
    const ok = await downloadClip(row);
    if (ok) {
      done++;
      if (done % 100 === 0) console.log(`  ${done + alreadyDone}/${rows.length + alreadyDone} downloaded`);
    } else {
      failed++;
    }
  });

  // High concurrency: signing is fast (HTTP POST), ffmpeg downloads are network-bound
  await pool(tasks, 300);

  console.log(`[download] Done. ${done} downloaded, ${failed} failed.`);
  const total = (db.prepare("SELECT COUNT(*) as n FROM clips WHERE local_path IS NOT NULL").get() as CountRow).n;
  console.log(`[download] DB has ${total} clips with local files.`);
  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
