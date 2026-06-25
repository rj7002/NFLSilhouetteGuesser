import { useEffect, useRef, useState } from "react";

// ---------- ONNX model (lazy, browser-only) ----------
type OrtModule = typeof import("onnxruntime-web");
let ortPromise: Promise<OrtModule> | null = null;
function getOrt(): Promise<OrtModule> {
  if (!ortPromise) {
    ortPromise = import("onnxruntime-web")
      .then((ort) => {
        ort.env.wasm.wasmPaths =
          "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
        return ort;
      })
      .catch(() => null as unknown as OrtModule);
  }
  return ortPromise;
}

type Session = import("onnxruntime-web").InferenceSession;
let sessionPromise: Promise<Session | null> | null = null;
function getSession(): Promise<Session | null> {
  if (!sessionPromise) {
    sessionPromise = getOrt().then((ort) =>
      ort?.InferenceSession.create("/scoreboard.onnx", {
        executionProviders: ["wasm"],
      }).catch(() => null),
    );
  }
  return sessionPromise;
}

type Box = { x1: number; y1: number; x2: number; y2: number };

async function detectScoreboard(
  video: HTMLVideoElement,
  vw: number,
  vh: number,
): Promise<Box | null> {
  const session = await getSession();
  if (!session) return null;
  const ort = await getOrt();

  const SIZE = 640;
  const prep = document.createElement("canvas");
  prep.width = SIZE;
  prep.height = SIZE;
  const ctx = prep.getContext("2d")!;
  ctx.drawImage(video, 0, 0, SIZE, SIZE);
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data;

  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    input[i] = px[i * 4] / 255;
    input[SIZE * SIZE + i] = px[i * 4 + 1] / 255;
    input[2 * SIZE * SIZE + i] = px[i * 4 + 2] / 255;
  }

  const tensor = new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]);
  const out = (await session.run({ images: tensor }))["output0"]
    .data as Float32Array;
  const N = 8400;

  let bestConf = 0.01;
  let best: Box | null = null;
  for (let i = 0; i < N; i++) {
    const conf = out[4 * N + i];
    if (conf <= bestConf) continue;
    const cx = out[0 * N + i],
      cy = out[1 * N + i],
      w = out[2 * N + i],
      h = out[3 * N + i];
    if (cy / SIZE < 0.5) continue; // only bottom half
    bestConf = conf;
    best = {
      x1: Math.max(0, ((cx - w / 2) * vw) / SIZE),
      y1: Math.max(0, ((cy - h / 2) * vh) / SIZE),
      x2: Math.min(vw, ((cx + w / 2) * vw) / SIZE),
      y2: Math.min(vh, ((cy + h / 2) * vh) / SIZE),
    };
  }
  return best;
}

// ---------- Sobel ----------
function sobelEdges(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)],
        tc = gray[(y - 1) * w + x],
        tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)],
        mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)],
        bc = gray[(y + 1) * w + x],
        br = gray[(y + 1) * w + (x + 1)];
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy);
      const v = mag > 20 ? 0 : 255;
      const i4 = (y * w + x) * 4;
      out[i4] = v;
      out[i4 + 1] = v;
      out[i4 + 2] = v;
      out[i4 + 3] = 255;
    }
  }
  return out;
}

// ---------- Component ----------
type Props = {
  src: string;
  onReady?: () => void;
  startTime?: number;
  endTime?: number;
};

export function SilhouetteVideo({
  src,
  onReady,
  startTime = 0,
  endTime = 10,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const boxRef = useRef<Box | null>(null);
  const detectedRef = useRef(false);
  const [errMsg, setErrMsg] = useState("");
  const [hasErr, setHasErr] = useState(false);

  useEffect(() => {
    getSession().catch(() => {});
  }, []);

  useEffect(() => {
    setHasErr(false);
    setErrMsg("");
    boxRef.current = null;
    detectedRef.current = false;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!offRef.current) offRef.current = document.createElement("canvas");
    const off = offRef.current;
    const tmp = document.createElement("canvas");
    let stopped = false;

    video.style.opacity = "0";
    video.style.filter = "";

    const render = () => {
      if (stopped) return;
      rafRef.current = requestAnimationFrame(render);
      if (video.readyState < 2 || !video.videoWidth) return;

      const vw = video.videoWidth,
        vh = video.videoHeight;

      if (off.width !== vw) off.width = vw;
      if (off.height !== vh) off.height = vh;
      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;

      const offCtx = off.getContext("2d", { willReadFrequently: true })!;
      const zoom = 1.25;
      const cropW = Math.round(vw / zoom);
      const cropH = Math.round(vh / zoom);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      offCtx.filter = "blur(6px)";
      offCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, vw, vh);
      offCtx.filter = "none";

      // Hyper-blur scoreboard region using canvas filter (GPU-accelerated)
      const sbX = Math.round(vw * 0.25);
      const sbY = Math.round(vh * 0.82);
      const sbW = Math.round(vw * 0.5);
      const sbH = Math.round(vh * 0.18);
      offCtx.filter = "blur(40px)";
      offCtx.drawImage(off, sbX, sbY, sbW, sbH, sbX, sbY, sbW, sbH);
      offCtx.filter = "none";

      let pixels: ImageData;
      try {
        pixels = offCtx.getImageData(0, 0, vw, vh);
      } catch {
        canvas.style.display = "none";
        video.style.opacity = "1";
        video.style.filter = "grayscale(1) contrast(3) brightness(1.5)";
        stopped = true;
        return;
      }

      // Kick off YOLO detection once on first frame (non-blocking)
      if (!detectedRef.current) {
        detectedRef.current = true;
        detectScoreboard(video, vw, vh)
          .then((box) => {
            boxRef.current = box;
          })
          .catch(() => {});
      }

      // Build edge overlay: black where edge detected, transparent elsewhere
      const edgeData = sobelEdges(pixels.data, vw, vh);
      const overlay = new Uint8ClampedArray(vw * vh * 4);
      for (let i = 0; i < vw * vh; i++) {
        const isEdge = edgeData[i * 4] === 0;
        overlay[i * 4] = 0;
        overlay[i * 4 + 1] = 0;
        overlay[i * 4 + 2] = 0;
        overlay[i * 4 + 3] = isEdge ? 220 : 0;
      }

      const ctx = canvas.getContext("2d")!;

      // Draw grayscale video base
      ctx.filter = "grayscale(1) brightness(0.75)";
      ctx.drawImage(off, 0, 0, vw, vh);
      ctx.filter = "none";

      // Overlay black edges
      tmp.width = vw;
      tmp.height = vh;
      const tmpCtx = tmp.getContext("2d")!;
      const imgData = tmpCtx.createImageData(vw, vh);
      imgData.data.set(overlay);
      tmpCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tmp, 0, 0, vw, vh);
    };

    const onTimeUpdate = () => {
      if (video.currentTime >= endTime) video.currentTime = startTime;
    };

    const start = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
      onReady?.();
    };

    video.addEventListener("canplay", start);
    video.addEventListener("timeupdate", onTimeUpdate);
    if (video.readyState >= 3) start();

    return () => {
      stopped = true;
      video.removeEventListener("canplay", start);
      video.removeEventListener("timeupdate", onTimeUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, onReady, startTime, endTime]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-gray-400 aspect-video">
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted
        loop
        autoPlay
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
        onError={() => {
          setErrMsg("Could not load video clip");
          setHasErr(true);
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {hasErr && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-destructive">
          {errMsg}
        </div>
      )}
    </div>
  );
}
