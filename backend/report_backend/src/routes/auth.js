import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../db.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // ۱. کوئری اصلاح شده: فیلدها از جدول کاربر و استان از جدول واحدها
    const query = `
      SELECT 
        u.id, u.username, u.name, u.password, u.role, u.gender, u.active, u.unit_cd,
        un."StateName", un."UnitShortName"
      FROM tbl_users u
      LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
      WHERE u.username = $1
    `;
    
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "کاربر یافت نشد" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "رمز عبور اشتباه است" });
    }

    if (!user.active) {
      return res.status(403).json({ error: "حساب کاربری شما غیرفعال است" });
    }

    // ۲. ساخت توکن با فیلدهای صحیح و JOIN شده
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        name: user.name,
        gender: user.gender === "female" ? "female" : "male",
        unitcd: user.unit_cd,
        unitName: user.UnitShortName,
        statename: user.StateName,
        role: user.role
      }, 
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "24h" }
    );

    console.log(`✅ ورود موفق: ${username} | واحد: ${user.unit_cd} | استان: ${user.StateName}`);

    res.json({
      token,
      role: user.role,
      unitcd: user.unit_cd,
      userName: user.username,
      name: user.name,
      gender: user.gender === "female" ? "female" : "male",
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
