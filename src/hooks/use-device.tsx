import * as React from "react";

export type DeviceType = "smartphone" | "tablet" | "desktop";

export function useDevice(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(getDevice);

  React.useEffect(() => {
    const onChange = () => setDevice(getDevice());
    const mqlCoarse = window.matchMedia("(pointer: coarse)");
    const mqlNarrow = window.matchMedia("(max-width: 639px)");
    const mqlMid = window.matchMedia("(max-width: 1023px)");
    mqlCoarse.addEventListener("change", onChange);
    mqlNarrow.addEventListener("change", onChange);
    mqlMid.addEventListener("change", onChange);
    return () => {
      mqlCoarse.removeEventListener("change", onChange);
      mqlNarrow.removeEventListener("change", onChange);
      mqlMid.removeEventListener("change", onChange);
    };
  }, []);

  return device;
}

function getDevice(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (w < 640) return "smartphone";
  if (isTouch && w < 1024) return "tablet";
  return "desktop";
}
