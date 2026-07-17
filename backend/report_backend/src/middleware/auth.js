// middleware/auth.js اصلاح شده
import jwt from "jsonwebtoken";
import { touchUserActivity } from "../services/userPresenceService.js";

export default function auth(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "token required", code: "TOKEN_MISSING" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "mysecretkey" // همون کلیدی که در فایل لاگین استفاده کردی
    );

    // حالا اطلاعات کاربر (id, username, unitcd, role) توی req.user هست
    req.user = decoded;
    try {
      if (decoded?.id) touchUserActivity(decoded.id);
    } catch (presenceErr) {
      console.warn("[auth] presence touch failed:", presenceErr.message);
    }
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    const expired = err.name === "TokenExpiredError";
    res.status(401).json({
      error: expired ? "نشست شما منقضی شده — دوباره وارد شوید" : "invalid token",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
}
