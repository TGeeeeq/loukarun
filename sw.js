/* =========================================================
   LOUKA RUN – service worker
   Hra se dá nainstalovat na plochu a funguje i offline.
   Při vydání nové verze zvyš číslo v názvu cache – stará
   cache se automaticky smaže.
   ========================================================= */

const CACHE = 'loukarun-v25';

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
  'js/game.js',
  'assets/logo.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/fonts/baloo2-latin.woff2',
  'assets/fonts/baloo2-latin-ext.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
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

// velké soubory, které se prakticky nemění – ty smí jít z cache hned
const HEAVY = /\.(mp3|woff2|png|webp|jpg)$/;

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
      if (net && net.ok) { cache.put(keyReq, net.clone()); full = net; }
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
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // jádro hry (HTML, JS, CSS, manifest): vždy nejdřív síť, ať se nová verze
  // projeví hned při dalším načtení; cache slouží jen offline
  if (req.mode === 'navigate' || !HEAVY.test(new URL(req.url).pathname)) {
    e.respondWith(
      (req.mode === 'navigate' ? fetch(req) : fetch(req.url, { cache: 'no-cache' }))
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Promise.reject(new Error('offline')))))
    );
    return;
  }

  // Range požadavek (typicky iOS audio) obsloužíme jako 206 Partial Content
  if (req.headers.has('range')) {
    e.respondWith(rangeResponse(req));
    return;
  }

  // hudba, fonty a obrázky: z cache hned, na pozadí se případně obnoví
  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
