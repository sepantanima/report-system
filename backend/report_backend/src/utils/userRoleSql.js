/** SQL helpers — role text derived from tbl_user_role_assignments (post-072) */

export function userRoleTextExpr(userAlias = "u") {
  return `(SELECT COALESCE(string_agg(rt.code, ',' ORDER BY rt.code), 'user')
    FROM tbl_user_role_assignments ura
    JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
    WHERE ura.user_id = ${userAlias}.id AND ura.active = TRUE)`;
}

export function userRoleTextSelect(userAlias = "u") {
  return `${userRoleTextExpr(userAlias)} AS role`;
}

export function userRoleCodesJsonSelect(userAlias = "u") {
  return `(SELECT COALESCE(json_agg(rt.code ORDER BY rt.code), '["user"]'::json)
    FROM tbl_user_role_assignments ura
    JOIN tbl_role_templates rt ON rt.id = ura.role_template_id
    WHERE ura.user_id = ${userAlias}.id AND ura.active = TRUE) AS role_codes`;
}
