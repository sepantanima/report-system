export const MESSAGE_TITLE_MAX = 120;
export const MESSAGE_BODY_MAX = 500;

export const DEFAULT_MESSAGE_SETTINGS = {
  max_direct_per_day: 30,
  max_direct_per_hour: 10,
  max_announcements_per_day: 5,
};

export function validateMessagePayload(body = {}, { requireTitle = false } = {}) {
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? body.text ?? "").trim();
  if (requireTitle && !title) return "عنوان پیام الزامی است";
  if (title.length > MESSAGE_TITLE_MAX) return `عنوان حداکثر ${MESSAGE_TITLE_MAX} کاراکتر باشد`;
  if (!text) return "متن پیام الزامی است";
  if (text.length > MESSAGE_BODY_MAX) return `متن پیام حداکثر ${MESSAGE_BODY_MAX} کاراکتر باشد`;
  return null;
}
