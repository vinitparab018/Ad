require('dotenv').config();
const bcrypt=require('bcryptjs');
const db=require('../src/database');
(async()=>{
 const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=String(process.env.ADMIN_PASSWORD||'');
 if(!email||!email.includes('@')){console.error('Set ADMIN_EMAIL in .env first.');process.exit(1);}
 if(password.length<14||password==='change-this-to-a-long-unique-password'){console.error('Set ADMIN_PASSWORD in .env to a unique password of at least 14 characters.');process.exit(1);}
 const hash=await bcrypt.hash(password,12);
 const old=db.prepare('SELECT id FROM users WHERE email=?').get(email);
 if(old){db.prepare("UPDATE users SET password_hash=?,role='admin' WHERE id=?").run(hash,old.id);console.log(`Updated administrator: ${email}`);}
 else {db.prepare("INSERT INTO users(email,password_hash,role) VALUES(?,?,'admin')").run(email,hash);console.log(`Created administrator: ${email}`);}
 db.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
