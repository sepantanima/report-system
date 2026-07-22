import api from "../api/api";

export async function fetchSyncStatus() {
  const { data } = await api.get("/sync/status");
  return data;
}

export async function previewSyncExport() {
  const { data } = await api.get("/sync/export/preview");
  return data;
}

export async function exportSyncPack() {
  // #region agent log
  fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'syncService.js:exportSyncPack:start',message:'export API call start',timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  const { data } = await api.get("/sync/export");
  // #region agent log
  fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'syncService.js:exportSyncPack:done',message:'export API response',data:{hasPack:!!data?.pack,packId:data?.pack_id},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  return data;
}

export async function previewSyncImport(pack) {
  const { data } = await api.post("/sync/import", { pack });
  return data;
}

export async function applySyncImport(previewToken) {
  const { data } = await api.post("/sync/import/apply", { preview_token: previewToken });
  return data;
}

export async function previewSyncImportBatch(packs) {
  const { data } = await api.post("/sync/import/batch", { packs });
  return data;
}

export async function fetchSyncHistory(params = {}) {
  const { data } = await api.get("/sync/history", { params });
  return data;
}

export async function reconcileSync(packIds, note = null) {
  const { data } = await api.post("/sync/reconcile", { pack_ids: packIds, note });
  return data;
}

export async function archiveSyncHistory(packIds) {
  const { data } = await api.post("/sync/history/archive", { pack_ids: packIds });
  return data;
}

export async function previewPurgeSyncHistory({ retention_days = 90, only_archived = true, pack_ids } = {}) {
  const params = {
    retention_days,
    only_archived: only_archived ? "1" : "0",
  };
  if (pack_ids?.length) params.pack_ids = pack_ids.join(",");
  const { data } = await api.get("/sync/history/purge/preview", { params });
  return data;
}

export async function purgeSyncHistory({ retention_days = 90, only_archived = true, pack_ids, dry_run = false } = {}) {
  const { data } = await api.post("/sync/history/purge", {
    retention_days,
    only_archived,
    pack_ids: pack_ids?.length ? pack_ids : undefined,
    dry_run,
  });
  return data;
}

/** JSON.stringify با پشتیبانی BigInt (PostgreSQL int8) */
function safeJsonStringify(value) {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

/** دانلود JSON — anchor در DOM + تأخیر revoke برای سازگاری مرورگر */
export function downloadPackJson(packData, filename = "sync-pack.json") {
  if (packData == null) {
    throw new Error("داده pack خالی است");
  }
  let jsonText;
  try {
    jsonText = safeJsonStringify(packData);
  } catch (e) {
    throw new Error(`سریال‌سازی pack ناموفق: ${e.message}`);
  }
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.\-]+/g, "_");
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
  return true;
}
