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
      'menu.hint': '⌨️ Mezerník = skok (2× dvojskok) · šipka dolů = skluz &nbsp;|&nbsp; 📱 ťuknutí = skok · swipe dolů = skluz',
      'settings.title': '⚙ Nastavení',
      'a11y.settings': 'Nastavení',
      'a11y.daily': 'Denní mise',
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
      'combo.tier1': 'ŘETĚZ!',
      'combo.tier2': 'PARÁDNÍ ŘETĚZ!',
      'combo.tier3': 'NEZASTAVITELNÝ!',
      'combo.tier4': 'LOUKA HOŘÍ! 🔥',
      'combo.tier5': 'LEGENDA LOUKY!',
      'combo.tier6': 'TO UŽ NENÍ NORMÁLNÍ!',
      'combo.tier7': 'BOŽSKÝ ŘETĚZ! ✨',
      'combo.tier8': 'MIMO TENTO SVĚT! 🌠',
      'combo.payout': 'ŘETĚZ {n} → +{c} 🪙',
      'combo.break': 'ŘETĚZ PŘETRŽEN',
      'over.combo': 'Nejdelší řetěz',
      'over.share': '📤 Pochlubit se',
      'share.title': 'Louka Run',
      'share.text': 'Můj běh v Louka Run: {d} m s {name}! 🥕 Hra na podporu azylu Nech mě růst. {url}',
      'share.card.sub': 'Běh pro azyl Nech mě růst',
      'share.card.dist': 'DOBĚHNUTO',
      'share.card.chain': 'ŘETĚZ',
      'share.card.record': 'NOVÝ REKORD',
      'daily.title': '📅 Denní mise',
      'daily.claim': 'Vyzvednout {n} 🪙',
      'daily.claimed': '✓ Vyzvednuto',
      'daily.allDone': 'Všechny dnešní mise splněny! Zítra přijdou nové. 🌱',
      'toast.daily': 'Denní mise splněna! 🎉',
      'q.dist': 'Doběhni {n} m v jednom běhu',
      'q.carrots': 'Nasbírej {n} mrkviček za jeden běh',
      'q.coins': 'Nasbírej {n} mincí za jeden běh',
      'q.combo': 'Udělej řetěz {n} sběrů',
      'q.golden': 'Sněz {n} zlaté mrkve v jednom běhu',
      'q.runs': 'Zaběhni {n} běhy',
      'q.clean': 'Doběhni {n} m bez jediného nárazu',
      'shop.diary': '📔 Deníček z azylu',
      'shop.diaryLocked': 'Odemkne se po {n} bězích s touhle postavou',
      'shop.diaryOpen': '📖 Otevřít deníček · {n} zajímavostí →',
      'diary.entries': 'Zápisky ošetřovatelů',
      'diary.entry': 'Zápisek {n}.',
      'diary.locked': 'Ještě {n} {w} s touhle postavou a pečeť praskne.',
      'diary.facts': 'Věděli jste?',
      'diary.factsTab': 'Zajímavosti o druhu',
      'diary.stories': 'Sbírka příběhů',
      'diary.story': 'Příběh {n}.',
      'diary.storyLocked': 'Tenhle konec jsi ještě neslyšel. Doběhni s touhle postavou znovu.',
      'task.title': 'Osobní úkoly',
      'task.head': 'Co po tobě {name} chce',
      'task.prize': 'Za všechny tři: {prize}',
      'task.won': 'Vysloužil sis: {prize}',
      'task.done': 'Úkol splněn!',
      'diary.sign': '— z deníku ošetřovatelů',
      'diary.home': 'žije v azylu Nech mě růst z.s.',
      'diary.hint': 'Listuj tažením nebo šipkami',
      'diary.endText': 'Všechna zvířátka v téhle hře doopravdy existují. Žijí na Louce, jedí, spí, hádají se o seno a nikam už nepojedou. Můžeš je přijet navštívit, adoptovat na dálku nebo přijít pomoct.',
      'diary.endLink': 'nechmerust.org →',
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
      'menu.hint': '⌨️ Space = jump (2× double jump) · down arrow = slide &nbsp;|&nbsp; 📱 tap = jump · swipe down = slide',
      'settings.title': '⚙ Settings',
      'a11y.settings': 'Settings',
      'a11y.daily': 'Daily missions',
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
      'combo.tier1': 'CHAIN!',
      'combo.tier2': 'GREAT CHAIN!',
      'combo.tier3': 'UNSTOPPABLE!',
      'combo.tier4': 'MEADOW ON FIRE! 🔥',
      'combo.tier5': 'MEADOW LEGEND!',
      'combo.tier6': 'THIS ISN’T NORMAL!',
      'combo.tier7': 'DIVINE CHAIN! ✨',
      'combo.tier8': 'OUT OF THIS WORLD! 🌠',
      'combo.payout': 'CHAIN {n} → +{c} 🪙',
      'combo.break': 'CHAIN BROKEN',
      'over.combo': 'Longest chain',
      'over.share': '📤 Share it',
      'share.title': 'Louka Run',
      'share.text': 'My Louka Run: {d} m with {name}! 🥕 A game supporting the Nech mě růst animal sanctuary. {url}',
      'share.card.sub': 'A run for the Nech mě růst sanctuary',
      'share.card.dist': 'DISTANCE',
      'share.card.chain': 'CHAIN',
      'share.card.record': 'NEW RECORD',
      'daily.title': '📅 Daily missions',
      'daily.claim': 'Claim {n} 🪙',
      'daily.claimed': '✓ Claimed',
      'daily.allDone': 'All of today’s missions are done! New ones tomorrow. 🌱',
      'toast.daily': 'Daily mission complete! 🎉',
      'q.dist': 'Run {n} m in a single run',
      'q.carrots': 'Collect {n} carrots in one run',
      'q.coins': 'Collect {n} coins in one run',
      'q.combo': 'Build a chain of {n} pickups',
      'q.golden': 'Eat {n} golden carrots in one run',
      'q.runs': 'Finish {n} runs',
      'q.clean': 'Run {n} m without a single hit',
      'shop.diary': '📔 Sanctuary diary',
      'shop.diaryLocked': 'Unlocks after {n} runs with this character',
      'shop.diaryOpen': '📖 Open the diary · {n} facts →',
      'diary.entries': 'Keepers’ notes',
      'diary.entry': 'Entry {n}',
      'diary.locked': '{n} more {w} with this animal and the seal breaks.',
      'diary.facts': 'Did you know?',
      'diary.factsTab': 'Facts about the species',
      'diary.stories': 'Story collection',
      'diary.story': 'Story {n}',
      'diary.storyLocked': 'You have not heard this ending yet. Run with this animal again.',
      'task.title': 'Personal tasks',
      'task.head': 'What {name} wants from you',
      'task.prize': 'For all three: {prize}',
      'task.won': 'You earned: {prize}',
      'task.done': 'Task complete!',
      'diary.sign': '— from the keepers’ diary',
      'diary.home': 'lives at the Nech mě růst sanctuary',
      'diary.hint': 'Swipe or use arrow keys',
      'diary.endText': 'Every animal in this game is real. They live at the Louka — eating, sleeping, arguing over hay, and going nowhere else ever again. You can come and visit them, adopt one from afar, or come and help.',
      'diary.endLink': 'nechmerust.org →',
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
