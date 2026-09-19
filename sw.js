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

     stránka, skripty, styl   z cache hned (spuštění nesmí viset
                              na síti), čerstvá se stáhne na pozadí
     hudba, písma, obrázky    z cache hned, na pozadí se nestahují

   O čerstvost se stará číslo cache níž: při vydání se zvedne,
   `install` stáhne všechno znovu a teprve pak se nová verze
   pustí ke slovu.

   DRUHÉ PRAVIDLO: do cache nesmí nic, co přišlo od pozvánkové
   brány. Viz `storable()` a `seed()` – stálo to hráče prázdné
   okno, které se samo nespravilo.

   TŘETÍ PRAVIDLO: nová verze se musí aktivovat VŽDYCKY, i když
   se jí nepodařilo stáhnout soubory. Opravená obsluha požadavků
   je totiž to nejcennější, co nese – a dokud běží ta stará,
   hráč se z rozbitého stavu nedostane. Co se rozhoduje podle
   úplnosti cache, je jen úklid té předchozí (`activate`).
   ========================================================= */

const CACHE = 'loukarun-v64';

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

// Bez těchhle souborů nemá cenu novou verzi vůbec pouštět ke slovu.
const VITAL = [
  'index.html',
  'style.css',
  'js/i18n.js',
  'js/data.js',
  'js/gfx.js',
  'js/audio.js',
  'js/platform.js',
  'js/comfort.js',
  'js/karel.js',
  'js/game.js',
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

/* Uložit se smí jen odpověď, která opravdu patří k požadované adrese.
   Pozvánková brána na nechmerust.org odpovídá přesměrováním na stránku
   s kódem – a to je obyčejná stránka se stavem 200. Kdyby se uložila pod
   klíčem „index.html“ nebo „js/game.js“, nainstalovaná hra by se rozbila
   natrvalo, až do příští změny čísla cache. Proto `redirected`. */
function storable(res) {
  return !!res && res.ok && res.type === 'basic' && !res.redirected;
}

// Totéž při čtení. Odpověď s příznakem `redirected` Chrome u navigace odmítne
// (ERR_FAILED) a okno zůstane prázdné – po ťuknutí na ikonu to vypadá, že se
// aplikace vůbec nespustila. Jedna otrávená položka v cache tak dokáže hru
// úplně vypnout, tak ji radši ignorujeme, i kdyby se tam nějakou cestou dostala.
function usable(res) {
  return res && !res.redirected ? res : null;
}

function store(key, res) {
  if (!storable(res)) return;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => { /* plná paměť */ });
}

/* Stažení do cache při instalaci. `cache.add()` se tu SCHVÁLNĚ nepoužívá:
   následuje přesměrování a výsledek uloží pod původním klíčem, takže se pod
   „js/game.js“ octne HTML pozvánkové brány. Přesně tím se hra rozbíjela –
   ikona otevřela prázdné okno a nespravilo to ani vypnutí telefonu, protože
   se cache sama nikdy nepřepisuje. `seed()` proti tomu drží `storable()`. */
async function seed(cache, url) {
  const res = await fetch(url, { cache: 'reload' });
  if (!storable(res)) throw new Error('brána nebo chyba: ' + url);
  await cache.put(url, res);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // po jednom (ne addAll): jediný nedostupný obrázek by jinak shodil celé
    // ukládání a hra by neměla offline vůbec nic
    await Promise.allSettled(CORE.map((u) => seed(cache, u)));
    // A instalace se kvůli tomu NESMÍ vzdát – viz třetí pravidlo v hlavičce.
    // Pokus nechat ji selhat, aby se nepustila ke slovu poloprázdná cache,
    // dopadl mnohem hůř: komu vypršel pozvánkový kód, tomu `seed()` dostal
    // od brány odmítnutí, instalace selhala pokaždé, a on zůstal navždy
    // na staré verzi – i s rozbitou cache, kvůli které se hra neotevřela.
    await self.skipWaiting();
  })());
});

// Je v téhle cache všechno, bez čeho se hra nespustí?
async function complete(name) {
  try {
    const cache = await caches.open(name);
    for (const u of VITAL) {
      if (!usable(await cache.match(u))) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/* Vyhodit z cache všechno, co přišlo od brány. Jediná taková položka umí hru
   vypnout úplně (Chrome odmítne `redirected` odpověď u navigace a okno zůstane
   prázdné), a protože se cache sama nepřepisuje, drží to až do příštího vydání.
   Uklízí se ve VŠECH cache, ne jen v té aktuální – z těch starších se totiž
   ještě čte, dokud není ta nová hotová. */
async function scrub() {
  const keys = await caches.keys();
  for (const name of keys) {
    try {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        if (res && !usable(res)) await cache.delete(req);
      }
    } catch (e) { /* jednu cache neuklidíme, na ostatní to nemá vliv */ }
  }
}

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await scrub();
    // Předchozí cache se smaže, teprve až je ta nová kompletní. Dokud není,
    // je z čeho brát – `cached()` sáhne i do ní a hra běží dál.
    if (await complete(CACHE)) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    }
    await self.clients.claim();
  })());
});

// velké soubory, které se prakticky nemění – ty se na pozadí neobnovují,
// aby hra nestahovala hudbu znovu při každém spuštění
const HEAVY = /\.(mp3|woff2|png|webp|jpg)$/;

// tichá obnova na pozadí – na výsledek se nečeká, chyba nikoho nezajímá
function refresh(url) {
  fetch(url, { cache: 'no-cache' })
    .then((res) => store(url, res))
    .catch(() => { /* offline, zkusí se při dalším spuštění */ });
}

// Bez tohohle stropu umí zaseknutý požadavek držet prázdné okno klidně minutu.
// `ctrl` zaseknutý fetch i opravdu zruší – jinak dál drží jedno z šesti
// spojení na server a další soubory čekají ve frontě za ním.
function withTimeout(p, ms, ctrl) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (ctrl) { try { ctrl.abort(); } catch (e) { /* už doběhlo */ } }
      reject(new Error('timeout'));
    }, ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Společný rám pro obě náhradní stránky. Radši čitelná zpráva s tlačítkem
// než bílé okno, ve kterém není vidět ani adresa. Pod tlačítkem je vždycky
// cesta na /loukarun/oprava — ta stránka leží mimo dosah service workeru, takže
// se načte i tehdy, když je uložená kopie hry rozbitá. Bez ní se hráč z prázdna
// nemá jak dostat: stránka hry se nenačte, tedy se nespustí ani nic, co by to
// spravilo.
function page(emoji, nadpis, text, tlacitko, odkaz) {
  const akce = odkaz
    ? '<a href="' + odkaz + '" style="font:inherit;padding:10px 18px;border-radius:999px;' +
      'background:#0d3b1e;color:#fff;text-decoration:none">' + tlacitko + '</a>'
    : '<button style="font:inherit;padding:10px 18px;border:0;border-radius:999px;' +
      'background:#0d3b1e;color:#fff" onclick="location.reload()">' + tlacitko + '</button>';
  const zachrana = '<a href="/loukarun/oprava" style="font:inherit;font-size:14px;opacity:.8;' +
    'color:#0d3b1e">Hra se pořád neotvírá? Zkus opravu</a>';
  return new Response(
    '<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Louka Run</title></head><body style="margin:0;font:16px/1.5 system-ui,sans-serif;' +
    'color:#0d3b1e;background:#8ed4f7;min-height:100vh;display:flex;flex-direction:column;' +
    'gap:12px;align-items:center;justify-content:center;text-align:center;padding:24px">' +
    '<div style="font-size:44px">' + emoji + '</div>' +
    '<strong style="font-size:20px">' + nadpis + '</strong>' +
    '<p style="margin:0;max-width:34ch">' + text + '</p>' + akce + zachrana +
    '</body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function offlinePage() {
  return page('🥕', 'Hru se nepodařilo načíst',
    'Zkus to prosím znovu – při prvním spuštění je potřeba připojení k internetu. ' +
    '<br><em>Couldn’t load the game. Please try again online.</em>',
    'Zkusit znovu / Retry', null);
}

/* Pozvánková brána odpověděla přesměrováním. Tuhle odpověď NELZE vrátit
   prohlížeči tak, jak přišla: u navigace ji Chrome odmítne a z okna
   nainstalované hry zbude prázdná chybová stránka. Adresa brány navíc leží
   mimo `scope` aplikace, takže by ji stejně otevřela až v prohlížeči. */
function gatePage(kam) {
  return page('🔑', 'Přístup do hry vypršel',
    'Hra je jen pro pozvané. Otevři si ji prosím znovu s pozvánkovým kódem. ' +
    '<br><em>Your invitation has expired. Please open the game with your code again.</em>',
    'Zadat kód', kam || '/loukarun?pristup=kod');
}

function fromGate(res) {
  return !!res && (res.redirected || res.type === 'opaqueredirect' || res.status === 403);
}

/* Uložená kopie, ať leží kdekoli. Přednost má aktuální cache; když v ní soubor
   ještě není (nová verze se nestihla dostáhnout, nebo ji odmítla brána), sáhne
   se do té předchozí. Hrát chvíli starou verzi je nesrovnatelně lepší než
   koukat do prázdného okna, a `refresh()` tu novou mezitím doplní. */
async function cached(url) {
  const cache = await caches.open(CACHE);
  const hit = usable(await cache.match(url));
  if (hit) return hit;
  return usable(await caches.match(url));
}

/* Doplnění nové cache na pozadí. `install` mohl skončit s poloprázdnou cache —
   komu zrovna vypršel pozvánkový kód, tomu brána odmítla všechno kromě ikon —
   a podruhé se nespustí, protože `sw.js` se od té doby nezměnil. Bez tohohle by
   hra napořád běžela z předchozí verze a ta by se nikdy neuklidila. Jakmile je
   nová cache kompletní, ta předchozí jde pryč; do té doby je z čeho brát. */
let doplnujeSe = false;
async function topUp() {
  if (doplnujeSe || (await complete(CACHE))) return;
  doplnujeSe = true;
  try {
    const cache = await caches.open(CACHE);
    for (const u of CORE) {
      if (usable(await cache.match(u))) continue;
      try { await seed(cache, u); } catch (e) { /* brána nebo offline – zkusí se při dalším startu */ }
    }
    if (await complete(CACHE)) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    }
  } catch (e) { /* nevadí, hra běží z toho, co má */ }
  doplnujeSe = false;
}

// Spuštění hry (ťuknutí na ikonu na ploše). Uložená kopie má přednost před
// sítí – jinak start visí na tom, jak rychle se probudí mobilní připojení.
async function handleNavigate(req) {
  const key = isShell(req.url) ? SHELL_URL : req.url;
  const hit = await cached(key);
  if (hit) {
    refresh(key);
    return hit;
  }
  const ctrl = new AbortController();
  try {
    const res = await withTimeout(fetch(req.url, { signal: ctrl.signal }), 12000, ctrl);
    if (fromGate(res)) return gatePage(res.url);
    store(key, res);
    return res;
  } catch (e) {
    return offlinePage();
  }
}

/* Skripty, styl, manifest: uložená kopie se vrací HNED a čerstvá se stahuje
   na pozadí. Dřív se čekalo na síť se stropem 3 s, jenže `style.css` blokuje
   vykreslení – start hry se o ten čas opozdil pokaždé, i když byl soubor
   v cache, a na probouzejícím se mobilním rádiu z toho byly celé sekundy
   prázdného okna. Čerstvost hlídá číslo cache výš: při vydání se zvedne,
   `install` stáhne všechno znovu a teprve pak se nová verze aktivuje. Stránka
   hry se z cache brala odjakživa, tímhle se k ní jen srovnaly i skripty. */
async function staleFirst(req) {
  const hit = await cached(req.url);
  if (hit) {
    refresh(req.url);
    return hit;
  }
  const ctrl = new AbortController();
  try {
    const res = await withTimeout(fetch(req.url, { cache: 'no-cache', signal: ctrl.signal }), 8000, ctrl);
    if (!storable(res)) {
      // Stránka brány vrácená místo skriptu by hru rozbila potichu: prohlížeč
      // by HTML odmítl a v konzoli by zbyla jediná nicneříkající hláška.
      // Prázdná chyba aspoň spustí hlídač spuštění v index.html.
      return new Response('', { status: 504, statusText: 'Nedostupné' });
    }
    store(req.url, res);
    return res;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// Hudba, písma a obrázky se prakticky nemění a jsou velké – z cache hned
// a na pozadí se znovu nestahují, ať hra nežere data při každém spuštění.
async function cacheFirst(req) {
  const hit = await cached(req.url);
  if (hit) return hit;
  try {
    const res = await fetch(req.url);
    store(req.url, res);
    return storable(res) ? res : new Response('', { status: 504, statusText: 'Nedostupné' });
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
  let full = await cached(req.url);
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

  // Doplňuje se jen při startu hry, ne u každého souboru – jednou za spuštění
  // stačí a na rozdíl od odpovědi se na to nečeká.
  if (req.mode === 'navigate') { e.respondWith(handleNavigate(req)); e.waitUntil(topUp()); return; }

  // Range požadavek (typicky iOS audio) obsloužíme jako 206 Partial Content
  if (req.headers.has('range')) { e.respondWith(rangeResponse(req)); return; }

  e.respondWith(HEAVY.test(url.pathname) ? cacheFirst(req) : staleFirst(req));
});
