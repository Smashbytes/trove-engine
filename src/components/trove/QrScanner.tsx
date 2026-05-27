import jsQR from "jsqr";
import { Camera, ImageUp, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

type ScanState = "idle" | "starting" | "live" | "decoding" | "error";

interface QrScannerProps {
  onDetected: (code: string) => void;
}

function isSecureContext() {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const h = window.location?.hostname ?? "";
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /instagram|fb_iab|fbav|fban|line\/|twitter|tiktok|musical_ly|; wv\)|\bwv\b/i.test(
    navigator.userAgent,
  );
}

export function QrScanner({ onDetected }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const readyTimerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ScanState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => () => killStream(), []);

  function killStream() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    readyTimerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function fail(msg: string) {
    killStream();
    setErrMsg(msg);
    setState("error");
  }

  async function startCamera() {
    setErrMsg(null);
    setState("starting");

    if (!isSecureContext()) {
      fail(
        "Camera needs HTTPS. Open trove-engine.pages.dev on your phone — or use localhost on desktop.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      fail(
        isInAppBrowser()
          ? "This in-app browser blocks camera access. Open in Safari or Chrome, or upload a QR photo."
          : "Camera API not available in this browser. Upload a QR photo instead.",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        fail("Camera permission denied. Allow camera in your browser settings, or upload a QR photo.");
      } else {
        fail(
          isInAppBrowser()
            ? "Camera blocked by this in-app browser. Open in Safari or Chrome, or upload a QR photo."
            : "Could not start camera. Upload a QR photo instead.",
        );
      }
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { fail("Internal error — video element missing."); return; }

    video.srcObject = stream;
    try { await video.play(); } catch { /* swallow — the readyState check below covers it */ }

    readyTimerRef.current = window.setTimeout(() => {
      if (!video || video.videoWidth === 0 || video.readyState < 2) {
        fail("Camera started but no video arrived. Try opening in Safari or Chrome, or upload a QR photo.");
      }
    }, 3000);

    setState("live");
    runDetectLoop();
  }

  function runDetectLoop() {
    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;

    if (typeof ctor === "function") {
      const det = new ctor({ formats: ["qr_code"] });
      const tick = async () => {
        const v = videoRef.current;
        if (!v || !streamRef.current) return;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          if (readyTimerRef.current) { clearTimeout(readyTimerRef.current); readyTimerRef.current = null; }
          try {
            const r = await det.detect(v);
            if (r.length > 0 && r[0].rawValue) {
              killStream(); setState("idle"); onDetected(r[0].rawValue); return;
            }
          } catch { /* miss */ }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const tick = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || !streamRef.current) return;
      if (v.readyState >= 2 && v.videoWidth > 0) {
        if (readyTimerRef.current) { clearTimeout(readyTimerRef.current); readyTimerRef.current = null; }
        const ctx = c.getContext("2d");
        if (ctx) {
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          try {
            const d = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(d.data, d.width, d.height, { inversionAttempts: "dontInvert" });
            if (code?.data) { killStream(); setState("idle"); onDetected(code.data); return; }
          } catch { /* miss */ }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function decodeFromImage(img: HTMLImageElement): string | null {
    const c = document.createElement("canvas");
    const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return (
      jsQR(d.data, d.width, d.height, { inversionAttempts: "dontInvert" })?.data ??
      jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" })?.data ??
      null
    );
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setErrMsg(null);
    setState("decoding");
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      const result = await new Promise<string | null>((resolve, reject) => {
        img.onload = () => resolve(decodeFromImage(img));
        img.onerror = () => reject(new Error("Could not load that image."));
        img.src = url;
      });
      URL.revokeObjectURL(url);
      if (result) { killStream(); setState("idle"); onDetected(result); }
      else { setErrMsg("No QR found. Try a clearer or closer crop."); setState("error"); }
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Could not read that image.");
      setState("error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = state === "starting" || state === "decoding";

  return (
    <div className="space-y-3">
      {/* ── Viewfinder ────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: "4 / 3" }}
      >
        {/* Video feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            state === "live" ? "opacity-100" : "opacity-0",
          )}
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* Corner brackets — thin magenta L-shapes */}
        <Corner pos="top-left" />
        <Corner pos="top-right" />
        <Corner pos="bottom-left" />
        <Corner pos="bottom-right" />

        {/* Sweep line when live */}
        {state === "live" && (
          <div className="pointer-events-none absolute inset-x-6 top-6 bottom-6 overflow-hidden">
            <div
              className="absolute left-0 right-0 h-0.5"
              style={{
                background: "linear-gradient(90deg, transparent 0%, var(--primary) 30%, var(--primary) 70%, transparent 100%)",
                boxShadow: "0 0 8px var(--primary), 0 0 24px var(--primary)",
                animation: "qr-sweep 2s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Status pill */}
        <div
          className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em]"
          style={{
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color:
              state === "live"
                ? "var(--success)"
                : state === "error"
                  ? "var(--destructive)"
                  : "rgba(255,255,255,0.5)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                state === "live"
                  ? "var(--success)"
                  : state === "error"
                    ? "var(--destructive)"
                    : "rgba(255,255,255,0.35)",
              boxShadow:
                state === "live"
                  ? "0 0 6px var(--success)"
                  : undefined,
            }}
          />
          {state === "idle" && "Ready"}
          {state === "starting" && "Starting"}
          {state === "live" && "Scanning"}
          {state === "decoding" && "Reading"}
          {state === "error" && "Offline"}
        </div>

        {/* Close button */}
        {state === "live" && (
          <button
            type="button"
            onClick={() => { killStream(); setState("idle"); }}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/80"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Center messages (idle / starting / decoding / error) */}
        {state !== "live" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            {state === "starting" && (
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            )}
            {state === "decoding" && (
              <div className="space-y-2">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/60" />
                <p className="text-xs text-white/50">Reading QR from image…</p>
              </div>
            )}
            {state === "idle" && (
              <p className="text-xs leading-5 text-white/35">
                Tap <strong className="text-white/55">Camera</strong> to open the live viewfinder or{" "}
                <strong className="text-white/55">Upload</strong> a screenshot of a QR code.
              </p>
            )}
            {state === "error" && errMsg && (
              <div className="max-w-xs space-y-2">
                <p className="text-xs font-semibold text-destructive">Camera offline</p>
                <p className="text-xs leading-5 text-white/65">{errMsg}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons — always visible ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={state === "live" ? () => { killStream(); setState("idle"); } : startCamera}
          disabled={busy}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-40",
            state === "live"
              ? "border border-white/15 bg-white/[0.05] text-white/80"
              : "bg-gradient-to-r from-[var(--primary)] to-[var(--violet,var(--primary))] text-white shadow-glow-sm",
          )}
        >
          {state === "starting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {state === "live" ? "Stop" : "Camera"}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 transition-all hover:bg-white/[0.08] disabled:opacity-40"
        >
          {state === "decoding" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <style>{`
        @keyframes qr-sweep {
          0%   { top: 0; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Corner({ pos }: { pos: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const size = 20;
  const offset = 10;
  const color = "var(--primary)";
  const styles: Record<string, React.CSSProperties> = {
    "top-left":     { top: offset, left: offset, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderTopLeftRadius: 4 },
    "top-right":    { top: offset, right: offset, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderTopRightRadius: 4 },
    "bottom-left":  { bottom: offset, left: offset, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderBottomLeftRadius: 4 },
    "bottom-right": { bottom: offset, right: offset, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderBottomRightRadius: 4 },
  };
  return (
    <span
      className="pointer-events-none absolute"
      style={{ width: size, height: size, ...styles[pos] }}
    />
  );
}
