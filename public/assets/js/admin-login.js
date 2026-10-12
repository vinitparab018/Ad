(async()=>{
 const form=document.querySelector('#login-form'),message=document.querySelector('#login-message');let token='';
 async function getToken(){const r=await fetch('/api/csrf-token',{credentials:'same-origin'});if(!r.ok)throw new Error('Unable to start a secure session.');token=(await r.json()).csrfToken;}
 try{await getToken();}catch(e){message.textContent=e.message;}
 form.addEventListener('submit',async e=>{e.preventDefault();message.textContent='Signing in…';const button=form.querySelector('button');button.disabled=true;try{const r=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({email:form.email.value,password:form.password.value})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Login failed.');location.href='/admin/dashboard.html';}catch(err){message.textContent=err.message;try{await getToken();}catch{} }finally{button.disabled=false;}});
})();
