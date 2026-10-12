const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(date); };
let homePage = 1;
let homeRefreshInProgress = false;
let lastHomeSnapshot = '';
function storyUrl(article) { return `./article.html?slug=${encodeURIComponent(article.slug)}`; }
function sourceLink(article) {
  if (!article.source_url) return '';
  return `<a class="source-link" href="${escapeHtml(article.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.source_name || 'Original source')} ↗</a>`;
}
function storyCard(article, index = 0) {
  const demo = article.is_demo ? '<span class="demo-tag">DEMO STORY</span>' : '';
  const source = sourceLink(article);
  return `<article class="article-card"><div class="card-image ${index % 2 ? 'image-alt' : ''}"><span>${escapeHtml(article.category || 'Latest')}</span><span class="image-glyph">${index % 3 === 0 ? '◈' : index % 3 === 1 ? '✳' : '◉'}</span></div><div class="card-body">${demo}<p class="card-meta">${escapeHtml(article.category)} · ${escapeHtml(formatDate(article.published_at))}</p><h3><a href="${storyUrl(article)}">${escapeHtml(article.title)}</a></h3><p class="card-summary">${escapeHtml(article.summary)}</p><div class="card-footer"><span>${escapeHtml(article.author || article.source_name || 'NewsOrbit')}</span>${source}</div></div></article>`;
}
async function getArticles(params = {}) {
  if (window.NEWSORBIT_STATIC === true || window.location.hostname.endsWith('github.io')) return getStaticArticles(params);
  const url = new URL('/api/articles', window.location.origin);
  Object.entries(params).forEach(([key, value]) => { if (value !== '' && value != null) url.searchParams.set(key, value); });
  const response = await fetch(url, {cache:'no-store',headers:{Accept:'application/json'}});
  if (response.ok) return response.json();
  throw new Error('Could not load stories. Please try again.');
}
async function getStaticArticles(params) {
  const staticResponse = await fetch('./data/articles.json');
  if (!staticResponse.ok) throw new Error('Could not load the static demo stories.');
  const articles = await staticResponse.json();
  const category = params.category || '';
  const query = String(params.q || '').toLowerCase();
  const filtered = articles.filter(article =>
    (!category || article.category === category) &&
    (!query || `${article.title} ${article.summary} ${article.tags}`.toLowerCase().includes(query))
  );
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 8);
  return {articles:filtered.slice((page - 1) * limit, page * limit),page,limit,total:filtered.length,pages:Math.ceil(filtered.length / limit)};
}
function setupCommon() {
  const date = $('#today-date'); if (date) date.textContent = new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  const toggle = $('#menu-toggle'); const nav = $('#primary-nav');
  if (toggle && nav) toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); nav.classList.toggle('nav-open', open); });
  const searchForm = $('#search-form'); if (searchForm) searchForm.addEventListener('submit', event => { event.preventDefault(); const query = $('#site-search').value.trim(); if (query) window.location.href = `./category.html?q=${encodeURIComponent(query)}`; });
  const newsletter = $('#newsletter-form'); if (newsletter) newsletter.addEventListener('submit', async event => { event.preventDefault(); const message = $('#newsletter-message'); const button = newsletter.querySelector('button[type=submit]'); if (message) message.textContent = 'Submitting…'; if(button) button.disabled = true; try { const response = await fetch('/api/newsletter/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:$('#newsletter-email').value, consent:$('#newsletter-consent')?.checked === true})}); const data = await response.json(); if(!response.ok) throw new Error(data.error || 'Could not subscribe.'); if(message) message.textContent = data.message; newsletter.reset(); } catch(error) { if(message) message.textContent = error.message; } finally { if(button) button.disabled = false; } });
}
function renderPagination(container, page, pages, onPage) {
  if (!container) return;
  if (pages <= 1) { container.innerHTML = ''; return; }
  const start = Math.max(1, page - 2), end = Math.min(pages, page + 2);
  let html = `<button ${page === 1 ? 'disabled' : ''} data-page="${page-1}">← Previous</button>`;
  for (let n = start; n <= end; n++) html += `<button class="${n === page ? 'current' : ''}" data-page="${n}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`;
  html += `<button ${page === pages ? 'disabled' : ''} data-page="${page+1}">Next →</button>`;
  container.innerHTML = html; container.querySelectorAll('button[data-page]').forEach(button => button.addEventListener('click', () => onPage(Number(button.dataset.page))));
}
async function initHome({silent = false} = {}) {
  if (homeRefreshInProgress) return;
  homeRefreshInProgress = true;
  const featured = $('#featured-story'), trending = $('#trending-list'), grid = $('#latest-grid'), count = $('#result-count');
  try {
    const data = await getArticles({page:1,limit:9});
    const snapshot = JSON.stringify({articles:data.articles,total:data.total});
    if (silent && snapshot === lastHomeSnapshot) {
      const status = $('#feed-update-status');
      if (status) status.textContent = window.NEWSORBIT_STATIC === true || window.location.hostname.endsWith('github.io')
        ? 'Static demo stories; live feeds are not available on GitHub Pages.'
        : `Live feed checked at ${new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit'}).format(new Date())}.`;
      return;
    }
    lastHomeSnapshot = snapshot;
    const status = $('#feed-update-status');
    if (status) status.textContent = `Live feed checked at ${new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit'}).format(new Date())}.`;
    const [lead, ...rest] = data.articles;
    if (!lead) { featured.innerHTML = '<p class="empty-state">No stories yet. Configure a permitted feed or publish an original article.</p>'; grid.innerHTML = ''; return; }
    featured.innerHTML = `<article class="lead-card"><div class="lead-art"><span class="lead-art-label">${lead.is_demo ? 'DEMO CONTENT' : escapeHtml(lead.category)}</span><span class="lead-art-symbol">N<span>O</span></span></div><div class="lead-copy"><p class="card-meta">${escapeHtml(lead.category)} · ${escapeHtml(formatDate(lead.published_at))}</p><h2><a href="${storyUrl(lead)}">${escapeHtml(lead.title)}</a></h2><p>${escapeHtml(lead.summary)}</p><a class="read-link" href="${storyUrl(lead)}">Read the story <span>↗</span></a><div class="card-footer"><span>${escapeHtml(lead.author || lead.source_name || 'NewsOrbit')}</span>${sourceLink(lead)}</div></div></article>`;
    trending.innerHTML = rest.slice(0,4).map((article,i) => `<article class="trending-item"><span class="trend-number">0${i+1}</span><div>${article.is_demo ? '<span class="demo-tag">DEMO</span>' : ''}<h3><a href="${storyUrl(article)}">${escapeHtml(article.title)}</a></h3><p>${escapeHtml(article.category)} · ${escapeHtml(formatDate(article.published_at))}</p>${sourceLink(article)}</div></article>`).join('');
    grid.innerHTML = rest.slice(0,6).map(storyCard).join(''); if (count) count.textContent = `${data.total} stories`;
    const breaking = $('#breaking-text'); if (breaking) breaking.textContent = lead.title;
    renderPagination($('#pagination'), data.page, data.pages, page => loadHomePage(page));
  } catch (error) {
    const status = $('#feed-update-status');
    if (silent) {
      if (status) status.textContent = 'Live feed refresh failed; retrying automatically.';
      console.error('Live feed refresh failed:', error);
    } else {
      featured.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
      grid.innerHTML = '';
      if (status) status.textContent = 'Live feed is temporarily unavailable.';
    }
  } finally {
    homeRefreshInProgress = false;
  }
}
async function loadHomePage(page) {
  const grid = $('#latest-grid'), count = $('#result-count'); if (!grid) return;
  grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  try { const data = await getArticles({page,limit:6}); homePage = data.page; grid.innerHTML = data.articles.map(storyCard).join('') || '<p>No stories found.</p>'; if (count) count.textContent = `${data.total} stories`; renderPagination($('#pagination'), data.page, data.pages, loadHomePage); $('#latest').scrollIntoView({behavior:'smooth',block:'start'}); }
  catch (error) { grid.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`; }
}
document.addEventListener('DOMContentLoaded', () => {
  setupCommon();
  if ($('#featured-story')) {
    initHome();
    if (window.NEWSORBIT_STATIC !== true && !window.location.hostname.endsWith('github.io')) {
      window.setInterval(() => {
        if (!document.hidden && homePage === 1) initHome({silent:true});
      }, 60_000);
    }
  }
});
