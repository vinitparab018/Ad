const escapeArticle = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const articleDate = value => {const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric'}).format(d);};
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search); const slug = params.get('slug'); const root = document.querySelector('#article-content');
  const toggle=document.querySelector('#menu-toggle'),nav=document.querySelector('#primary-nav'); if(toggle&&nav) toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('nav-open',open);});
  const form=document.querySelector('#search-form'); if(form) form.addEventListener('submit',e=>{e.preventDefault();const q=document.querySelector('#site-search').value.trim();if(q)location.href=`./category.html?q=${encodeURIComponent(q)}`;});
  if(!slug){root.innerHTML='<div class="error-state"><h1>Article not specified</h1><p>Choose a story from the homepage.</p><a href="./">Return home</a></div>';return;}
  try {
    let a;
    if(window.NEWSORBIT_STATIC === true || location.hostname.endsWith('github.io')) {
      const staticResponse=await fetch('./data/articles.json');
      if(!staticResponse.ok) throw new Error('The static demo stories could not be loaded.');
      a=(await staticResponse.json()).find(item=>item.slug===slug);
      if(!a) throw new Error('This article could not be found.');
    } else {
      const response=await fetch(`/api/articles/${encodeURIComponent(slug)}`);
      if(!response.ok) throw new Error(response.status===404?'This article could not be found.':'Unable to load article.');
      ({article:a}=await response.json());
    }
    document.title=`${a.title} — NewsOrbit`;document.querySelector('meta[name="description"]').content=a.summary;document.querySelector('#article-category').textContent=a.category;
    const source=a.source_url?`<a class="article-source" href="${escapeArticle(a.source_url)}" target="_blank" rel="noopener noreferrer">Read the original publisher’s story ↗</a>`:'';
    const body=a.body? a.body.split(/\n\s*\n/).map(p=>`<p>${escapeArticle(p)}</p>`).join('') : `<p>${escapeArticle(a.summary)}</p><p>This page contains a short feed summary. Follow the original publisher for the complete report and additional context.</p>`;
    root.innerHTML=`<article class="article-layout"><div class="article-main"><p class="eyebrow">${escapeArticle(a.category)}</p>${a.is_demo?'<div class="demo-notice">DEMO CONTENT — This is sample text, not a real news report.</div>':''}<h1>${escapeArticle(a.title)}</h1><p class="article-deck">${escapeArticle(a.summary)}</p><div class="article-byline"><span>By <strong>${escapeArticle(a.author||a.source_name||'NewsOrbit Desk')}</strong></span><span>${escapeArticle(articleDate(a.published_at))}</span>${a.source_name?`<span>Source: ${escapeArticle(a.source_name)}</span>`:''}</div><div class="article-body">${body}${source}</div><div class="article-share"><span>Found this useful?</span><button id="share-button" type="button">Share article ↗</button></div></div><aside class="article-sidebar"><div class="ad-slot ad-sidebar"><span>ADVERTISEMENT</span><strong>Sidebar ad</strong><small>Placeholder only</small></div><div class="sidebar-note"><p class="eyebrow">OUR APPROACH</p><h3>Context matters.</h3><p>We aim to distinguish original reporting, analysis and external-source summaries clearly.</p></div></aside></article>`;
    const share=document.querySelector('#share-button');if(share)share.addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:a.title,url:location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);share.textContent='Link copied';}else share.textContent='Copy this page URL to share';}catch(_){}});
  } catch(error){root.innerHTML=`<div class="error-state"><h1>Story unavailable</h1><p>${escapeArticle(error.message)}</p><a href="./">Return to homepage</a></div>`;}
});
