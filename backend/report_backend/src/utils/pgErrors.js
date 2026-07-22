/** پیام کاربرپسند برای خطاهای یکتایی PostgreSQL */
export function pgUniqueViolationMessage(err) {
  if (err?.code !== "23505") return null;
  const c = String(err.constraint || "");
  if (c === "tbl_users_username_key") {
    return "این نام کاربری قبلاً ثبت شده است — نام دیگری انتخاب کنید";
  }
  if (c === "tbl_news_hash_key_key") {
    return "محتوای این خبر با خبر دیگری یکسان است — آن را تکراری علامت بزنید یا متن را تغییر دهید";
  }
  return "مقدار تکراری — این رکورد قبلاً در پایگاه وجود دارد";
}
