/* =========================================================
   PLATFORM – jedna vrstva pro web (PWA) i pro Android (Capacitor)

   Hra má běžet stejně v prohlížeči i v aplikaci z Google Play. Herní kód
   proto nikdy nesmí sám zjišťovat, kde běží – zavolá PLATFORM.haptic(),
   PLATFORM.share() nebo STORE.set() a tenhle soubor si sám vybere, jestli
   sáhne po nativním pluginu, nebo po webové náhradě.

   Nativní pluginy se berou z běhového mostu Capacitoru (window.Capacitor),
   takže tu nejsou žádné importy a hra dál funguje jako obyčejné <script>
   soubory bez sestavovacího kroku. Když plugin chybí (web, starší build),
   všechno tiše spadne na webovou variantu – nikdy to nesmí shodit běh.
   ========================================================= */
window.PLATFORM = (() => {
  'use strict';

  const CAP = window.Capacitor || null;
  const NATIVE = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());

  // most Capacitoru vrací proxy i na plugin, který v buildu není – takové
  // volání pak jen odmítne slib, proto je všude .catch()
  function plugin(name) {
    if (!NATIVE) return null;
    try {
      if (typeof CAP.registerPlugin === 'function') return CAP.registerPlugin(name);
      return (CAP.Plugins && CAP.Plugins[name]) || null;
    } catch (e) { return null; }
  }

  const Haptics = plugin('Haptics');
  const App = plugin('App');
  const Prefs = plugin('Preferences');
  const Share = plugin('Share');
  const Filesystem = plugin('Filesystem');

  /* ---------- haptika ----------
     Vibrace jde ruku v ruce se zvukovými efekty: kdo si vypne zvuky, chce
     mít klid úplně, ne telefon poskakující v kapse. Krátké dojmy se navíc
     škrtí – při sbírání mrkví by se jinak slily do jednoho trvalého bzučení. */
  let hapticsOn = true;
  let lastHaptic = -1e9;

  const IMPACT = { light: 'LIGHT', medium: 'MEDIUM', heavy: 'HEAVY' };
  const WEB_PATTERN = {
    light: [10],
    medium: [22],
    heavy: [40, 30, 80],
    success: [18, 60, 18],
  };
  // jak dlouho po předchozí vibraci se stejný typ přeskočí (ms)
  const HAPTIC_GAP = { light: 55, medium: 90, heavy: 0, success: 0 };

  function haptic(kind) {
    if (!hapticsOn) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const gap = HAPTIC_GAP[kind] !== undefined ? HAPTIC_GAP[kind] : 55;
    if (now - lastHaptic < gap) return;
    lastHaptic = now;
    try {
      if (Haptics) {
        if (kind === 'success') Haptics.notification({ type: 'SUCCESS' }).catch(() => {});
        else Haptics.impact({ style: IMPACT[kind] || 'LIGHT' }).catch(() => {});
        return;
      }
      if (navigator.vibrate) navigator.vibrate(WEB_PATTERN[kind] || WEB_PATTERN.light);
    } catch (e) { /* haptika je třešnička, nikdy nesmí shodit hru */ }
  }

  function setHaptics(on) {
    hapticsOn = !!on;
    if (!hapticsOn && navigator.vibrate) { try { navigator.vibrate(0); } catch (e) {} }
  }

  /* ---------- tlačítko Zpět ----------
     Na Androidu je hardwarové/gestové Zpět povinnost: bez ošetření aplikace
     rovnou skončí i uprostřed běhu. Na webu dělá totéž klávesa Escape a
     tlačítko Zpět v prohlížeči (drží se jeden „strážný“ záznam v historii).

     handler() vrátí true, když si událost vzal (odešlo se o obrazovku zpět),
     nebo false, když už jsme na úvodní obrazovce – tam se aplikace na
     Androidu ukončí a na webu se nestane nic. */
  function onBack(handler) {
    if (App) {
      App.addListener('backButton', () => {
        if (!handler()) { try { App.exitApp(); } catch (e) {} }
      });
      return;
    }
    // web: jeden strážný záznam v historii, který se po každém použití obnoví
    let guard = false;
    const pushGuard = () => {
      if (guard) return;
      try { history.pushState({ lrGuard: 1 }, ''); guard = true; } catch (e) {}
    };
    pushGuard();
    window.addEventListener('popstate', () => {
      guard = false;
      if (handler()) pushGuard();
      // když handler vrátí false, jsme v menu – strážný záznam už neobnovujeme
      // a další Zpět odejde z hry pryč, jak hráč čeká
    });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      handler();
      pushGuard();
    });
  }

  /* ---------- sdílení výsledku ----------
     Web: Web Share API s obrázkem, jinak stažení PNG.
     Android: WebView navigator.share nezná, jde se přes plugin Share –
     obrázek se musí nejdřív uložit do cache a sdílí se jeho file:// adresa.

     POZOR: když se sdílí obrázek, NEPOSÍLÁ se k němu žádný text ani titulek.
     Android má v jednom sdílení jediný typ obsahu; k obrázku se text přidá
     jako EXTRA_TEXT a příjemce si pak vybere, co z toho vezme. Instagram
     text neumí (nemá kam ho dát) a smíšené sdílení u něj skončí tím, že se
     appka jen otevře a obrázek zmizí. Adresa hry i odznak Google Play jsou
     navíc vypálené přímo v obrázku (buildShareCard), takže se textem nic
     neztrácí. Text se posílá jen tam, kde obrázek sdílet nejde. */
  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function share({ title, text, blob, filename }) {
    const name = filename || 'louka-run.png';
    if (Share && Filesystem && blob) {
      try {
        const data = await blobToBase64(blob);
        await Filesystem.writeFile({ path: name, data, directory: 'CACHE' });
        const { uri } = await Filesystem.getUri({ path: name, directory: 'CACHE' });
        await Share.share({ files: [uri] }); // bez textu – viz komentář výše
        return true;
      } catch (e) { /* zkusíme níž aspoň text */ }
    }
    if (Share) {
      try { await Share.share({ title, text }); return true; } catch (e) { return false; }
    }
    if (blob && navigator.canShare) {
      try {
        const file = new File([blob], name, { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] }); // bez textu – viz komentář výše
          return true;
        }
      } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    if (navigator.share) {
      try { await navigator.share({ title, text }); return true; } catch (e) { return false; }
    }
    // poslední záchrana: stáhnout obrázek, ať hráč aspoň má co poslat
    if (blob) {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return true;
      } catch (e) { return false; }
    }
    return false;
  }

  const canShare = !!(Share || navigator.share || navigator.canShare);

  return { native: NATIVE, haptic, setHaptics, onBack, share, canShare };
})();

/* =========================================================
   STORE – uložený postup

   Čtení musí být okamžité (hra si postup bere hned při startu), proto je
   zdrojem pravdy localStorage. Na Androidu se navíc všechno zrcadlí do
   nativních Preferences (SharedPreferences), které přežijí i vymazání dat
   WebView. Když se ukáže, že localStorage je prázdný a v Preferences záloha
   je, postup se obnoví a stránka se jednou načte znovu – to celé ještě
   během úvodní animace, takže si toho hráč nevšimne.

   Až se někdy bude připojovat cloud (Google Play Saved Games nebo Azure),
   mění se jen tenhle objekt – herní kód zůstane, jak je.
   ========================================================= */
window.STORE = (() => {
  'use strict';

  const CAP = window.Capacitor || null;
  const NATIVE = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());
  let Prefs = null;
  if (NATIVE) {
    try { Prefs = typeof CAP.registerPlugin === 'function' ? CAP.registerPlugin('Preferences') : (CAP.Plugins || {}).Preferences; } catch (e) { Prefs = null; }
  }

  function getSync(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* plné/zakázané úložiště – postup zůstane v paměti */ }
    if (Prefs) { try { Prefs.set({ key, value }).catch(() => {}); } catch (e) {} }
  }

  /* Záchrana postupu po vymazání dat WebView. Spustí se jen na Androidu,
     jen když v localStorage nic není, a jen jednou za sezení. */
  function recover(key) {
    if (!Prefs) return;
    if (getSync(key) !== null) return;
    let already = false;
    try { already = sessionStorage.getItem('lr_recovered') === '1'; } catch (e) { already = true; }
    if (already) return;
    Prefs.get({ key }).then(({ value }) => {
      if (!value) return;
      try {
        JSON.parse(value); // poškozenou zálohu radši zahodíme, než abychom na ni spadli
        localStorage.setItem(key, value);
        sessionStorage.setItem('lr_recovered', '1');
        location.reload();
      } catch (e) { /* nedá se nic dělat, jede se od nuly */ }
    }).catch(() => {});
  }

  return { getSync, set, recover, native: NATIVE };
})();
