import jsQR from "jsqr";
import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

interface QrScannerProps {
  onDetected: (code: string) => void;
  autoStart?: boolean;
  videoClassName?: string;
}

export function QrScanner({ onDetected, autoStart = false, videoClassName }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (autoStart) startCamera();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setIsStarting(false);
  };

  const startCamera = async () => {
    setError(null);
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setIsStarting(false);

      const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
        .BarcodeDetector;

      if (typeof ctor === "function") {
        // Native BarcodeDetector — Chrome desktop & Android Chrome
        const detector = new ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const results = await detector.detect(videoRef.current);
              if (results.length > 0 && results[0].rawValue) {
                stopCamera();
                onDetected(results[0].rawValue);
                return;
              }
            } catch {
              // detection failures are non-fatal
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // jsQR fallback — iOS Safari, Firefox, and any browser lacking BarcodeDetector
        const tick = () => {
          if (!videoRef.current || !streamRef.current || !canvasRef.current) return;
          if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0);
              try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
                });
                if (code?.data) {
                  stopCamera();
                  onDetected(code.data);
                  return;
                }
              } catch {
                // non-fatal
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera unavailable.";
      setError(message);
      stopCamera();
    }
  };

  return (
    <div className="space-y-3">
      {!active && (
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          disabled={isStarting}
          className="w-full sm:w-auto"
        >
          {isStarting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-1.5 h-4 w-4" />
          )}
          {isStarting ? "Starting camera…" : "Scan with camera"}
        </Button>
      )}

      {active && (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black">
          <video
            ref={videoRef}
            className={cn("w-full object-cover", videoClassName ?? "h-64")}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={stopCamera}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Stop camera"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pointer-events-none absolute inset-0 m-auto h-44 w-44 rounded-2xl border-2 border-primary/70 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
