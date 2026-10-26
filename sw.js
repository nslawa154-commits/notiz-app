// Arbeitsapp Service Worker – App öffnet offline; Updates kommen per Netzwerk zuerst.
const V='arbeitsapp-v2.2';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png','icon-maskable-512.png','finder/','finder/index.html','finder/core.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x.startsWith('arbeitsapp-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    if(u.pathname.startsWith('/notiz-app/tafel/'))return; // alte Einzel-App: nie cachen
    if(u.searchParams.has('nocache'))return;
    if(u.pathname.startsWith('/notiz-app/data/'))return; // Plan vom Bot: immer frisch aus dem Netz, nie cachen
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(stripQ(r),cp));}return res;}).catch(()=>caches.match(stripQ(r)).then(m=>m||caches.match(r.mode==='navigate'?'./':r))));return;}
  if(/cdn\.jsdelivr\.net|cdn\.sheetjs\.com|tessdata|projectnaptha/.test(u.hostname+u.pathname)){
    e.respondWith(caches.open(V+'-cdn').then(c=>c.match(r).then(m=>{const f=fetch(r).then(res=>{if(res.ok||res.type==='opaque')c.put(r,res.clone());return res;}).catch(()=>m);return m||f;})));}
});
function stripQ(r){const u=new URL(r.url);u.search='';return new Request(u.href);}
