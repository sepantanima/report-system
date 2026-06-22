/** برش متن به حداکثر طول مجاز — برای onChange فیلدها */
export function clampText(value, max) {
  if (max == null || max < 0) return value ?? "";
  return String(value ?? "").slice(0, max);
}

export function createLimitedChange(setter, field, max) {
  return (e) => {
    const next = clampText(e.target.value, max);
    if (typeof setter === "function") {
      setter((prev) => (typeof prev === "object" && prev !== null ? { ...prev, [field]: next } : next));
    }
  };
}

export function createLimitedSetter(setValue, max) {
  return (value) => setValue(clampText(value, max));
}
