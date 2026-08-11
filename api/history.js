const { neon } = require('@neondatabase/serverless');

const DB_URL = process.env.STORAGE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

// GET /api/history?page=home&keyword=free+bets
// Returns position + clicks history for a specific keyword on a page
module.exports = async function handler(req, res) {
  const { page, keyword } = req.query;
  if (!page || !keyword) return res.status(400).json({ error: 'Missing page or keyword' });

  const sql = neon(DB_URL);
  const history = await sql`
    SELECT snapshot_date::text AS snapshot_date, position, clicks, impressions, ctr
    FROM keyword_snapshots
    WHERE page_key = ${page} AND keyword = ${keyword}
    ORDER BY snapshot_date ASC
  `;

  res.json({ history, page, keyword });
};
