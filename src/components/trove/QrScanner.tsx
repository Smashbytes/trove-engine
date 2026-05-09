import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}

export function QrScanner({ onDetected }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    setSupported(typeof ctor === "function");
  }, []);

  useEffect(() => () => stopCamera(), []);

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
  };

  const startCamera = async () => {
    setError(null);
    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    if (!ctor) {
      setError("This browser does not support QR scanning. Use code entry instead.");
      return;
    }

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

      const detector = new ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              const code = results[0].rawValue;
              if (code) {
                stopCamera();
                onDetected(code);
                return;
              }
            }
          } catch {
            // detection failures are non-fatal; keep ticking
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera unavailable.";
      setError(message);
      stopCamera();
    }
  };

  if (supported === false) {
    return (
      <p className="text-xs text-muted-foreground">
        Camera scanning is not supported in this browser. Type a code below to inspect it.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!active && (
        <Button type="button" variant="outline" onClick={startCamera} disabled={supported === null}>
          {supported === null ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-1.5 h-4 w-4" />
          )}
          Scan with camera
        </Button>
      )}

      {active && (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black">
          <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
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
