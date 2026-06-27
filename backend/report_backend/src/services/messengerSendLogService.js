import pool from "../db.js";

export async function insertMessengerSendLog({
  user_id,
  usage_key,
  channel_config_id,
  payload_kind,
  status,
  platform_message_id,
  error_message,
  request_meta,
}) {
  const r = await pool.query(
    `INSERT INTO tbl_messenger_send_logs (
       user_id, usage_key, channel_config_id, payload_kind, status,
       platform_message_id, error_message, request_meta
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     RETURNING id`,
    [
      user_id ?? null,
      usage_key ?? null,
      channel_config_id ?? null,
      payload_kind || "text",
      status || "pending",
      platform_message_id ?? null,
      error_message ?? null,
      JSON.stringify(request_meta || {}),
    ],
  );
  return r.rows[0].id;
}
