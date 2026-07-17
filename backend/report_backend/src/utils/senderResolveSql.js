/**
 * Shared SQL for resolving tbl_news.sender (and optional external id) to tbl_users.
 */

export const MESSENGER_PLATFORMS = ["bale", "telegram", "eitaa"];

export function normalizeMessengerUsername(value) {
  if (value == null) return null;
  const s = String(value).trim().replace(/^@+/, "").toLowerCase();
  return s || null;
}

export function normalizeMessengerDisplayName(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

export function normalizeExternalId(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/** LATERAL + direct user joins; alias for news row must be `bk`. */
export const SENDER_RESOLVE_JOINS = `
  LEFT JOIN tbl_users u_direct ON NULLIF(trim(bk.sender), '') IS NOT NULL
    AND (
      lower(trim(bk.sender)) = lower(trim(u_direct.name))
      OR lower(trim(bk.sender)) = lower(trim(u_direct.username))
    )
  LEFT JOIN LATERAL (
    SELECT uma.user_id
    FROM tbl_user_messenger_accounts uma
    WHERE uma.platform = COALESCE(NULLIF(trim(bk.sender_platform), ''), 'bale')
      AND (
        (
          NULLIF(trim(COALESCE(bk.sender_external_id, '')), '') IS NOT NULL
          AND uma.external_id = trim(bk.sender_external_id)
        )
        OR (
          NULLIF(trim(COALESCE(bk.sender, '')), '') IS NOT NULL
          AND uma.external_username IS NOT NULL
          AND uma.external_username = lower(trim(both '@' from bk.sender))
        )
        OR (
          NULLIF(trim(COALESCE(bk.sender, '')), '') IS NOT NULL
          AND uma.display_name IS NOT NULL
          AND lower(trim(bk.sender)) = lower(trim(uma.display_name))
        )
      )
    ORDER BY
      CASE
        WHEN NULLIF(trim(COALESCE(bk.sender_external_id, '')), '') IS NOT NULL
          AND uma.external_id = trim(bk.sender_external_id)
        THEN 0 ELSE 1
      END,
      CASE WHEN uma.is_verified THEN 0 ELSE 1 END,
      uma.id
    LIMIT 1
  ) sender_map ON true
  LEFT JOIN tbl_users u_mapped ON u_mapped.id = sender_map.user_id
`;

export const RESOLVED_USER_ID_SQL = `COALESCE(u_direct.id, u_mapped.id)`;

export const RESOLVED_SENDER_NAME_SQL = `
  COALESCE(
    u_direct.name,
    u_mapped.name,
    NULLIF(trim(bk.sender), '')
  )
`;

/** Analytics/filter joins: `obs` = resolved system user from sender. */
export function buildSenderResolveJoinsForAnalytics() {
  return `
    ${SENDER_RESOLVE_JOINS}
    LEFT JOIN tbl_users obs ON obs.id = ${RESOLVED_USER_ID_SQL}
  `;
}

/** Field events: alias `ev` for tbl_unit_events row. */
export const FIELD_SENDER_RESOLVE_JOINS = `
  LEFT JOIN tbl_users u_direct ON (
    (
      NULLIF(trim(ev.sender_name), '') IS NOT NULL
      AND (
        lower(trim(ev.sender_name)) = lower(trim(u_direct.name))
        OR lower(trim(ev.sender_name)) = lower(trim(u_direct.username))
      )
    )
    OR (
      NULLIF(trim(ev.sender_id::text), '') IS NOT NULL
      AND lower(trim(ev.sender_id::text)) = lower(trim(u_direct.username))
    )
  )
  LEFT JOIN LATERAL (
    SELECT uma.user_id
    FROM tbl_user_messenger_accounts uma
    WHERE uma.platform = COALESCE(NULLIF(trim(ev.sender_platform), ''), 'bale')
      AND (
        (
          NULLIF(trim(COALESCE(ev.sender_id::text, '')), '') IS NOT NULL
          AND uma.external_id = trim(ev.sender_id::text)
        )
        OR (
          NULLIF(trim(COALESCE(ev.sender_name, '')), '') IS NOT NULL
          AND uma.external_username IS NOT NULL
          AND uma.external_username = lower(trim(both '@' from ev.sender_name))
        )
        OR (
          NULLIF(trim(COALESCE(ev.sender_name, '')), '') IS NOT NULL
          AND uma.display_name IS NOT NULL
          AND lower(trim(ev.sender_name)) = lower(trim(uma.display_name))
        )
      )
    ORDER BY
      CASE
        WHEN NULLIF(trim(COALESCE(ev.sender_id::text, '')), '') IS NOT NULL
          AND uma.external_id = trim(ev.sender_id::text)
        THEN 0 ELSE 1
      END,
      CASE WHEN uma.is_verified THEN 0 ELSE 1 END,
      uma.id
    LIMIT 1
  ) field_sender_map ON true
  LEFT JOIN tbl_users u_mapped ON u_mapped.id = field_sender_map.user_id
`;

export const FIELD_RESOLVED_USER_ID_SQL = `COALESCE(u_direct.id, u_mapped.id)`;

/** News sender marked as channel/source name — exclude from unmapped-user lists. */
export const NEWS_SENDER_SOURCE_MARKER_NOT_EXISTS_SQL = `
  NOT EXISTS (
    SELECT 1 FROM tbl_news_sender_source_markers m
    WHERE m.platform = COALESCE(NULLIF(trim(bk.sender_platform), ''), 'bale')
      AND lower(trim(m.sender_text)) = lower(trim(bk.sender))
  )
`;
