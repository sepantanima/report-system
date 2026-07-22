import { useEffect, useRef } from "react";

/**
 * پالس زنده داشبورد: ترجیح SSE با Authorization؛ در صورت خطا fallback به polling JSON
 */
export function useCommandDashboardLive(params, { enabled = true, onPulse, intervalMs = 20000 } = {}) {
  const onPulseRef = useRef(onPulse);
  onPulseRef.current = onPulse;
  const paramsKey = JSON.stringify(params || {});

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const ac = new AbortController();
    const token = localStorage.getItem("token");
    const baseParams = params || {};

    const apply = (payload) => {
      if (!cancelled && payload && typeof onPulseRef.current === "function") {
        onPulseRef.current(payload);
      }
    };

    async function pollOnce() {
      const qs = new URLSearchParams();
      Object.entries(baseParams).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v));
      });
      const res = await fetch(`/api/command/dashboard/live?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`live ${res.status}`);
      apply(await res.json());
    }

    async function runSse() {
      const qs = new URLSearchParams({ sse: "1", interval_ms: String(intervalMs) });
      Object.entries(baseParams).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v));
      });
      const res = await fetch(`/api/command/dashboard/live?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`sse ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() || "";
        for (const chunk of chunks) {
          if (!chunk.includes("event: pulse")) continue;
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            apply(JSON.parse(dataLine.slice(6)));
          } catch {
            /* ignore bad frame */
          }
        }
      }
    }

    let pollTimer = null;
    (async () => {
      try {
        await runSse();
      } catch {
        if (cancelled) return;
        try {
          await pollOnce();
        } catch {
          /* ignore */
        }
        pollTimer = setInterval(() => {
          pollOnce().catch(() => {});
        }, intervalMs);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [enabled, paramsKey, intervalMs]);
}
