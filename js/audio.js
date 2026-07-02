/* =========================================================
   LOUKA RUN – zvuk
   1) Zvukové efekty generované ve WebAudio (žádné soubory).
   2) Hudba: vestavěný generativní engine (hraje vždy).
      Pokud existuje mp3 v assets/music/ (viz HUDBA_PROMPTY.md),
      má přednost před generovanou hudbou.
   ========================================================= */

const AUDIO = (() => {
  let ctx = null;
  let sfxGain = null;
  let musicEl = null;
  let currentTrack = null;
  let enabled = true;
  let musicEnabled = true;
  let lastKey = null;

  // mapování prostředí → soubor (volitelné, vytvoříš přes Suno)
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
    clover() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.6, null, i * 0.06)); },
    hit()    { tone(220, 0.25, 'sawtooth', 0.5, 90); noise(0.15, 0.3); },
    ram()    { tone(150, 0.2, 'sawtooth', 0.7, 60); noise(0.2, 0.5); },
    quote()  { tone(520, 0.07, 'sine', 0.35); tone(700, 0.08, 'sine', 0.3, null, 0.06); },
    finish() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.6, null, i * 0.13)); },
    click()  { tone(700, 0.05, 'sine', 0.4); },
    buy()    { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.55, null, i * 0.09)); },
  };

  function play(name) { if (SFX[name]) SFX[name](); }

  /* =========================================================
     GENERATIVNÍ HUDBA
     Jednoduchý sekvencer: basa + akordy + pentatonická melodie
     + lehké bicí. Každé prostředí má vlastní náladu.
     ========================================================= */
  const SCALES = {
    major:  [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
  };

  const MUSIC_DEFS = {
    // bpm, root = MIDI nota, prog = stupně akordů (1 takt každý)
    // intro je ve stejné tónině jako menu, takže se do něj plynule prolne
    intro:   { bpm: 108, root: 62, scale: 'major',  prog: [0, 5, 3, 4], lead: 'triangle', leadOct: 1, perc: false, oompah: false, density: 0.55 },
    menu:    { bpm: 100, root: 62, scale: 'major',  prog: [0, 3, 4, 0], lead: 'sine',     leadOct: 1, perc: false, oompah: false, density: 0.45 },
    louka:   { bpm: 126, root: 62, scale: 'major',  prog: [0, 5, 3, 4], lead: 'square',   leadOct: 1, perc: true,  oompah: false, density: 0.6 },
    sad:     { bpm: 122, root: 64, scale: 'major',  prog: [0, 3, 1, 4], lead: 'square',   leadOct: 1, perc: true,  oompah: false, density: 0.55 },
    les:     { bpm: 112, root: 57, scale: 'dorian', prog: [0, 2, 5, 4], lead: 'triangle', leadOct: 1, perc: false, oompah: false, density: 0.5 },
    vesnice: { bpm: 138, root: 60, scale: 'major',  prog: [0, 4, 0, 4], lead: 'square',   leadOct: 1, perc: true,  oompah: true,  density: 0.65 },
    zapad:   { bpm: 100, root: 59, scale: 'major',  prog: [0, 3, 1, 4], lead: 'sine',     leadOct: 1, perc: false, oompah: false, density: 0.4 },
    noc:     { bpm: 84,  root: 69, scale: 'major',  prog: [0, 3, 4, 0], lead: 'sine',     leadOct: 1, perc: false, oompah: false, density: 0.3 },
  };

  const PENTA = [0, 2, 4, 7, 9]; // bezpečné melodické kroky

  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function frac(x) { return x - Math.floor(x); }
  function prand(i, salt) { return frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453); }
  function degMidi(root, scale, deg) {
    const n = scale.length;
    const oct = Math.floor(deg / n);
    const idx = ((deg % n) + n) % n;
    return root + oct * 12 + scale[idx];
  }

  const Proc = {
    timer: null, gain: null, key: null, pos: 0, nextTime: 0, salt: 0,

    start(key) {
      const def = MUSIC_DEFS[key];
      if (!def || !ensureCtx()) return;
      if (this.key === key && this.timer) return;
      this.stop(0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
      g.connect(ctx.destination);
      this.gain = g;
      this.key = key;
      this.pos = 0;
      this.salt = key.length * 7 + key.charCodeAt(0);
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(def), 90);
    },

    stop(fade = 0.5) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.gain && ctx) {
        const g = this.gain;
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
        setTimeout(() => g.disconnect(), fade * 1000 + 100);
        this.gain = null;
      }
      this.key = null;
    },

    note(t, midi, dur, type, vol) {
      if (!this.gain) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(midiHz(midi), t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(this.gain);
      osc.start(t); osc.stop(t + dur + 0.05);
    },

    drum(t, kind) {
      if (!this.gain) return;
      if (kind === 'kick') {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        osc.connect(g); g.connect(this.gain);
        osc.start(t); osc.stop(t + 0.15);
      } else { // hat
        const len = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 6000;
        const g = ctx.createGain(); g.gain.value = 0.10;
        src.connect(f); f.connect(g); g.connect(this.gain);
        src.start(t);
      }
    },

    schedule(def) {
      if (!ctx || !this.gain) return;
      const stepDur = 60 / def.bpm / 4; // šestnáctina
      const scale = SCALES[def.scale];
      while (this.nextTime < ctx.currentTime + 0.45) {
        const i = this.pos;
        const t = this.nextTime;
        const bar = Math.floor(i / 16) % def.prog.length;
        const chordDeg = def.prog[bar];
        const step = i % 16;

        // basa
        if (def.oompah) {
          if (step === 0 || step === 8) this.note(t, degMidi(def.root - 12, scale, chordDeg), stepDur * 3, 'triangle', 0.30);
          if (step === 4 || step === 12) this.note(t, degMidi(def.root - 12, scale, chordDeg + 4), stepDur * 3, 'triangle', 0.24);
        } else if (step === 0 || step === 8) {
          this.note(t, degMidi(def.root - 12, scale, chordDeg), stepDur * 6, 'triangle', 0.28);
        }

        // akordový polštář na začátku taktu
        if (step === 0) {
          [0, 2, 4].forEach(k => {
            this.note(t, degMidi(def.root, scale, chordDeg + k), stepDur * 14, 'triangle', 0.07);
          });
        }

        // melodie – opakuje se po 8 taktech, ať má hlavu a patu
        const loopStep = i % (16 * 8);
        if (step % 2 === 0 && prand(loopStep, this.salt) < def.density) {
          const pick = PENTA[Math.floor(prand(loopStep, this.salt + 5) * PENTA.length)];
          const midi = degMidi(def.root + 12 * def.leadOct, scale, chordDeg + pick);
          const len = prand(loopStep, this.salt + 9) < 0.3 ? stepDur * 3.5 : stepDur * 1.8;
          this.note(t, midi, len, def.lead, def.lead === 'square' ? 0.055 : 0.10);
        }

        // bicí
        if (def.perc) {
          if (step === 0 || step === 8) this.drum(t, 'kick');
          if (step % 4 === 2) this.drum(t, 'hat');
        }

        this.pos++;
        this.nextTime += stepDur;
      }
    },
  };

  /* ---- veřejné API hudby ---- */
  function playMusic(key) {
    lastKey = key;
    if (!musicEnabled) return;
    if (!ensureCtx()) return;
    const src = MUSIC_FILES[key];
    if (!musicEl) {
      musicEl = new Audio();
      musicEl.loop = true;
      musicEl.volume = 0.5;
    }
    if (src && currentTrack !== src) {
      currentTrack = src;
      musicEl.src = src;
      musicEl.onerror = () => { if (lastKey === key) { currentTrack = null; Proc.start(key); } };
      musicEl.onplaying = () => { if (lastKey === key) Proc.stop(0.3); };
      musicEl.play().catch(() => { if (lastKey === key) Proc.start(key); });
    } else if (!src) {
      Proc.start(key);
    } else if (musicEl.paused) {
      // soubor už je nastavený, ale nehraje (např. 404) → generovaná hudba
      Proc.start(key);
    }
  }

  function stopMusic() {
    if (musicEl) { musicEl.pause(); currentTrack = null; }
    Proc.stop();
  }

  function setSfx(on) { enabled = on; }
  function setMusic(on) {
    musicEnabled = on;
    if (!on) stopMusic();
    else if (lastKey) playMusic(lastKey);
  }

  // autoplay politika: po prvním doteku/klávese rozjedeme čekající hudbu
  function unlock() {
    if (!ensureCtx()) return;
    if (musicEnabled && lastKey && !Proc.timer && (!musicEl || musicEl.paused)) {
      playMusic(lastKey);
    }
  }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  // hned po načtení se pár vteřin snažíme hudbu rozjet i bez doteku –
  // když to prohlížeč dovolí (itch.io po kliknutí na „Run game“, návrat
  // na známý web…), hraje okamžitě; jinak počká na první dotek/klávesu
  let eagerTries = 0;
  const eagerTimer = setInterval(() => {
    if (ctx && ctx.state === 'running') { clearInterval(eagerTimer); return; }
    if (++eagerTries > 8) { clearInterval(eagerTimer); return; }
    if (lastKey) unlock();
  }, 400);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });

  return { play, playMusic, stopMusic, setSfx, setMusic, ensureCtx };
})();
