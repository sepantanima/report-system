import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = Router();

// مسیر ثبت‌نام
router.post("/register", async (req, res) => {
  const { name, email, password, username } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password, username, role, active)
       VALUES ($1, $2, $3, $4, 'user', true)
       RETURNING id, name, email, username`,
      [name, email, hash, username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Register failed" });
  }
});

// مسیر لاگین (اصلاح شده)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // اصلاح کوئری: اضافه کردن password و active و role
    const result = await db.query(
      "SELECT id, username, password, role, active FROM users WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({ error: "User is inactive" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;