import * as React from "react";

const DEFAULT_BREAKPOINT = 768;

/**
 * Returns true when viewport width is < breakpoint.
 * @param breakpoint px value at which "mobile" starts (default 768)
 */
export function useIsMobile(breakpoint: number = DEFAULT_BREAKPOINT) {
  const query = `(max-width: ${breakpoint - 1}px)`;

  // Lazy initial state avoids SSR hydration mismatch.
  const getIsMobile = () =>
    typeof window !== "undefined"
      ? window.matchMedia(query).matches
      : false;

  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(query);

    let raf = 0;
    const update = () => setIsMobile(mql.matches);

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    // Initial sync
    update();

    // MediaQuery change (new + old Safari)
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
    } else {
      // @ts-expect-error: older Safari
      mql.addListener(update);
    }

    // Fallback: also react to normal resizes
    window.addEventListener("resize", onResize);

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", update);
      } else {
        // @ts-expect-error: older Safari
        mql.removeListener(update);
      }
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [query]);

  return isMobile;
}
