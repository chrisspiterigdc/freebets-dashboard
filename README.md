**# FreeBets.com SEO Content Dashboard — Daily Update Routine

Repo: `freebets-dashboard` → deployed on Vercel (auto-redeploys on every commit to `main`).
Live: https://freebets-seo-content-dash.vercel.app

You are running the daily update routine for the FreeBets.com SEO Content Dashboard. Your job is to pull fresh data from GSC, GA4, Ahrefs, and brand promo pages, and commit updated JSON data files to the repo. Vercel handles redeployment automatically.

**Never edit `index.html`. Only edit files inside `data/` and `snapshots/`.**

---

## Architecture

The dashboard is a single static HTML file that loads three JSON files at page load:

- `data/seo.json` — KPIs, daily sessions, channels, top queries, top pages
- `data/keywords.json` — Top 50 mobile keywords per tracked page
- `data/promos.json` — 28 priority brand promo lists with change flags

Every daily run also writes dated snapshots to `snapshots/YYYY-MM-DD/` for rollback and history.

---

## STEP 1 — Calculate the rolling 30-day window

Today's run uses UK timezone. Produce:
- `startDate`: today minus 30 days, YYYY-MM-DD
- `endDate`: yesterday, YYYY-MM-DD
- `displayRange`: e.g. "22 Mar – 21 Apr 2026" for the header

All GSC and GA4 queries use this window. All queries are UK-filtered.

---

## STEP 2 — Update `data/seo.json`

Use the **GDCG MCP GSC & GA4** connector for all GA4 and GSC pulls, and the **Ahrefs** MCP for Ahrefs data.

### GA4 pulls (property `properties/319143886`)

1. **Total sessions** for the date range, UK only
2. **Organic sessions** (sessionDefaultChannelGroup = "Organic Search"), UK only
3. **Average engagement rate / bounce rate** for the date range, UK only
4. **Daily sessions** — day-by-day breakdown for the chart (31 data points)
5. **Channel breakdown** — sessions by `sessionDefaultChannelGroup`, sorted by sessions desc

Channel colour mapping (match existing palette):
- Organic Search → `#00c853`
- Direct → `#58a6ff`
- Organic Social → `#bc8cff`
- Paid Social → `#e3b341`
- Email → `#f78166`
- Other → `#6e7681`

Group all channels not in the above list into "Other".

### GSC pulls (site `https://www.freebets.com/`)

1. **Top queries** (UK, mobile+desktop, last 30 days), top 20 by clicks. Include: query, clicks, impressions, ctr (0-100, not 0-1), position
2. **Top pages** (UK, mobile+desktop, last 30 days), top 15 by clicks. Include: url (page path only, strip domain), clicks, impressions, ctr, position

### Ahrefs pulls (target `freebets.com`)

1. **Domain rating**
2. **Ahrefs rank**
3. **Organic traffic** (estimated monthly visits)
4. **Ranking keywords** (total count)
5. **Keywords in top 3**

### Output format

Write `data/seo.json` with this exact schema:

```json
{
  "dateRange": "22 Mar – 21 Apr 2026",
  "lastUpdated": "2026-04-22",
  "kpis": {
    "totalSessions": 84260,
    "organicSessions": 47476,
    "ahrefsOrganicTraffic": 18907,
    "domainRating": 54,
    "ahrefsRank": 452058,
    "rankingKeywords": 2177,
    "keywordsTop3": 246,
    "avgBounceRate": 35.0
  },
  "dailySessions": [
    {"date": "Mar 22", "value": 2245},
    ...
  ],
  "channels": [
    {"name": "Organic Search", "sessions": 47476, "color": "#00c853"},
    ...
  ],
  "topQueries": [
    {"query": "free bets", "clicks": 476, "impressions": 10938, "ctr": 4.4, "position": 9.5},
    ...
  ],
  "topPages": [
    {"url": "/no-deposit/", "clicks": 4716, "impressions": 251942, "ctr": 1.9, "position": 18.4},
    ...
  ]
}
```

**Critical:**
- CTR values are percentages (4.4, not 0.044)
- Date labels on `dailySessions` use "MMM D" format (no leading zeros)
- `topPages[].url` is path only (strip `https://www.freebets.com`)
- If any data source fails, keep the previous value from the existing `seo.json` and add a `warnings` array at the root with the affected field names

---

## STEP 3 — Update `data/keywords.json`

Ten pages are tracked. Keep the same keys and labels — do not invent new ones.

Pages and their GSC URL filters:

| Key | Label | GSC page filter |
|---|---|---|
| `home` | `/ (Home)` | `https://www.freebets.com/` (exact) |
| `no-deposit` | `/no-deposit/` | `https://www.freebets.com/no-deposit/` (contains) |
| `casino` | `/casino/` | `https://www.freebets.com/casino/` (exact) |
| `betting-sites` | `/betting-sites/` | `https://www.freebets.com/betting-sites/` (contains) |
| `casino-free-spins` | `/casino/free-spins/` | `https://www.freebets.com/casino/free-spins/` (contains) |
| `slots-sign-up` | `/slots/sign-up-offers/` | `https://www.freebets.com/slots/sign-up-offers/` (contains) |
| `betting-apps` | `/betting-apps/` | `https://www.freebets.com/betting-apps/` (contains) |
| `world-cup` | `/football/world-cup/` | `https://www.freebets.com/football/world-cup/` (contains) |
| `promotions` | `/promotions/` | `https://www.freebets.com/promotions/` (contains) |
| `new-casino` | `/casino/new-casino` | `https://www.freebets.com/casino/new-casino` (contains) |

For each page: pull **top 50 queries, mobile only, UK, last 30 days**, sorted by clicks desc.

Schema:

```json
{
  "home": {
    "label": "/ (Home)",
    "url": "https://www.freebets.com/",
    "keywords": [
      {"keyword": "freebet", "clicks": 667, "impressions": 7520, "ctr": 8.87, "position": 7.5},
      ...
    ]
  },
  ...
}
```

If a page returns zero keywords (as `new-casino` currently does), write `keywords: []` — do not fabricate.

---

## STEP 4 — Update `data/promos.json`

The 28 priority brands are already defined in the existing `data/promos.json`. Read the existing file first to get the current brand list and their current promo arrays.

### For each brand:

1. **Fetch** the brand's promo URL (column `url` in the existing file)
2. **Extract** the current list of promo titles from the page. Try direct fetch first; if the page returns 403, captcha, or appears blocked, fall back to WebSearch with the query `[brand name] promotions site:[domain]` and extract promo titles from snippets.
3. **Compare** to the previous day's promo list stored in the existing `promos.json`
4. **Determine change flag:**
   - If the set of promos is identical → `changed: false`
   - If promos added or removed → `changed: true`
5. **Build the new promo array:**
   - Promos present in both old and new → `{"text": "…", "status": "unchanged"}` (or just the string form — the dashboard accepts both)
   - Promos only in new → `{"text": "…", "status": "new"}`
   - Promos only in old → `{"text": "…", "status": "removed"}` (keep for 1 day of visibility, drop the next day)
6. **Update `lastChecked`** to today in DD/MM/YYYY format

### If a brand page cannot be scraped:

Keep the previous day's data unchanged. Set `lastChecked` to yesterday's value. Add the brand name to a top-level `scrapeFailures` array.

### Full schema:

```json
{
  "lastUpdated": "2026-04-22",
  "scrapeFailures": ["BrandA", "BrandB"],
  "brands": [
    {
      "name": "247Bet",
      "url": "https://247bet.com/en-gb/promotions",
      "lastChecked": "22/04/2026",
      "changed": false,
      "promos": [
        {"text": "Sports Welcome – 100% Bonus up to £50", "status": "unchanged"},
        {"text": "New – £25 Free Bet", "status": "new"},
        {"text": "Retired – Mega Cash Drop", "status": "removed"}
      ]
    },
    ...
  ]
}
```

**Critical rules:**
- Never invent promos. If the page fails to load, keep previous data.
- Do not add new brands. The 28-brand list is curated.
- Do not remove brands. If a brand page is permanently broken, flag it but keep the entry.
- Promo titles should be cleaned (no HTML, no trailing whitespace, no marketing flourish like "NEW!!" badges).

---

## STEP 5 — Save dated snapshots

Before committing the updated `data/*.json` files, save snapshots of today's data to:

```
snapshots/YYYY-MM-DD/seo.json
snapshots/YYYY-MM-DD/keywords.json
snapshots/YYYY-MM-DD/promos.json
```

The snapshots are exact copies of what goes into `data/`. This gives you rollback capability and a historical archive.

---

## STEP 6 — Commit everything to `main`

Single commit with message:
```
Daily dashboard update YYYY-MM-DD
```

Files in the commit:
- `data/seo.json` (modified)
- `data/keywords.json` (modified)
- `data/promos.json` (modified)
- `snapshots/YYYY-MM-DD/seo.json` (new)
- `snapshots/YYYY-MM-DD/keywords.json` (new)
- `snapshots/YYYY-MM-DD/promos.json` (new)

Commit directly to `main`. Vercel will auto-redeploy within ~30 seconds of the commit.

---

## STEP 7 — Send status DM to Chris on Slack

Send a short summary as a direct message to Chris, using Slack DM conversation ID `D04E1KBMEBX`. Do NOT post to any public or shared channel — this is a private admin status update.

If sending to `D04E1KBMEBX` fails (invalid ID, permissions error, etc.), fall back to searching Slack users for "Chris Spiteri" and sending the DM to the matching user ID. If that also fails, post the summary to Slack channel `C0AVBC6256C` as a last resort and flag the Slack delivery failure in that message.

Message format:

```
*Dashboard update — [DD Month YYYY]*

SEO: Sessions [X], Organic [Y] ([Z]% WoW change)
Keywords: [X] pages refreshed
Promos: [X] changed, [Y] scrape failures

Live: https://freebets-seo-content-dash.vercel.app
```

If any step had warnings or scrape failures, flag them:

```
⚠ Warnings: [list]
⚠ Scrape failures: [brand names]
```

---

## Error handling rules

- If GDCG MCP fails, do not fabricate data. Keep the previous day's `seo.json` and `keywords.json` and send a Slack DM alert to `D04E1KBMEBX`.
- If Ahrefs MCP fails, keep previous Ahrefs values in `seo.json` and flag in `warnings`.
- If all scrapes for promos fail, keep previous `promos.json` and send a Slack DM alert to `D04E1KBMEBX`.
- Never commit empty or malformed JSON. Validate every file parses before committing.
- Never edit `index.html`. The dashboard markup is stable.

---

## Quick reference

| What | Source | Output |
|---|---|---|
| Sessions, channels, bounce | GA4 via GDCG MCP | `data/seo.json` |
| Top queries, top pages | GSC via GDCG MCP | `data/seo.json` |
| Per-page top 50 keywords | GSC mobile via GDCG MCP | `data/keywords.json` |
| DR, rank, organic traffic, keyword count | Ahrefs MCP | `data/seo.json` |
| Brand promo lists | Direct fetch + WebSearch fallback | `data/promos.json` |
| Daily archive | Copy of above | `snapshots/YYYY-MM-DD/` |
| Deploy trigger | Commit to `main` | Vercel auto-redeploys |
| Status notification | Slack DM `D04E1KBMEBX` | Send summary |**
