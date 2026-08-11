const { neon } = require('@neondatabase/serverless');

const DB_URL = process.env.STORAGE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

// POST /api/ingest
// Body: { date: "2026-08-11", pages: { home: { clicks, impressions, avgPosition, ctr, keywordCount, top10, top3, keywords: [{keyword, position, clicks, impressions, ctr}] } } }
// Header: x-ingest-secret: <INGEST_SECRET>
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-ingest-secret'];
  if (process.env.INGEST_SECRET && secret !== process.env.INGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { date, pages } = req.body;
  if (!date || !pages) return res.status(400).json({ error: 'Missing date or pages' });

  const sql = neon(DB_URL);
  let pageCount = 0;
  let kwCount = 0;

  for (const [pageKey, data] of Object.entries(pages)) {
    if (!data) continue;

    await sql`
      INSERT INTO page_snapshots (page_key, snapshot_date, clicks, impressions, avg_position, ctr, keyword_count, top10, top3)
      VALUES (${pageKey}, ${date}, ${data.clicks || 0}, ${data.impressions || 0}, ${data.avgPosition || null}, ${data.ctr || null}, ${data.keywordCount || 0}, ${data.top10 || 0}, ${data.top3 || 0})
      ON CONFLICT (page_key, snapshot_date) DO UPDATE SET
        clicks = EXCLUDED.clicks,
        impressions = EXCLUDED.impressions,
        avg_position = EXCLUDED.avg_position,
        ctr = EXCLUDED.ctr,
        keyword_count = EXCLUDED.keyword_count,
        top10 = EXCLUDED.top10,
        top3 = EXCLUDED.top3
    `;
    pageCount++;

    if (data.keywords?.length) {
      for (const kw of data.keywords) {
        await sql`
          INSERT INTO keyword_snapshots (page_key, snapshot_date, keyword, position, clicks, impressions, ctr)
          VALUES (${pageKey}, ${date}, ${kw.keyword}, ${kw.position || null}, ${kw.clicks || 0}, ${kw.impressions || 0}, ${kw.ctr || null})
          ON CONFLICT (page_key, snapshot_date, keyword) DO UPDATE SET
            position = EXCLUDED.position,
            clicks = EXCLUDED.clicks,
            impressions = EXCLUDED.impressions,
            ctr = EXCLUDED.ctr
        `;
        kwCount++;
      }
    }
  }

  res.json({ success: true, date, pages: pageCount, keywords: kwCount });
};
