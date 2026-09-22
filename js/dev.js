/* =========================================================
   VÝVOJÁŘSKÝ REŽIM

   Nástroj pro jednoho člověka: rychle se vrátit do kůže nového hráče,
   nasypat si mince, odemknout stádo a skočit na kilometr, kde je vidět
   to, co se zrovna ladí. Do hry se nevměšuje, dokud ho někdo neodemkne.

   ODEMYKÁ SE SEDMI ŤUKNUTÍMI NA ČÍSLO VERZE V NASTAVENÍ (do tří vteřin
   mezi ťuknutími), na počítači i Ctrl+Shift+D. Příznak se pamatuje pod
   VLASTNÍM klíčem `loukarun_dev_v1` – schválně mimo `loukarun_save_v1`,
   protože „začít jako nový hráč" maže právě ten save a režim by si tím
   pokaždé vypnul sám sebe.

   Není to ochrana a nemá se za ni vydávat: hra běží v prohlížeči, takže
   kdokoli s vývojářskou konzolí si týž příznak nastaví ručně. Gesto brání
   jen náhodnému objevení – proto za ním nejsou žádná data ani cizí účty,
   jen vlastní postup hráče, který si stejně smí smazat.

   Soubor se smí kdykoli ztratit: `index.html` ho načítá zvlášť a `game.js`
   sáhne po `DEVTOOLS` jen `if (window.DEVTOOLS)`. Do `VITAL` v `sw.js`
   proto nepatří – chybějící vývojářský panel nesmí bránit tomu, aby se
   nová verze hry vůbec pustila ke slovu.
   ========================================================= */
window.DEVTOOLS = (() => {
  'use strict';

  const FLAG_KEY = 'loukarun_dev_v1';
  const SAVE_KEY = 'loukarun_save_v1';
  const COMFORT_KEY = 'loukarun_comfort_v1';
  const LANG_KEY = 'loukarun_lang_v1';

  const TAPS_NEEDED = 7;
  const TAP_WINDOW = 3000;

  let api = null;          // most z game.js, viz attach()
  let enabled = false;
  let panel = null;
  let opener = null;
  let taps = 0;
  let lastTap = 0;

  /* ---------- příznak ----------
     Čte se přes STORE, aby se na Androidu vezl i v nativní záloze: kdo si
     režim odemkne na telefonu, nemá o něj přijít po vyčištění WebView. */
  function readFlag() {
    try { return STORE.getSync(FLAG_KEY) === '1'; } catch (e) { return false; }
  }
  function writeFlag(on) {
    try { on ? STORE.set(FLAG_KEY, '1') : STORE.remove(FLAG_KEY); } catch (e) {}
  }

  /* ---------- úložiště ----------
     Mazání jde vždycky přes STORE.remove(), nikdy přes localStorage přímo.
     Na Androidu totiž `STORE.recover()` při příštím startu obnoví save
     z nativních Preferences – kdo smaže jen localStorage, uvidí po načtení
     přesně ten postup, kterého se chtěl zbavit, a bude to považovat za
     chybu resetu. Čeká se na slib, teprve pak se stránka načte znovu. */
  function wipe(keys) {
    return Promise.all(keys.map((k) => {
      try { return Promise.resolve(STORE.remove(k)); } catch (e) { return Promise.resolve(); }
    }));
  }

  /* Cache service workeru je něco jiného než postup a plete se to: tohle
     shodí uloženou KOPII HRY, ne hráčova data. V aplikaci z Google Play
     service worker není, takže tam tlačítko jen nic nenajde a řekne to. */
  async function wipeCaches() {
    let n = 0;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).then((ok) => { if (ok) n++; })));
    } catch (e) { /* prohlížeč bez Cache API */ }
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (e) {}
    return n;
  }

  function reload() {
    // `reload()` po smazání cache musí minout i cache prohlížeče, jinak se
    // vrátí tentýž index.html, který se právě zahazoval
    location.replace(location.pathname + location.search + location.hash);
  }

  /* ---------- panel ----------
     Bydlí v <body>, takže na telefonu na výšku jede v otočení
     `html.force-landscape` s ním a text je čitelný. Styl se vkládá odsud,
     ať se do produkčního stylopisu nepřidává nic, co hráč nikdy neuvidí. */
  const CSS = `
  #dev-open{position:fixed;right:6px;top:6px;z-index:9998;width:34px;height:34px;
    border:0;border-radius:50%;background:rgba(20,26,16,.62);color:#cdf5a0;
    font-size:17px;line-height:34px;padding:0;cursor:pointer;opacity:.5}
  #dev-open:active{opacity:1}
  #dev-panel{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;
    justify-content:center;background:rgba(0,0,0,.55);font-family:system-ui,sans-serif}
  #dev-panel[hidden]{display:none}
  /* position:relative je tu kvůli křížku: bez něj se absolutně pozicovaný
     #dev-close chytne panelu přes celé okno a na širokém displeji odletí
     do rohu obrazovky, daleko od karty. (Zpětné apostrofy sem nepatří –
     celý tenhle blok je template literal.) */
  #dev-card{position:relative;width:min(94%,560px);max-height:92%;overflow:auto;background:#161d12;
    color:#e8f3dc;border:1px solid #3c5230;border-radius:12px;padding:10px 12px 14px;
    box-shadow:0 10px 40px rgba(0,0,0,.5);-webkit-overflow-scrolling:touch}
  #dev-card h3{margin:0 0 2px;font-size:15px;color:#cdf5a0}
  #dev-card h4{margin:12px 0 5px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;
    color:#8fae76;border-top:1px solid #2c3b23;padding-top:8px}
  #dev-card h4:first-of-type{border-top:0;padding-top:0}
  #dev-sub{margin:0;font-size:11px;color:#8fae76}
  .dev-row{display:flex;flex-wrap:wrap;gap:5px}
  .dev-row button{flex:1 1 128px;min-height:34px;padding:5px 8px;font:inherit;font-size:12px;
    background:#24301c;color:#e8f3dc;border:1px solid #3c5230;border-radius:7px;cursor:pointer}
  .dev-row button:active{background:#33441f}
  .dev-row button.on{background:#4a7a28;border-color:#6ca63a;color:#fff}
  .dev-row button.warn{border-color:#7a3b2a;color:#f0b8a6}
  #dev-close{position:absolute;top:8px;right:10px;background:none;border:0;color:#8fae76;
    font-size:20px;line-height:1;cursor:pointer;padding:4px}
  #dev-msg{margin:9px 0 0;min-height:15px;font-size:11px;color:#cdf5a0}`;

  function say(text) {
    const el = document.getElementById('dev-msg');
    if (el) el.textContent = text || '';
  }

  // Nativní prompt() je v nainstalované PWA i ve WebView nespolehlivý
  // (Android ho v aplikaci umí ignorovat úplně), takže se ptáme vlastním
  // řádkem uvnitř panelu. Vrací null, když člověk nic nezadal.
  function ask(label, preset) {
    const raw = window.prompt(label, preset == null ? '' : String(preset));
    if (raw === null) return null;
    const n = Number(String(raw).replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  }

  function button(row, label, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', onClick);
    row.appendChild(b);
    return b;
  }

  function section(card, title) {
    const h = document.createElement('h4');
    h.textContent = title;
    card.appendChild(h);
    const row = document.createElement('div');
    row.className = 'dev-row';
    card.appendChild(row);
    return row;
  }

  function build() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    opener = document.createElement('button');
    opener.id = 'dev-open';
    opener.type = 'button';
    opener.title = 'Vývojářský režim';
    opener.setAttribute('aria-label', 'Vývojářský režim');
    opener.textContent = '🛠';
    opener.addEventListener('click', open);
    document.body.appendChild(opener);

    panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.hidden = true;
    panel.addEventListener('click', (e) => { if (e.target === panel) close(); });

    const card = document.createElement('div');
    card.id = 'dev-card';
    panel.appendChild(card);

    const close$ = document.createElement('button');
    close$.id = 'dev-close';
    close$.type = 'button';
    close$.setAttribute('aria-label', 'Zavřít');
    close$.textContent = '×';
    close$.addEventListener('click', close);
    card.appendChild(close$);

    const h = document.createElement('h3');
    h.textContent = '🛠 Vývojářský režim';
    card.appendChild(h);
    const sub = document.createElement('p');
    sub.id = 'dev-sub';
    sub.textContent = 'hra ' + (api && api.version ? 'v' + api.version : '?')
      + (STORE.native ? ' · aplikace' : ' · web');
    card.appendChild(sub);

    buildProgress(card);
    buildMoney(card);
    buildRun(card);
    buildFooter(card);

    const msg = document.createElement('p');
    msg.id = 'dev-msg';
    card.appendChild(msg);

    document.body.appendChild(panel);
  }

  /* ---------- postup ---------- */
  function buildProgress(card) {
    const row = section(card, 'Začít znovu');

    button(row, '🧹 Úplně nový hráč', async () => {
      if (!confirm('Smazat celý postup i nastavení a načíst hru znovu?')) return;
      say('mažu…');
      await wipe([SAVE_KEY, COMFORT_KEY]);
      reload();
    }, 'warn');

    button(row, '🫏 Znovu potkat Karla', () => {
      const s = api.save;
      s.karelSeen = 0;
      s.karelHellos = 0;
      s.karelGuideSeen = false;
      s.karelLastSeen = 0;
      s.karelFed = 0;
      s.karelAlways = false;
      s.storyIdx = 0;
      s.storySeen = [];
      api.persist();
      say('Karel na tebe zapomněl. Otevři ho v menu.');
    });

    button(row, '🎓 Znovu školu běhu', () => {
      api.save.tutorialDone = false;
      api.persist();
      say('Škola běhu se spustí při dalším běhu.');
    });

    button(row, '📔 Zapomenout deníček', () => {
      const s = api.save;
      s.factsRead = {};
      s.charTasks = {};
      s.seenObstacles = [];
      api.persist();
      api.refreshMenu();
      say('Přečtená fakta i splněné úkoly jsou pryč.');
    });
  }

  /* ---------- peníze a odemknutí ---------- */
  function buildMoney(card) {
    const row = section(card, 'Mince a odemknutí');

    button(row, '🪙 +1 000', () => {
      api.save.coins += 1000;
      api.persist();
      api.refreshMenu();
      say('Mincí: ' + api.save.coins);
    });

    button(row, '🪙 Nastavit…', () => {
      const n = ask('Kolik mincí?', api.save.coins);
      if (n === null) return;
      api.save.coins = Math.max(0, Math.round(n));
      api.persist();
      api.refreshMenu();
      say('Mincí: ' + api.save.coins);
    });

    button(row, '🐾 Odemknout vše', () => {
      const s = api.save;
      // `unlocked` drží id postav, `items` id ozdob, `worn` výběr na zvíře;
      // sjednocení přes Set proto, že obojí se jinde jen přidává push()em
      s.unlocked = Array.from(new Set(s.unlocked.concat(api.CHARACTERS.map((c) => c.id))));
      s.items = Array.from(new Set((s.items || []).concat(api.ITEMS.map((i) => i.id))));
      api.persist();
      api.refreshMenu();
      say(s.unlocked.length + ' zvířátek, ' + s.items.length + ' ozdob.');
    });

    button(row, '🔒 Zamknout vše', () => {
      const s = api.save;
      // Karel je startovní postava a zamknout ho nejde: hra by po načtení
      // neměla za koho běžet a spadla by dřív, než by to šlo vrátit
      s.unlocked = ['karel'];
      s.selected = 'karel';
      s.items = [];
      s.worn = {};
      api.persist();
      api.refreshMenu();
      say('Zpátky na začátek obchodu.');
    }, 'warn');
  }

  /* ---------- zásahy do běhu ---------- */
  function buildRun(card) {
    const row = section(card, 'Za běhu');

    const god = button(row, '🛡 Nesmrtelnost', () => {
      api.flags.god = !api.flags.god;
      god.classList.toggle('on', api.flags.god);
      say(api.flags.god
        ? 'Nárazy neubírají energii a energie neubývá.'
        : 'Zpátky normální pravidla.');
    });
    god.classList.toggle('on', api.flags.god);

    button(row, '📏 Skočit na…', () => {
      const m = ask('Na kolikátý metr?', 2500);
      if (m === null) return;
      const to = Math.max(0, Math.round(m));
      const done = api.teleport(to);
      say(done
        ? 'Jsi na ' + to + ' m. Obtížnost i rychlost odpovídají.'
        : 'Jde to jen za běhu – nejdřív spusť běh.');
    });

    button(row, '⚡ Doplnit energii', () => {
      say(api.refill() ? 'Energie na 100 %.' : 'Jde to jen za běhu.');
    });

    button(row, '💀 Ukončit běh', () => {
      say(api.finish() ? 'Běh ukončen, jsi v cíli.' : 'Žádný běh neběží.');
    });
  }

  /* ---------- servis ---------- */
  function buildFooter(card) {
    const row = section(card, 'Kopie hry a režim');

    button(row, '♻️ Smazat cache hry', async () => {
      if (STORE.native) { say('V aplikaci žádná cache hry není – aktualizuje se přes Google Play.'); return; }
      say('mažu cache…');
      const n = await wipeCaches();
      say('Smazáno ' + n + ' cache. Načítám znovu…');
      setTimeout(reload, 600);
    });

    button(row, '🚪 Vypnout režim', () => {
      if (!confirm('Vypnout vývojářský režim? Zpátky sedmi ťuknutími na verzi v Nastavení.')) return;
      disable();
    }, 'warn');
  }

  /* ---------- kde smí plovoucí tlačítko svítit ----------
     Změřeno, ne odhadnuto: v menu leží dole odznak denních misí a v obchodě
     i v nastavení je nahoře kruhové Zpět – žádný roh není volný na všech
     obrazovkách naráz. Tlačítko proto svítí jen v menu a za běhu (tam je
     pravý horní roh prázdný na všech testovaných rozlišeních) a jinde se
     schová; z obchodu se panel otevře ťuknutím na verzi v Nastavení.

     Hlídá to pozorovatel místo volání z hry: `showScreen()` je uvnitř IIFE
     a rozšiřovat kvůli tomu most by znamenalo dva zdroje pravdy o tom,
     která obrazovka je vidět. */
  function watchScreens() {
    const shown = () => {
      const hud = document.getElementById('hud');
      const menu = document.getElementById('screen-menu');
      return (menu && menu.classList.contains('visible'))
        || (hud && hud.classList.contains('visible'));
    };
    const paint = () => { if (opener && enabled) opener.hidden = !shown(); };
    const obs = new MutationObserver(paint);
    for (const el of document.querySelectorAll('.screen, #hud')) {
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
    paint();
  }

  /* ---------- otevírání ---------- */
  function open() {
    if (!panel) return;
    panel.hidden = false;
    say('');
  }
  function close() {
    if (panel) panel.hidden = true;
  }

  function enable(quiet) {
    if (enabled) { open(); return; }
    enabled = true;
    writeFlag(true);
    if (!panel) { build(); watchScreens(); }
    if (opener) opener.hidden = false;
    if (!quiet) open();
  }

  function disable() {
    enabled = false;
    writeFlag(false);
    close();
    if (opener) opener.hidden = true;
  }

  /* ---------- gesto ----------
     Sedm ťuknutí na číslo verze. Element je <span>, takže dostane jen
     posluchač a kurzor – vzhled Nastavení se nemění ani o pixel, jinak by
     tam ta věc svítila i na hráče, kteří ji nikdy nemají použít. */
  function armGesture() {
    const el = document.getElementById('game-version');
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      if (enabled) { open(); return; }
      const now = Date.now();
      taps = (now - lastTap > TAP_WINDOW) ? 1 : taps + 1;
      lastTap = now;
      if (taps >= TAPS_NEEDED) { taps = 0; enable(); }
    });
  }

  function armKeys() {
    window.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || !e.shiftKey || (e.key !== 'D' && e.key !== 'd')) return;
      e.preventDefault();
      enabled ? (panel && panel.hidden ? open() : close()) : enable();
    });
  }

  /* ---------- napojení na hru ----------
     `game.js` zavolá attach() na konci své inicializace a předá jediný most:
     save, pár funkcí a objekt příznaků, který sám každý snímek čte. Obrátit
     tu závislost (dev.js by si sahal do hry) nejde – game.js je jedno IIFE
     a zvenku z něj nevede nic. */
  function attach(bridge) {
    api = bridge;
    const url = new URLSearchParams(location.search);
    if (url.get('dev') === '0') { writeFlag(false); return; }
    armGesture();
    armKeys();
    if (url.has('dev') || readFlag()) enable(true);
  }

  return { attach, open, close, isOn: () => enabled };
})();
