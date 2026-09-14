/* Player comfort settings are separate from game progress. */
window.COMFORT = (() => {
  'use strict';
  const KEY = 'loukarun_comfort_v1';
  const read = (key) => {
    try { return JSON.parse(STORE.getSync(key)) || {}; } catch (e) { return {}; }
  };
  const legacy = read('loukarun_save_v1');
  /* Nové volby jsou schválně vypnuté: hra se po aktualizaci musí chovat
     přesně jako předtím. Kdo o ně stojí, zapne si je v Nastavení – opačné
     pořadí by všem vracejícím se hráčům bez ptaní sebralo znělku a položilo
     přes hrací plochu dvě tlačítka. */
  const defaults = {
    musicVolume: 1, sfxVolume: 1, voiceVolume: 1,
    haptics: legacy.sfx !== false, reduceMotion: false,
    largeText: false, fastStart: false, touchControls: false,
  };
  function normalize(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const v = source[key];
      result[key] = typeof fallback === 'boolean'
        ? (typeof v === 'boolean' ? v : fallback)
        : (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback);
    }
    return result;
  }
  const state = normalize(read(KEY));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => state.reduceMotion || motion.matches;
  const text = (cs, en) => I18N.lang === 'en' ? en : cs;
  const fields = [
    ['musicVolume', 'Hudba', 'Music', 'range'],
    ['sfxVolume', 'Zvukové efekty', 'Sound effects', 'range'],
    ['voiceVolume', 'Hlasy zvířat', 'Animal voices', 'range'],
    ['haptics', 'Vibrace', 'Vibration', 'checkbox'],
    ['reduceMotion', 'Klidné efekty a kamera', 'Reduced effects and camera motion', 'checkbox'],
    ['largeText', 'Větší text v panelech', 'Larger panel text', 'checkbox'],
    ['fastStart', 'Rychlý návrat bez intra', 'Skip intros on return visits', 'checkbox'],
    ['touchControls', 'Tlačítka skoku a skluzu', 'Jump and slide buttons', 'checkbox'],
  ];
  const inputs = new Map();
  let legend = null, status = null, note = null;

  /* O vibracích rozhoduje zdejší přepínač A hlavní vypínač zvuků, který
     patří hře. Bránu si proto hra nastaví sama – bez ní by ťuknutí na
     „Vibrace“ zapnulo bzučení i ztlumené hře. */
  let hapticsGate = () => true;
  function applyHaptics() { PLATFORM.setHaptics(state.haptics && hapticsGate()); }

  function apply() {
    AUDIO.setMix({ music: state.musicVolume, sfx: state.sfxVolume, voice: state.voiceVolume });
    applyHaptics();
    const root = document.documentElement;
    root.classList.toggle('comfort-reduced', reduced());
    root.classList.toggle('comfort-large-text', state.largeText);
    root.classList.toggle('comfort-touch-controls', state.touchControls);
    for (const [key, row] of inputs) {
      if (row.input.type === 'range') {
        row.input.value = String(Math.round(state[key] * 100));
        row.output.textContent = row.input.value + '%';
      } else row.input.checked = state[key];
    }
  }

  function persist() {
    const saved = STORE.set(KEY, JSON.stringify(state));
    if (status) status.textContent = saved === false
      ? text('Trvalé uložení se nepodařilo potvrdit. Nastavení platí pro toto spuštění.', 'Persistent saving could not be confirmed. Settings apply to this session.')
      : '';
  }

  function syncText() {
    if (legend) legend.textContent = text('Hra podle tebe', 'Make yourself at home');
    if (note) note.textContent = text('Hlasitost dolaď zde. Přepínače Zvuky a Hudba výše zůstávají hlavním vypínačem.', 'Fine-tune volume here. The Sounds and Music buttons above remain the master switches.');
    for (const [key, cs, en] of fields) {
      const row = inputs.get(key);
      if (row) row.label.textContent = text(cs, en);
    }
    const jump = document.getElementById('comfort-jump');
    const slide = document.getElementById('comfort-slide');
    if (jump) { jump.textContent = text('↑ Skok', '↑ Jump'); jump.setAttribute('aria-label', text('Skok, podrž pro vyšší skok', 'Jump, hold to jump higher')); }
    if (slide) { slide.textContent = text('↓ Skluz', '↓ Slide'); slide.setAttribute('aria-label', text('Skluz', 'Slide')); }
  }

  const host = document.getElementById('comfort-settings');
  if (host) {
    /* Panel je ve výchozím stavu složený: osm řádků prodlouží kartu nastavení
       o 250–390 px a na každém telefonu by se k jejímu konci dalo jen
       dorolovat (audit-rozvrzeni.js hlásil 34 nálezů proti nule na čistém
       stavu). Takhle zůstane obrazovka stejně vysoká jako dosud a obsah se
       rozbalí na požádání – .screen má overflow-y: auto, takže je dosažitelný.

       Skládá se přes `hidden`, ne přes <details>. Zavřené <details> tady
       obsah neskrylo (obal měl přes 300 px a texty lezly přes odkazy pod
       kartou), takže o viditelnosti rozhoduje atribut, ne chování prohlížeče. */
    const group = document.createElement('div');
    group.className = 'comfort-panel';
    legend = document.createElement('button');
    legend.type = 'button';
    legend.className = 'comfort-toggle';
    legend.setAttribute('aria-expanded', 'false');
    group.appendChild(legend);
    const body = document.createElement('div');
    body.className = 'comfort-body';
    body.hidden = true;
    legend.addEventListener('click', () => {
      body.hidden = !body.hidden;
      legend.setAttribute('aria-expanded', String(!body.hidden));
      group.classList.toggle('open', !body.hidden);
    });
    const grid = document.createElement('div');
    grid.className = 'comfort-grid';
    for (const [key, cs, en, type] of fields) {
      const label = document.createElement('label');
      label.className = 'comfort-row comfort-' + type;
      const caption = document.createElement('span');
      const input = document.createElement('input');
      input.id = 'comfort-' + key;
      input.type = type;
      let output = null;
      if (type === 'range') {
        input.min = '0'; input.max = '100'; input.step = '1';
        output = document.createElement('output');
        output.htmlFor = input.id;
        label.append(caption, output, input);
      } else label.append(input, caption);
      input.addEventListener('input', () => {
        state[key] = type === 'range' ? Number(input.value) / 100 : input.checked;
        apply();
      });
      input.addEventListener('change', persist);
      inputs.set(key, { input, label: caption, output });
      grid.appendChild(label);
    }
    body.appendChild(grid);
    note = document.createElement('p');
    note.className = 'comfort-note';
    status = document.createElement('p');
    status.className = 'comfort-status';
    status.setAttribute('role', 'status');
    body.append(note, status);
    group.appendChild(body);
    host.appendChild(group);
  }
  if (motion.addEventListener) motion.addEventListener('change', apply);
  else if (motion.addListener) motion.addListener(apply);
  I18N.onChange(syncText);
  apply();
  syncText();
  return {
    get settings() { return { ...state }; },
    get reducedMotion() { return reduced(); },
    get fastStart() { return state.fastStart; },
    get haptics() { return state.haptics; },
    setHapticsGate(fn) { hapticsGate = fn; applyHaptics(); },
    syncHaptics: applyHaptics,
  };
})();
