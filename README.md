# NewsOrbit Phase 2

NewsOrbit is an original Indian news/blogging portal starter with a publishing dashboard. Phase 2 adds session-based admin authentication, article CRUD, drafts, scheduled publishing, CSRF protection, SEO metadata and Article JSON-LD on `/story/:slug`, newsletter opt-in integration, and deployment guidance.

## Requirements
- Node.js 20 or newer
- npm

## Install and run
1. Extract the ZIP and open the `newsorbit` folder in a terminal.
2. Install dependencies: `npm install`
   The native SQLite modules require install scripts; `package.json` explicitly approves the scripts for `better-sqlite3` and `sqlite3`.
3. Copy `.env.example` to `.env` (Windows PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`).
4. Edit `.env`. Set `SESSION_SECRET` to a long random secret. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to your own values; use at least 14 characters for the admin password.
5. Create or update the administrator: `npm run create-admin`
6. Start: `npm run dev`
7. Open `http://localhost:3000` and admin login at `http://localhost:3000/admin/login.html`.

The SQLite database is created automatically at `src/newsorbit.sqlite`. Never commit `.env`, database files, or backups containing subscriber data.

## Deploy to Render (free testing)

The repository includes a Render Blueprint in `render.yaml`. To deploy:

1. Sign in to Render and create a new Blueprint from `vinitparab018/Ad`, using the `main` branch.
2. When prompted, provide `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 14 characters. Render generates `SESSION_SECRET`.
3. Deploy the `newsorbit` web service and open its `onrender.com` URL. Use that URL, not `https://vinitparab018.github.io/`; GitHub Pages only serves static files and cannot run this app's Node.js API or SQLite-backed admin.

This blueprint uses Render's free web-service plan for testing. Its filesystem and SQLite database are temporary: articles, accounts, and sessions can be lost whenever the service sleeps, restarts, or redeploys. Free services also spin down when idle. Do not use this configuration for real publishing or subscriber data. For persistent production storage, upgrade to a paid web service with a persistent disk mounted at `/var/data`, set `SQLITE_PATH=/var/data/newsorbit.sqlite`, or migrate the application to a managed database.

The blueprint runs `npm run create-admin` at startup using the configured admin environment variables. Updating those variables and redeploying changes the bootstrap admin credentials.

## Admin workflow
- Sign in at `/admin/login.html`.
- Choose **New article** to open the editor.
- Use status `Save draft`, `Publish now`, `Schedule`, or `Unpublish`.
- For scheduled articles, choose a future local date/time. The scheduler checks due stories while the Node process is running.
- Article pages are available at `/story/<slug>` and include server-rendered title/description/canonical metadata and NewsArticle JSON-LD.
- Only an admin role can delete articles. Create the first admin from the terminal; there is no public registration endpoint.

## Security notes
- Passwords use bcrypt hashing (12 rounds).
- Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- State-changing admin requests require a session-bound CSRF token in `X-CSRF-Token`.
- Login attempts are rate limited; Helmet adds security headers; article HTML is sanitized server-side.
- Set `NODE_ENV=production`, a unique `SESSION_SECRET`, HTTPS, and `TRUST_PROXY=1` only if the app is behind a trusted reverse proxy. Do not expose the SQLite file or source tree publicly.
- For multiple app instances, use a shared production session store instead of the included SQLite session store. Set up automated encrypted backups and test restoration.

## News feed
The site is configured to import the BBC News World RSS feed from `RSS_FEED_URL` every 15 minutes and assign imported stories the `World` category via `RSS_CATEGORY`; the homepage checks for new stories every 60 seconds while visible. Set `RSS_CATEGORY` to one of the site's supported categories when changing the feed. Feed refresh is best-effort and failures are logged; the last successfully imported stories remain available.

BBC News requires permission for business use of its RSS metadata. Do not launch or continue business use unless you have the required written permission/licence. When displaying BBC feed items, retain their BBC News source attribution and link prominently near the item, and follow all licence conditions. NewsOrbit links each imported story to BBC News and displays that source beside the headline. Do not copy full articles or images unless your permission explicitly covers them. For any replacement feed, verify its terms and image rights before configuring `RSS_FEED_URL`; a feed URL by itself is not a reuse licence.

## Newsletter
The form records consent and stores subscription status. To send through Mailchimp, configure `NEWSLETTER_PROVIDER=mailchimp`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, and `MAILCHIMP_SERVER_PREFIX` in `.env`. Use a real audience, configure double opt-in in the provider, test provider error handling, and provide the provider's unsubscribe link in every email. If no credentials are configured, signups are recorded locally as pending and no email is sent. The included unsubscribe endpoint updates NewsOrbit's local record; it is not a replacement for the provider's own unsubscribe mechanism.

## SEO
- Submit `https://YOUR-DOMAIN/sitemap.xml` in Google Search Console.
- Check `/robots.txt`, canonical URLs and rendered source at `/story/<slug>`.
- Keep drafts and admin pages private; `robots.txt` is not access control. Admin APIs require authentication.
- JSON-LD is generated from stored article fields; keep metadata accurate and visible article content consistent with the schema.

## AdSense
The visual ad placeholders are not ads. After approval, use only the official code and publisher/ad-unit IDs from your AdSense account. Implement a consent management platform appropriate to the regions you serve, including Google's requirements for relevant consent signals. Never encourage ad clicks or insert ad code before you understand the applicable policy requirements. Approval is not guaranteed.

## PostgreSQL option
The current runnable implementation uses SQLite. `src/postgres-schema.sql` is a reference PostgreSQL schema for migration planning, not a runtime adapter. Moving production to PostgreSQL requires replacing SQLite-specific SQL (`?` placeholders, `INSERT OR IGNORE`, `lastInsertRowid`, and SQLite session storage) with PostgreSQL equivalents, adding a migration process and a PostgreSQL-backed session store, and testing transaction behavior. Do not merely set a database URL and assume the app has switched. For a production multi-instance deployment, PostgreSQL plus a shared session store is recommended.

## Production deployment checklist
1. Use a persistent Node.js hosting service and persistent storage; the free Render Blueprint is for testing only.
2. Add environment variables in the host dashboard; do not upload `.env`.
3. Set `NODE_ENV=production`, `SITE_URL=https://your-domain.example`, `SESSION_SECRET`, admin credentials, and approved provider configuration.
4. Enable HTTPS and configure trusted proxy settings only according to your host's documentation.
5. Use a process manager/platform restart policy; scheduled publishing only runs while the worker process is alive. For multi-instance production, move scheduling to one dedicated worker or managed job.
6. Configure log retention, encrypted backups, restore tests, monitoring and dependency updates.
7. Add the custom domain and verify ownership in Google Search Console; submit `/sitemap.xml`.
8. Publish original editorial content and complete legal/privacy pages to reflect your actual practices before applying for advertising.

## Test commands
- `npm run check` checks JavaScript syntax.
- `npm run create-admin` creates or updates the admin account using `.env` values.
- `curl http://localhost:3000/api/health`
- `curl http://localhost:3000/api/articles`
- Visit `/api/csrf-token`, admin login, editor and dashboard in a browser.

This project is a strong development baseline, not a substitute for a professional security review before handling real user data or launching a monetized publisher.
