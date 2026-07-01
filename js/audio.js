/* =========================================================
   LOUKA RUN – zvuk
   Zvukové efekty generované ve WebAudio (žádné soubory).
   Hudba: pokud existují soubory v assets/music/, přehrají se
   podle aktuálního prostředí – viz HUDBA_PROMPTY.md.
   ========================================================= */

const AUDIO = (() => {
  let ctx = null;
  let sfxGain = null;
  let musicEl = null;
  let currentTrack = null;
  let enabled = true;
  let musicEnabled = true;

  // mapování prostředí → soubor (vytvoříš přes Suno, viz HUDBA_PROMPTY.md)
  const MUSIC_FILES = {
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

  function noise(dur, vol = 0.4, delay = 0) {
    if (!enabled || !ensureCtx()) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0);
  }

  const SFX = {
    jump()   { tone(300, 0.18, 'square', 0.5, 620); },
    djump()  { tone(420, 0.16, 'square', 0.5, 820); },
    land()   { noise(0.08, 0.25); },
    slide()  { noise(0.22, 0.2); },
    carrot() { tone(660, 0.09, 'sine', 0.7); tone(880, 0.12, 'sine', 0.7, null, 0.07); },
    golden() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.14, 'sine', 0.7, null, i * 0.08)); },
    coin()   { tone(1050, 0.08, 'triangle', 0.6); tone(1400, 0.1, 'triangle', 0.5, null, 0.06); },
    hit()    { tone(220, 0.25, 'sawtooth', 0.5, 90); noise(0.15, 0.3); },
    ram()    { tone(150, 0.2, 'sawtooth', 0.7, 60); noise(0.2, 0.5); },
    quote()  { tone(520, 0.07, 'sine', 0.35); tone(700, 0.08, 'sine', 0.3, null, 0.06); },
    finish() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.6, null, i * 0.13)); },
    click()  { tone(700, 0.05, 'sine', 0.4); },
    buy()    { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.55, null, i * 0.09)); },
  };

  function play(name) { if (SFX[name]) SFX[name](); }

  /* ---- hudba (volitelné mp3 soubory) ---- */
  function playMusic(key) {
    if (!musicEnabled) return;
    const src = MUSIC_FILES[key];
    if (!src || currentTrack === src) return;
    if (!musicEl) {
      musicEl = new Audio();
      musicEl.loop = true;
      musicEl.volume = 0.5;
    }
    // zkusíme přehrát; když soubor neexistuje, tiše to ignorujeme
    musicEl.src = src;
    currentTrack = src;
    musicEl.play().catch(() => { currentTrack = null; });
  }
  function stopMusic() {
    if (musicEl) { musicEl.pause(); currentTrack = null; }
  }

  function setSfx(on) { enabled = on; }
  function setMusic(on) {
    musicEnabled = on;
    if (!on) stopMusic();
  }

  return { play, playMusic, stopMusic, setSfx, setMusic, ensureCtx };
})();
