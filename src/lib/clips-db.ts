// Server-only: reads clips from the pre-ingested SQLite DB.
// Never import from client components.

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../nfl-clips.db");

let _db: ReturnType<typeof Database> | null = null;
function getDb() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

export type CachedClip = {
  id: number;
  slug: string;
  title: string;
  mcpId: string | null;
  week: string;
  localPath: string | null;     // /videos/slug.mp4 — permanent, preferred
  clipUrl: string | null;       // pre-signed HLS URL (expires)
  urlExpiresAt: number | null;
};

type Row = {
  id: number;
  slug: string;
  title: string;
  mcp_id: string | null;
  week: string;
  local_path: string | null;
  clip_url: string | null;
  url_expires_at: number | null;
};

export function getClipsForPlayer(playerSlug: string, position: string): CachedClip[] {
  try {
    const rows = getDb()
      .prepare(`
        SELECT id, slug, title, mcp_id, week, local_path, clip_url, url_expires_at
        FROM clips
        WHERE player_slug = ? AND position = ?
        ORDER BY RANDOM()
      `)
      .all(playerSlug, position) as Row[];
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      mcpId: r.mcp_id,
      week: r.week,
      localPath: r.local_path,
      clipUrl: r.clip_url,
      urlExpiresAt: r.url_expires_at,
    }));
  } catch {
    return [];
  }
}

export function saveClipUrl(id: number, url: string, ttlSeconds = 3 * 60 * 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  getDb()
    .prepare("UPDATE clips SET clip_url = ?, url_expires_at = ? WHERE id = ?")
    .run(url, expiresAt, id);
}

export function isUrlFresh(clip: CachedClip): boolean {
  if (!clip.clipUrl || !clip.urlExpiresAt) return false;
  // consider stale if expiring within 5 minutes
  return clip.urlExpiresAt > Math.floor(Date.now() / 1000) + 300;
}
