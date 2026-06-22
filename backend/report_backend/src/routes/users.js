import express from "express";
const router = express.Router();
import pool from "../db.js";
import bcrypt from "bcrypt";
import auth from "../middleware/auth.js"; // میدل‌ور احراز هویت جهت شناسایی کاربر جاری

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

// ۳. دریافت لیست کاربران با نام واحد (مختص ادمین کل)
router.get("/", auth, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.name, u.role, u.active, u.unit_cd, un."UnitShortName"
      FROM tbl_users u
      LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
      ORDER BY u.id DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);  
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۴. افزودن کاربر جدید توسط ادمین (با هش کردن پسورد)
router.post("/", auth, async (req, res) => {
  const { username, name, password, role, unit_cd } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO tbl_users (username, name, password, role, unit_cd, active)
      VALUES ($1, $2, $3, $4, $5, true) RETURNING *
    `;
    const result = await pool.query(query, [username, name, hashedPassword, role, unit_cd]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۵. ویرایش کاربر توسط ادمین (روت پارامتریک - به پایین‌ترین بخش روت‌ها منتقل شد)
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { username, name, role, unit_cd, active, password } = req.body;
  
  try {
    let query;
    let params;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, role=$3, unit_cd=$4, active=$5, password=$6 
        WHERE id=$7`;
      params = [username, name, role, unit_cd, active, hashedPassword, id];
    } else {
      query = `
        UPDATE tbl_users 
        SET username=$1, name=$2, role=$3, unit_cd=$4, active=$5 
        WHERE id=$6`;
      params = [username, name, role, unit_cd, active, id];
    }

    await pool.query(query, params);
    res.json({ message: "بروزرسانی موفق" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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