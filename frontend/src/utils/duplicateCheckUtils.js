/** @param {import('axios').AxiosError} err */
export function parseDuplicateCheckError(err) {
  if (err?.response?.status !== 409) return null;
  const data = err.response.data;
  if (!data?.code || !Array.isArray(data.matches)) return null;
  if (data.code !== "duplicate_exact" && data.code !== "duplicate_similar") return null;
  return {
    code: data.code,
    matches: data.matches,
    can_force: data.can_force !== false,
  };
}

export function isDuplicateCheckError(err) {
  return parseDuplicateCheckError(err) != null;
}
