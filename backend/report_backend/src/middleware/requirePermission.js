import { checkAccess } from "../services/rbacService.js";
import { assertHubCapability, getHubCapabilityDeniedPayload } from "../services/instanceConfig.js";

export default function requirePermission(permission, options = {}) {
  const { anyOf, hubCapability } = options;
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "احراز هویت الزامی است" });
    }

    if (hubCapability && !assertHubCapability(hubCapability)) {
      const payload = getHubCapabilityDeniedPayload(hubCapability);
      // #region agent log
      fetch('http://127.0.0.1:7732/ingest/84806bcd-7c67-4feb-bf71-3b9c8b6b47fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'338542'},body:JSON.stringify({sessionId:'338542',location:'requirePermission.js:hubDenied',message:'HUB_CAPABILITY_DENIED',data:{hubCapability,currentMode:payload.current_instance_mode,path:req.path},timestamp:Date.now(),hypothesisId:'HUB-MSG'})}).catch(()=>{});
      // #endregion
      return res.status(403).json(payload);
    }

    const perms = anyOf || (permission ? [permission] : []);
    const ok = await checkAccess(req, {
      permissions: perms,
      roles: options.legacyRoles,
    });

    if (ok) return next();
    return res.status(403).json({ error: "دسترسی غیرمجاز", code: "PERMISSION_DENIED" });
  };
}

/** Shorthand for sync routes */
export function requireSyncExport() {
  return requirePermission("sync.export", { hubCapability: "sync.export" });
}

export function requireSyncImport() {
  return requirePermission("sync.import", { hubCapability: "sync.import" });
}

export function requireSyncBriefing() {
  return requirePermission("sync.briefing", { hubCapability: "sync.briefing" });
}

export function requireSyncView() {
  return requirePermission("sync.view");
}
