const CACHE='sitesense-shell-v29';
const SHELL=['/','/index.html','/style.css','/app.js','/platform.js','/speech.js','/scenarios.js','/live-camera.js','/live-review.js','/safety.js','/tasks.js','/visual-checks.js','/attention.js','/weather-state.js','/weather-ui.js','/reminders.js','/manifest.webmanifest','/icons/icon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sitesense-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const {request}=event,url=new URL(request.url);
 // Never intercept or cache API requests, POSTs, uploads, or external services.
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
 event.respondWith(fetch(request).catch(()=>caches.match('/index.html')));return;
 }
 if(SHELL.includes(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
