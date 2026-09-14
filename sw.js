/* =========================================================
   LOUKA RUN – service worker
   Hra se dá nainstalovat na plochu a funguje i offline.
   Při vydání nové verze zvyš číslo v názvu cache – stará
   cache se automaticky smaže.

   PRAVIDLO: žádné čekání donekonečna.
   Dřív se všechno tahalo nejdřív ze sítě a cache sloužila jen
   offline. Jenže zaseknutý požadavek na mobilní síti nespadne –
   jen visí. Náhradní kopie se proto nikdy nepoužila a hráč
   koukal do bílého okna; po ťuknutí na ikonu to vypadá, že se
   aplikace vůbec nespustila. Teď to je takhle:

     stránka hry   z cache hned (spuštění nesmí viset na síti),
                   čerstvá se stáhne na pozadí pro příště
     skripty, styl nejdřív síť, ale se stropem 3 s – pak cache,
                   ať se nová verze projeví hned při dalším načtení
     hudba, písma  z cache hned, na pozadí se nestahují znovu
   ========================================================= */

const CACHE = 'loukarun-v58';

const CORE = [
  './',
  'index.html',
  'style.css',
  'soukromi.html',
  'manifest.webmanifest',
  'js/i18n.js',
  'js/data.js',
  'js/gfx.js',
  'js/audio.js',
  'js/platform.js',
  'js/comfort.js',
  'js/karel.js',
  'js/game.js',
  'assets/logo.png',
  'assets/start.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/fonts/baloo2-latin.woff2',
  'assets/fonts/baloo2-latin-ext.woff2',
  'assets/fonts/caveat-latin.woff2',
  'assets/fonts/caveat-latin-ext.woff2',
];

// Stránka hry. Zastupuje i adresu s koncovým lomítkem („…/app/“), kterou
// server může přesměrovávat – když ji obslouží service worker z cache,
// k přesměrování vůbec nedojde a relativní cesty ke skriptům zůstanou platit.
const SHELL = 'index.html';
const SHELL_URL = new URL(SHELL, self.location).href;

function isShell(url) {
  const p = new URL(url).pathname;
  return p.endsWith('/') || p.endsWith('/index.html');
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // po jednom (ne addAll): jediný nedostupný soubor by jinak shodil celé
      // ukládání a hra by neměla offline vůbec nic
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// velké soubory, které se prakticky nemění – ty se na pozadí neobnovují,
// aby hra nestahovala hudbu znovu při každém spuštění
const HEAVY = /\.(mp3|woff2|png|webp|jpg)$/;

/* Uložit se smí jen odpověď, která opravdu patří k požadované adrese.
   Pozvánková brána na nechmerust.org odpovídá přesměrováním na stránku
   s kódem – a to je obyčejná stránka se stavem 200. Kdyby se uložila pod
   klíčem „index.html“ nebo „js/game.js“, nainstalovaná hra by se rozbila
   natrvalo, až do příští změny čísla cache. Proto `redirected`. */
function storable(res) {
  return !!res && res.ok && res.type === 'basic' && !res.redirected;
}

function store(key, res) {
  if (!storable(res)) return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => { /* plná paměť */ });
}

// tichá obnova na pozadí – na výsledek se nečeká, chyba nikoho nezajímá
function refresh(url) {
  fetch(url, { cache: 'no-cache' })
    .then((res) => store(url, res))
    .catch(() => { /* offline, zkusí se při dalším spuštění */ });
}

// Bez tohohle stropu umí zaseknutý požadavek držet prázdné okno klidně minutu.
function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Poslední záchrana: radši čitelná zpráva s tlačítkem než bílé okno,
// ve kterém není vidět ani adresa.
function offlinePage() {
  return new Response(
    '<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Louka Run</title></head><body style="margin:0;font:16px/1.5 system-ui,sans-serif;' +
    'color:#0d3b1e;background:#8ed4f7;min-height:100vh;display:flex;flex-direction:column;' +
    'gap:12px;align-items:center;justify-content:center;text-align:center;padding:24px">' +
    '<div style="font-size:44px">🥕</div>' +
    '<strong style="font-size:20px">Hru se nepodařilo načíst</strong>' +
    '<p style="margin:0;max-width:34ch">Zkus to prosím znovu – při prvním spuštění je potřeba ' +
    'připojení k internetu. <br><em>Couldn’t load the game. Please try again online.</em></p>' +
    '<button style="font:inherit;padding:10px 18px;border:0;border-radius:999px;' +
    'background:#0d3b1e;color:#fff" onclick="location.reload()">Zkusit znovu / Retry</button>' +
    '</body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Spuštění hry (ťuknutí na ikonu na ploše). Uložená kopie má přednost před
// sítí – jinak start visí na tom, jak rychle se probudí mobilní připojení.
async function handleNavigate(req) {
  const key = isShell(req.url) ? SHELL_URL : req.url;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key);
  if (hit) {
    refresh(key);
    return hit;
  }
  try {
    const res = await withTimeout(fetch(req), 12000);
    store(key, res);
    return res;
  } catch (e) {
    return offlinePage();
  }
}

// Skripty, styly, manifest: nejdřív síť, ať se nová verze projeví hned při
// dalším načtení. Na kontrolu aktualizace service workeru se spolehnout nedá –
// Chrome si ji sám odkládá, u často spouštěné hry klidně o desítky minut.
// Strop 3 s je tu proto, aby zaseknutý požadavek nezdržel start: po něm se
// sáhne po uložené kopii a hra naběhne, jako by byla offline.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req.url, { cache: 'no-cache' }), 3000);
    if (storable(res)) {
      cache.put(req.url, res.clone()).catch(() => { /* plná paměť */ });
      return res;
    }
    // brána nebo chyba serveru – uložená kopie je lepší než stránka s kódem
    return (await cache.match(req)) || res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Hudba, písma a obrázky se prakticky nemění a jsou velké – z cache hned
// a na pozadí se znovu nestahují, ať hra nežere data při každém spuštění.
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    store(req.url, res);
    return res;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Média (audio) posílá iOS/WebKit s hlavičkou Range a vyžaduje odpověď
// 206 Partial Content – na cachovaný plný 200 přehrávání odmítne. Sestavíme
// tedy 206 z celého souboru (z cache, jinak dotáhneme ze sítě a uložíme).
async function rangeResponse(req) {
  const cache = await caches.open(CACHE);
  const keyReq = new Request(req.url); // klíč bez Range → sedí na uložený plný soubor
  let full = await cache.match(keyReq);
  if (!full) {
    try {
      const net = await fetch(keyReq);
      if (storable(net)) { cache.put(keyReq, net.clone()); full = net; }
    } catch (e) { /* offline */ }
  }
  if (!full) {
    try { return await fetch(req); } catch (e) { return new Response('', { status: 504 }); }
  }
  const buf = await full.arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= total) end = total - 1;
  if (start > end) start = 0;
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(slice.byteLength),
    },
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') { e.respondWith(handleNavigate(req)); return; }

  // Range požadavek (typicky iOS audio) obsloužíme jako 206 Partial Content
  if (req.headers.has('range')) { e.respondWith(rangeResponse(req)); return; }

  e.respondWith(HEAVY.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
});
