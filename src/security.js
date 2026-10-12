const crypto = require('crypto');
function csrfToken(req) { if(!req.session.csrfToken) req.session.csrfToken=crypto.randomBytes(32).toString('hex'); return req.session.csrfToken; }
function csrfProtection(req,res,next) {
 if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
 const supplied=req.get('x-csrf-token')||req.body?._csrf||''; const expected=req.session?.csrfToken||'';
 const a=Buffer.from(String(supplied)); const b=Buffer.from(String(expected));
 if(!a.length||a.length!==b.length||!crypto.timingSafeEqual(a,b)) return res.status(403).json({error:'Security token expired or invalid. Refresh the page and try again.'});
 next();
}
function slugify(text) { return String(text||'article').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'article'; }
function validHttpUrl(value) { if(!value) return null; try { const u=new URL(value); return ['http:','https:'].includes(u.protocol)?u.toString():null; } catch { return null; } }
module.exports={csrfToken,csrfProtection,slugify,validHttpUrl};
