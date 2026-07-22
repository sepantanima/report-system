import express from "express";
const router = express.Router();
import pool from "../db.js";
import bcrypt from "bcrypt";
import auth from "../middleware/auth.js";
import requirePermission from "../middleware/requirePermission.js";
import { parseUserRoles } from "../middleware/requireRole.js";
import { legacyRoleToTemplate } from "../services/rbacSeedService.js";
import { invalidateUserPermissionCache, bumpPermissionVersion } from "../services/rbacService.js";
import { getBriefStatsForUsers, resolveAnalystRoleSuggestions, countPendingAnalystRoleSuggestions } from "../services/analysisBriefSubmissionService.js";
import { PERMISSION_DESCRIPTIONS, permissionModule } from "../constants/rbacSeed.js";
import {
  createAccountForUser,
  deleteAccount,
  listAccountsForUser,
  updateAccount,
} from "../services/userMessengerAccountService.js";
import { MESSENGER_PLATFORMS } from "../utils/senderResolveSql.js";
import { userRoleTextSelect } from "../utils/userRoleSql.js";

import { pgUniqueViolationMessage } from "../utils/pgErrors.js";

function normalizeGenderInput(value) {
  return value === "female" ? "female" : "male";
}

// =========================================================================
// 🌟 گام اول اصلاحی: روت‌های ثابت (مانند /profile یا /units) باید همیشه بالاتر از 
// روت‌های پارامتریک (مانند /:id) تعریف شوند تا تداخل در تشخیص پارامتر رخ ندهد.
// =========================================================================

// ۱. لیست واحدها برای کمبوباکس (روت ثابت - در بالا قرار گرفت)
router.get("/units", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "UnitCode", "UnitShortName", "StateName",
              COALESCE(NULLIF(TRIM("Name"), ''), "UnitShortName") AS display_name
       FROM tbl_units
       ORDER BY COALESCE(NULLIF(TRIM("Name"), ''), "UnitShortName")`,
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۲. وب‌سرویس به‌روزرسانی پروفایل شخصی و کلمه عبور توسط خود کاربر (روت ثابت)
router.put("/profile", auth, async (req, res) => {
  const userId = req.user.id; // استخراج شناسه عددی معتبر از توکن احراز هویت
  const { name, currentPassword, password } = req.body;

  try {
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "وارد کردن نام و نام خانوادگی الزامی است." });
    }

    let query;
    let params;

    // اگر کاربر درخواست تغییر کلمه عبور داده بود
    if (password && password.trim() !== "") {
      if (!currentPassword) {
        return res.status(400).json({ error: "برای تغییر کلمه عبور، وارد کردن رمز عبور فعلی الزامی است." });
      }

      // الف) واکشی کلمه عبور هش شده فعلی کاربر از دیتابیس
      const userRes = await pool.query("SELECT password FROM tbl_users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: "کاربر یافت نشد." });
      }

      const dbPasswordHash = userRes.rows[0].password;

      // ب) مقایسه پسورد کنونی وارد شده با پسورد هش شده در دیتابیس
      const isMatch = await bcrypt.compare(currentPassword, dbPasswordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "رمز عبور کنونی شما نادرست است." });
      }

      // ج) هش کردن رمز عبور جدید
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      query = `
        UPDATE tbl_users 
        SET name = $1, password = $2 
        WHERE id = $3 
        RETURNING id, username, name
      `;
      params = [name.trim(), hashedPassword, userId];
    } else {
      // اگر تغییر رمز عبور درخواست نشده بود، فقط فیلد نام به‌روزرسانی می‌شود
      query = `
        UPDATE tbl_users 
        SET name = $1 
        WHERE id = $2 
        RETURNING id, username, name
      `;
      params = [name.trim(), userId];
    }

    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      message: "مشخصات پروفایل شما با موفقیت بروزرسانی شد ✅",
      user: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// اکانت‌های پیام‌رسان کاربر جاری
router.get("/me/messenger-accounts", auth, async (req, res) => {
  try {
    res.json(await listAccountsForUser(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me/messenger-platforms", auth, (_req, res) => {
  res.json(MESSENGER_PLATFORMS);
});

router.post("/me/messenger-accounts", auth, async (req, res) => {
  try {
    const row = await createAccountForUser(req.user.id, req.body, { verified: false });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/me/messenger-accounts/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await pool.query(
      `SELECT id FROM tbl_user_messenger_accounts WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: "اکانت یافت نشد." });
    }
    const row = await updateAccount(id, req.body, { admin: false });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/me/messenger-accounts/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteAccount(id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// راهنمای نقش‌ها — مجوزهای زنده از RBAC (برای UI مدیریت کاربران)
router.get("/role-guide", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (_req, res) => {
  try {
    const [rolesRes, permsRes] = await Promise.all([
      pool.query(
        `SELECT rt.code, rt.label_fa, rt.is_system,
                COALESCE(json_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
         FROM tbl_role_templates rt
         LEFT JOIN tbl_role_template_permissions rtp ON rtp.role_template_id = rt.id
         LEFT JOIN tbl_permissions p ON p.id = rtp.permission_id
         GROUP BY rt.id
         ORDER BY rt.code`,
      ),
      pool.query(`SELECT code, label_fa, module FROM tbl_permissions`),
    ]);
    const permMeta = Object.fromEntries(permsRes.rows.map((p) => [p.code, p]));
    res.json({
      roles: rolesRes.rows.map((rt) => ({
        code: rt.code,
        label_fa: rt.label_fa,
        is_system: rt.is_system,
        permissions: (rt.permissions || []).map((code) => ({
          code,
          label_fa: permMeta[code]?.label_fa || code,
          module: permMeta[code]?.module || permissionModule(code),
          description_fa: PERMISSION_DESCRIPTIONS[code] || "",
        })),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// نقش‌های پیش‌فرض فرم «کاربر جدید» (برای مدیران کاربر، بدون نیاز به rbac.manage)
router.get("/new-user-default-roles", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (_req, res) => {
  try {
    const r = await pool.query(`SELECT default_new_user_role_codes FROM tbl_rbac_meta WHERE id = 1`);
    const codes = r.rows[0]?.default_new_user_role_codes;
    res.json({
      role_codes: Array.isArray(codes) && codes.length ? codes : ["user"],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analyst-suggestion-count", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (_req, res) => {
  try {
    const count = await countPendingAnalystRoleSuggestions();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۳. دریافت لیست کاربران
router.get("/", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.name, u.gender, u.active, u.unit_cd, un."UnitShortName",
             ${userRoleTextSelect("u")},
             COALESCE(
               (SELECT json_agg(rt.code ORDER BY rt.code)
                FROM tbl_user_role_assignments ura
                JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
                WHERE ura.user_id = u.id AND ura.active = TRUE),
               '[]'::json
             ) AS role_codes
      FROM tbl_users u
      LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
      ORDER BY u.id DESC
    `;
    const result = await pool.query(query);
    const rows = result.rows;
    if (req.query.include_brief_stats === "true" && rows.length) {
      const stats = await getBriefStatsForUsers(rows.map((u) => u.id));
      return res.json(rows.map((u) => ({
        ...u,
        brief_submission_count: stats[u.id]?.submission_count || 0,
        analyst_suggested: stats[u.id]?.analyst_suggested || false,
        role_codes: Array.isArray(u.role_codes) ? u.role_codes : [],
      })));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۴. افزودن کاربر جدید
router.post("/", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (req, res) => {
  const { username, name, password, role, unit_cd, gender } = req.body;
  try {
    const uname = String(username ?? "").trim();
    if (!uname) return res.status(400).json({ error: "نام کاربری الزامی است" });
    const exists = await pool.query(`SELECT id FROM tbl_users WHERE username = $1`, [uname]);
    if (exists.rows[0]) {
      return res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است — نام دیگری انتخاب کنید" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const roleCodes = parseUserRoles(role).map(legacyRoleToTemplate);

    const query = `
      INSERT INTO tbl_users (username, name, password, unit_cd, gender, active)
      VALUES ($1, $2, $3, $4, $5, true) RETURNING *
    `;
    const result = await pool.query(query, [
      uname,
      name,
      hashedPassword,
      unit_cd,
      normalizeGenderInput(gender),
    ]);
    const newUser = result.rows[0];
    const roles = await pool.query(`SELECT id, code FROM tbl_role_templates WHERE code = ANY($1::text[])`, [roleCodes]);
    for (const rt of roles.rows) {
      await pool.query(
        `INSERT INTO tbl_user_role_assignments (user_id, role_template_id, active) VALUES ($1,$2,TRUE) ON CONFLICT DO NOTHING`,
        [newUser.id, rt.id],
      );
    }
    res.status(201).json(newUser);
  } catch (err) {
    const pgMsg = pgUniqueViolationMessage(err);
    res.status(pgMsg ? 400 : 500).json({ error: pgMsg || err.message });
  }
});

// ۵. ویرایش کاربر توسط ادمین (روت پارامتریک - به پایین‌ترین بخش روت‌ها منتقل شد)
router.put("/:id", auth, requirePermission("manage_users", { legacyRoles: ["admin", "analysis_manager", "Field_admin"] }), async (req, res) => {
  const { id } = req.params;
  const { username, name, role, unit_cd, active, password, gender } = req.body;
  
  try {
    const uname = String(username ?? "").trim();
    if (!uname) return res.status(400).json({ error: "نام کاربری الزامی است" });
    const taken = await pool.query(
      `SELECT id FROM tbl_users WHERE username = $1 AND id <> $2`,
      [uname, id],
    );
    if (taken.rows[0]) {
      return res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است — نام دیگری انتخاب کنید" });
    }

    const roleCodes = parseUserRoles(role).map(legacyRoleToTemplate);

    let query;
    let params;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, unit_cd=$3, active=$4, password=$5, gender=$6
        WHERE id=$7`;
      params = [uname, name, unit_cd, active, hashedPassword, normalizeGenderInput(gender), id];
    } else {
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, unit_cd=$3, active=$4, gender=$5
        WHERE id=$6`;
      params = [uname, name, unit_cd, active, normalizeGenderInput(gender), id];
    }

    await pool.query(query, params);

    const roles = await pool.query(`SELECT id, code FROM tbl_role_templates WHERE code = ANY($1::text[])`, [roleCodes]);
    await pool.query(`UPDATE tbl_user_role_assignments SET active = FALSE WHERE user_id = $1`, [id]);
    for (const rt of roles.rows) {
      await pool.query(
        `INSERT INTO tbl_user_role_assignments (user_id, role_template_id, active)
         VALUES ($1,$2,TRUE) ON CONFLICT (user_id, role_template_id) DO UPDATE SET active = TRUE`,
        [id, rt.id],
      );
    }

    if (roleCodes.includes("analyst")) {
      await resolveAnalystRoleSuggestions(id);
    }

    invalidateUserPermissionCache(id);
    await bumpPermissionVersion();
    res.json({ message: "بروزرسانی موفق" });
  } catch (err) {
    const pgMsg = pgUniqueViolationMessage(err);
    res.status(pgMsg ? 400 : 500).json({ error: pgMsg || err.message });
  }
});

// ۶. حذف کاربر توسط ادمین
router.delete("/:id", auth, requirePermission("manage_users", { legacyRoles: ["admin"] }), async (req, res) => {
  try {
    await pool.query("DELETE FROM tbl_users WHERE id = $1", [req.params.id]);
    res.json({ message: "حذف موفق" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;