const Parser = require('rss-parser');
const crypto = require('crypto');
const db = require('./database');
const parser = new Parser({timeout: 12000, headers: {'User-Agent': 'NewsOrbit/1.0 (+configure-your-site-contact)'}});

function slugify(value) {
  const base = String(value || 'article').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return base || crypto.randomBytes(5).toString('hex');
}
function plainText(value = '') {
  return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 500);
}
function safeHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}
async function refreshFeed() {
  const feedUrl = process.env.RSS_FEED_URL;
  if (!feedUrl) return {enabled: false, imported: 0, message: 'No RSS feed configured.'};
  const safeFeedUrl = safeHttpUrl(feedUrl);
  if (!safeFeedUrl) throw new Error('RSS_FEED_URL must be a valid HTTP(S) URL.');
  const feed = await parser.parseURL(safeFeedUrl);
  const category = plainText(process.env.RSS_CATEGORY || 'Latest News').slice(0, 80);
  const insert = db.prepare(`INSERT OR IGNORE INTO articles
    (title, slug, summary, body, category, author, source_name, source_url, image_url, published_at, status, is_demo)
    VALUES (@title, @slug, @summary, '', @category, @author, @source_name, @source_url, @image_url, @published_at, 'published', 0)`);
  let imported = 0;
  const transaction = db.transaction(items => {
    for (const item of items) {
      const title = plainText(item.title).slice(0, 240);
      const sourceUrl = safeHttpUrl(item.link);
      if (!title || !sourceUrl) continue;
      const existing = db.prepare('SELECT id FROM articles WHERE source_url = ?').get(sourceUrl);
      if (existing) continue;
      const published = item.isoDate || item.pubDate;
      const parsedDate = published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : new Date().toISOString();
      const rawImage = item.enclosure && item.enclosure.url;
      const imageUrl = safeHttpUrl(rawImage);
      const result = insert.run({
        title, slug: `${slugify(title)}-${crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0,7)}`,
        summary: plainText(item.contentSnippet || item.summary || item.content || title),
        category, author: plainText(item.creator || feed.title || 'External publisher').slice(0,120),
        source_name: plainText(feed.title || new URL(safeFeedUrl).hostname).slice(0,160),
        source_url: sourceUrl, image_url: imageUrl, published_at: parsedDate
      });
      imported += result.changes;
    }
  });
  transaction((feed.items || []).slice(0, 100));
  return {enabled: true, imported, feed: plainText(feed.title || new URL(safeFeedUrl).hostname)};
}
module.exports = {refreshFeed};
