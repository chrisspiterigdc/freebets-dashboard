const { neon } = require('@neondatabase/serverless');

const DB_URL = process.env.STORAGE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

// GET /api/compare?from1=2026-08-04&to1=2026-08-11&from2=2026-07-14&to2=2026-08-03
module.exports = async function handler(req, res) {
  const { from1, to1, from2, to2, page } = req.query;
  if (!from1 || !to1 || !from2 || !to2) {
    return res.status(400).json({ error: 'Missing date range params (from1, to1, from2, to2)' });
  }

  const sql = neon(DB_URL);
  const pageFilter = page && page !== 'all';

  const [period1, period2] = await Promise.all([
    pageFilter
      ? sql`SELECT page_key, ROUND(AVG(avg_position)::numeric,2) AS avg_position, SUM(clicks) AS clicks, SUM(impressions) AS impressions, ROUND(AVG(ctr)::numeric,2) AS ctr, ROUND(AVG(top10)::numeric,1) AS top10, ROUND(AVG(top3)::numeric,1) AS top3, COUNT(*) AS days FROM page_snapshots WHERE snapshot_date BETWEEN ${from1} AND ${to1} AND page_key = ${page} GROUP BY page_key ORDER BY page_key`
      : sql`SELECT page_key, ROUND(AVG(avg_position)::numeric,2) AS avg_position, SUM(clicks) AS clicks, SUM(impressions) AS impressions, ROUND(AVG(ctr)::numeric,2) AS ctr, ROUND(AVG(top10)::numeric,1) AS top10, ROUND(AVG(top3)::numeric,1) AS top3, COUNT(*) AS days FROM page_snapshots WHERE snapshot_date BETWEEN ${from1} AND ${to1} GROUP BY page_key ORDER BY page_key`,
    pageFilter
      ? sql`SELECT page_key, ROUND(AVG(avg_position)::numeric,2) AS avg_position, SUM(clicks) AS clicks, SUM(impressions) AS impressions, ROUND(AVG(ctr)::numeric,2) AS ctr, ROUND(AVG(top10)::numeric,1) AS top10, ROUND(AVG(top3)::numeric,1) AS top3, COUNT(*) AS days FROM page_snapshots WHERE snapshot_date BETWEEN ${from2} AND ${to2} AND page_key = ${page} GROUP BY page_key ORDER BY page_key`
      : sql`SELECT page_key, ROUND(AVG(avg_position)::numeric,2) AS avg_position, SUM(clicks) AS clicks, SUM(impressions) AS impressions, ROUND(AVG(ctr)::numeric,2) AS ctr, ROUND(AVG(top10)::numeric,1) AS top10, ROUND(AVG(top3)::numeric,1) AS top3, COUNT(*) AS days FROM page_snapshots WHERE snapshot_date BETWEEN ${from2} AND ${to2} GROUP BY page_key ORDER BY page_key`,
  ]);

  res.json({ period1, period2, ranges: { period1: { from: from1, to: to1 }, period2: { from: from2, to: to2 } } });
};
