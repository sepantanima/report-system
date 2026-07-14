import { useCallback, useMemo, useState } from "react";
import { loadSortPref, saveSortPref } from "../utils/listSort.js";

const DEFAULT_SORT = { field: "date", direction: "desc" };

export function useMonitorSort(storageKey, fields) {
  const validKeys = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);

  const [sortConfig, setSortConfigState] = useState(() =>
    loadSortPref(storageKey, DEFAULT_SORT, validKeys),
  );

  const setSortConfig = useCallback(
    (next) => {
      setSortConfigState(next);
      saveSortPref(storageKey, next);
    },
    [storageKey],
  );

  return [sortConfig, setSortConfig];
}
