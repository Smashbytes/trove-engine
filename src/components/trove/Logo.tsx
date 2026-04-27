import logo from "@/assets/trove-logo.png";

export function TroveLogo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="Trove"
        width={size}
        height={size}
        className="drop-shadow-[0_0_18px_oklch(0.68_0.27_350/0.55)]"
      />
      {withText && (
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-display text-lg font-bold tracking-tight">TROVE</span>
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Engine
          </span>
        </div>
      )}
    </div>
  );
}
