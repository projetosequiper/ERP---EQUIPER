/* ERP Equiper — service worker: deixa o ERP instalável e faz ele abrir na hora.
   A tela abre com a versão já guardada no aparelho e, ao mesmo tempo, baixa a versão nova por trás;
   se mudou, avisa a tela ("versão nova — aperte F5"). As cópias dos apps (apps/…) só são baixadas quando alguém abre.
   Os dados (Supabase) NUNCA ficam guardados: sempre vêm do servidor, com o login de quem está usando. */
const VERSAO = 'erp-2026-11-26-06';
const APP = ['./', './index.html', './manifest.webmanifest', './icones/icon-192.png', './icones/icon-512.png', './icones/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

async function avisaSeMudou(req, nova){
  try{
    const c = await caches.open(VERSAO), velha = await c.match(req);
    const tNova = await nova.clone().text(), tVelha = velha ? await velha.text() : null;
    await c.put(req, nova);
    if(tVelha !== null && tVelha !== tNova){ const cl = await self.clients.matchAll({ type: 'window' }); cl.forEach(x => x.postMessage({ tipo: 'erp-versao-nova' })); }
  }catch(e){}
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET' || u.origin !== location.origin) return;          // Supabase, CEP, CNPJ etc.: direto na internet
  const tela = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  if(tela){
    // abre na hora com a guardada; a nova vem por trás
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(guardada => {
      const rede = fetch(e.request, { cache: 'no-cache' }).then(r => { if(r.ok) e.waitUntil(avisaSeMudou(e.request, r.clone())); return r; });
      if(guardada){ e.waitUntil(rede.catch(() => {})); return guardada; }
      return rede.catch(() => caches.match('./index.html'));
    }));
    return;
  }
  // (18/11) os aplicativos (apps/…, 1 a 3,5 MB cada) abrem do guardado na hora; a versão nova vem por trás e vale na próxima abertura.
  // Ao publicar aplicativo novo, trocar a VERSAO acima: a guardada antiga é apagada e todos pegam a nova.
  if(/\/apps\/[^/]+\.html$/.test(u.pathname)){
    e.respondWith(caches.open(VERSAO).then(c => c.match(e.request).then(guardado => {
      const rede = fetch(e.request).then(r => { if(r.ok) c.put(e.request, r.clone()); return r; });
      if(guardado){ e.waitUntil(rede.catch(() => {})); return guardado; }
      return rede;
    })));
    return;
  }
  // demais arquivos do app (apps/…, ícones, proposta): da internet primeiro; sem internet, o guardado
  e.respondWith(fetch(e.request).then(r => { if(r.ok){ const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request)));
});
