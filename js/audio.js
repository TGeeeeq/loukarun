/* =========================================================
   LOUKA RUN – zvuk
   1) Zvukové efekty generované ve WebAudio (žádné soubory).
   2) Hudba: mp3 soubory v assets/music/ (viz HUDBA_PROMPTY.md).
   ========================================================= */

const AUDIO = (() => {
  let ctx = null;
  let sfxGain = null;   // efekty (řídí hlasitost i ztlumení na pauze)
  let voiceGain = null; // hlasy zvířátek a Karlův smích – vlastní úroveň
  let sfxComp = null;   // lepidlo na efekty
  let master = null;    // pojistka proti přebuzení na výstupu
  let enabled = true;
  let musicEnabled = true;
  let lastKey = null;

  // mapování prostředí → soubor
  const MUSIC_FILES = {
    intro:   'assets/music/menu.mp3', // intro a menu sdílí soubor → přechod je plynulý
    menu:    'assets/music/menu.mp3',
    louka:   'assets/music/louka.mp3',
    sad:     'assets/music/louka.mp3',
    les:     'assets/music/les.mp3',
    vesnice: 'assets/music/vesnice.mp3',
    zapad:   'assets/music/zapad.mp3',
    noc:     'assets/music/noc.mp3',
  };

  const SFX_VOL = 0.35;
  const VOICE_VOL = 0.9; // hlasy dřív šly rovnou na výstup a přebíjely všechno

  /* Výstupní řetěz:
       efekty → sfxGain → sfxComp ─┐
       hlasy  → voiceGain ─────────┼→ master (pojistka) → výstup
       hudba (jen v aplikaci) ─────┘
     sfxComp lepí dohromady efekty – při dopadu se jich sejde pět naráz
     (krok, dopad, sběr, tón řetězu, náraz) a součet špiček přebíjel hudbu.
     Hlasy ani hudba přes něj nejdou, ty by dýchaly do rytmu skákání; drží
     je až master, který sahá po zisku teprve těsně pod nulou. */
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -3;
      master.knee.value = 3;
      master.ratio.value = 20;
      master.attack.value = 0.002;
      master.release.value = 0.12;
      master.connect(ctx.destination);
      sfxComp = ctx.createDynamicsCompressor();
      sfxComp.threshold.value = -20;
      sfxComp.knee.value = 20;
      sfxComp.ratio.value = 4;
      sfxComp.attack.value = 0.004;
      sfxComp.release.value = 0.2;
      sfxComp.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = SFX_VOL;
      sfxGain.connect(sfxComp);
      voiceGain = ctx.createGain();
      voiceGain.gain.value = VOICE_VOL;
      voiceGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 1, slideTo = null, delay = 0) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /* ---- šum ----
     Jeden dlouhý plochý šum, ze kterého si každý zvuk bere náhodný výřez;
     tvar mu dá až obálka v GainNode. Dřív měl každý zvuk vlastní krátký
     buffer se zapečeným doběhem, takže se dvě přehrání lišila nula ku nule –
     a série stejných transientů (kroky!) zní jako střelba, ne jako běh.
     Plochý buffer navíc jde poctivě zasmyčkovat (vrstva rychlosti): ten se
     zapečeným doběhem se každou otočku smyčky utnul z ticha na plný šum. */
  const NOISE_SEC = 3;
  let noiseBuf = null;
  function noiseSrc() {
    if (!noiseBuf) {
      const len = Math.floor(ctx.sampleRate * NOISE_SEC);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  }

  function noise(dur, vol = 0.4, delay = 0, atk = 0.004) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime + delay;
    const src = noiseSrc();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 700 + Math.random() * 300;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0, Math.random() * (NOISE_SEC - dur - 0.05));
    src.stop(t0 + dur + 0.05);
  }

  /* Jednorázový zvukový soubor (Karlův smích, hlasy zvířátek). Vzorky jdou
     přes WebAudio na všech platformách: ⟨audio⟩ má na Androidu při zátěži
     herní smyčky latenci a umí zaškobrtnout, a hlavně jeho volume nelze
     zvednout nad 1 – nejtišší nahrávku (Flíček) tak nešlo dorovnat na
     úroveň ostatních. ⟨audio⟩ zbylo jen jako nouzovka bez WebAudia. */
  const samples = {};
  const sampleBufs = {};
  function sample(src, vol = 1) {
    if (!enabled) return;
    if (ensureCtx()) {
      if (!sampleBufs[src]) {
        sampleBufs[src] = fetch(src)
          .then((r) => r.arrayBuffer())
          .then((ab) => ctx.decodeAudioData(ab))
          .catch(() => { delete sampleBufs[src]; return null; });
      }
      sampleBufs[src].then((buf) => {
        if (!buf || !enabled) return;
        const s = ctx.createBufferSource();
        s.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = vol;
        s.connect(g); g.connect(voiceGain);
        s.start();
      });
      return;
    }
    let el = samples[src];
    if (!el) { el = samples[src] = new Audio(src); el.preload = 'auto'; }
    // ⟨audio⟩ nemá voiceGain – stejnou úroveň i ztlumení dopočítáme sem
    el.volume = Math.min(1, vol * VOICE_VOL * duckNow);
    try { el.currentTime = 0; } catch (e) { /* metadata ještě nejsou */ }
    el.play().catch(() => {});
  }

  const SFX = {
    jump()   { tone(300, 0.18, 'square', 0.5, 620); },
    djump()  { tone(420, 0.16, 'square', 0.5, 820); },
    land()   { noise(0.09, 0.22, 0, 0.003); },
    slide()  { noise(0.26, 0.16, 0, 0.05); }, // skluz se rozjíždí, neťukne
    // sběry zní vždy zároveň s tónem řetězu (viz comboTone) – proto o něco
    // tišeji, ať se dva melodické zvuky naráz nepobijí
    carrot() { tone(660, 0.09, 'sine', 0.5); tone(880, 0.12, 'sine', 0.5, null, 0.07); },
    golden() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, 'sine', 0.6, null, i * 0.08)); },
    coin()   { tone(1050, 0.08, 'triangle', 0.45); tone(1400, 0.1, 'triangle', 0.38, null, 0.06); },
    clover() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.5, null, i * 0.06)); },
    hit()    { tone(220, 0.25, 'sawtooth', 0.5, 90); noise(0.15, 0.3); },
    ram()    { tone(150, 0.2, 'sawtooth', 0.7, 60); noise(0.2, 0.5); },
    quote()  { tone(520, 0.07, 'sine', 0.35); tone(700, 0.08, 'sine', 0.3, null, 0.06); },
    laugh()  { sample('assets/sfx/karel-smich.mp3', 1.02); }, // koeficienty viz VOICE_FILES
    bray()   { sample('assets/sfx/karel-hykani.mp3', 0.58); },
    finish() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.6, null, i * 0.13)); },
    click()  { tone(700, 0.05, 'sine', 0.4); },
    buy()    { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.55, null, i * 0.09)); },
  };

  function play(name) { if (SFX[name]) SFX[name](); }

  /* ---- řetěz sběrů: stoupající pentatonika ----
     Pentatonická stupnice nemá půltónové střety, takže ať padne kterýkoli
     tón kdykoli, nikdy se nepohádá s hudbou pod ním. Řetěz tak zní jako
     melodie, která se s každým dalším kouskem šplhá výš. */
  const PENTA = [0, 2, 4, 7, 9]; // C D E G A
  function comboTone(step) {
    const i = Math.max(0, step);
    const semi = PENTA[i % PENTA.length] + 12 * Math.floor(i / PENTA.length);
    // po dvou oktávách už by to pískalo – dál se drží nahoře
    const f = 523.25 * Math.pow(2, Math.min(semi, 26) / 12);
    tone(f, 0.11, 'triangle', 0.34);
  }

  /* ---- kroky podle povrchu ----
     Šustnutí, ne klepnutí. Původní verze pouštěla pořád tentýž 50ms výřez
     šumu přes úzký pásmový filtr kolem 1,4 kHz s okamžitým náběhem – tedy
     ostrý transient přesně v pásmu, kde ucho slyší nejcitlivěji, pětkrát
     za vteřinu a pokaždé nota po notě stejný. To se neposlouchá jako běh,
     ale jako dávka ze samopalu, a na telefonu to přebilo i hudbu.

     Teď: dolní propust (žádné pásmové „ping“), měkký náběh přes 15 ms
     (bez cvaknutí), pokaždé jiný výřez šumu, střídání levé a pravé nohy
     jinou barvou i hlasitostí, a tvrdý strop na hustotu kroků, aby se při
     nejvyšší rychlosti nesešly na hromadu. */
  const STEP_FILTER = { louka: 950, sad: 950, les: 700, vesnice: 1500, zapad: 1000, noc: 800 };
  const STEP_MIN_GAP = 0.14; // s – rychleji než tohle už to zní jako rachot
  let stepFoot = 0;
  let stepLast = -1;
  function step(envId, vol = 1) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime;
    if (t0 - stepLast < STEP_MIN_GAP) return;
    stepLast = t0;
    stepFoot ^= 1;
    const dur = 0.055 + Math.random() * 0.035;
    const base = (STEP_FILTER[envId] || 950) * (stepFoot ? 1.1 : 0.9);
    const src = noiseSrc();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 260; // ať krok nedunív basech
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = base * (0.9 + Math.random() * 0.2);
    f.Q.value = 0.4;
    const g = ctx.createGain();
    const peak = 0.038 * vol * (stepFoot ? 1 : 0.8);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp); hp.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0, Math.random() * (NOISE_SEC - 0.2));
    src.stop(t0 + dur + 0.03);
  }

  /* ---- vrstva rychlosti ----
     Nad hudbou jede tichý vzduchový šum, jehož hlasitost i barva rostou
     s rychlostí běhu. Záměrně je to šum, ne perkuse: hotové skladby mají
     každá své tempo, které neznáme, a nesynchronní bubny by se s nimi
     praly. Šum nemá tón ani rytmus, takže sedne na cokoli a hráč přesto
     slyší, že se rozjíždí. */
  const WIND_VOL = 0.11;
  let wind = null;
  let windTarget = 0;
  let windSet = -1; // poslední naplánovaná hodnota – smyčka volá 60×/s
  function ensureWind() {
    if (wind || !ensureCtx()) return;
    const src = noiseSrc(); // plochý šum: smyčka je opravdu neslyšitelná
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; // pásmový filtr syčel v řeči; vzduch má být pod ní
    f.frequency.value = 500;
    f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0;
    // přes sfxGain, ať vrstvu rychlosti řídí hlasitost efektů i ztlumení
    // na pauze stejně jako všechno ostatní (dřív šla rovnou na výstup)
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start();
    wind = { src, f, g };
  }

  // v = 0 (stojí) … 1 (naplno) – volá se z herní smyčky každý snímek
  function setIntensity(v) {
    windTarget = Math.max(0, Math.min(1, v));
    if (!enabled) { if (wind) { wind.g.gain.value = 0; windSet = -1; } return; }
    ensureWind();
    if (!wind) return;
    // přeplánovat rampu 60×/s je zbytečná práce i drhnutí – stačí při změně
    if (Math.abs(windTarget - windSet) < 0.02) return;
    windSet = windTarget;
    const t = ctx.currentTime;
    wind.g.gain.cancelScheduledValues(t);
    wind.g.gain.setValueAtTime(wind.g.gain.value, t);
    wind.g.gain.linearRampToValueAtTime(WIND_VOL * windTarget, t + 0.25);
    wind.f.frequency.cancelScheduledValues(t);
    wind.f.frequency.setValueAtTime(wind.f.frequency.value, t);
    wind.f.frequency.linearRampToValueAtTime(380 + 700 * windTarget, t + 0.25);
  }

  /* ---- ztlumení při pauze ----
     Web hraje hudbu přes ⟨audio⟩ a Android přes WebAudio; filtr by šel
     jen na jedné z nich, a hra by pak na každé platformě zněla jinak.
     Proto se místo filtru obě cesty stejně ztiší – parita je přednější. */
  const DUCK_LEVEL = 0.32;
  const DUCK_TIME = 0.25;
  let duckNow = 1;
  function duck(on) {
    const to = on ? DUCK_LEVEL : 1;
    if (to === duckNow) return;
    duckNow = to;
    if (sfxGain && ctx) {
      const t = ctx.currentTime;
      for (const [node, base] of [[sfxGain, SFX_VOL], [voiceGain, VOICE_VOL]]) {
        node.gain.cancelScheduledValues(t);
        node.gain.setValueAtTime(node.gain.value, t);
        node.gain.linearRampToValueAtTime(base * duckNow, t + DUCK_TIME);
      }
    }
    if (WA && WA.active && ctx) {
      const t = ctx.currentTime;
      const g = WA.active.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(MUSIC_VOL * duckNow, t + DUCK_TIME);
    }
    if (players) for (const el of players) el.volume = el._vol * duckNow;
    // vrstva rychlosti i hlasy visí na sfxGain/voiceGain – ztlumí se s nimi
  }

  // hlas zvířátka při Zvířecím koncertu – každá postava má svůj soubor.
  // Nahrávky přišly každá odjinud a lišily se o 12 dB (Flíček se ztrácel,
  // Květa řvala). Přepisovat mp3 by znamenalo ztrátovou překódovací kolečku,
  // tak se srovnávají tady: koeficient dorovná změřenou hlasitost souboru
  // na společných −20 dBFS RMS.
  const VOICE_FILES = {
    karel:  ['voice-karel',  0.58], // osel – hýká
    pogo:   ['voice-pogo',   0.75], // ovečka – bečí
    avala:  ['voice-avala',  0.62], // kráva – bučí
    flicek: ['voice-flicek', 1.60], // prasátko – chrochtá (plné dorovnání by špičkou drhlo o nulu)
    yakul:  ['voice-yakul',  0.88], // muflon – bečí
    kveta:  ['voice-kveta',  0.51], // kráva – bučí
  };
  function voice(id) {
    const [file, trim] = VOICE_FILES[id] || VOICE_FILES.karel;
    sample('assets/sfx/' + file + '.mp3', trim);
  }

  // hlasy a Karlův smích/hýkání se dřív dekódovaly líně až při 1. přehrání –
  // uprostřed běhu to uměl být první zádrhel. Po unlocku je v klidu
  // předehřejeme do sampleBufs, ať jsou dekódované předem.
  let warmed = false;
  function warmSamples() {
    if (warmed || !ensureCtx()) return;
    warmed = true;
    const list = ['assets/sfx/karel-smich.mp3', 'assets/sfx/karel-hykani.mp3'];
    for (const id in VOICE_FILES) list.push('assets/sfx/' + VOICE_FILES[id][0] + '.mp3');
    for (const src of list) {
      if (sampleBufs[src]) continue;
      sampleBufs[src] = fetch(src)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
        .catch(() => { delete sampleBufs[src]; return null; });
    }
  }

  /* ---- hudba: dva přehrávače a plynulé prolínání (jen mp3) ----
     Změna skladby (nové prostředí) se prolne přes TRACK_FADE a stejně
     tak návrat smyčky na začátek: kousek před koncem skladby ji druhý
     přehrávač rozehraje od nuly a hlasitosti se prokříží, takže hudba
     nikdy tvrdě neusekne ani necvakne. */
  const MUSIC_VOL = 0.5;
  const TRACK_FADE = 1.8;  // prolnutí mezi skladbami (s)
  const LOOP_FADE = 1.4;   // prolnutí přes konec smyčky (s)
  const TICK_MS = 90;      // krok prolínacího časovače

  let players = null;      // [Audio, Audio] – aktivní se střídá
  let active = 0;
  let currentTrack = null;

  /* ---- Capacitor (Android app): hudba během běhu přes WebAudio ----
     HTMLAudio se v Android WebView při zátěži herní smyčky zadrhává, i když
     hraje z blobu v paměti. WebAudio mixuje předem dekódovanou skladbu
     v audio vlákně, které zásek hlavního vlákna nezastaví. Web zůstává
     u <audio> – tam hudba jede plynule ze service worker cache.

     POZOR na paměť: dekódovaná skladba je surové PCM. Krátké běhové smyčky
     (~45 s) zaberou ~16 MB, ale menu.mp3 má několik minut → přes 80 MB.
     Držet ji dekódovanou (a k tomu dekódovat další) posílalo WebView na
     slabších telefonech do OOM pádu přesně při startu běhu. Proto menu
     hraje i v aplikaci streamovaně přes <audio> (menu nemá herní smyčku,
     zádrhel tam nehrozí) a WebAudio se používá jen pro krátké běhové
     skladby – v paměti je vždy nanejvýš jedna. */
  const WA = window.Capacitor ? { buffers: {}, active: null, watch: null } : null;
  let waSeq = 0; // pořadí požadavků – ať pozdě dodekódovaná stopa nepřebije novější

  // menu/intro sdílí dlouhý soubor – ten v aplikaci nikdy nedekódujeme
  const useWA = (src) => !!WA && src !== MUSIC_FILES.menu;

  function waBuffer(src) {
    if (!WA.buffers[src]) {
      WA.buffers[src] = fetch(src)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
        .catch((e) => { delete WA.buffers[src]; throw e; });
    }
    return WA.buffers[src];
  }

  function waStop(fade) {
    if (!WA.active) return;
    const a = WA.active; WA.active = null;
    const t = ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
    try { a.node.stop(t + fade + 0.1); } catch (e) { /* už zastavená */ }
  }

  function waStart(src, buf, fade) {
    waStop(fade);
    const t = ctx.currentTime;
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true; // pojistka: kdyby prolnutí smyčky nestihlo, hraje dál postaru
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(MUSIC_VOL * duckNow, t + fade);
    node.connect(gain); gain.connect(master);
    node.start(t);
    WA.active = { src, node, gain, buf, t0: t, dur: buf.duration };
    // dekódovaná skladba zabírá desítky MB – v cache drž jen tu hrající
    for (const k in WA.buffers) {
      if (k !== src) delete WA.buffers[k];
    }
  }

  // hlídá konec smyčky a prolne stopu do jejího vlastního začátku
  function waTick() {
    if (!WA.active || !ctx) return;
    const a = WA.active;
    if (ctx.currentTime - a.t0 > a.dur - LOOP_FADE) waStart(a.src, a.buf, LOOP_FADE);
  }

  function waPlay(src, fade) {
    if (!ensureCtx()) return;
    if (!WA.watch) WA.watch = setInterval(waTick, TICK_MS);
    if (WA.active && WA.active.src === src) return;
    const seq = ++waSeq;
    waBuffer(src)
      .then((buf) => {
        if (seq !== waSeq || !musicEnabled) return; // mezitím se chtělo něco jiného
        waStart(src, buf, fade);
      })
      .catch(() => {});
  }

  // v pozadí aplikace hudbu utne; návrat dořeší visibilitychange → unlock()
  if (WA) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      if (ctx) ctx.suspend();
      // menu hraje přes ⟨audio⟩ – to je potřeba v pozadí zastavit taky
      if (players) for (const el of players) el.pause();
    });
  }

  // hlasitost přehrávače držíme v JS (el._vol = zdroj pravdy) a zapisujeme do
  // el.volume. Na Androidu/desktopu se hlasitost skutečně mění (plynulé
  // prolnutí); iOS/WebKit zápis do el.volume ignoruje, ale to nevadí –
  // rozhodnutí „doznělo, zastav“ se řídí podle el._vol (viz musicTick), takže
  // odcházející stopa se spolehlivě zastaví i tam a nehraje přes novou.
  function setVol(el, v) {
    el._vol = v;
    el.volume = v * duckNow; // ztlumení při pauze se přičítá až tady, ať prolínání zůstane netknuté
  }

  function makePlayer() {
    const el = new Audio();
    el.preload = 'auto';
    // pojistka: kdyby prolnutí smyčky nestihlo (uspaná karta apod.),
    // skladba aspoň skočí na začátek postaru
    el.loop = true;
    el._vol = 0;           // aktuální hlasitost (zdroj pravdy, viz setVol)
    el._target = 0;        // cílová hlasitost, k níž tick() klouže
    el._fade = TRACK_FADE; // délka aktuálního prolnutí (s)
    setVol(el, 0);
    return el;
  }

  function ensurePlayers() {
    if (players) return;
    players = [makePlayer(), makePlayer()];
    setInterval(musicTick, TICK_MS);
  }

  // klouzání hlasitostí + hlídání konce smyčky
  function musicTick() {
    const dt = TICK_MS / 1000;
    for (const el of players) {
      const step = (MUSIC_VOL / (el._fade || TRACK_FADE)) * dt;
      if (el._vol < el._target) setVol(el, Math.min(el._target, el._vol + step));
      else if (el._vol > el._target) {
        setVol(el, Math.max(el._target, el._vol - step));
        if (el._vol <= 0 && !el.paused) el.pause();
      }
    }
    // blíží se konec aktivní skladby → prolnout do jejího vlastního začátku
    const cur = players[active];
    if (currentTrack && !cur.paused && isFinite(cur.duration) && cur.duration > 0
        && cur.currentTime > cur.duration - LOOP_FADE) {
      crossTo(currentTrack, LOOP_FADE);
    }
  }

  // rozehraje src na neaktivním přehrávači a prokříží hlasitosti
  function crossTo(src, fade) {
    const from = players[active];
    from._target = 0;
    from._fade = fade;
    active = 1 - active;
    const to = players[active];
    if (to._src !== src) { to._src = src; to.src = src; }
    else { try { to.currentTime = 0; } catch (e) { /* metadata ještě nejsou */ } }
    to._target = MUSIC_VOL;
    to._fade = fade;
    to.play().catch(() => {}); // autoplay zákaz dořeší unlock()
  }

  function playMusic(key) {
    lastKey = key;
    if (!musicEnabled) return;
    const src = MUSIC_FILES[key];
    if (!src) { stopMusic(); return; }
    const firstStart = !currentTrack;
    if (currentTrack === src) {
      // stejná skladba – jen pojistka, že opravdu hraje (návrat z pozadí apod.)
      if (useWA(src)) { if (!WA.active) waPlay(src, 0.6); return; }
      ensurePlayers();
      const el = players[active];
      el._target = MUSIC_VOL;
      if (el.paused) el.play().catch(() => {});
      return;
    }
    currentTrack = src;
    if (useWA(src)) {
      // menu (⟨audio⟩) doznívá, běhová skladba najíždí ve WebAudio
      if (players) { for (const el of players) { el._target = 0; el._fade = TRACK_FADE; } }
      waPlay(src, firstStart ? 0.6 : TRACK_FADE);
    } else {
      // návrat do menu: WebAudio doznívá, menu jede streamovaně přes ⟨audio⟩
      if (WA) { waSeq++; if (ctx) waStop(TRACK_FADE); }
      ensurePlayers();
      // úplně první spuštění jen krátce naběhne, jinak plné prolnutí
      crossTo(src, firstStart ? 0.6 : TRACK_FADE);
    }
  }

  function stopMusic() {
    currentTrack = null;
    if (WA) { waSeq++; if (ctx) waStop(0.2); }
    if (!players) return;
    for (const el of players) { el.pause(); el._target = 0; setVol(el, 0); }
  }

  function setSfx(on) {
    enabled = on;
    if (wind) { wind.g.gain.value = on ? WIND_VOL * windTarget : 0; windSet = on ? windTarget : -1; }
  }
  function setMusic(on) {
    musicEnabled = on;
    if (!on) stopMusic();
    else if (lastKey) playMusic(lastKey);
  }

  // autoplay politika: po prvním doteku/klávese rozjedeme čekající hudbu
  function unlock() {
    ensureCtx(); // probudí WebAudio (efekty vždy, v Capacitoru i běhová hudba)
    warmSamples(); // v aplikaci předehřej hlasy/smích, ať 1. přehrání neseká
    if (!musicEnabled || !lastKey || !currentTrack) return;
    if (useWA(currentTrack)) {
      if (!WA.active) waPlay(currentTrack, 0.6);
      return;
    }
    if (players && players[active].paused) {
      players[active].play().catch(() => {});
    }
  }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  // hned po načtení se pár vteřin snažíme hudbu rozjet i bez doteku –
  // když to prohlížeč dovolí (itch.io po kliknutí na „Run game“, návrat
  // na známý web…), hraje okamžitě; jinak počká na první dotek/klávesu
  let eagerTries = 0;
  const eagerTimer = setInterval(() => {
    if (WA && WA.active) { clearInterval(eagerTimer); return; }
    if (players && !players[active].paused) { clearInterval(eagerTimer); return; }
    if (++eagerTries > 8) { clearInterval(eagerTimer); return; }
    if (lastKey) unlock();
  }, 400);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });

  return { play, voice, playMusic, stopMusic, setSfx, setMusic, ensureCtx, comboTone, step, setIntensity, duck };
})();
