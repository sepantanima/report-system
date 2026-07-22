/**
 * نمایش خطای API با hint عملیاتی (مخصوصاً HUB_CAPABILITY_DENIED)
 */
export function formatApiError(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || "خطای نامشخص";

  if (data.code === "HUB_CAPABILITY_DENIED") {
    const parts = [data.error || data.title];
    if (data.hint) parts.push("", "راهنمای عملیاتی:", data.hint);
    if (data.current_instance_mode_fa) {
      parts.push("", `محیط فعلی: ${data.current_instance_mode_fa}`);
    }
    return parts.filter(Boolean).join("\n");
  }

  return data.error || data.message || err.message || "خطای نامشخص";
}

export function isHubCapabilityError(err) {
  return err?.response?.data?.code === "HUB_CAPABILITY_DENIED";
}

export function getHubErrorDetails(err) {
  const data = err?.response?.data;
  if (data?.code !== "HUB_CAPABILITY_DENIED") return null;
  return {
    title: data.title || "عملیات در این محیط مجاز نیست",
    error: data.error,
    hint: data.hint,
    currentMode: data.current_instance_mode_fa,
    requiredMode: data.required_mode,
    actionFa: data.action_fa,
  };
}
