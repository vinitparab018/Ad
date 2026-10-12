const Database = require('better-sqlite3');
const path = require('path');
const databasePath = path.resolve(process.env.SQLITE_PATH || path.join(__dirname, 'newsorbit.sqlite'));
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('admin','editor')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS articles (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 summary TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'India',
 author TEXT NOT NULL DEFAULT 'NewsOrbit Desk', source_name TEXT NOT NULL DEFAULT 'NewsOrbit',
 source_url TEXT, image_url TEXT, image_credit TEXT, tags TEXT NOT NULL DEFAULT '',
 seo_title TEXT, meta_description TEXT, canonical_url TEXT, featured INTEGER NOT NULL DEFAULT 0,
 published_at TEXT, scheduled_at TEXT, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','unpublished')),
 is_demo INTEGER NOT NULL DEFAULT 0, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
 id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, consent_text TEXT NOT NULL,
 consented_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','subscribed','unsubscribed')),
 provider_id TEXT, unsubscribe_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, article_id INTEGER,
 ip_hash TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
// Safe additive migrations for older Phase 1 databases.
const columns = db.prepare('PRAGMA table_info(articles)').all().map(c => c.name);
const additions = {
 scheduled_at: 'TEXT', tags: "TEXT NOT NULL DEFAULT ''", seo_title: 'TEXT', meta_description: 'TEXT',
 canonical_url: 'TEXT', featured: 'INTEGER NOT NULL DEFAULT 0', updated_at: 'TEXT',
 created_by: 'INTEGER REFERENCES users(id) ON DELETE SET NULL'
};
for (const [name, type] of Object.entries(additions)) if (!columns.includes(name)) db.exec(`ALTER TABLE articles ADD COLUMN ${name} ${type}`);
db.exec("UPDATE articles SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL");
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_public ON articles(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_schedule ON articles(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category,status,published_at DESC);
`);
// Preserve starter content but mark it unmistakably as demo content.
const count = db.prepare('SELECT COUNT(*) AS n FROM articles').get().n;
if (count === 0) {
 const rows = [
 ['How to read a major policy announcement','demo-policy-announcement','A sample explainer showing how NewsOrbit articles present context and key facts.','This is demonstration content, not a real news report. Replace it with original reporting and verified sources.','India'],
 ['A beginner’s guide to understanding AI tools','demo-ai-tools-guide','A sample technology guide about evaluating AI tools and checking outputs.','This is demonstration content. A real guide should include original research, hands-on testing, and reliable references.','Technology & AI'],
 ['Personal finance basics: building a monthly budget','demo-monthly-budget','A sample educational article demonstrating the finance category.','This is demonstration content, not financial advice. Replace it with carefully researched original content.','Business & Finance']
 ];
 const insert = db.prepare(`INSERT INTO articles(title,slug,summary,body,category,author,source_name,published_at,status,is_demo) VALUES(?,?,?,?,?,'NewsOrbit Demo Desk','NewsOrbit Demo',?,'published',1)`);
 const tx = db.transaction(items => items.forEach((r,i)=>insert.run(...r,new Date(Date.now()-(i+1)*3600000).toISOString()))); tx(rows);
}
module.exports = db;
