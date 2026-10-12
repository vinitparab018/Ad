/* Category and search results page */
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(d); };
function card(item, i) { return `<article class="article-card"><div class="card-image ${i%2?'image-alt':''}"><span>${esc(item.category)}</span><span class="image-glyph">${['◈','✳','◉'][i%3]}</span></div><div class="card-body">${item.is_demo?'<span class="demo-tag">DEMO STORY</span>':''}<p class="card-meta">${esc(item.category)} · ${esc(dateLabel(item.published_at))}</p><h3><a href="./article.html?slug=${encodeURIComponent(item.slug)}">${esc(item.title)}</a></h3><p class="card-summary">${esc(item.summary)}</p><div class="card-footer"><span>${esc(item.author||item.source_name||'NewsOrbit')}</span>${item.source_url?`<a class="source-link" href="${esc(item.source_url)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`:''}</div></div></article>`; }
let currentPage = 1;
const params = new URLSearchParams(location.search); const category = params.get('name') || ''; const query = params.get('q') || '';
const title = query ? `Search: ${query}` : category || 'Latest stories';
document.addEventListener('DOMContentLoaded', () => {
  document.title = `${title} — NewsOrbit`;
  document.querySelector('#category-title').textContent = title;
  document.querySelector('#breadcrumb-category').textContent = title;
  const input = document.querySelector('#site-search'); if (input && query) input.value = query;
  const toggle = document.querySelector('#menu-toggle'), nav = document.querySelector('#primary-nav');
  if (toggle && nav) toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded',String(open)); nav.classList.toggle('nav-open',open); });
  const form = document.querySelector('#search-form'); if(form) form.addEventListener('submit',e=>{e.preventDefault(); const q=document.querySelector('#site-search').value.trim(); if(q) location.href=`./category.html?q=${encodeURIComponent(q)}`;});
  load(1);
});
async function load(page) {
  currentPage = page; const grid = document.querySelector('#category-grid'); grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  const url = new URL('/api/articles', location.origin); url.searchParams.set('page',page); url.searchParams.set('limit',9); if(category) url.searchParams.set('category',category); if(query) url.searchParams.set('q',query);
  try {
    let data;
    if (location.hostname.endsWith('github.io')) {
      const staticResponse = await fetch('./data/articles.json');
      if (!staticResponse.ok) throw new Error('Could not load the static demo stories.');
      const articles = await staticResponse.json();
      const filtered = articles.filter(article =>
        (!category || article.category === category) &&
        (!query || `${article.title} ${article.summary} ${article.tags}`.toLowerCase().includes(query.toLowerCase()))
      );
      data = {articles:filtered.slice((page - 1) * 9, page * 9),total:filtered.length,pages:Math.ceil(filtered.length / 9)};
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not load stories.');
      data = await response.json();
    }
    grid.innerHTML = data.articles.map(card).join(''); document.querySelector('#result-count').textContent = `${data.total} stories`; document.querySelector('#empty-state').hidden = data.articles.length > 0;
    const pagination = document.querySelector('#pagination'); if(data.pages<=1) pagination.innerHTML=''; else { let html=`<button ${page===1?'disabled':''} data-page="${page-1}">← Previous</button>`; for(let n=Math.max(1,page-2);n<=Math.min(data.pages,page+2);n++) html+=`<button data-page="${n}" class="${n===page?'current':''}" ${n===page?'aria-current="page"':''}>${n}</button>`; html+=`<button ${page===data.pages?'disabled':''} data-page="${page+1}">Next →</button>`; pagination.innerHTML=html; pagination.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{load(Number(b.dataset.page));scrollTo({top:0,behavior:'smooth'});})); }
  } catch(error) { grid.innerHTML=`<p class="error-state">${esc(error.message)}</p>`; }
}
