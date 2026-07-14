/** خبر واجد شرایط پالایش هوشمند در لیست فعلی */
export function isEditorialCandidate(item) {
  if (!item) return false;
  const ed = item.editorial_state || "pending";
  const rel = item.relevance_status || "unset";
  const dup = item.duplicate_status || "none";
  if (dup !== "none") return false;
  return ed === "pending" || (ed === "ai" && rel === "unset");
}

export const EDITORIAL_MAX_PER_RUN = 500;
