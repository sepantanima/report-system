// middleware/auth.js اصلاح شده
import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "token required" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "mysecretkey" // همون کلیدی که در فایل لاگین استفاده کردی
    );

    // حالا اطلاعات کاربر (id, username, unitcd, role) توی req.user هست
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ error: "invalid token" });
  }
}