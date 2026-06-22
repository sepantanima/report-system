import { Router } from "express";
import pool from "../db.js";
import { validateMonitorVerifyPayload, validateUnitReportPayload } from "../constants/fieldFieldLimits.js";
import {
  getAdvancedReports,
  returnReport,
  updateReportByManager,
  getUnitRankings,
} from "../controllers/reportController.js";

import auth from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import managementSummaryRoutes from "./managementSummaryRoutes.js";
import { executeFormAiAction } from "../services/aiFormRunOrchestrator.js";
import { listActiveActionsForForm } from "../services/aiFormActionService.js";
import { validateFormActionName, validateFormDataObject } from "../constants/aiFormActions.js";

const router = Router();

const fieldMgmtAiRoles = requireRole("admin", "Field_admin");

// تابع کمکی برای فرمت لاگ زمانی شمسی در مسیرها
const getPersianDateTimeLog = () => {
  const now = new Date();
  return new Intl.DateTimeFormat("fa-IR", {
    calendar: "persian",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
};

// تابع اصلاح شده برای تبدیل متن فارسی فرانت‌بند به فیلد عددی متناظر در دیتابیس (1، 3، 5)
const parsePriority = (p) => {
  if (p === "عادی" || p === 1 || p === "1") return 1;
  if (p === "مهم" || p === 3 || p === "3") return 3;
  if (p === "فوری" || p === 5 || p === "5") return 5;
  
  const num = parseInt(p);
  if (num === 1 || num === 3 || num === 5) return num;
  return 1; // مقدار پیش‌فرض در صورت بروز هرگونه خطا
};

// تابع معکوس برای مپ کردن فیلد عددی دیتابیس به اولویت متنی استاندارد فرانت‌بند
const mapPriorityToFa = (pNum) => {
  const num = parseInt(pNum);
  if (num === 5) return "فوری";
  if (num === 3) return "مهم";
  return "عادی";
};

// نرمال‌سازی دامنه‌ی انتشار به مقدار عددی استاندارد (1=عمومی، 2=استانی، 3=واحد، 4=خاص)
const parseClassification = (c) => {
  const map = { "عمومی": 1, "استانی": 2, "واحد": 3, "خاص": 4 };
  if (map[c]) return map[c];
  const num = parseInt(c);
  return [1, 2, 3, 4].includes(num) ? num : 1;
};

// تابع معکوس برای مپ کردن فیلد عددی دامنه‌ی انتشار به برچسب متنی فارسی
const mapClassificationToFa = (cNum) => {
  const num = parseInt(cNum);
  if (num === 4) return "خاص";
  if (num === 3) return "واحد";
  if (num === 2) return "استانی";
  return "عمومی";
};

// دریافت انواع گزارش
router.get("/types", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title_fa, type_code FROM tbl_report_types ORDER BY id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// دریافت سوابق اخیر بر اساس موضوع
router.get("/by-topic", auth, async (req, res) => {
  const { topic } = req.query;
  const { id, unitcd } = req.user;
  try {
    const query = `
      SELECT title, raw_text, date, time 
      FROM tbl_unit_events 
      WHERE chat_title = $1 AND sender_id = $2 AND unitcd = $3 
      ORDER BY id DESC LIMIT 3
    `;
    const result = await pool.query(query, [topic, id.toString(), unitcd || 0]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// دریافت گزارش‌های روزانه کاربر همراه با مپ فیلدهای تاریخ و اولویت
router.get("/by-date", auth, async (req, res) => {
  const { date } = req.query; 
  const { id, unitcd } = req.user;
  try {
    const query = `
      SELECT title, 
             raw_text, 
             sender_name, chat_title as category, 
             LPAD(FLOOR(time / 100)::text, 2, '0') || ':' || LPAD((time % 100)::text, 2, '0') as send_time, 
             date, hash_key, state, workflow_logs,
             priority, classification
      FROM tbl_unit_events 
      WHERE date = $1 AND sender_id = $2 AND unitcd = $3 AND (is_deleted = false OR is_deleted IS NULL)
      ORDER BY id ASC
    `;
    
    const result = await pool.query(query, [date, id.toString(), unitcd || 0]);
    
    const formattedRows = result.rows.map(row => ({
      ...row,
      priority: mapPriorityToFa(row.priority),
      classification: mapClassificationToFa(row.classification)
    }));
    
    res.json(formattedRows);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// لیست گزارشات برگشت‌خورده کاربر با مپ فیلدهای جدید
router.get("/rejected-list", auth, async (req, res) => {
  const { id, unitcd } = req.user;
  try {
    const query = `
      SELECT title, 
             raw_text, 
             sender_name, chat_title as category, 
             LPAD(FLOOR(time / 100)::text, 2, '0') || ':' || LPAD((time % 100)::text, 2, '0') as send_time, 
             date, hash_key, state, workflow_logs,
             priority, classification
      FROM tbl_unit_events 
      WHERE sender_id = $1 AND unitcd = $2 AND state = 'rejected' AND (is_deleted = false OR is_deleted IS NULL)
      ORDER BY id DESC
    `;
    
    const result = await pool.query(query, [id.toString(), unitcd || 0]);
    
    const formattedRows = result.rows.map(row => ({
      ...row,
      priority: mapPriorityToFa(row.priority),
      classification: mapClassificationToFa(row.classification)
    }));
    
    res.json(formattedRows);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// تعداد گزارش‌های برگشت‌خورده کاربر
router.get("/rejected-count", auth, async (req, res) => {
  const { id, unitcd } = req.user;
  try {
    const query = `
      SELECT COUNT(*)::int as count 
      FROM tbl_unit_events 
      WHERE sender_id = $1 AND unitcd = $2 AND state = 'rejected' AND (is_deleted = false OR is_deleted IS NULL)
    `;
    const result = await pool.query(query, [id.toString(), unitcd || 0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.json({ count: 0 });
  }
});

// ثبت گزارش جدید (تغییر یافته جهت نوشتن روی raw_text)
router.post("/", auth, async (req, res) => {
  const { title, text, chat_title, message_type, date, priority, classification } = req.body;
  const fieldErr = validateUnitReportPayload({ title, text });
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const { id, name, username, unitcd, statename } = req.user;

  try {
    const now = new Date();
    const timeNumeric = parseInt(
      now.getHours().toString() + now.getMinutes().toString().padStart(2, "0"),
    );
    const hash_key = "K-" + Math.random().toString(36).substring(2, 10);

    const query = `
      INSERT INTO tbl_unit_events (
        unitcd, chat_title, raw_text, title, 
        date, time, news_ts, sender_id, sender_name, 
        province, hash_key, priority, source, 
        message_type, state, classification, "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
    `;

    const values = [
      unitcd || 0, 
      chat_title, 
      text, // متن ارسالی مستقیم در فیلد خام دیتابیس (raw_text) ذخیره می‌شود
      title, 
      date, 
      timeNumeric, 
      timeNumeric.toString(),
      id.toString(), 
      name || username, 
      statename || "", 
      hash_key, 
      parsePriority(priority), // اعمال تبدیل استاندارد اولویت‌ها
      "WEB_APP", 
      message_type, 
      "pending",
      parseClassification(classification), // دامنه‌ی انتشار گزارش (عمومی/استانی/واحد/خاص)
    ];

    await pool.query(query, values);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ویرایش و ارسال مجدد توسط کاربر (بروزرسانی روی فیلد جدید workflow_logs و raw_text)
router.put("/update/:hash_key", auth, async (req, res) => {
  const { hash_key } = req.params;
  const { title, text: userEditedText, chat_title, message_type, priority, classification } = req.body;
  const fieldErr = validateUnitReportPayload({ title, text: userEditedText });
  if (fieldErr) return res.status(400).json({ error: fieldErr });
  const { id } = req.user;

  try {
    const checkQuery = `SELECT state, workflow_logs FROM tbl_unit_events WHERE hash_key = $1 AND sender_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`;
    const result = await pool.query(checkQuery, [hash_key, id.toString()]);

    if (result.rows.length === 0) return res.status(404).json({ error: "گزارش یافت نشد" });
    if (result.rows[0].state === "verified") return res.status(403).json({ error: "گزارش تایید شده قابل ویرایش نیست" });

    const oldComment = result.rows[0].workflow_logs || "";
    const logDate = getPersianDateTimeLog();
    
    const userFixLog = `[${logDate}] اصلاحیه کاربر: گزارش ویرایش و مجدداً ارسال شد.`;
    const updatedCommentLog = oldComment ? `${oldComment}\n${userFixLog}` : userFixLog;

    const updateQuery = `
      UPDATE tbl_unit_events 
      SET title = $1, 
          raw_text = $2, 
          chat_title = $3, 
          message_type = $4, 
          priority = $5, 
          state = 'pending', 
          workflow_logs = $6, 
          classification = $7, 
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE hash_key = $8
    `;
    
    await pool.query(updateQuery, [
      title, 
      userEditedText, 
      chat_title, 
      message_type, 
      parsePriority(priority), 
      updatedCommentLog, 
      parseClassification(classification), 
      hash_key
    ]);

    res.json({ success: true, message: "گزارش با موفقیت ویرایش و در صف بررسی قرار گرفت." });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// حذف منطقی گزارش توسط کاربر
router.delete("/delete/:hash_key", auth, async (req, res) => {
  const { hash_key } = req.params;
  const { id } = req.user;
  try {
    const checkQuery = `SELECT state FROM tbl_unit_events WHERE hash_key = $1 AND sender_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`;
    const checkRes = await pool.query(checkQuery, [hash_key, id.toString()]);

    if (checkRes.rows.length === 0)
      return res.status(404).json({ error: "گزارش یافت نشد" });
    if (checkRes.rows[0].state === "verified")
      return res
        .status(403)
        .json({ error: "گزارشات تایید شده قابل حذف نیستند" });

    await pool.query(
      `UPDATE tbl_unit_events SET is_deleted = true, "updatedAt" = CURRENT_TIMESTAMP WHERE hash_key = $1`,
      [hash_key],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// روت اقدام مدیریت با اصلاح فیلدهای جدید (manager_notes و workflow_logs)
router.put("/admin/verify/:hash_key", auth, async (req, res) => {
  const { hash_key } = req.params;
  const { title, chat_title, cleaned_text, admin_note, priority, quality, state, manager_comment, classification } = req.body;
  const fieldErr = validateMonitorVerifyPayload({ title, cleaned_text, admin_note, manager_comment });
  if (fieldErr) return res.status(400).json({ error: fieldErr });

  try {
    const selectQuery = `SELECT workflow_logs FROM tbl_unit_events WHERE hash_key = $1`;
    const currentRes = await pool.query(selectQuery, [hash_key]);
    const oldComment = currentRes.rows[0]?.workflow_logs || "";

    let finalCommentLog = oldComment;

    if (manager_comment && manager_comment.trim()) {
      const logDate = getPersianDateTimeLog();
      const actionTitle = state === "pending" ? "بازگشت به در انتظار" : (state === "rejected" ? "برگشت به کاربر" : "توضیحات مدیریت");
      const newLogEntry = `[${logDate}] ${actionTitle}: ${manager_comment}`;
      finalCommentLog = oldComment ? `${oldComment}\n${newLogEntry}` : newLogEntry;
    } else if (state === "verified" && !oldComment.includes("تایید و انتشار نهایی")) {
      const logDate = getPersianDateTimeLog();
      finalCommentLog = oldComment ? `${oldComment}\n[${logDate}] تایید و انتشار نهایی گزارش.` : `[${logDate}] تایید و انتشار نهایی گزارش.`;
    }

    const query = `
      UPDATE tbl_unit_events
      SET title = $1,
          chat_title = $2,
          cleaned_text = $3, 
          manager_notes = $4, 
          priority = $5, 
          quality = $6, 
          state = $7, 
          workflow_logs = $8, 
          classification = $9, 
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE hash_key = $10
    `;

    await pool.query(query, [
      title || null,
      chat_title || null,
      cleaned_text, 
      admin_note,
      parsePriority(priority), 
      parseInt(quality) || 1, 
      state, 
      finalCommentLog || null, 
      parseClassification(classification), 
      hash_key
    ]);

    res.json({ success: true, message: "وضعیت گزارش با موفقیت بروزرسانی شد." });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// حذف منطقی گزارش توسط مدیریت
router.delete("/admin/delete/:hash_key", auth, async (req, res) => {
  const { hash_key } = req.params;
  try {
    await pool.query(
      `UPDATE tbl_unit_events SET is_deleted = true, "updatedAt" = CURRENT_TIMESTAMP WHERE hash_key = $1`,
      [hash_key],
    );
    res.json({
      success: true,
      message: "گزارش با موفقیت به سطل زباله منتقل شد.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/filters-data", auth, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const query = `
      SELECT DISTINCT u."StateName", r.chat_title as "Topic", u."UnitCode", u."UnitShortName"
      FROM tbl_unit_events r
      LEFT JOIN tbl_units u ON r.unitcd = u."UnitCode"
      WHERE r.date BETWEEN $1 AND $2
    `;
    const result = await pool.query(query, [startDate, endDate]);
    const states = [
      ...new Set(result.rows.map((r) => r.StateName).filter(Boolean)),
    ];
    const topics = [
      ...new Set(result.rows.map((r) => r.Topic).filter(Boolean)),
    ];
    const units = result.rows
      .filter((r) => r.UnitCode)
      // فیلد استان (province) به ساختار نگاشت یگان اضافه شد تا فیلترهای ادمین بر اساس استان به درستی اعمال شوند
      .map((r) => ({ id: r.UnitCode, name: r.UnitShortName, province: r.StateName }))
      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
    res.json({ states, topics, units });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/provinces", auth, async (req, res) => {
  try {
    const query = `SELECT DISTINCT u."StateName" FROM tbl_unit_events e JOIN tbl_units u ON e.unitcd = u."UnitCode" ORDER BY u."StateName"`;
    const result = await pool.query(query);
    res.json(result.rows.map((row) => row.StateName).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** ۴ یادداشت آخر مدیریت برای یک موضوع مشخص */
router.get("/admin/manager-notes-by-topic", auth, async (req, res) => {
  const { topic, excludeHash, limit = 4 } = req.query;
  if (!topic || !String(topic).trim()) return res.json([]);

  try {
    const params = [String(topic).trim()];
    let query = `
      SELECT manager_notes, hash_key, "updatedAt", date, time
      FROM tbl_unit_events
      WHERE chat_title = $1
        AND manager_notes IS NOT NULL
        AND TRIM(manager_notes) <> ''
        AND (is_deleted = false OR is_deleted IS NULL)
    `;
    if (excludeHash) {
      params.push(excludeHash);
      query += ` AND hash_key <> $${params.length}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 4, 10));
    query += ` ORDER BY "updatedAt" DESC NULLS LAST, date DESC, time DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// لیست پایش ادمین با پشتیبانی کامل از انواع فیلترها (استان، موضوع، کد یگان، اولویت و...)
router.get("/admin/monitor", auth, async (req, res) => {
  const {
    startDate,
    endDate,
    search,
    topic,
    province, // دریافت مقدار تک استان فیلتر جاری فرانت‌اند
    provinces, // دریافت آرایه به صورت چند انتخابی قدیمی
    unitcd, // دریافت پارامتر فیلتر واحد (کد یگان) به صورت Integer عددی
    priority,
    state,
    quality,
    classification,
    deleted,
  } = req.query;
  try {
    let query = `SELECT e.*, u."UnitShortName", u."StateName" 
                 FROM tbl_unit_events e 
                 LEFT JOIN tbl_units u ON e.unitcd = u."UnitCode" 
                 WHERE 1=1`;
    const params = [];

    if (startDate && endDate) {
      params.push(startDate);
      params.push(endDate);
      query += ` AND e.date BETWEEN $1 AND $2`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.raw_text ILIKE $${params.length} OR e.cleaned_text ILIKE $${params.length} OR u."UnitShortName" ILIKE $${params.length})`;
    }
    if (topic) {
      params.push(topic);
      query += ` AND e.chat_title = $${params.length}`;
    }
    if (priority) {
      params.push(parsePriority(priority)); 
      query += ` AND e.priority = $${params.length}`;
    }
    if (quality) {
      params.push(parseInt(quality));
      query += ` AND e.quality = $${params.length}`;
    }
    if (classification) {
      params.push(parseClassification(classification));
      query += ` AND e.classification = $${params.length}`;
    }
    if (state !== undefined && state !== "" && state !== "all") {
      params.push(state);
      query += ` AND e.state = $${params.length}`;
    }
    
    // اعمال شرط فیلتر روی کد یگان (unitcd) در دیتابیس واقعه‌ها
    if (unitcd) {
      params.push(parseInt(unitcd));
      query += ` AND e.unitcd = $${params.length}`;
    }

    // اعمال فیلتر بر اساس تک استان منتخب در فیلتر جاری
    if (province) {
      params.push(province);
      query += ` AND u."StateName" = $${params.length}`;
    } else if (provinces) {
      const pList = provinces.split(",").filter((x) => x);
      if (pList.length) {
        params.push(pList);
        query += ` AND u."StateName" = ANY($${params.length}::text[])`;
      }
    }

    if (deleted === "true") {
      query += ` AND e.is_deleted = true`;
    } else {
      query += ` AND (e.is_deleted = false OR e.is_deleted IS NULL)`;
    }

    query += ` ORDER BY e.date DESC, e.time DESC LIMIT 1000`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/summary-stats", auth, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let query = `
      SELECT COUNT(*) as total_reports, COUNT(*) FILTER (WHERE state = 'verified') as verified_count,
      COUNT(*) FILTER (WHERE state = 'rejected') as rejected_count, ROUND(AVG(quality), 1) as avg_quality
      FROM tbl_unit_events WHERE (is_deleted = false OR is_deleted IS NULL)
    `;
    const params = [];
    if (startDate && endDate) {
      query += ` AND date BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/advanced", auth, getAdvancedReports);
router.post("/return/:id", auth, returnReport);
router.put("/update-admin/:id", auth, updateReportByManager);

router.get("/ai/form-actions", auth, fieldMgmtAiRoles, async (req, res) => {
  try {
    const form_name = String(req.query.form_name || "").trim();
    if (!validateFormActionName(form_name)) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    const rows = await listActiveActionsForForm(form_name);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai/run", auth, fieldMgmtAiRoles, async (req, res) => {
  try {
    const { form_name, action_name, form_data } = req.body || {};
    if (!validateFormActionName(String(form_name || "").trim())) {
      return res.status(400).json({ error: "form_name نامعتبر است" });
    }
    if (!validateFormActionName(String(action_name || "").trim())) {
      return res.status(400).json({ error: "action_name نامعتبر است" });
    }
    const fe = validateFormDataObject(form_data);
    if (fe) return res.status(400).json({ error: fe });
    const data = await executeFormAiAction({
      formName: String(form_name).trim(),
      actionName: String(action_name).trim(),
      formData: form_data,
      userId: req.user?.id ?? null,
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// تعریف روت مانیتورینگ ادمین
router.get("/admin/unit-rankings", auth, getUnitRankings);

router.use(managementSummaryRoutes);

export default router;