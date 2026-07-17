import express from "express";
const router = express.Router();
import pool from "../db.js";
import bcrypt from "bcrypt";
import auth from "../middleware/auth.js";
import { getBriefStatsForUsers } from "../services/analysisBriefSubmissionService.js";
import {
  createAccountForUser,
  deleteAccount,
  listAccountsForUser,
  updateAccount,
} from "../services/userMessengerAccountService.js";
import { MESSENGER_PLATFORMS } from "../utils/senderResolveSql.js";

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
        RETURNING id, username, name, role
      `;
      params = [name.trim(), hashedPassword, userId];
    } else {
      // اگر تغییر رمز عبور درخواست نشده بود، فقط فیلد نام به‌روزرسانی می‌شود
      query = `
        UPDATE tbl_users 
        SET name = $1 
        WHERE id = $2 
        RETURNING id, username, name, role
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

// ۳. دریافت لیست کاربران با نام واحد (مختص ادمین کل)
router.get("/", auth, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.name, u.role, u.gender, u.active, u.unit_cd, un."UnitShortName"
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
      })));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۴. افزودن کاربر جدید توسط ادمین (با هش کردن پسورد)
router.post("/", auth, async (req, res) => {
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

    const query = `
      INSERT INTO tbl_users (username, name, password, role, unit_cd, gender, active)
      VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *
    `;
    const result = await pool.query(query, [
      uname,
      name,
      hashedPassword,
      role,
      unit_cd,
      normalizeGenderInput(gender),
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    const pgMsg = pgUniqueViolationMessage(err);
    res.status(pgMsg ? 400 : 500).json({ error: pgMsg || err.message });
  }
});

// ۵. ویرایش کاربر توسط ادمین (روت پارامتریک - به پایین‌ترین بخش روت‌ها منتقل شد)
router.put("/:id", auth, async (req, res) => {
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

    let query;
    let params;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, role=$3, unit_cd=$4, active=$5, password=$6, gender=$7
        WHERE id=$8`;
      params = [uname, name, role, unit_cd, active, hashedPassword, normalizeGenderInput(gender), id];
    } else {
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, role=$3, unit_cd=$4, active=$5, gender=$6
        WHERE id=$7`;
      params = [uname, name, role, unit_cd, active, normalizeGenderInput(gender), id];
    }

    await pool.query(query, params);
    res.json({ message: "بروزرسانی موفق" });
  } catch (err) {
    const pgMsg = pgUniqueViolationMessage(err);
    res.status(pgMsg ? 400 : 500).json({ error: pgMsg || err.message });
  }
});

// ۶. حذف کاربر توسط ادمین
router.delete("/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM tbl_users WHERE id = $1", [req.params.id]);
    res.json({ message: "حذف موفق" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;