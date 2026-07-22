/** @typedef {'male' | 'female'} UserGender */

export const GENDER_OPTIONS = [
  { value: "male", label: "آقا" },
  { value: "female", label: "خانم" },
];

/** @returns {UserGender} */
export function normalizeGender(value) {
  return value === "female" ? "female" : "male";
}

/**
 * متن خوش‌آمدگویی صفحه اصلی بر اساس جنسیت.
 * @returns {{ titleBefore: string | null, name: string, titleAfter: string }}
 */
export function getWelcomeGreeting(name, gender) {
  const displayName = (name || "").trim() || "کاربر محترم";
  if (normalizeGender(gender) === "female") {
    return { titleBefore: "سرکار خانم", name: displayName, titleAfter: "خوش آمدید" };
  }
  return { titleBefore: "جناب آقای", name: displayName, titleAfter: "خوش آمدید" };
}
