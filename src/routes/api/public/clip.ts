import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const NFL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Referer: "https://www.nfl.com/",
};

export const Route = createFileRoute("/api/public/clip")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const { searchParams, origin } = new URL(request.url);
        const rawUrl = searchParams.get("u");
        if (!rawUrl) {
          return new Response("Missing u param", { status: 400, headers: CORS_HEADERS });
        }

        let upstream: Response;
        try {
          upstream = await fetch(rawUrl, {
            headers: NFL_HEADERS,
            signal: AbortSignal.timeout(15000),
          });
        } catch (e) {
          return new Response(String(e), { status: 502, headers: CORS_HEADERS });
        }

        if (!upstream.ok) {
          return new Response(`Upstream ${upstream.status}`, {
            status: upstream.status,
            headers: CORS_HEADERS,
          });
        }

        const contentType = upstream.headers.get("content-type") ?? "";

        // HLS manifest — rewrite all URLs to go through this proxy
        if (
          rawUrl.endsWith(".m3u8") ||
          contentType.includes("mpegurl") ||
          contentType.includes("x-mpegURL")
        ) {
          const text = await upstream.text();
          const baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf("/") + 1);
          const isMaster = text.includes("#EXT-X-STREAM-INF");

          let lines = text.split("\n");

          // Master manifest: keep only the highest-bandwidth rendition so the
          // browser never adaptive-switches down from the best quality tier.
          if (isMaster) {
            let bestBw = -1;
            let bestInfIdx = -1;
            let bestUrlIdx = -1;
            for (let i = 0; i < lines.length; i++) {
              const m = lines[i].match(/BANDWIDTH=(\d+)/);
              if (m && i + 1 < lines.length) {
                const bw = parseInt(m[1]);
                if (bw > bestBw) {
                  bestBw = bw;
                  bestInfIdx = i;
                  bestUrlIdx = i + 1;
                }
              }
            }
            if (bestInfIdx >= 0) {
              const header = lines.filter(l => l.startsWith("#EXT") && !l.startsWith("#EXT-X-STREAM-INF") && !l.startsWith("#EXT-X-I-FRAME") && !l.startsWith("#EXT-X-MEDIA:TYPE=SUBTITLES"));
              lines = [...header, lines[bestInfIdx], lines[bestUrlIdx]];
            }
          }

          const rewritten = lines
            .map((line) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith("#")) return line;
              const absolute = trimmed.startsWith("http")
                ? trimmed
                : baseUrl + trimmed;
              return `${origin}/api/public/clip?u=${encodeURIComponent(absolute)}`;
            })
            .join("\n");

          return new Response(rewritten, {
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/vnd.apple.mpegurl",
              "Cache-Control": "no-cache",
            },
          });
        }

        // Binary segment — stream through
        const body = await upstream.arrayBuffer();
        const headers: Record<string, string> = { ...CORS_HEADERS };
        const ct = upstream.headers.get("content-type");
        if (ct) headers["Content-Type"] = ct;
        const cc = upstream.headers.get("cache-control");
        if (cc) headers["Cache-Control"] = cc;

        return new Response(body, { headers });
      },
    },
  },
});
