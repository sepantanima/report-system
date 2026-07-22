import { logStatusChange, missionActiveStatusSql } from "../utils/analysisHelpers.js";

/**
 * When every non-cancelled assignment is FinalApproved and none are active,
 * mark the topic Completed automatically.
 */
export async function maybeAutoCompleteTopic(client, topicId, changedBy = null) {
  const topicRes = await client.query(
    "SELECT id, status FROM tbl_analysis_topics WHERE id = $1 AND deleted_at IS NULL",
    [topicId],
  );
  const topic = topicRes.rows[0];
  if (!topic || topic.status === "Completed") return false;

  const counts = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('Cancelled','Archived'))::int AS total,
       COUNT(*) FILTER (WHERE status = 'FinalApproved')::int AS done,
       COUNT(*) FILTER (WHERE ${missionActiveStatusSql()})::int AS active
     FROM tbl_analysis_assignments WHERE topic_id = $1`,
    [topicId],
  );
  const { total, done, active } = counts.rows[0] || { total: 0, done: 0, active: 0 };
  if (total === 0 || active > 0 || done < total) return false;

  await client.query(
    `UPDATE tbl_analysis_topics
     SET status = 'Completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [topicId],
  );
  await logStatusChange(client, {
    entityType: "topic",
    entityId: topicId,
    oldStatus: topic.status,
    newStatus: "Completed",
    changedBy,
    comment: "تکمیل خودکار — همه مأموریت‌ها پایان یافت",
  });
  return true;
}
