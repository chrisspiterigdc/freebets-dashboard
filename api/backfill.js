const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.STORAGE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

// POST /api/backfill (one-time: loads historical snapshot files + current-details keywords into DB)
// Header: x-ingest-secret: <INGEST_SECRET>
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-ingest-secret'];
  if (process.env.INGEST_SECRET && secret !== process.env.INGEST_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = neon(DB_URL);
  let pageRows = 0;
  let kwRows = 0;

  // 1. Load page-level metrics from all historical snapshot files
  const snapshotsDir = path.join(process.cwd(), 'data', 'snapshots');
  if (fs.existsSync(snapshotsDir)) {
    const files = fs.readdirSync(snapshotsDir).filter(f => f.endsWith('.json')).sort();
    for (const file of files) {
      const snap = JSON.parse(fs.readFileSync(path.join(snapshotsDir, file), 'utf8'));
      for (const [pageKey, data] of Object.entries(snap.pages || {})) {
        if (!data) continue;
        await sql`
          INSERT INTO page_snapshots (page_key, snapshot_date, clicks, impressions, avg_position, ctr, keyword_count, top10, top3)
          VALUES (${pageKey}, ${snap.date}, ${data.clicks || 0}, ${data.impressions || 0}, ${data.avgPosition || null}, ${data.ctr || null}, ${data.keywordCount || 0}, ${data.top10 || 0}, ${data.top3 || 0})
          ON CONFLICT (page_key, snapshot_date) DO NOTHING
        `;
        pageRows++;
      }
    }
  }

  // 2. Load keyword data from current-details.json (top 15 per page for today's date)
  const detailsPath = path.join(process.cwd(), 'data', 'current-details.json');
  if (fs.existsSync(detailsPath)) {
    const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
    const date = details.date;
    for (const [pageKey, data] of Object.entries(details.pages || {})) {
      if (!data || !data.topKeywords) continue;
      for (const kw of data.topKeywords) {
        await sql`
          INSERT INTO keyword_snapshots (page_key, snapshot_date, keyword, position, clicks, impressions, ctr)
          VALUES (${pageKey}, ${date}, ${kw.kw}, ${kw.pos || null}, ${kw.cl || 0}, ${kw.imp || 0}, ${kw.ctr || null})
          ON CONFLICT (page_key, snapshot_date, keyword) DO NOTHING
        `;
        kwRows++;
      }
    }
  }

  res.json({ success: true, pageRows, kwRows });
};
