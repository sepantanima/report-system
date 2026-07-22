import { useCallback, useEffect, useState } from "react";
import analysisService from "../services/analysisService.js";

const POLL_MS = 60_000;

const EMPTY_BADGES = {
  my_missions: 0,
  approve_topics: 0,
  review_queue: 0,
};

export default function useAnalysisMenuBadges() {
  const [badges, setBadges] = useState(EMPTY_BADGES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await analysisService.getMenuBadges();
      setBadges({
        my_missions: Number(data?.my_missions) || 0,
        approve_topics: Number(data?.approve_topics) || 0,
        review_queue: Number(data?.review_queue) || 0,
      });
    } catch {
      setBadges(EMPTY_BADGES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { badges, loading, refresh };
}
