/* =========================================================
   LOUKA RUN – zvuk
   1) Zvukové efekty generované ve WebAudio (žádné soubory).
   2) Hudba: mp3 soubory v assets/music/ (viz HUDBA_PROMPTY.md).
   ========================================================= */

const AUDIO = (() => {
  let ctx = null;
  let sfxGain = null;
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

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.35;
      sfxGain.connect(ctx.destination);
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

  // bílý šum se dřív generoval (alokace bufferu + Math.random smyčka) při
  // každém volání – a land()/hit() padnou při každém dopadu, přesně v herně
  // citlivý okamžik. Šum je nerozeznatelný, tak ho pro danou délku vyrobíme
  // jednou a dál jen recyklujeme hotový buffer.
  const noiseBufs = new Map();
  function noiseBuffer(dur) {
    let buf = noiseBufs.get(dur);
    if (!buf) {
      const len = Math.floor(ctx.sampleRate * dur);
      buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      noiseBufs.set(dur, buf);
    }
    return buf;
  }

  function noise(dur, vol = 0.4, delay = 0) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const g = ctx.createGain();
    g.gain.value = vol;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0);
  }

  // jednorázový zvukový soubor (např. Karlův smích) – respektuje vypnutí
  // zvuků, přehrávače se cachují a přehrání se dá kdykoli spustit od začátku.
  // V aplikaci (Capacitor) hrají vzorky přes WebAudio: <audio> element má na
  // Androidu při zátěži herní smyčky latenci a umí zaškobrtnout; dekódované
  // vzorky (pár vteřin) mixuje audio vlákno bez ohledu na hlavní vlákno.
  const samples = {};
  const sampleBufs = {};
  function sample(src, vol = 1) {
    if (!enabled) return;
    if (WA && ensureCtx()) {
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
        s.connect(g); g.connect(ctx.destination);
        s.start();
      });
      return;
    }
    let el = samples[src];
    if (!el) { el = samples[src] = new Audio(src); el.preload = 'auto'; }
    el.volume = vol;
    try { el.currentTime = 0; } catch (e) { /* metadata ještě nejsou */ }
    el.play().catch(() => {});
  }

  const SFX = {
    jump()   { tone(300, 0.18, 'square', 0.5, 620); },
    djump()  { tone(420, 0.16, 'square', 0.5, 820); },
    land()   { noise(0.08, 0.25); },
    slide()  { noise(0.22, 0.2); },
    carrot() { tone(660, 0.09, 'sine', 0.7); tone(880, 0.12, 'sine', 0.7, null, 0.07); },
    golden() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, 'sine', 0.7, null, i * 0.08)); },
    coin()   { tone(1050, 0.08, 'triangle', 0.6); tone(1400, 0.1, 'triangle', 0.5, null, 0.06); },
    clover() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.6, null, i * 0.06)); },
    hit()    { tone(220, 0.25, 'sawtooth', 0.5, 90); noise(0.15, 0.3); },
    ram()    { tone(150, 0.2, 'sawtooth', 0.7, 60); noise(0.2, 0.5); },
    quote()  { tone(520, 0.07, 'sine', 0.35); tone(700, 0.08, 'sine', 0.3, null, 0.06); },
    laugh()  { sample('assets/sfx/karel-smich.mp3', 0.7); },
    bray()   { sample('assets/sfx/karel-hykani.mp3', 0.8); },
    finish() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.6, null, i * 0.13)); },
    click()  { tone(700, 0.05, 'sine', 0.4); },
    buy()    { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.55, null, i * 0.09)); },
  };

  function play(name) { if (SFX[name]) SFX[name](); }

  // hlas zvířátka při Zvířecím koncertu – každá postava má svůj soubor.
  const VOICE_FILES = {
    karel:  'voice-karel',   // osel – hýká
    pogo:   'voice-pogo',    // ovečka – bečí
    avala:  'voice-avala',   // kráva – bučí
    flicek: 'voice-flicek',  // prasátko – chrochtá
    yakul:  'voice-yakul',   // muflon – bečí
    kveta:  'voice-kveta',   // kráva – bučí
  };
  function voice(id) { sample('assets/sfx/' + (VOICE_FILES[id] || 'voice-karel') + '.mp3', 0.9); }

  // hlasy a Karlův smích/hýkání se dřív dekódovaly líně až při 1. přehrání –
  // uprostřed běhu to uměl být první zádrhel. V aplikaci (WA) je v klidu po
  // unlocku předehřejeme do sampleBufs, ať jsou dekódované předem. Na webu
  // jede sample() přes <audio preload="auto">, takže tam warm není potřeba.
  let warmed = false;
  function warmSamples() {
    if (warmed || !WA || !ensureCtx()) return;
    warmed = true;
    const list = ['assets/sfx/karel-smich.mp3', 'assets/sfx/karel-hykani.mp3'];
    for (const id in VOICE_FILES) list.push('assets/sfx/' + VOICE_FILES[id] + '.mp3');
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
    gain.gain.linearRampToValueAtTime(MUSIC_VOL, t + fade);
    node.connect(gain); gain.connect(ctx.destination);
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
    el.volume = v;
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

  function setSfx(on) { enabled = on; }
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

  return { play, voice, playMusic, stopMusic, setSfx, setMusic, ensureCtx };
})();
