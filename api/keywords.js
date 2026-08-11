const { neon } = require('@neondatabase/serverless');

const DB_URL = process.env.STORAGE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

// GET /api/keywords?page=home&date=2026-08-11
module.exports = async function handler(req, res) {
  const { page, date } = req.query;
  const sql = neon(DB_URL);

  const [latestRow] = await sql`SELECT MAX(snapshot_date)::text AS latest FROM keyword_snapshots`;
  const snapshotDate = date || latestRow?.latest;

  if (!snapshotDate) return res.json({ keywords: [], date: null });

  const keywords = page && page !== 'all'
    ? await sql`
        SELECT page_key, keyword, position, clicks, impressions, ctr
        FROM keyword_snapshots
        WHERE page_key = ${page} AND snapshot_date = ${snapshotDate}
        ORDER BY clicks DESC, position ASC NULLS LAST
      `
    : await sql`
        SELECT page_key, keyword, position, clicks, impressions, ctr
        FROM keyword_snapshots
        WHERE snapshot_date = ${snapshotDate}
        ORDER BY page_key, clicks DESC, position ASC NULLS LAST
      `;

  res.json({ keywords, date: snapshotDate });
};
