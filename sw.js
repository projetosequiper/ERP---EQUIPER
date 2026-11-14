/* ERP Equiper — service worker: deixa o ERP instalável e abre a tela mesmo com a internet ruim.
   Só guarda os arquivos do próprio app (a tela e os ícones). Os dados (Supabase) NUNCA ficam guardados:
   sempre vêm do servidor, com o login de quem está usando. */
const VERSAO = 'erp-2026-11-14-1';
const APP = ['./', './index.html', './manifest.webmanifest', './icones/icon-192.png', './icones/icon-512.png', './icones/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET' || u.origin !== location.origin) return;          // Supabase, CEP, CNPJ etc.: direto na internet
  // a tela: primeiro a versão nova da internet; sem internet, a última guardada
  e.respondWith(fetch(e.request).then(r => { if(r.ok){ const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
