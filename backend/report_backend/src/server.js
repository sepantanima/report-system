import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import newsRoutes from "./routes/news.js";
import reportsRoutes from "./routes/reports.js";
import analysisRoutes from "./routes/analysis.js";
import auth from "./middleware/auth.js";
import adminPromptsRoutes from "./routes/adminPrompts.js";
import adminAiApiConfigsRoutes from "./routes/adminAiApiConfigs.js";
import adminAiProviderTemplatesRoutes from "./routes/adminAiProviderTemplates.js";
import adminAiFormActionsRoutes from "./routes/adminAiFormActions.js";
import adminAiRunLogsRoutes from "./routes/adminAiRunLogs.js";
import adminNewsCleanPatternsRoutes from "./routes/adminNewsCleanPatterns.js";
import adminMessengerChannelConfigsRoutes from "./routes/adminMessengerChannelConfigs.js";
import adminMessengerProviderTemplatesRoutes from "./routes/adminMessengerProviderTemplates.js";
import adminNewsReportSettingsRoutes from "./routes/adminNewsReportSettings.js";
import adminFieldReportSettingsRoutes from "./routes/adminFieldReportSettings.js";
import adminNewsEntrySettingsRoutes from "./routes/adminNewsEntrySettings.js";
import messagesRoutes from "./routes/messages.js";
import adminMessageSettingsRoutes from "./routes/adminMessageSettings.js";
import adminUserMessengerAccountsRoutes from "./routes/adminUserMessengerAccounts.js";
import messengerRoutes from "./routes/messengerRoutes.js";
import commandCenterRoutes from "./routes/commandCenter.js";
import { getPdfEngineInfo } from "./services/newsReportPdf.js";

const app = express();

// --- تنظیمات اصلی ---
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
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
    if (req.url.includes("ai-api-configs") && safeBody.credential_secret_cipher) {
      safeBody.credential_secret_cipher = "******";
    }
    if (req.url.includes("messenger-channel-configs") && safeBody.credential_secret_cipher) {
      safeBody.credential_secret_cipher = "******";
    }
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
app.use("/api/admin/prompts", adminPromptsRoutes);
app.use("/api/admin/ai-api-configs", adminAiApiConfigsRoutes);
app.use("/api/admin/ai-provider-templates", adminAiProviderTemplatesRoutes);
app.use("/api/admin/ai/form-actions", adminAiFormActionsRoutes);
app.use("/api/admin/ai-run-logs", adminAiRunLogsRoutes);
app.use("/api/admin/news-clean-patterns", adminNewsCleanPatternsRoutes);
app.use("/api/admin/messenger-channel-configs", adminMessengerChannelConfigsRoutes);
app.use("/api/admin/messenger-provider-templates", adminMessengerProviderTemplatesRoutes);
app.use("/api/admin/news-report", adminNewsReportSettingsRoutes);
app.use("/api/admin/field-report", adminFieldReportSettingsRoutes);
app.use("/api/admin/news-entry", adminNewsEntrySettingsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/admin/message-settings", adminMessageSettingsRoutes);
app.use("/api/admin", adminUserMessengerAccountsRoutes);
app.use("/api/messenger", messengerRoutes);
app.use("/api/command", commandCenterRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Report API running" });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(">>> Environment loaded successfully <<<");
  const pdf = getPdfEngineInfo();
  console.log(
    `[pdf] engine=${pdf.pdf_engine_env} gotenberg=${pdf.gotenberg_configured ? pdf.gotenberg_url : "NOT SET"} chrome=${pdf.chrome_available ? "ok" : "missing"}`,
  );
});
server.timeout = 180000;
server.keepAliveTimeout = 180000;
server.headersTimeout = 185000;
