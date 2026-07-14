export {

  decodeToken,

  parseUserRoles,

  normalizeRoles,

  getSessionRoles,

  getRoleLabelFa,

  hasRole,

  hasPermission,

  ROLE_PERMISSIONS,

  ROLE_LABELS,

} from "./userRoles.js";



import { decodeToken, getSessionRoles, hasRole } from "./userRoles.js";



export const getCurrentUser = () => decodeToken(localStorage.getItem("token") || "");



export const getUserRoles = () => getSessionRoles();



export const canApproveTopics = () => hasRole(getUserRoles(), "admin", "analysis_manager", "topic_approver", "Field_admin");

export const canManageAnalysis = () => hasRole(getUserRoles(), "admin", "analysis_manager", "Field_admin");

export const canManageTopicOps = () => canManageAnalysis() || canApproveTopics();



export const toPersianDigits = (val) => {

  if (val === undefined || val === null) return "۰";

  return String(val).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

};



export const TOPIC_STATUS = {

  Draft: "پیش‌نویس", Submitted: "منتظر تصویب", UnderReview: "برگشت برای اصلاح", Approved: "محور تصویب‌شده",

  Rejected: "رد شده", Assigned: "در جریان تحلیل", Completed: "تکمیل‌شده", Closed: "بایگانی‌شده",

};



export const MISSION_STATUS = {

  Assigned: "ارجاع شده", InProgress: "در حال انجام", Submitted: "ارسال شده",

  UnderReview: "در بررسی", NeedsRevision: "نیازمند اصلاح", Revised: "اصلاح شده",

  FinalApproved: "تایید نهایی", Archived: "بایگانی", Cancelled: "لغو شده",

};


