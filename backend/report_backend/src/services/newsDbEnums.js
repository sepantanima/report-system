/** نرمال‌سازی enumهای ذخیره‌شده با کوتیشن اضافی (مثلاً n8n: 'none') */
export function sqlNewsWorkflow(alias = "bk") {
  return `trim(both '''' from trim(COALESCE(${alias}.workflow_status, 'new')))`;
}

export function sqlNewsReviewState(alias = "bk") {
  return `trim(both '''' from trim(COALESCE(${alias}.review_state, 'pending')))`;
}

export function sqlNewsDuplicateStatus(alias = "bk") {
  return `trim(both '''' from trim(COALESCE(${alias}.duplicate_status, 'none')))`;
}

/** هم‌راستا با resolveDuplicateStatus — ستون duplicate_status + پرچم legacy is_duplicate */
export function sqlNewsIsFlaggedDuplicate(alias = "bk") {
  const ds = sqlNewsDuplicateStatus(alias);
  return `(${ds} <> 'none' OR COALESCE(${alias}.is_duplicate, false) = true)`;
}

/** review_state از ستون یا فیلدهای legacy (هم‌راستا با inferReviewState) */
export function sqlInferReviewState(alias = "bk") {
  const rs = sqlNewsReviewState(alias);
  return `CASE
    WHEN COALESCE(${alias}.is_approved, 0)::int = 2 THEN 'rejected'
    WHEN COALESCE(${alias}.is_approved, 0)::int = 1 AND COALESCE(${alias}.status, 0)::int = 2 THEN 'rumor'
    WHEN COALESCE(${alias}.is_approved, 0)::int = 1 THEN 'approved'
    ELSE ${rs}
  END`;
}

/** workflow مؤثر برای فیلتر و آمار (هم‌راستا با inferWorkflowStatus در mapRow) */
export function sqlEffectiveNewsWorkflow(alias = "bk") {
  const ws = sqlNewsWorkflow(alias);
  const rs = sqlInferReviewState(alias);
  return `CASE
    WHEN ${ws} IN ('new', 'pending', 'reviewed', 'finalized') THEN ${ws}
    WHEN ${rs} = 'approved' AND COALESCE(${alias}.is_approved, 0)::int = 1 THEN 'finalized'
    WHEN ${rs} <> 'pending' THEN 'reviewed'
    ELSE 'pending'
  END`;
}
