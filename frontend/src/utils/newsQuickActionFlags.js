import { getNewsRoleLevel, hasPermission } from "./userRoles.js";
import { normalizeDbEnum } from "../constants/newsMonitorMeta.js";

/**
 * @param {object} item
 * @param {string[]} roles
 */
export function getNewsQuickActionFlags(item, roles) {
  if (!item) {
    return {
      canVerdict: false,
      canFinalize: false,
      canToggleDuplicate: false,
      canSetPriority: false,
    };
  }

  const level = getNewsRoleLevel(roles);
  const ws = normalizeDbEnum(item.workflow_status, "pending");
  const canReview = hasPermission(roles, "news_review");
  const canFinalizePerm = hasPermission(roles, "news_finalize");
  const isEditorQueue = ws === "pending";
  const isChiefQueue = ws === "reviewed";
  const dupConfirmed = normalizeDbEnum(item.duplicate_status) === "confirmed";

  return {
    canVerdict: canReview && isEditorQueue && (level === "editor" || level === "chief" || level === "admin"),
    canFinalize: canFinalizePerm && isChiefQueue && (level === "chief" || level === "admin"),
    canChiefPublish: canFinalizePerm && isChiefQueue && (level === "chief" || level === "admin"),
    canChiefBank: canFinalizePerm && isChiefQueue && (level === "chief" || level === "admin"),
    canChiefReject: canFinalizePerm && isChiefQueue && (level === "chief" || level === "admin"),
    canToggleDuplicate: canReview && !dupConfirmed && (level === "editor" || level === "chief" || level === "admin"),
    canSetPriority: canReview && (level === "editor" || level === "chief" || level === "admin"),
  };
}
