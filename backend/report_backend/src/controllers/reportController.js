import pool from "../db.js";
import {
  fieldReportListScopeSql,
  fieldReportTypeJoinSql,
} from "../services/instanceScopeService.js";

// تابع کمکی لاگ زمانی شمسی برای ردیابی خطاها در بک‌باند
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

// 🌟 تابع کمکی محاسبه دقیق تفاضل روزهای تقویمی جلالی (حتی بین سال‌های مختلف)
const getJalaaliDiff = (start, end) => {
  const getDays = (dateStr) => {
    // تبدیل فرمت "YYYY-MM-DD" به روز مطلق
    const [y, m, d] = dateStr.split("-").map(Number);
    let total = y * 365 + Math.floor((y - 1) / 4); // تقریب کبیسه‌های جلالی
    const monthDays = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    for (let i = 1; i < m; i++) {
      total += monthDays[i];
    }
    total += d;
    return total;
  };
  return getDays(end) - getDays(start) + 1; // شامل هر دو روز ابتدایی و انتهایی (Inclusive)
};

// دریافت گزارش‌های پیشرفته با اعمال فیلترها و مرتب‌سازی در بک‌باند
// نرمال‌سازی دامنه‌ی انتشار به مقدار عددی استاندارد (1=عمومی، 2=استانی، 3=واحد، 4=خاص)
const parseClassification = (c) => {
  const map = { "عمومی": 1, "استانی": 2, "واحد": 3, "خاص": 4 };
  if (map[c]) return map[c];
  const num = parseInt(c, 10);
  return [1, 2, 3, 4].includes(num) ? num : 1;
};

export const getAdvancedReports = async (req, res) => {
  const { startDate, endDate, unitcd, province, priority, quality, state, classification } = req.query;
  try {
    let query = `
      SELECT r.*, u."UnitShortName", u."StateName"
      FROM tbl_unit_events r
      LEFT JOIN tbl_units u ON r.unitcd = u."UnitCode"
      ${fieldReportTypeJoinSql("r")}
      WHERE 1=1
      ${fieldReportListScopeSql("r", "rt_scope")}
    `;
    const params = [];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND r.date BETWEEN $1 AND $2`;
    }

    if (unitcd) {
      params.push(parseInt(unitcd, 10));
      query += ` AND r.unitcd = $${params.length}`;
    }

    if (province) {
      params.push(province);
      query += ` AND u."StateName" = $${params.length}`;
    }

    if (priority) {
      params.push(parseInt(priority, 10));
      query += ` AND r.priority = $${params.length}`;
    }

    // فیلترینگ بر مبنای کیفیت ۵ تایی جدید
    if (quality) {
      params.push(parseInt(quality, 10));
      query += ` AND r.quality = $${params.length}`;
    }

    // فیلترینگ بر مبنای دامنه‌ی انتشار (عمومی/استانی/واحد/خاص)
    if (classification) {
      params.push(parseClassification(classification));
      query += ` AND r.classification = $${params.length}`;
    }

    if (state && state !== "all") {
      params.push(state);
      query += ` AND r.state = $${params.length}`;
    }

    query += ` AND (r.is_deleted = false OR r.is_deleted IS NULL) ORDER BY r.date DESC, r.time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// اقدام سریع مدیریت: برگشت گزارش با ثبت علت عودت و درج در لاگ رفت‌وبرگشت جریان‌کاری (workflow_logs)
export const returnReport = async (req, res) => {
  const { id } = req.params; // دریافت شناسه واقعه (hash_key یا id)
  const { comment } = req.body; // علت عودت گزارش به یگان

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "ثبت علت برگشت گزارش الزامی است." });
  }

  try {
    // واکشی جریان‌کاری فعلی گزارش جهت الحاق لاگ جدید به صورت ترتیبی
    const selectQuery = `
      SELECT e.workflow_logs FROM tbl_unit_events e
      ${fieldReportTypeJoinSql("e")}
      WHERE (e.id::text = $1 OR e.hash_key = $1)
        ${fieldReportListScopeSql("e", "rt_scope")}
    `;
    const currentRes = await pool.query(selectQuery, [id]);
    
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: "گزارش مورد نظر یافت نشد." });
    }

    const oldComment = currentRes.rows[0].workflow_logs || "";
    const logDate = getPersianDateTimeLog();
    const newLogEntry = `[${logDate}] برگشت به یگان: ${comment.trim()}`;
    const finalCommentLog = oldComment ? `${oldComment}\n${newLogEntry}` : newLogEntry;

    // عودت گزارش: تغییر وضعیت به rejected و ثبت علت در فیلد workflow_logs دیتابیس
    const updateQuery = `
      UPDATE tbl_unit_events
      SET state = 'rejected',
          workflow_logs = $1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $2 OR hash_key = $2
    `;

    await pool.query(updateQuery, [finalCommentLog, id]);
    res.json({ success: true, message: "گزارش با موفقیت عودت داده شد." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// تایید و ویراستاری نهایی گزارشات توسط مدیر ارشد (با اعمال رده کیفی ۵ ستاره جدید)
export const updateReportByManager = async (req, res) => {
  const { id } = req.params; // شناسه گزارش
  const { title, chat_title, cleaned_text, admin_note, priority, quality, state, manager_comment, classification } = req.body;

  try {
    const selectQuery = `
      SELECT e.workflow_logs FROM tbl_unit_events e
      ${fieldReportTypeJoinSql("e")}
      WHERE (e.id::text = $1 OR e.hash_key = $1)
        ${fieldReportListScopeSql("e", "rt_scope")}
    `;
    const currentRes = await pool.query(selectQuery, [id]);
    
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: "گزارش مورد نظر یافت نشد." });
    }

    const oldComment = currentRes.rows[0].workflow_logs || "";
    let finalCommentLog = oldComment;

    // مدیریت لاگ چرخه رفت‌وبرگشت جریان‌کاری در دیتابیس
    if (manager_comment && manager_comment.trim()) {
      const logDate = getPersianDateTimeLog();
      const actionTitle = state === "pending" ? "بازگشت به در انتظار" : (state === "rejected" ? "برگشت به کاربر" : "توضیحات مدیریت");
      const newLogEntry = `[${logDate}] ${actionTitle}: ${manager_comment.trim()}`;
      finalCommentLog = oldComment ? `${oldComment}\n${newLogEntry}` : newLogEntry;
    } else if (state === "verified" && !oldComment.includes("تایید و انتشار نهایی")) {
      const logDate = getPersianDateTimeLog();
      finalCommentLog = oldComment ? `${oldComment}\n[${logDate}] تایید و انتشار نهایی گزارش.` : `[${logDate}] تایید و انتشار نهایی گزارش.`;
    }

    // اعمال کیفیت ۵ ستاره جدید با بررسی دامنه [1, 5]
    const validatedQuality = parseInt(quality, 10);
    const finalQuality = (validatedQuality >= 1 && validatedQuality <= 5) ? validatedQuality : 3; // پیش‌فرض متوسط

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
      WHERE id = $10 OR hash_key = $10
    `;

    await pool.query(query, [
      title ? title.trim() : null,
      chat_title,
      cleaned_text ? cleaned_text.trim() : null, 
      admin_note ? admin_note.trim() : null, 
      parseInt(priority, 10) || 1, 
      finalQuality, // ذخیره مقدار تایید شده در بازه ۱ تا ۵
      state, 
      finalCommentLog || null, 
      parseClassification(classification), 
      id
    ]);

    res.json({ success: true, message: "گزارش با موفقیت ویرایش و تایید نهایی شد." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🌟 روت جدید و فوق‌العاده پیشرفته رتبه‌بندی علمی یگان‌ها بر اساس امتیازدهی کیفی-کمی پویا و فیلتر کف فعالیت ۲ گزارش در روز محدوده
export const getUnitRankings = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let query = `
      SELECT 
        r.unitcd,
        COALESCE(u."UnitShortName", 'واحد ' || r.unitcd::text) as unit_name,
        COUNT(r.id)::float as total_reports,
        AVG(r.quality)::float as avg_quality,
        AVG(r.priority)::float as avg_priority
      FROM tbl_unit_events r
      LEFT JOIN tbl_units u ON r.unitcd = u."UnitCode"
      ${fieldReportTypeJoinSql("r")}
      WHERE (r.is_deleted = false OR r.is_deleted IS NULL)
      ${fieldReportListScopeSql("r", "rt_scope")}
    `;
    const params = [];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND r.date BETWEEN $1 AND $2`;
    }

    query += ` GROUP BY r.unitcd, u."UnitShortName"`;

    const result = await pool.query(query, params);

    // 🌟 محاسبه روزهای بازه تقویمی بر مبنای تفاضل تاریخ انتخابی گزارشات (نه روزهای فعالیت هر واحد)
    let rangeDays = 1;
    if (startDate && endDate) {
      rangeDays = getJalaaliDiff(startDate, endDate);
    } else {
      // در صورتی که به هر دلیلی بازه فرستاده نشده باشد، بازه پیش‌فرض کل گزارشات ثبت شده محاسبه می‌شود
      const dateBoundaries = await pool.query(
        `SELECT MIN(e.date) as min_d, MAX(e.date) as max_d
         FROM tbl_unit_events e
         ${fieldReportTypeJoinSql("e")}
         WHERE (e.is_deleted = false OR e.is_deleted IS NULL)
           ${fieldReportListScopeSql("e", "rt_scope")}`,
      );
      const minD = dateBoundaries.rows[0]?.min_d;
      const maxD = dateBoundaries.rows[0]?.max_d;
      if (minD && maxD) {
        rangeDays = getJalaaliDiff(minD, maxD);
      }
    }
    if (rangeDays <= 0) rangeDays = 1; // مهار تقسیم بر صفر

    // محاسبه زنده فرمول امتیازدهی و اعمال شرط حداقل فعالیت ۲ گزارش در روز بازه انتخابی
    const rankings = result.rows
      .map((row) => {
        const totalReports = row.total_reports || 0;
        const avgQuality = row.avg_quality || 0;
        const avgPriority = row.avg_priority || 0;

        // محاسبه نرخ ارسال گزارش بر اساس روزهای کل محدوده تقویمی گزارش
        const reportsPerDay = totalReports / rangeDays;

        // ضریب فعالیت = تعداد گزارش بر تعداد کل روزهای محدوده
        const multiplier = reportsPerDay;

        // امتیاز نهایی = کیفیت * اولویت * ضریب
        const score = avgQuality * avgPriority * multiplier;

        return {
          unitcd: row.unitcd,
          unit_name: row.unit_name,
          total_reports: totalReports,
          range_days: rangeDays, // تعداد روز کل محدوده
          avg_quality: parseFloat(avgQuality.toFixed(2)),
          avg_priority: parseFloat(avgPriority.toFixed(2)),
          reports_per_day: parseFloat(reportsPerDay.toFixed(2)),
          score: parseFloat(score.toFixed(2))
        };
      })
      // 🌟 فیلتر حفاظتی: اگر نسبت تعداد گزارش بر روزهای کل محدوده کمتر از ۲ باشد، کلاً محاسبه نشود
      .filter((item) => item.reports_per_day >= 1.0)
      // مرتب‌سازی به ترتیب رتبه از بیشترین امتیاز به کمترین
      .sort((a, b) => b.score - a.score);

    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

