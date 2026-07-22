/** Hub / org configuration from environment */

export function getOrgCode() {
  return process.env.ORG_CODE || "Nezaja";
}

export function getOrgRole() {
  const role = (process.env.ORG_ROLE || "standalone").toLowerCase();
  if (["standalone", "parent", "child"].includes(role)) return role;
  return "standalone";
}

export function getInstanceMode() {
  const mode = (process.env.INSTANCE_MODE || "online").toLowerCase();
  return mode === "offline" ? "offline" : "online";
}

export function isOnlineHub() {
  return getInstanceMode() === "online";
}

export function isOfflineHub() {
  return getInstanceMode() === "offline";
}

/** USB فقط آنلاین→آفلاین؛ هیچ فایلی (ack و …) از داخل به خارج با فلش برنگردد */
export function isSyncUsbOneWay() {
  const raw = (process.env.SYNC_USB_ONE_WAY ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0";
}

export function assertHubCapability(capability) {
  const mode = getInstanceMode();
  const caps = {
    "sync.export": mode === "online",
    "sync.import": mode === "offline",
    "sync.briefing": mode === "offline",
    "sync.child_aggregate_export": mode === "online" && getOrgRole() === "child",
    "sync.parent_import": mode === "online" && getOrgRole() === "parent",
  };
  return caps[capability] ?? true;
}

const INSTANCE_MODE_FA = { online: "آنلاین", offline: "آفلاین" };

/** پیام عملیاتی وقتی عملیات با INSTANCE_MODE فعلی سازگار نیست */
export function getHubCapabilityDeniedPayload(capability) {
  const mode = getInstanceMode();
  const modeFa = INSTANCE_MODE_FA[mode] || mode;
  const orgCode = getOrgCode();

  const catalog = {
    "sync.export": {
      title: "خروجی pack فقط از سرور آنلاین",
      error: `در حال حاضر روی hub «${modeFa}» هستید؛ ساخت و دانلود pack همگام‌سازی فقط روی سرور آنلاین ممکن است.`,
      hint: [
        "۱. روی سرور آنلاین (INSTANCE_MODE=online) وارد «مدیریت همگام‌سازی» شوید.",
        "۲. تب «خروجی» → پیش‌نمایش → دانلود فایل pack.",
        "۳. فایل را با USB یا شبکه داخلی به سرور آفلاین منتقل کنید.",
        "۴. روی سرور آفلاین تب «ورود» را باز کنید و pack را import کنید.",
      ].join("\n"),
      required_mode: "online",
      action_fa: "ساخت pack خروجی",
    },
    "sync.import": {
      title: "ورود pack فقط روی سرور آفلاین",
      error: `در حال حاضر روی hub «${modeFa}» هستید؛ import و اعمال pack فقط روی سرور آفلاین (شبکه داخلی) انجام می‌شود.`,
      hint: [
        "۱. ابتدا pack را از سرور آنلاین export و دانلود کنید.",
        "۲. فایل را به سرور آفلاین منتقل کنید.",
        "۳. همین صفحه را روی سرور آفلاین باز کنید → تب «ورود» → انتخاب فایل → پیش‌نمایش → اعمال.",
        "۴. پس از import موفق، روی آنلاین «تأیید تحویل دستی» بزنید — فایل ack با USB برنمی‌گردد.",
      ].join("\n"),
      required_mode: "offline",
      action_fa: "ورود pack",
    },
    "sync.briefing": {
      title: "گزارش راهبر فقط روی سرور آفلاین",
      error: `در حال حاضر روی hub «${modeFa}» هستید؛ گزارش HTML تغییرات کاربر/نقش فقط روی سرور آفلاین تولید می‌شود.`,
      hint: [
        "۱. تغییرات کاربر و نقش را روی همین محیط آفلاین انجام دهید.",
        "۲. از منوی «گزارش راهبر آنلاین» فایل HTML را دانلود کنید.",
        "۳. فایل را (USB) به راهبر سرور آنلاین بدهید تا کاربر/نقش را دستی در پنل آنلاین ثبت کند.",
        "۴. این گزارش داده عملیاتی (اخبار/میدان) را منتقل نمی‌کند — فقط راهنمای اداری است.",
      ].join("\n"),
      required_mode: "offline",
      action_fa: "گزارش راهبر",
    },
    "sync.child_aggregate_export": {
      title: "export تجمیعی فرزند",
      error: `export pack تجمیعی سازمان فرزند روی این hub مجاز نیست (نیاز: آنلاین + ORG_ROLE=child).`,
      hint: "تنظیم env: INSTANCE_MODE=online و ORG_ROLE=child روی hub سازمان فرزند.",
      required_mode: "online",
      action_fa: "export تجمیعی",
    },
    "sync.parent_import": {
      title: "import تجمیعی مادر",
      error: `import pack سازمان‌های فرزند فقط روی hub مادر (ORG_ROLE=parent) انجام می‌شود.`,
      hint: "این عملیات روی hub با ORG_ROLE=parent و INSTANCE_MODE=online فعال است.",
      required_mode: "online",
      action_fa: "import تجمیعی مادر",
    },
  };

  const entry = catalog[capability] || {
    title: "عملیات در این محیط مجاز نیست",
    error: `عملیات «${capability || "نامشخص"}» با hub فعلی (${modeFa}) سازگار نیست.`,
    hint: mode === "online"
      ? "برخی کارها فقط روی سرور آفلاین (import، گزارش راهبر) و برخی فقط روی آنلاین (export) انجام می‌شوند."
      : "برخی کارها فقط روی سرور آنلاین (export) انجام می‌شوند؛ import و گزارش راهبر را همین‌جا انجام دهید.",
    required_mode: null,
    action_fa: capability,
  };

  return {
    ...entry,
    code: "HUB_CAPABILITY_DENIED",
    capability: capability || null,
    current_instance_mode: mode,
    current_instance_mode_fa: modeFa,
    org_code: orgCode,
  };
}
