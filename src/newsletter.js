const crypto = require('crypto');
const db = require('./database');
async function subscribe(email, consentText) {
 const token=crypto.randomBytes(32).toString('hex');
 const existing=db.prepare('SELECT id,status FROM newsletter_subscribers WHERE email=?').get(email);
 if(existing && existing.status==='subscribed') return {already:true};
 if(existing) db.prepare("UPDATE newsletter_subscribers SET status='pending',consent_text=?,consented_at=?,unsubscribe_token=? WHERE id=?").run(consentText,new Date().toISOString(),token,existing.id);
 else db.prepare('INSERT INTO newsletter_subscribers(email,consent_text,consented_at,unsubscribe_token,status) VALUES(?,?,?,?,\'pending\')').run(email,consentText,new Date().toISOString(),token);
 const provider=(process.env.NEWSLETTER_PROVIDER||'').toLowerCase();
 if(provider==='mailchimp' && process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID && process.env.MAILCHIMP_SERVER_PREFIX) {
  const endpoint=`https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${encodeURIComponent(process.env.MAILCHIMP_AUDIENCE_ID)}/members`;
  const auth=Buffer.from(`newsorbit:${process.env.MAILCHIMP_API_KEY}`).toString('base64');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'},body:JSON.stringify({email_address:email,status:'pending',merge_fields:{},tags:['NewsOrbit Website']})});
  if(!response.ok) { const detail=await response.json().catch(()=>({})); const duplicate=response.status===400 && /member exists/i.test(String(detail.title||detail.detail||'')); if(!duplicate) throw new Error('Newsletter provider request failed'); }
  // Keep status pending until the provider confirms double opt-in. Never mark unconfirmed consent as subscribed.
 }
 return {already:false, pending: !(provider==='mailchimp' && process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_AUDIENCE_ID && process.env.MAILCHIMP_SERVER_PREFIX)};
}
function unsubscribe(token) { const result=db.prepare("UPDATE newsletter_subscribers SET status='unsubscribed' WHERE unsubscribe_token=?").run(token); return result.changes>0; }
module.exports={subscribe,unsubscribe};
