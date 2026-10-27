// Arbeitsapp Service Worker v2.3 – App-Code immer zuerst frisch aus dem Netz (ohne HTTP-Cache), Cache nur offline.
const V='arbeitsapp-v2.7';
const SHELL=['./','index.html','manifest.webmanifest','version.json','icon-192.png','icon-512.png','icon-180.png','icon-maskable-512.png','finder/','finder/index.html','finder/core.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==V+'-cdn'&&x.startsWith('arbeitsapp-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim())
  .then(()=>self.clients.matchAll({type:'window'})).then(cs=>cs.forEach(c=>c.postMessage({type:'sw-updated',v:V}))));}); // offene Seiten informieren
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){
    if(u.pathname.startsWith('/notiz-app/tafel/'))return;          // alte Einzel-App: nie anfassen
    if(u.pathname.startsWith('/notiz-app/data/'))return;           // Plan/Schlüssel: immer direkt aus dem Netz
    if(u.searchParams.has('nocache')||u.pathname.endsWith('/version.json'))return;
    e.respondWith(fetch(r.url,{cache:'no-store',credentials:'same-origin'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(stripQ(r),cp));}return res;})
      .catch(()=>caches.match(stripQ(r)).then(m=>m||caches.match(r.mode==='navigate'?'./':r))));return;}
  if(/cdn\.jsdelivr\.net|cdn\.sheetjs\.com|tessdata|projectnaptha/.test(u.hostname+u.pathname)){
    e.respondWith(caches.open(V+'-cdn').then(c=>c.match(r).then(m=>{const f=fetch(r).then(res=>{if(res.ok||res.type==='opaque')c.put(r,res.clone());return res;}).catch(()=>m);return m||f;})));}
});
function stripQ(r){const u=new URL(r.url);u.search='';return new Request(u.href);}
