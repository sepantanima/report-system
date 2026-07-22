import pool from "../db.js";
import { createDirectMessage } from "./messageService.js";

const MANAGER_ROLES = ["admin", "analysis_manager", "Field_admin"];

/** Fire-and-forget notification; never throws to caller. */
export function notifyUserSafe(senderUser, recipientId, title, body) {
  if (!recipientId || recipientId === senderUser?.id) return;
  createDirectMessage(
    { recipient_id: recipientId, title, body, priority: "normal" },
    senderUser,
  ).catch((err) => console.warn("[analysis-notify]", err.message));
}

export async function getAnalysisManagerIds(client = pool) {
  const r = await client.query(
    `SELECT DISTINCT u.id
     FROM tbl_users u
     JOIN tbl_user_role_assignments ura ON ura.user_id = u.id AND ura.active = TRUE
     JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
     WHERE u.active IS NOT FALSE
       AND rt.code IN ('analysis_manager', 'system_admin', 'admin')`,
  );
  return r.rows.map((row) => row.id);
}

export function notifyAnalysisManagers(senderUser, title, body) {
  getAnalysisManagerIds()
    .then((ids) => {
      for (const id of ids) {
        notifyUserSafe(senderUser, id, title, body);
      }
    })
    .catch((err) => console.warn("[analysis-notify-managers]", err.message));
}

export const ANALYSIS_NOTIFY = {
  topicApproved: (topicTitle) => `محور «${topicTitle}» تصویب شد.`,
  topicRejected: (topicTitle) => `محور «${topicTitle}» رد شد.`,
  topicNeedsInfo: (topicTitle) => `محور «${topicTitle}» برای اصلاح برگشت خورد.`,
  assignmentCreated: (topicTitle) => `مأموریت جدید برای محور «${topicTitle}» به شما ارجاع شد.`,
  analysisSubmitted: (topicTitle) => `تحلیل محور «${topicTitle}» ارسال شد — آماده بازبینی.`,
  needsRevision: (topicTitle) => `تحلیل محور «${topicTitle}» نیازمند اصلاح است.`,
  finalApproved: (topicTitle) => `تحلیل محور «${topicTitle}» تایید نهایی شد.`,
  briefSubmitted: (code, title) => `تحلیل ثبت‌شده ${code}: «${title}» — صندوق ورودی.`,
  topicProposalSubmitted: (code, title) => `پیشنهاد موضوع ${code}: «${title}» — صندوق ورودی.`,
  briefAcknowledged: (code) => `تحلیل ثبت‌شده ${code} دریافت شد.`,
  briefManagerApproved: (code) => `تحلیل ثبت‌شده ${code} در بانک تحلیل ذخیره شد.`,
  briefEditorApproved: (code) => `تحلیل ثبت‌شده ${code} برای انتشار تأیید شد.`,
  briefPublished: (code) => `تحلیل ثبت‌شده ${code} منتشر شد.`,
  briefPromoted: (code) => `تحلیل ثبت‌شده ${code} به فرایند رسمی ارتقا یافت.`,
  briefRejected: (code) => `تحلیل ثبت‌شده ${code} رد شد.`,
  analystSuggested: (name) => `پیشنهاد نقش تحلیل‌گر برای «${name}» ثبت شد.`,
};
