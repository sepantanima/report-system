export class DuplicateCheckError extends Error {
  /**
   * @param {'duplicate_exact'|'duplicate_similar'} code
   * @param {Array} matches
   */
  constructor(code, matches) {
    super(code === "duplicate_exact" ? "خبر تکراری یافت شد" : "خبر مشابه یافت شد");
    this.name = "DuplicateCheckError";
    this.code = code;
    this.matches = matches;
    this.can_force = true;
    this.duplicateCheck = true;
  }
}

/** @param {import('express').Response} res */
export function sendDuplicateCheckResponse(res, err) {
  return res.status(409).json({
    code: err.code,
    matches: err.matches,
    can_force: true,
    error: err.message,
  });
}

/** @param {unknown} err */
export function isDuplicateCheckError(err) {
  return err instanceof DuplicateCheckError || err?.duplicateCheck === true;
}
