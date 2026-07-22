import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";

const POLL_MS = 60_000;

const EMPTY_BADGES = {
  analyst_suggestions: 0,
};

export default function useUserManagementBadges(enabled = true) {
  const [badges, setBadges] = useState(EMPTY_BADGES);
  const [loading, setLoading] = useState(Boolean(enabled));

  const refresh = useCallback(async () => {
    if (!enabled) {
      setBadges(EMPTY_BADGES);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/users/analyst-suggestion-count");
      setBadges({
        analyst_suggestions: Number(data?.count) || 0,
      });
    } catch {
      setBadges(EMPTY_BADGES);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return undefined;
    const interval = setInterval(refresh, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, enabled]);

  return { badges, loading, refresh };
}
