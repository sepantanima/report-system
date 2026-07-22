import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import { getEffectivePermissions } from "../services/rbacService.js";
import { hubSyncCapabilities } from "../services/instanceScopeService.js";
import { getOrgCode, getOrgRole, getInstanceMode } from "../services/instanceConfig.js";

const router = Router();

async function buildAuthPayload(user) {
  const { permissions, roleTemplates, permission_version } = await getEffectivePermissions(
    user.id,
    user.role,
  );
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    gender: user.gender === "female" ? "female" : "male",
    unitcd: user.unit_cd,
    unitName: user.UnitShortName,
    statename: user.StateName,
    role: user.role,
    role_templates: roleTemplates,
    permissions,
    permission_version,
    org_code: getOrgCode(),
    org_role: getOrgRole(),
    instance_mode: getInstanceMode(),
  };
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
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

    const authPayload = await buildAuthPayload(user);

    const token = jwt.sign(
      authPayload,
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "24h" },
    );

    res.json({
      token,
      role: user.role,
      role_templates: authPayload.role_templates,
      permissions: authPayload.permissions,
      permission_version: authPayload.permission_version,
      org_code: authPayload.org_code,
      org_role: authPayload.org_role,
      instance_mode: authPayload.instance_mode,
      unitcd: user.unit_cd,
      userName: user.username,
      name: user.name,
      gender: authPayload.gender,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.name, u.role, u.gender, u.active, u.unit_cd,
              un."StateName", un."UnitShortName"
       FROM tbl_users u
       LEFT JOIN tbl_units un ON u.unit_cd = un."UnitCode"
       WHERE u.id = $1`,
      [req.user.id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }
    const user = result.rows[0];
    const authPayload = await buildAuthPayload(user);
    res.json({
      ...authPayload,
      active: user.active,
      capabilities: hubSyncCapabilities(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
