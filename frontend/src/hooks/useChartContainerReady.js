import { useEffect, useRef, useState } from "react";

/** Wait until chart container has positive dimensions before mounting ResponsiveContainer */
export function useChartContainerReady(resetKey) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const el = ref.current;
    if (!el) return undefined;

    const check = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setReady(true);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resetKey]);

  return [ref, ready];
}
