import { Router } from "express";
import auth from "../middleware/auth.js";
import requirePermission, {
  requireSyncExport,
  requireSyncImport,
  requireSyncView,
  requireSyncBriefing,
} from "../middleware/requirePermission.js";
import {
  getSyncStatus,
  listSyncHistory,
  processAckImport,
  reconcilePacks,
  archiveSyncRuns,
  previewPurgeSyncRuns,
  purgeSyncRuns,
  listOpenConflicts,
} from "../services/syncLedgerService.js";
import {
  previewExport,
  buildExportPack,
  dryRunImport,
  applyImport,
  applyBatchImport,
  applyChildAggregatePack,
  buildAckJson,
} from "../services/syncPackService.js";
import { hubSyncCapabilities } from "../services/instanceScopeService.js";
import { getInstanceMode, isOfflineHub, isSyncUsbOneWay } from "../services/instanceConfig.js";

const router = Router();

router.use(auth);

router.get("/status", requireSyncView(), async (_req, res) => {
  try {
    const status = await getSyncStatus();
    res.json({ ...status, capabilities: hubSyncCapabilities() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/export/preview", requireSyncExport(), async (req, res) => {
  try {
    const mode = req.query.mode === "full" ? "full" : "delta";
    res.json(await previewExport({ mode }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/export", requireSyncExport(), async (req, res) => {
  try {
    const mode = req.query.mode === "full" ? "full" : "delta";
    const { packId, manifest, packBody } = await buildExportPack(req.user.id, { mode });
    res.json({ pack_id: packId, manifest, pack: packBody });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/import", requireSyncImport(), async (req, res) => {
  try {
    const packBody = req.body?.pack || req.body;
    const result = await dryRunImport(packBody);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/import/batch", requireSyncImport(), async (req, res) => {
  try {
    const packs = (req.body?.packs || []).slice().sort((a, b) => {
      const at = a?.manifest?.exported_at || "";
      const bt = b?.manifest?.exported_at || "";
      return at.localeCompare(bt);
    });
    const previews = [];
    for (const pack of packs) {
      previews.push(await dryRunImport(pack));
    }
    res.json({
      packs: previews,
      preview_tokens: previews.map((p) => p.preview_token).filter(Boolean),
      aggregated: previews.reduce(
        (a, p) => ({
          insert: a.insert + (p.counts?.insert || 0),
          update: a.update + (p.counts?.update || 0),
          skip: a.skip + (p.counts?.skip || 0),
          conflict: a.conflict + (p.counts?.conflict || 0),
        }),
        { insert: 0, update: 0, skip: 0, conflict: 0 },
      ),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/import/batch/apply", requireSyncImport(), async (req, res) => {
  try {
    const tokens = req.body?.preview_tokens || [];
    const result = await applyBatchImport(tokens, req.user.id);
    if (getInstanceMode() === "offline" && !isSyncUsbOneWay()) {
      result.ack = buildAckJson(result.packs.map((p) => ({ pack_id: p.pack_id, pack_checksum: null })));
    }
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/import/apply", requireSyncImport(), async (req, res) => {
  try {
    const { preview_token: previewToken } = req.body;
    const result = await applyImport(previewToken, req.user.id);
    if (getInstanceMode() === "offline" && !isSyncUsbOneWay()) {
      const ack = buildAckJson([{ pack_id: result.pack_id, pack_checksum: null }]);
      result.ack = ack;
    }
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/** فاز ۹: import pack تجمیعی سازمان فرزند روی hub مادر */
router.post("/import/child-aggregate", requireSyncImport(), async (req, res) => {
  try {
    const packBody = req.body?.pack || req.body;
    if (req.body?.preview_only) {
      const preview = await dryRunImport(packBody);
      return res.json(preview);
    }
    const result = await applyChildAggregatePack(packBody, req.user.id);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/import/ack", requirePermission("sync.import"), async (req, res) => {
  try {
    const result = await processAckImport(req.body, req.user.id);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/reconcile", requirePermission("sync.reconcile"), async (req, res) => {
  try {
    const packIds = req.body?.pack_ids || [];
    const note = req.body?.note || null;
    res.json(await reconcilePacks(packIds, req.user.id, note));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/history", requireSyncView(), async (req, res) => {
  try {
    const result = await listSyncHistory({
      limit: Number(req.query.limit) || 100,
      runType: req.query.run_type || null,
      ackStatus: req.query.ack_status || null,
      search: req.query.q || null,
      includeArchived: req.query.include_archived === "1" || req.query.include_archived === "true",
      pendingDeliveryOnly: req.query.pending_only === "1" || req.query.pending_only === "true",
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/history/archive", requirePermission("sync.reconcile"), async (req, res) => {
  try {
    const packIds = req.body?.pack_ids || [];
    res.json(await archiveSyncRuns(packIds, req.user.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/history/purge/preview", requirePermission("sync.purge"), async (req, res) => {
  try {
    res.json(await previewPurgeSyncRuns({
      retentionDays: Number(req.query.retention_days) || 90,
      onlyArchived: req.query.only_archived !== "0" && req.query.only_archived !== "false",
      packIds: (req.query.pack_ids || "").split(",").filter(Boolean).length
        ? (req.query.pack_ids || "").split(",").filter(Boolean)
        : null,
    }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/history/purge", requirePermission("sync.purge"), async (req, res) => {
  try {
    const { dry_run: dryRun, retention_days: retentionDays, only_archived: onlyArchived, pack_ids: packIds } = req.body || {};
    res.json(await purgeSyncRuns({
      retentionDays: Number(retentionDays) || 90,
      onlyArchived: onlyArchived !== false,
      packIds: packIds?.length ? packIds : null,
      operatorUserId: req.user.id,
      dryRun: !!dryRun,
    }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/conflicts", requireSyncImport(), async (req, res) => {
  try {
    res.json(await listOpenConflicts(Number(req.query.limit) || 100));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/import/ack/regenerate", requireSyncView(), async (req, res) => {
  try {
    if (isOfflineHub() && isSyncUsbOneWay()) {
      return res.status(403).json({
        error: "سیاست USB یک‌طرفه: ساخت فایل ack روی سرور داخلی غیرفعال است. روی آنلاین «تأیید تحویل دستی» بزنید.",
        code: "USB_ONE_WAY_ACK_DISABLED",
      });
    }
    const packIds = (req.query.pack_ids || "").split(",").filter(Boolean);
    const history = await listSyncHistory({ limit: 100 });
    const applied = history.items.filter(
      (h) => h.run_type === "import" && h.status === "applied" && (!packIds.length || packIds.includes(h.pack_id)),
    );
    res.json(buildAckJson(applied.map((h) => ({ pack_id: h.pack_id, pack_checksum: h.pack_checksum }))));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/import/child-aggregate", requirePermission("sync.import", { hubCapability: "sync.parent_import" }), async (req, res) => {
  try {
    const packBody = req.body?.pack || req.body;
    const preview = await dryRunImport(packBody);
    res.json(preview);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
