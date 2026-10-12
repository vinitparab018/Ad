require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const databasePath = path.resolve(process.env.SQLITE_PATH || path.join(__dirname, '..', 'src', 'newsorbit.sqlite'));
const outputPath = path.join(__dirname, '..', 'public', 'data', 'articles.json');
const now = new Date().toISOString();
const db = new Database(databasePath, {readonly:true,fileMustExist:true});

let articles;
try {
  articles = db.prepare(`
    SELECT title, slug, summary, body, category, author, source_name, source_url,
      tags, published_at, is_demo, featured
    FROM articles
    WHERE status = 'published' AND (published_at IS NULL OR published_at <= ?)
    ORDER BY featured DESC, published_at DESC
  `).all(now).map(article => ({
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    body: article.is_demo ? article.body : '',
    category: article.category,
    author: article.author,
    source_name: article.source_name,
    source_url: article.source_url,
    tags: article.tags,
    published_at: article.published_at,
    is_demo: Boolean(article.is_demo),
    featured: Boolean(article.featured)
  }));
} finally {
  db.close();
}

fs.mkdirSync(path.dirname(outputPath), {recursive:true});
fs.writeFileSync(outputPath, `${JSON.stringify(articles, null, 2)}\n`);
console.log(`Exported ${articles.length} published stories to public/data/articles.json.`);
