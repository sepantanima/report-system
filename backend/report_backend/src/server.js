import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import newsRoutes from "./routes/news.js";
import reportsRoutes from "./routes/reports.js";
import analysisRoutes from "./routes/analysis.js";
import auth from "./middleware/auth.js";

const app = express();

// --- تنظیمات اصلی ---
app.use(cors());
app.use(express.json()); // حتما باید قبل از لاگر باشد تا Body را بخوانیم

// --- لاگر هوشمند و جامع ---
const SHOW_LOGS = true; // <--- هر وقت نخواستی، این را false کن

app.use((req, res, next) => {
  if (!SHOW_LOGS) return next();

  const now = new Date().toLocaleTimeString("fa-IR");
  const userAgent = req.headers["user-agent"] || "Unknown";

  // لاگ پایه: متد و آدرس
  console.log(`\n🔹 [${now}] ${req.method} --> ${req.url}`);

  // لاگ پارامترهای URL (Query)
  if (Object.keys(req.query).length > 0) {
    console.log(`   🔎 Query:`, JSON.stringify(req.query, null, 2));
  }

  // لاگ دیتای ارسالی (Body) - مخصوص POST و PUT
  if (Object.keys(req.body).length > 0) {
    // برای امنیت، پسورد را در لاگ نشان نمی‌دهیم
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = "******";
    console.log(`   📦 Body:`, JSON.stringify(safeBody, null, 2));
  }

  // لاگ دستگاه
  const isMobile = /mobile/i.test(userAgent);
  console.log(`   📱 Device: ${isMobile ? "Mobile" : "Desktop"}`);

  console.log(`   ─────────────────────────────────────────`);
  next();
});

// --- مسیرها (Routes) ---
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/analysis", auth, analysisRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Report API running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(">>> Environment loaded successfully <<<");
});
