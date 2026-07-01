export const MESSAGE_KIND_LABELS = {
  direct: "پیام مستقیم",
  announcement: "ابلاغ",
  entity: "دستور / موجودیت",
};

export const MESSAGE_PRIORITY_LABELS = {
  normal: "عادی",
  important: "مهم",
  order: "دستور",
};

export function kindLabel(kind) {
  return MESSAGE_KIND_LABELS[kind] || kind || "—";
}

export function priorityLabel(priority) {
  return MESSAGE_PRIORITY_LABELS[priority] || priority || "—";
}
