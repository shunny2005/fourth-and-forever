// Optional home-screen installation. Gameplay never depends on service workers.
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=false);});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true);});
document.addEventListener('click',async event=>{const button=event.target.closest('[data-install]');if(!button)return;if(installPrompt){await installPrompt.prompt();installPrompt=null;}else{const info=document.querySelector('#toast');if(info){info.textContent='On iPhone: Safari → Share → Add to Home Screen. On Android: browser menu → Install app.';info.classList.add('show');setTimeout(()=>info.classList.remove('show'),7000);}}});
if('serviceWorker' in navigator&&isSecureContext&&location.protocol!=='file:')window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline installation unavailable:',error.message));});
