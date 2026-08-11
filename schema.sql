-- Run this once in Neon SQL Editor (Open in Neon → SQL Editor)

CREATE TABLE IF NOT EXISTS page_snapshots (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(50) NOT NULL,
  snapshot_date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  avg_position NUMERIC(6,2),
  ctr NUMERIC(5,2),
  keyword_count INTEGER DEFAULT 0,
  top10 INTEGER DEFAULT 0,
  top3 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_key, snapshot_date)
);

CREATE TABLE IF NOT EXISTS keyword_snapshots (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(50) NOT NULL,
  snapshot_date DATE NOT NULL,
  keyword VARCHAR(500) NOT NULL,
  position NUMERIC(7,2),
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_key, snapshot_date, keyword)
);

CREATE INDEX IF NOT EXISTS idx_ks_page_date ON keyword_snapshots(page_key, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ks_keyword ON keyword_snapshots(keyword, page_key);
CREATE INDEX IF NOT EXISTS idx_ps_page_date ON page_snapshots(page_key, snapshot_date DESC);
