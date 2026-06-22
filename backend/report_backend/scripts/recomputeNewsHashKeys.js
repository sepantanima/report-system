import pool from "../src/db.js";
import { stripHtml } from "../src/services/newsTextUtils.js";
import { computeNewsHashKey } from "../src/services/newsIngest/newsHashKey.js";

const BATCH = 500;

async function run() {
  const client = await pool.connect();
  let updated = 0;
  try {
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM tbl_news WHERE COALESCE(is_deleted, false) = false`,
    );
    const total = countRes.rows[0]?.c ?? 0;
    console.log(`Recomputing hash_key for ${total} rows...`);

    let lastId = 0;
    while (true) {
      const res = await client.query(
        `SELECT id, cleaned_text, raw_text, source
         FROM tbl_news
         WHERE COALESCE(is_deleted, false) = false AND id > $1
         ORDER BY id
         LIMIT $2`,
        [lastId, BATCH],
      );
      if (!res.rows.length) break;

      const ids = [];
      const hashKeys = [];
      const charCounts = [];
      for (const row of res.rows) {
        const plain = stripHtml(row.cleaned_text || row.raw_text || "");
        ids.push(row.id);
        hashKeys.push(computeNewsHashKey(plain, row.source));
        charCounts.push(plain.length);
        lastId = row.id;
      }

      const valuePlaceholders = ids
        .map((_, i) => `($${i * 3 + 1}::int, $${i * 3 + 2}::text, $${i * 3 + 3}::int)`)
        .join(", ");
      const params = [];
      for (let i = 0; i < ids.length; i++) {
        params.push(ids[i], hashKeys[i], charCounts[i]);
      }

      await client.query(
        `UPDATE tbl_news AS n SET
           hash_key = v.hash_key,
           char_count = v.char_count
         FROM (VALUES ${valuePlaceholders}) AS v(id, hash_key, char_count)
         WHERE n.id = v.id`,
        params,
      );

      updated += ids.length;
      if (updated % 2000 === 0 || updated >= total) {
        console.log(`  ... ${updated}/${total}`);
      }
    }
    console.log(`Recomputed hash_key for ${updated} news rows (FNV-1a).`);
  } catch (err) {
    console.error("Recompute failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
