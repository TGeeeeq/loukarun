/* =========================================================
   LOUKA RUN – lokalizace
   Čeština je výchozí, angličtina se přepíná v menu.
   Texty herních dat (postavy, hlášky…) žijí v data.js jako
   objekty { cs, en } a vybírá z nich I18N.pick().
   ========================================================= */

const I18N = (() => {
  const KEY = 'loukarun_lang_v1';
  const LANGS = ['cs', 'en'];
  let lang = 'cs';
  try {
    const s = localStorage.getItem(KEY);
    if (LANGS.includes(s)) lang = s;
  } catch (e) { /* soukromý režim apod. – zůstane čeština */ }

  const STRINGS = {
    cs: {
      'meta.title': 'Louka Run 🥕 – hra na podporu azylu Nech mě růst',
      'menu.subtitle': 'Běhací hra na podporu azylu <a href="https://nechmerust.org" target="_blank" rel="noopener">Nech mě růst</a> 💚',
      'menu.play': '▶ &nbsp;BĚŽET!',
      'menu.shop': '🐾 Zvířátka &amp; obchod',
      'menu.sounds': 'Zvuky',
      'menu.music': 'Hudba',
      'menu.install': '📲 Instalovat hru',
      'menu.donate': '💚 Podpoř azyl',
      'menu.privacy': '🔒 Soukromí',
      'menu.testers': '📋 Návod pro testery',
      'menu.hint': '⌨️ Mezerník = skok (2× dvojskok) · šipka dolů = skluz &nbsp;|&nbsp; 📱 ťuknutí = skok · swipe dolů = skluz',
      'shop.title': 'Zvířecí obyvatelé',
      'shop.note': 'Všechna zvířátka doopravdy žijí v azylu Nech mě růst. 🐾',
      'shop.selected': '✓ Vybráno',
      'shop.select': 'Vybrat',
      'shop.free': 'Zdarma',
      'shop.stat.speed': 'Rychlost',
      'shop.stat.jump': 'Skok',
      'shop.stat.stamina': 'Výdrž',
      'shop.cta.q': 'S kým dalším by sis přál skákat a skotačit po louce? 🐾',
      'shop.cta.text': 'Tohle je zatím celá naše běžecká parta. Každé zvířátko z azylu má svůj příběh – přijď je poznat naživo!',
      'shop.cta.btn': '💚 Naši zvířecí obyvatelé',
      'over.finish': 'CÍL DNEŠNÍHO BĚHU!',
      'over.record': '🏆 NOVÝ REKORD!',
      'over.dist': 'Doběhnuto',
      'over.carrots': 'Mrkviček',
      'over.coins': 'Mince',
      'over.best': 'Rekord',
      'over.again': '🐾 Běžet znovu',
      'over.animals': '🛍 Zvířátka',
      'over.menu': '🏠 Menu',
      'pause.title': 'Přestávka na trávu 🌱',
      'pause.resume': '▶ Pokračovat',
      'pause.menu': '🏠 Zpět do menu',
      'toast.needCoins': 'Chybí ti ještě {n} mincí. Běhej a sbírej! 🪙',
      'toast.joined': '{name} se přidává k běžeckému týmu! 🎉',
      'fl.golden': 'ZLATÁ MRKEV! +{n} ⚡',
      'fl.clover': 'ČTYŘLÍSTEK! Mince ×{n} 🍀',
      'fl.concert': 'VYPRODÁNO! +{n} ⚡ 🎶',
      'fl.ram': 'BERANIDLO! 💥',
      'tut.hint.jump': '⬆ ťukni / mezerník = skok',
      'tut.hint.duck': '⬇ swipe dolů / šipka dolů = skrčit',
      'tut.continue': '▶ Pokračovat',
      'ach.title': '🎖️ Odznaky',
      'ach.new': 'Nový odznak',
      'a11y.pause': 'Pauza',
      'a11y.back': 'Zpět',
    },
    en: {
      'meta.title': 'Louka Run 🥕 – a game supporting the Nech mě růst sanctuary',
      'menu.subtitle': 'A runner game supporting the <a href="https://nechmerust.org" target="_blank" rel="noopener">Nech mě růst</a> animal sanctuary 💚',
      'menu.play': '▶ &nbsp;RUN!',
      'menu.shop': '🐾 Animals &amp; shop',
      'menu.sounds': 'Sounds',
      'menu.music': 'Music',
      'menu.install': '📲 Install game',
      'menu.donate': '💚 Support the sanctuary',
      'menu.privacy': '🔒 Privacy',
      'menu.testers': '📋 Tester guide',
      'menu.hint': '⌨️ Space = jump (2× double jump) · down arrow = slide &nbsp;|&nbsp; 📱 tap = jump · swipe down = slide',
      'shop.title': 'Sanctuary residents',
      'shop.note': 'All of these animals really live at the Nech mě růst sanctuary. 🐾',
      'shop.selected': '✓ Selected',
      'shop.select': 'Select',
      'shop.free': 'Free',
      'shop.stat.speed': 'Speed',
      'shop.stat.jump': 'Jump',
      'shop.stat.stamina': 'Stamina',
      'shop.cta.q': 'Who else would you love to jump and frolic with? 🐾',
      'shop.cta.text': 'That’s our whole running crew for now. Every animal from the sanctuary has its own story – come meet them for real!',
      'shop.cta.btn': '💚 Our animal residents',
      'over.finish': 'TODAY’S RUN IS DONE!',
      'over.record': '🏆 NEW RECORD!',
      'over.dist': 'Distance',
      'over.carrots': 'Carrots',
      'over.coins': 'Coins',
      'over.best': 'Best',
      'over.again': '🐾 Run again',
      'over.animals': '🛍 Animals',
      'over.menu': '🏠 Menu',
      'pause.title': 'Grass break 🌱',
      'pause.resume': '▶ Resume',
      'pause.menu': '🏠 Back to menu',
      'toast.needCoins': 'You need {n} more coins. Run and collect! 🪙',
      'toast.joined': '{name} joins the running team! 🎉',
      'fl.golden': 'GOLDEN CARROT! +{n} ⚡',
      'fl.clover': 'FOUR-LEAF CLOVER! Coins ×{n} 🍀',
      'fl.concert': 'SOLD OUT! +{n} ⚡ 🎶',
      'fl.ram': 'BATTERING RAM! 💥',
      'tut.hint.jump': '⬆ tap / space = jump',
      'tut.hint.duck': '⬇ swipe down / down arrow = duck',
      'tut.continue': '▶ Continue',
      'ach.title': '🎖️ Badges',
      'ach.new': 'New badge',
      'a11y.pause': 'Pause',
      'a11y.back': 'Back',
    },
  };

  const listeners = [];

  function t(key, params) {
    let s = STRINGS[lang][key] ?? STRINGS.cs[key] ?? key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
    return s;
  }

  // překlad v opačném jazyce – pro dvojjazyčné prvky úvodní obrazovky
  function tOther(key, params) {
    const other = lang === 'cs' ? 'en' : 'cs';
    let s = STRINGS[other][key] ?? key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
    return s;
  }

  // herní data: { cs: '…', en: '…' } → text v aktuálním jazyce
  function pick(v) {
    if (v && typeof v === 'object') return v[lang] ?? v.cs;
    return v;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-other]').forEach(el => { el.innerHTML = tOther(el.dataset.i18nOther); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    for (const fn of listeners) fn(lang);
  }

  function set(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* nevadí */ }
    apply();
  }

  return { t, tOther, pick, apply, set, onChange: (fn) => listeners.push(fn), get lang() { return lang; } };
})();
