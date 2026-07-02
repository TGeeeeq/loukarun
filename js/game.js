/* =========================================================
   LOUKA RUN – herní engine
   Endless runner na podporu azylu Nech mě růst
   ========================================================= */

(() => {
  const { CHARACTERS, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY } = DATA;

  /* ---------- canvas ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, groundY = 0;
  let vignette = null; // cachovaný gradient vinětace

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = H * 0.78;
    vignette = null;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- uložený postup ---------- */
  const SAVE_KEY = 'loukarun_save_v1';
  const save = loadSave();
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && Array.isArray(s.unlocked)) return s;
    } catch (e) { /* poškozený záznam – začneme znovu */ }
    return { coins: 0, unlocked: ['karel'], selected: 'karel', best: 0, runs: 0, sfx: true, music: true };
  }
  function persist() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

  AUDIO.setSfx(save.sfx !== false);
  AUDIO.setMusic(save.music !== false);

  /* ---------- stav hry ---------- */
  const S = {
    mode: 'intro',          // intro | menu | run | over | paused
    t: 0,                   // celkový čas (ms)
    worldX: 0,              // ujetá vzdálenost v px
    speed: 0,
    baseSpeed: 330,
    char: null,             // definice postavy
    stats: null,
    energy: 100,
    coinsRun: 0,
    carrotsRun: 0,
    ramLeft: 0,
    cloverT: 0,             // zbývající čas bonusu čtyřlístku (s) – mince mají dvojnásobnou hodnotu
    // hráč
    py: 0, vy: 0, airborne: false, jumps: 0,
    sliding: 0,             // zbývající čas skluzu (s)
    jumpBuf: 0,             // zapamatované ťuknutí těsně před dopadem (s)
    stumble: 0, invuln: 0, squash: 0,
    runPhase: 0, blink: 0,
    // svět
    obstacles: [], pickups: [], decor: [], particles: [], floaters: [],
    flyers: [],             // zvířátka kroužící na obloze
    nextObstacleX: 900, nextPickupX: 600, nextDecorX: 200, nextFlyerX: 500,
    // hlášky
    bubble: null, bubbleT: 0, nextQuoteAt: 6,
    sideBubbles: [],        // bublinky obyvatel a letců v pozadí
    saidLowEnergy: false, lastMilestone: 0,
    shake: 0,
    demo: true,             // atrakt mód za menu
  };

  const PX_PER_M = 42;
  const GRAVITY = 2600;
  // pozadí se posouvá pomaleji než pěšina – kulisy jsou déle na očích,
  // takže si hráč stihne přečíst cedule a všimnout si vtípků
  const FAR_PARALLAX = 0.45;

  function charById(id) { return CHARACTERS.find(c => c.id === id); }

  /* =========================================================
     INTRO – zvířátka pobíhají po louce, vykreslí se logo azylu
     a web, pak se to plynule prolne do menu
     ========================================================= */
  const INTRO_LOGO_START = 0.8;   // kdy se začne kreslit logo (s)
  const INTRO_LOGO_DUR = 2.6;     // jak dlouho se kreslí
  const INTRO_WEB_AT = 3.2;       // kdy naskočí web
  const INTRO_END_AT = 7.0;       // kdy intro samo přejde do menu
  const INTRO_FADE = 1.2;         // délka závěrečného prolnutí

  // na výšku drží intro pozici 0 – rozjede se, až hráč otočí telefon
  const portraitMq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

  const intro = {
    t: 0,
    ending: false, endT: 0,
    actors: [],
    logoImg: null, logoReady: false,
    buf: null, bufCtx: null,
  };

  function initIntro() {
    intro.t = 0; intro.ending = false; intro.endT = 0;
    intro.actors = CHARACTERS.map((ch, i) => ({
      ch,
      x: -160 - Math.random() * 80,
      delay: 0.25 + i * 0.65 + Math.random() * 0.4,
      speed: 60 + Math.random() * 150,   // navíc k posunu světa – zvířátka se předbíhají
      scale: 0.78 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      py: 0, vy: 0,
      hopT: 0.8 + Math.random() * 2.5,
      puffT: Math.random() * 0.3,
    }));
    intro.logoImg = new Image();
    intro.logoImg.onload = () => { intro.logoReady = true; };
    intro.logoImg.src = 'assets/logo.png';
  }

  function updateIntro(dt) {
    if (portraitMq.matches) return; // čeká za výzvou „otoč telefon“
    intro.t += dt;

    for (const a of intro.actors) {
      if (intro.t < a.delay) continue;
      if (intro.ending && a.x < -60) continue; // při odchodu už nikdo nový nenabíhá
      a.x += (a.speed + (intro.ending ? 900 : 0)) * dt;

      // radostné poskočení
      if (a.py > 0 || a.vy < 0) {
        a.vy += GRAVITY * dt;
        a.py -= a.vy * dt;
        if (a.py <= 0) { a.py = 0; a.vy = 0; }
      } else {
        a.hopT -= dt;
        if (a.hopT <= 0) {
          a.hopT = 1.5 + Math.random() * 3;
          a.vy = -480 - Math.random() * 260;
          a.py = 0.0001;
        }
      }

      // obláčky prachu od kopýtek
      a.puffT -= dt;
      if (a.puffT <= 0 && a.py === 0 && a.x > -40 && a.x < W + 40) {
        a.puffT = 0.22 + Math.random() * 0.2;
        S.particles.push({
          x: a.x - 30 * a.scale, y: groundY - 3,
          vx: -80 - Math.random() * 60, vy: -10 - Math.random() * 30,
          r: 3 + Math.random() * 4, life: 0.4, c: '#e8dcc4', a: 0.6,
        });
      }

      // dokola, ať louka pořád žije
      if (!intro.ending && a.x > W + 160) {
        a.x = -160 - Math.random() * 120;
        a.speed = 60 + Math.random() * 150;
      }
    }

    if (!intro.ending && intro.t >= INTRO_END_AT) beginIntroEnd();
    if (intro.ending) {
      intro.endT += dt;
      if (intro.endT >= INTRO_FADE) finishIntro();
    }
  }

  function beginIntroEnd() {
    intro.ending = true;
    intro.endT = 0;
  }

  function skipIntro() {
    if (S.mode === 'intro' && !intro.ending && intro.t > 0.6) beginIntroEnd();
  }
  window.addEventListener('pointerdown', skipIntro);

  function finishIntro() {
    S.mode = 'menu';
    initMenu();
    const m = document.getElementById('screen-menu');
    m.classList.add('fade-in');
    setTimeout(() => m.classList.remove('fade-in'), 800);
    showScreen('menu');
  }

  function renderIntro(px) {
    // pobíhající zvířátka azylu
    for (const a of intro.actors) {
      if (intro.t < a.delay || a.x < -160 || a.x > W + 160) continue;
      const sc = a.scale;
      const shScale = Math.max(0.4, 1 - a.py / 300);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      GFX.ell(ctx, a.x, groundY + 6, 40 * sc * shScale, 7 * sc * shScale);
      ctx.fill();
      GFX.drawCharacter(ctx, a.ch, a.x, groundY - a.py, sc, {
        runPhase: S.runPhase * (0.8 + a.speed / 250) + a.phase,
        airborne: a.py > 0,
        squash: a.py > 0 ? -0.25 : 0,
        blink: S.blink > 0,
      }, S.t + a.phase * 1000);
    }

    // závěr – vybrané zvířátko dobíhá na své místo v menu
    if (intro.ending) {
      const p = Math.min(1, intro.endT / (INTRO_FADE * 0.85));
      const ease = 1 - Math.pow(1 - p, 3);
      const x = GFX.lerp(-140, px, ease);
      const ch = charById(save.selected) || CHARACTERS[0];
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      GFX.ell(ctx, x, groundY + 6, 44, 8);
      ctx.fill();
      GFX.drawCharacter(ctx, ch, x, groundY, 1, { runPhase: S.runPhase, blink: S.blink > 0 }, S.t);
    }

    drawIntroLogo();
  }

  function drawIntroLogo() {
    const reveal = Math.max(0, Math.min(1, (intro.t - INTRO_LOGO_START) / INTRO_LOGO_DUR));
    if (reveal <= 0) return;
    const fadeOut = intro.ending ? Math.max(0, 1 - intro.endT / (INTRO_FADE * 0.6)) : 1;
    if (fadeOut <= 0) return;

    // rozměry podle poměru stran obrázku
    const ratio = intro.logoReady ? intro.logoImg.height / intro.logoImg.width : 0.7;
    let lw = Math.min(W * 0.46, 480);
    if (lw * ratio > H * 0.46) lw = (H * 0.46) / ratio;
    const lh = lw * ratio;
    const cx = W / 2, cy = H * 0.32;

    // tmavší podklad, ať světlé kruhy loga vyniknou i na jasné obloze
    const glow = ctx.createRadialGradient(cx, cy, lw * 0.1, cx, cy, lw * 0.85);
    glow.addColorStop(0, `rgba(28, 42, 30, ${0.32 * reveal * fadeOut})`);
    glow.addColorStop(1, 'rgba(28, 42, 30, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - lw, cy - lw, lw * 2, lw * 2);

    if (intro.logoReady) {
      // „vykreslování“ zleva doprava – maska s měkkou hranou v offscreen bufferu
      const bw = Math.ceil(lw * DPR), bh = Math.ceil(lh * DPR);
      if (!intro.buf || intro.buf.width !== bw || intro.buf.height !== bh) {
        intro.buf = document.createElement('canvas');
        intro.buf.width = bw; intro.buf.height = bh;
        intro.bufCtx = intro.buf.getContext('2d');
      }
      const b = intro.bufCtx;
      b.clearRect(0, 0, bw, bh);
      b.drawImage(intro.logoImg, 0, 0, bw, bh);
      if (reveal < 1) {
        b.globalCompositeOperation = 'destination-in';
        const feather = 0.22;
        const edge = reveal * (1 + feather);
        const g = b.createLinearGradient(0, 0, bw, 0);
        g.addColorStop(Math.max(0, Math.min(1, edge - feather)), 'rgba(0,0,0,1)');
        g.addColorStop(Math.max(0, Math.min(1, edge)), 'rgba(0,0,0,0)');
        b.fillStyle = g;
        b.fillRect(0, 0, bw, bh);
        b.globalCompositeOperation = 'source-over';
      }
      ctx.save();
      ctx.globalAlpha = fadeOut;
      ctx.shadowColor = 'rgba(20, 26, 18, 0.45)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(intro.buf, cx - lw / 2, cy - lh / 2, lw, lh);
      ctx.restore();
    } else {
      // záložní nápis, kdyby se obrázek nestihl načíst
      ctx.save();
      ctx.globalAlpha = reveal * fadeOut;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f5efdf';
      ctx.font = `800 ${Math.round(lw * 0.13)}px "Baloo 2", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillText('nech mě růst', cx, cy);
      ctx.restore();
    }

    // web azylu
    const webIn = Math.max(0, Math.min(1, (intro.t - INTRO_WEB_AT) / 0.8));
    if (webIn > 0) {
      ctx.save();
      ctx.globalAlpha = webIn * fadeOut;
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(Math.min(34, lw * 0.1))}px "Baloo 2", sans-serif`;
      const y = cy + lh / 2 + Math.min(46, H * 0.08) + (1 - webIn) * 14;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(30, 40, 26, 0.4)';
      ctx.strokeText('nechmerust.org', cx, y);
      ctx.fillStyle = '#ffe08a';
      ctx.fillText('nechmerust.org', cx, y);
      ctx.restore();
    }

    // nápověda přeskočení
    if (!intro.ending && intro.t > 1.4) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(S.t * 0.004);
      ctx.textAlign = 'center';
      ctx.font = '600 15px "Baloo 2", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('ťukni pro přeskočení', W / 2, H - 16);
      ctx.restore();
    }
  }

  /* =========================================================
     OVLÁDÁNÍ
     ========================================================= */
  function jump() {
    if (S.mode !== 'run' && !S.demo) return;
    if (S.sliding > 0) S.sliding = 0;
    const jumpPower = 950 * (S.stats?.jump || 1);
    if (!S.airborne) {
      S.vy = -jumpPower;
      S.airborne = true;
      S.jumps = 1;
      S.squash = -0.6;
      puffs(6);
      AUDIO.play('jump');
    } else if (S.jumps === 1) {
      S.vy = -jumpPower * 0.88;
      S.jumps = 2;
      AUDIO.play('djump');
      // obláček pod nohama při dvojskoku
      for (let i = 0; i < 5; i++) {
        S.particles.push({
          x: playerX(), y: groundY - S.py - 6, vx: (Math.random() - 0.5) * 120,
          vy: Math.random() * 60 + 20, r: 5 + Math.random() * 5, life: 0.5, c: '#ffffff', a: 0.8,
        });
      }
    } else {
      // ťuknutí těsně před dopadem se zapamatuje a skočí se hned po doteku země,
      // takže žádný klik nepřijde vniveč
      S.jumpBuf = 0.16;
    }
  }

  function slide() {
    if (S.mode !== 'run') return;
    if (S.airborne) { S.vy = Math.max(S.vy, 1500); } // rychlý sešup
    S.sliding = 0.65;
    AUDIO.play('slide');
  }

  // fullscreen hned při prvním doteku – dřív to prohlížeč (bez gesta) nedovolí
  window.addEventListener('pointerdown', () => goLandscapeFullscreen(), { once: true, capture: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); uiOrJump(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); slide(); }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  });

  function uiOrJump() {
    if (S.mode === 'intro') { skipIntro(); return; }
    if (S.mode === 'menu') startRun();
    else if (S.mode === 'over') { /* tlačítka řeší DOM */ }
    else jump();
  }

  let ptr = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'run') return;
    ptr = { y: e.clientY, t: performance.now(), acted: false };
    jump();
    ptr.acted = 'jump';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptr || S.mode !== 'run') return;
    if (e.clientY - ptr.y > 38 && ptr.acted !== 'slide') {
      slide();
      ptr.acted = 'slide';
    }
  });
  canvas.addEventListener('pointerup', () => { ptr = null; });

  /* =========================================================
     PRŮBĚH HRY
     ========================================================= */
  // v demu za menu běhá zvířátko víc vlevo, aby ho nezakrýval panel menu
  function playerX() { return S.demo ? Math.min(W * 0.16, 170) : Math.min(W * 0.3, 260); }

  function resetWorld(demo) {
    S.worldX = 0;
    S.obstacles = []; S.pickups = []; S.decor = []; S.particles = []; S.floaters = [];
    S.flyers = [];
    S.nextObstacleX = demo ? Infinity : 1600;
    S.nextPickupX = demo ? Infinity : 650;
    S.nextDecorX = 100;
    S.nextFlyerX = 400;
    S.py = 0; S.vy = 0; S.airborne = false; S.jumps = 0; S.sliding = 0; S.jumpBuf = 0;
    S.stumble = 0; S.invuln = 0; S.bubble = null; S.sideBubbles = [];
    S.saidLowEnergy = false; S.lastMilestone = 0; S.nextQuoteAt = 6 + Math.random() * 6;
  }

  function goLandscapeFullscreen() {
    // na mobilu při startu běhu: celá obrazovka + zámek na šířku
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    Promise.resolve(req.call(el)).then(() => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }).catch(() => {});
  }

  function startRun() {
    AUDIO.ensureCtx();
    goLandscapeFullscreen();
    S.char = charById(save.selected) || CHARACTERS[0];
    S.stats = S.char.stats;
    S.energy = ECONOMY.startEnergy;
    S.coinsRun = 0; S.carrotsRun = 0;
    S.cloverT = 0;
    S.ramLeft = S.stats.ram || 0;
    S.speed = S.baseSpeed * S.stats.speed;
    S.demo = false;
    S.lastEnvId = null; // ať hned naskočí hudba prvního prostředí
    resetWorld(false);
    S.mode = 'run';
    showScreen(null);
    updateHud(true);
    AUDIO.play('click');
  }

  function togglePause() {
    if (S.mode === 'run') { S.mode = 'paused'; showScreen('pause'); }
    else if (S.mode === 'paused') { S.mode = 'run'; showScreen(null); }
  }

  function endRun() {
    S.mode = 'over';
    S.shake = 0;
    save.coins += S.coinsRun;
    save.runs += 1;
    const dist = Math.floor(S.worldX / PX_PER_M);
    const isBest = dist > save.best;
    if (isBest) save.best = dist;
    // příběhový konec – každé zvířátko střídá své příběhy popořadě,
    // takže tři doběhy za sebou vyprávějí tři různé konce
    if (!save.storyIdx) save.storyIdx = {};
    const sIdx = (save.storyIdx[S.char.id] || 0) % S.char.stories.length;
    const story = I18N.pick(S.char.stories[sIdx]);
    save.storyIdx[S.char.id] = sIdx + 1;
    persist();
    AUDIO.play('finish');
    document.getElementById('over-title').textContent = isBest ? I18N.t('over.record') : I18N.t('over.finish');
    document.getElementById('over-story').textContent = story;
    document.getElementById('over-dist').textContent = dist + ' m';
    document.getElementById('over-carrots').textContent = S.carrotsRun;
    document.getElementById('over-coins').textContent = '+' + S.coinsRun;
    document.getElementById('over-best').textContent = save.best + ' m';
    drawPortrait(document.getElementById('over-portrait'), S.char);
    showScreen('over');
  }

  /* =========================================================
     SPAWNOVÁNÍ
     ========================================================= */
  function spawnObstacle() {
    const distM = S.worldX / PX_PER_M;
    const pool = OBSTACLES;
    const ob = pool[Math.floor(Math.random() * pool.length)];
    const o = {
      ...ob,
      x: S.nextObstacleX,
      y: 0, // dopočítá se při kreslení (svět → obrazovka)
      broken: false,
    };
    // drůbež má náhodnou barevnou variantu
    const variants = BIRD_VARIANTS[o.id];
    if (variants) o.v = variants[Math.floor(Math.random() * variants.length)];
    S.obstacles.push(o);

    // občas mince nebo mrkev nad překážkou – odměna za přesný skok
    if (Math.random() < 0.45 && !o.flying) {
      const carrot = Math.random() < 0.4;
      for (let i = 0; i < 3; i++) {
        S.pickups.push({
          kind: carrot ? 'carrot' : 'coin',
          x: o.x - 26 + i * 26,
          h: o.h + 70 + Math.sin(i / 2 * Math.PI) * 24,
        });
      }
    }

    // dál v běhu občas dvojitá pozemní překážka (skok–skok)
    if (distM > 450 && !o.flying && Math.random() < 0.22) {
      const groundPool = pool.filter(p => !p.flying);
      const ob2 = groundPool[Math.floor(Math.random() * groundPool.length)];
      const o2 = { ...ob2, x: o.x + 340 + Math.random() * 140, y: 0, broken: false };
      const v2 = BIRD_VARIANTS[o2.id];
      if (v2) o2.v = v2[Math.floor(Math.random() * v2.length)];
      S.obstacles.push(o2);
      S.nextObstacleX = o.x + 340 + 140;
    }

    // mezera podle rychlosti – s ujetou vzdáleností se zmenšuje
    const tighten = Math.max(0.6, 1 - distM / 4000);
    const reaction = S.speed * (1.0 + Math.random() * 0.9) * tighten;
    S.nextObstacleX += Math.max(380, reaction);
  }

  function spawnPickups() {
    const x0 = S.nextPickupX;
    const distM = S.worldX / PX_PER_M;
    // s ujetou vzdáleností jsou svačiny vzácnější
    const scarcity = 1 + distM / 2200;
    const roll = Math.random();
    let width = 0;

    if (roll < 0.30) {
      // mrkve ve vzduchu – musí se pro ně skočit
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      const h = 95 + Math.random() * 40;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 46, h: h + i * 6 });
      width = n * 46;
    } else if (roll < 0.60) {
      // oblouk mincí ve vzduchu
      const n = 5;
      for (let i = 0; i < n; i++) {
        S.pickups.push({ kind: 'coin', x: x0 + i * 40, h: 60 + Math.sin(i / (n - 1) * Math.PI) * 70 });
      }
      width = n * 40;
    } else if (roll < 0.75) {
      // krátká řada mrkví na zemi (vzácná odměna zadarmo)
      const n = 2;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 46, h: 26 });
      width = n * 46;
    } else if (roll < 0.82) {
      // ZLATÁ MRKEV – vysoko, chce to dvojskok
      S.pickups.push({ kind: 'golden', x: x0, h: 130 });
      width = 40;
    } else if (roll < 0.87) {
      // ČTYŘLÍSTEK PRO ŠTĚSTÍ – vzácný, chvíli po něm platí mince dvojnásob
      S.pickups.push({ kind: 'clover', x: x0, h: 105 + Math.random() * 30 });
      width = 40;
    } else {
      // řádka mincí na zemi
      const n = 4;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'coin', x: x0 + i * 40, h: 28 });
      width = n * 40;
    }
    S.nextPickupX = x0 + width + (520 + Math.random() * 480) * scarcity;
  }

  // malé kytičky apod. smí do popředí; všechno velké patří dozadu,
  // aby se nepletlo s překážkami na pěšině
  const NEAR_PROPS = new Set(['flower', 'mushroom', 'stump', 'basket', 'gnome', 'campfire']);

  // lidští obyvatelé Louky – objevují se vzácně a střídají se
  const HUMAN_PROPS = Object.keys(HUMANS);
  let humanIdx = Math.floor(Math.random() * HUMAN_PROPS.length);

  function spawnDecor() {
    // občas u pěšiny fandí někdo z lidí, co se o azyl starají
    if (Math.random() < 0.13) {
      S.decor.push({
        prop: HUMAN_PROPS[humanIdx++ % HUMAN_PROPS.length],
        x: S.nextDecorX,
        far: true,
        human: true,
        said: false,
        extra: Math.floor(Math.random() * 3), // náhodná póza (každý člověk má tři)
        s: 0.8 + Math.random() * 0.15,
      });
      S.nextDecorX += 640 + Math.random() * 620;
      return;
    }
    const env = currentEnv().env;
    const props = env.props;
    const p = props[Math.floor(Math.random() * props.length)];
    const far = !NEAR_PROPS.has(p) || Math.random() < 0.4;
    const isSign = p === 'signpost';
    S.decor.push({
      prop: p,
      x: S.nextDecorX,
      far,
      // cedule schválně větší, ať se dají číst
      s: isSign ? 0.95 + Math.random() * 0.2 : (far ? 0.55 + Math.random() * 0.25 : 0.75 + Math.random() * 0.3),
      extra: isSign ? I18N.pick(SIGNS[Math.floor(Math.random() * SIGNS.length)]) : null,
    });
    S.nextDecorX += 460 + Math.random() * 640;
  }

  /* ---------- letci kroužící na obloze ---------- */
  function spawnFlyer() {
    const envId = currentEnv().env.id;
    let type = Math.random() < 0.55 ? 'swallow' : 'stork';
    if (envId === 'noc') type = 'owl';
    else if (envId === 'les' && Math.random() < 0.5) type = 'owl';
    const big = type === 'stork';
    S.flyers.push({
      type,
      cx: S.nextFlyerX,                                      // střed kruhu ve světě
      cy: 60 + Math.random() * Math.max(60, groundY - 300),  // výška středu na obrazovce
      r: big ? 70 + Math.random() * 45 : 40 + Math.random() * 35,
      w: big ? 0.45 + Math.random() * 0.2 : 0.9 + Math.random() * 0.5,
      ph: Math.random() * Math.PI * 2,
      dir: Math.random() < 0.5 ? -1 : 1,
      trailT: 0, dropT: 2 + Math.random() * 4, said: false,
    });
    S.nextFlyerX += 900 + Math.random() * 900;
  }

  function updateFlyers(dt, running) {
    const px = playerX();
    for (const f of S.flyers) {
      const ang = f.ph + S.t * 0.001 * f.w * f.dir;
      f.sx = (f.cx - S.worldX) * 0.85 + px + Math.cos(ang) * f.r;
      f.sy = f.cy + Math.sin(ang) * f.r * 0.5;
      // natočení po směru letu (v zrcadleném prostoru stačí |vx|)
      const vx = -Math.sin(ang) * f.dir;
      f.flip = vx < 0 ? -1 : 1;
      f.rot = Math.atan2(Math.cos(ang) * 0.5 * f.dir, Math.abs(vx) + 0.25) * 0.7;
      if (f.type === 'swallow') {
        // třpytivá stopa za vlaštovkou
        f.trailT -= dt;
        if (f.trailT <= 0 && f.sx > -40 && f.sx < W + 40) {
          f.trailT = 0.09;
          S.particles.push({ x: f.sx - f.flip * 14, y: f.sy + 2, vx: -20 * f.flip, vy: 8, r: 2, life: 0.9, a: 0.55, c: '#ffffff' });
        }
      } else if (f.type === 'stork') {
        // čáp občas upustí pírko, které se snáší dolů
        f.dropT -= dt;
        if (f.dropT <= 0 && f.sx > 0 && f.sx < W) {
          f.dropT = 5 + Math.random() * 6;
          S.particles.push({ x: f.sx, y: f.sy + 6, vx: -30, vy: 35, r: 3, life: 4, a: 0.85, sway: Math.random() * 6, c: '#f5f2ea' });
        }
      }
      // jednou za přelet něco vesele zavolá
      if (!f.said && running && f.sx > W * 0.3 && f.sx < W * 0.85) {
        f.said = true;
        if (Math.random() < 0.45 && S.sideBubbles.length < 2) {
          S.sideBubbles.push({ txt: randomQuote(EVENTS.flyer[f.type]), t: 0, dur: 3, flyer: f });
        }
      }
    }
  }

  /* =========================================================
     PROSTŘEDÍ – plynulé prolínání palet
     ========================================================= */
  const ENV_LEN_M = 550;   // délka jednoho prostředí
  const ENV_FADE_M = 70;   // délka přechodu

  function currentEnv() {
    const distM = Math.max(0, S.worldX) / PX_PER_M;
    const idx = ((Math.floor(distM / ENV_LEN_M) % ENVS.length) + ENVS.length) % ENVS.length;
    const next = (idx + 1) % ENVS.length;
    const local = distM % ENV_LEN_M;
    const fadeStart = ENV_LEN_M - ENV_FADE_M;
    const t = local > fadeStart ? (local - fadeStart) / ENV_FADE_M : 0;
    return { env: ENVS[idx], nextEnv: ENVS[next], blend: t, idx };
  }

  function blendedPalette() {
    const { env, nextEnv, blend } = currentEnv();
    const keys = ['skyTop', 'skyBottom', 'hillFar', 'hillNear', 'ground', 'groundDark', 'path', 'sun', 'clouds'];
    const pal = {};
    for (const k of keys) pal[k] = GFX.lerpColor(env[k], nextEnv[k], blend);
    pal.nightAmt = GFX.lerp(env.night ? 1 : 0, nextEnv.night ? 1 : 0, blend);
    pal.particles = blend < 0.5 ? env.particles : nextEnv.particles;
    return pal;
  }

  /* =========================================================
     ČÁSTICE, BUBLINY, TEXTY
     ========================================================= */
  function puffs(n) {
    for (let i = 0; i < n; i++) {
      S.particles.push({
        x: playerX() - 20 + Math.random() * 20,
        y: groundY - 4 - Math.random() * 8,
        vx: -60 - Math.random() * 90, vy: -20 - Math.random() * 50,
        r: 4 + Math.random() * 6, life: 0.45 + Math.random() * 0.3,
        c: '#e8dcc4', a: 0.7,
      });
    }
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 220;
      S.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
        r: 3 + Math.random() * 5, life: 0.5 + Math.random() * 0.5,
        c: color, a: 1, grav: true,
      });
    }
  }

  function floater(txt, x, y, color) {
    S.floaters.push({ txt, x, y, life: 1, color });
  }

  function sayBubble(text) {
    S.bubble = text;
    S.bubbleT = 4.2;
    AUDIO.play('quote');
  }
  // hlášky jsou dvojjazyčné objekty { cs, en } – vybere náhodnou v aktuálním jazyce
  function randomQuote(list) { return I18N.pick(list[Math.floor(Math.random() * list.length)]); }

  /* =========================================================
     UPDATE
     ========================================================= */
  let ambientTimer = 0;

  function update(dt) {
    S.t += dt * 1000;
    // třes musí odeznít i na obrazovkách mimo běh, jinak se menu klepe donekonečna
    S.shake = Math.max(0, S.shake - dt * 3);

    if (S.mode === 'paused' || S.mode === 'over') return;
    const running = S.mode === 'run';
    const spd = S.demo ? S.baseSpeed * 0.8 : S.speed;

    // zrychlování
    if (running) {
      S.speed = Math.min(S.baseSpeed * S.stats.speed + (S.worldX / PX_PER_M) * 0.45, 860);
    }

    S.worldX += spd * dt * (S.stumble > 0 ? 0.55 : 1);

    if (S.mode === 'intro') updateIntro(dt);

    // fyzika hráče
    if (S.airborne || S.py > 0) {
      S.vy += GRAVITY * dt;
      S.py -= S.vy * dt;
      if (S.py <= 0) {
        S.py = 0; S.vy = 0;
        if (S.airborne) { S.squash = 0.8; puffs(5); AUDIO.play('land'); }
        S.airborne = false; S.jumps = 0;
        if (S.jumpBuf > 0) { S.jumpBuf = 0; jump(); } // zapamatované ťuknutí
      }
    }
    S.jumpBuf = Math.max(0, S.jumpBuf - dt);
    S.sliding = Math.max(0, S.sliding - dt);
    S.stumble = Math.max(0, S.stumble - dt);
    S.invuln = Math.max(0, S.invuln - dt);
    S.squash *= Math.pow(0.0001, dt); // rychlé odeznění
    S.runPhase += dt * (10 + spd * 0.012);

    // mrkání
    S.blink -= dt;
    if (S.blink < -3 - Math.random() * 3) S.blink = 0.12;

    // spawn
    while (S.nextDecorX < S.worldX + W / FAR_PARALLAX + 500) spawnDecor();
    while (S.nextFlyerX < S.worldX + W + 700) spawnFlyer();
    S.flyers = S.flyers.filter(f => f.cx > S.worldX - 700);
    updateFlyers(dt, running);
    if (running) {
      while (S.nextObstacleX < S.worldX + W + 300) spawnObstacle();
      while (S.nextPickupX < S.worldX + W + 300) spawnPickups();
    }

    // úklid za obrazovkou
    const cut = S.worldX - 300;
    S.obstacles = S.obstacles.filter(o => o.x > cut);
    S.pickups = S.pickups.filter(p => p.x > cut && !p.taken);
    S.decor = S.decor.filter(d => d.x > cut - 1300); // pomalejší parallax = déle na obrazovce

    // hudba podle prostředí
    if (running) {
      const envId = currentEnv().env.id;
      if (envId !== S.lastEnvId) { S.lastEnvId = envId; AUDIO.playMusic(envId); }
    }

    if (running) {
      S.cloverT = Math.max(0, S.cloverT - dt);
      // energie – ubývá rychleji s tempem i vzdáleností, ať běh nemůže trvat věčně
      const distM = S.worldX / PX_PER_M;
      const speedFactor = Math.max(0, (S.speed - S.baseSpeed) / 400);
      const ramp = 1 + speedFactor * 0.6 + distM / ECONOMY.drainRampDist;
      S.energy -= ECONOMY.drainPerSecond * S.stats.drain * ramp * dt;
      if (S.energy <= 25 && !S.saidLowEnergy) {
        S.saidLowEnergy = true;
        sayBubble(randomQuote(EVENTS.lowEnergy));
      }
      if (S.energy > 35) S.saidLowEnergy = false;
      if (S.energy <= 0) { S.energy = 0; endRun(); return; }

      collide(dt);
      quotes(dt);
      humanQuotes();
      updateHud(false);
    }

    // částice
    for (const p of S.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vy += 500 * dt;
      p.life -= dt;
    }
    S.particles = S.particles.filter(p => p.life > 0);
    for (const f of S.floaters) { f.y -= 40 * dt; f.life -= dt * 0.55; }
    S.floaters = S.floaters.filter(f => f.life > 0);
    for (const b of S.sideBubbles) b.t += dt;
    S.sideBubbles = S.sideBubbles.filter(b => b.t < b.dur);

    // ambientní částice prostředí
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 0.25;
      const pal = blendedPalette();
      if (pal.particles === 'petals' || pal.particles === 'leaves') {
        S.particles.push({
          x: W + 20, y: Math.random() * groundY * 0.8,
          vx: -spd * 0.35 - 30, vy: 30 + Math.random() * 40,
          r: 4, life: 4, a: 0.8, sway: Math.random() * 6,
          c: pal.particles === 'petals' ? ['#ff8fb1', '#fff', '#ffe08a'][Math.floor(Math.random() * 3)] : ['#e5a53a', '#c9762a', '#a8b83a'][Math.floor(Math.random() * 3)],
        });
      } else if (pal.particles === 'fireflies') {
        S.particles.push({
          x: Math.random() * W, y: groundY - 30 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 30,
          r: 2.5, life: 3, a: 0.9, c: '#ffe88a', glow: true,
        });
      }
    }

    S.bubbleT = Math.max(0, S.bubbleT - dt);
  }

  /* ---------- kolize ---------- */
  function collide(dt) {
    const px = playerX();
    const pyTop = groundY - S.py - (S.sliding > 0 ? 42 : 82);
    const pyBottom = groundY - S.py;
    const pLeft = px - 34, pRight = px + 46;

    // magnet (Flíček)
    const magnetR = S.stats.magnet || 0;

    for (const p of S.pickups) {
      if (p.taken) continue;
      let sx = p.x - S.worldX + px; // pozice na obrazovce (svět se posouvá pod hráčem)
      const sy = groundY - p.h;
      if (magnetR) {
        const dx = px - sx, dy = (pyBottom - 40) - sy;
        const d = Math.hypot(dx, dy);
        if (d < magnetR && d > 1) {
          p.x += dx * dt * 8;                                  // přitažení po x
          p.h += ((groundY - (pyBottom - 40)) - p.h) * dt * 6; // a po výšce k tlamičce
        }
      }
      sx = p.x - S.worldX + px;
      const reach = magnetR ? 46 : 34;
      if (Math.abs(sx - px) < reach && sy > pyTop - reach && sy < pyBottom + 10) {
        p.taken = true;
        if (p.kind === 'carrot') {
          S.carrotsRun++;
          const gain = ECONOMY.carrotEnergy * (S.stats.carrotBonus || 1);
          S.energy = Math.min(100, S.energy + gain);
          floater('+' + Math.round(gain) + ' ⚡', sx, sy - 20, '#f28c28');
          burst(sx, sy, '#f28c28', 6);
          AUDIO.play('carrot');
        } else if (p.kind === 'golden') {
          S.carrotsRun++;
          S.energy = Math.min(100, S.energy + ECONOMY.goldenCarrotEnergy);
          floater(I18N.t('fl.golden', { n: ECONOMY.goldenCarrotEnergy }), sx, sy - 24, '#ffce3a');
          burst(sx, sy, '#ffd24a', 22);
          sayBubble(randomQuote(EVENTS.goldenCarrot));
          AUDIO.play('golden');
        } else if (p.kind === 'clover') {
          S.cloverT = ECONOMY.cloverDuration;
          floater(I18N.t('fl.clover', { n: ECONOMY.cloverCoinValue }), sx, sy - 24, '#8ee87a');
          burst(sx, sy, '#6fce58', 18);
          sayBubble(randomQuote(EVENTS.clover));
          AUDIO.play('clover');
        } else {
          const val = S.cloverT > 0 ? ECONOMY.cloverCoinValue : 1;
          S.coinsRun += val;
          floater('+' + val, sx, sy - 16, S.cloverT > 0 ? '#8ee87a' : '#ffd24a');
          AUDIO.play('coin');
        }
      }
    }

    if (S.invuln > 0) return;
    for (const o of S.obstacles) {
      if (o.broken) continue;
      const sx = o.x - S.worldX + px;
      const oLeft = sx - o.w / 2 + 8, oRight = sx + o.w / 2 - 8;
      let oTop, oBottom;
      if (o.flying) {
        oBottom = groundY - o.clearance;
        oTop = oBottom - o.h + 10;
      } else {
        oBottom = groundY;
        oTop = groundY - o.h + 8;
      }
      const hit = pRight > oLeft && pLeft < oRight && pyBottom > oTop && pyTop < oBottom;
      if (!hit) continue;

      if (S.ramLeft > 0 && !o.flying) {
        // Yakulovo BERANIDLO
        S.ramLeft--;
        o.broken = true;
        burst(sx, groundY - o.h / 2, '#c9a03c', 20);
        floater(I18N.t('fl.ram'), sx, groundY - o.h - 30, '#ffd24a');
        S.shake = 0.6;
        AUDIO.play('ram');
        updateHud(true);
        continue;
      }

      // náraz – nenásilný: zvíře jen klopýtne, drůbež s křikem uteče
      o.broken = true;
      if (o.id === 'chicken' || o.id === 'goose') {
        burst(sx, groundY - 30, (o.v && o.v.body) || '#f5f0e0', o.id === 'goose' ? 16 : 12); // peříčka
        floater(randomQuote(EVENTS[o.id]), sx, groundY - o.h - 26, '#e5533a');
      }
      const penalty = o.soft ? 8 : ECONOMY.hitPenalty;
      S.energy = Math.max(0, S.energy - penalty);
      S.stumble = 0.7;
      S.invuln = 1.1;
      S.shake = 0.8;
      floater('-' + penalty + ' ⚡', px, pyTop - 20, '#e5533a');
      sayBubble(randomQuote(S.char.hitQuotes));
      AUDIO.play('hit');
      if (S.energy <= 0) { endRun(); return; }
    }
  }

  /* ---------- hlášky ---------- */
  function quotes(dt) {
    S.nextQuoteAt -= dt;
    if (S.nextQuoteAt <= 0 && S.bubbleT <= 0) {
      sayBubble(randomQuote(S.char.quotes));
      S.nextQuoteAt = 11 + Math.random() * 8;
    }
    const dist = Math.floor(S.worldX / PX_PER_M);
    if (dist - S.lastMilestone >= 500) {
      S.lastMilestone = Math.floor(dist / 500) * 500;
      floater(S.lastMilestone + ' m! ' + randomQuote(EVENTS.milestone), playerX(), groundY - 160, '#ffffff');
    }
  }

  // lidé v pozadí na běžce vesele zavolají, když kolem nich probíhá
  const lastHumanQuote = {}; // aby nikdo neopakoval stejnou hlášku dvakrát po sobě
  function humanQuotes() {
    const px = playerX();
    for (const d of S.decor) {
      if (!d.human || d.said) continue;
      const sx = (d.x - S.worldX) * FAR_PARALLAX + px;
      if (sx > W * 0.3 && sx < W * 0.85) {
        d.said = true;
        const list = HUMANS[d.prop];
        let qi = Math.floor(Math.random() * list.length);
        if (list.length > 1 && qi === lastHumanQuote[d.prop]) qi = (qi + 1) % list.length;
        lastHumanQuote[d.prop] = qi;
        S.sideBubbles.push({ txt: I18N.pick(list[qi]), t: 0, dur: 4, decor: d });
      }
    }
  }

  /* =========================================================
     RENDER
     ========================================================= */
  function render() {
    const pal = blendedPalette();
    const px = playerX();

    ctx.save();
    if (S.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * S.shake, (Math.random() - 0.5) * 8 * S.shake);
    }

    GFX.drawSky(ctx, W, H, pal, S.t);
    GFX.drawClouds(ctx, W, H, pal, S.worldX, S.t);
    GFX.drawHills(ctx, W, H, pal, S.worldX, groundY);
    GFX.drawGround(ctx, W, H, pal, S.worldX, groundY);

    // letci kroužící na obloze
    for (const f of S.flyers) {
      if (f.sx === undefined || f.sx < -60 || f.sx > W + 60) continue;
      GFX.drawFlyer(ctx, f.type, f.sx, f.sy, f.rot, f.flip, S.t);
    }

    // dekorace – ztlumená, ať je na první pohled jasné, že to není překážka
    for (const d of S.decor) {
      if (!d.far) continue;
      const sx = (d.x - S.worldX) * FAR_PARALLAX + px;
      if (sx < -220 || sx > W + 220) continue;
      ctx.globalAlpha = d.human ? 0.95 : (d.prop === 'signpost' ? 0.85 : 0.62);
      GFX.drawProp(ctx, d.prop, sx, groundY - 10, d.s, d.extra, S.t);
      ctx.globalAlpha = 1;
    }
    for (const d of S.decor) {
      if (d.far) continue;
      const sx = d.x - S.worldX + px;
      if (sx < -200 || sx > W + 200) continue;
      ctx.globalAlpha = 0.8;
      GFX.drawProp(ctx, d.prop, sx, groundY + 58, d.s, d.extra, S.t);
      ctx.globalAlpha = 1;
    }

    // sběratelné
    for (const p of S.pickups) {
      if (p.taken) continue;
      const sx = p.x - S.worldX + px;
      if (sx < -60 || sx > W + 60) continue;
      const sy = groundY - p.h;
      if (p.kind === 'coin') GFX.drawCoin(ctx, sx, sy, S.t);
      else if (p.kind === 'clover') GFX.drawClover(ctx, sx, sy, S.t);
      else GFX.drawCarrot(ctx, sx, sy, S.t, p.kind === 'golden');
    }

    // překážky – plná sytost, stín na zemi a obrys, ať jasně vystupují
    for (const o of S.obstacles) {
      if (o.broken) continue;
      const sx = o.x - S.worldX + px;
      if (sx < -160 || sx > W + 160) continue;
      o.screenX = sx;
      ctx.fillStyle = 'rgba(20, 14, 6, 0.28)';
      GFX.ell(ctx, sx, groundY + 8, o.w / 2 + 8, 9);
      ctx.fill();
      // bez rozmazaného stínu – shadowBlur každý snímek znatelně škubal na mobilech,
      // ostrý stín na zemi pod překážkou stačí
      GFX.drawObstacle(ctx, {
        ...o, x: sx,
        y: o.flying ? groundY - o.clearance : groundY,
      }, S.t);
    }

    if (S.mode === 'intro') {
      // v intru místo hráče pobíhá celý azyl + kreslí se logo
      renderIntro(px);
    } else {
      // stín hráče
      const shScale = Math.max(0.4, 1 - S.py / 400);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      GFX.ell(ctx, px, groundY + 6, 44 * shScale, 8 * shScale);
      ctx.fill();

      // hráč – v menu a obchodě běhá vždy právě vybrané zvířátko,
      // během běhu (a na kartě po doběhnutí) drží postava z běhu
      const ch = (!S.demo && S.char) ? S.char : (charById(save.selected) || CHARACTERS[0]);
      const flash = S.invuln > 0 && Math.floor(S.t / 80) % 2 === 0;
      if (!flash) {
        GFX.drawCharacter(ctx, ch, px, groundY - S.py, 1, {
          runPhase: S.runPhase,
          airborne: S.airborne,
          sliding: S.sliding > 0,
          stumble: S.stumble,
          squash: S.squash,
          blink: S.blink > 0,
        }, S.t);
      }
    }

    // bublina s hláškou
    if (S.bubbleT > 0 && S.bubble && S.mode === 'run') {
      drawBubble(px + 10, groundY - S.py - 134, S.bubble, Math.min(1, S.bubbleT * 3));
    }

    // částice
    for (const p of S.particles) {
      const pa = Math.min(1, p.life * 2) * (p.a || 1);
      ctx.fillStyle = p.c;
      const sway = p.sway ? Math.sin(S.t * 0.004 + p.sway) * 6 : 0;
      if (p.glow) { // levná záře místo shadowBlur – měkký kruh pod svatojánskou muškou
        ctx.globalAlpha = pa * 0.3;
        ctx.beginPath();
        ctx.arc(p.x + sway, p.y, p.r * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = pa;
      ctx.beginPath();
      ctx.arc(p.x + sway, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // plovoucí texty
    for (const f of S.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = 'bold 27px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // bublinky obyvatel a letců – plují se svým mluvčím
    for (const b of S.sideBubbles) {
      let ax, ay;
      if (b.decor) {
        ax = (b.decor.x - S.worldX) * FAR_PARALLAX + px;
        ay = groundY - 16 - (b.decor.human ? 148 : 80) * b.decor.s;
      } else if (b.flyer) {
        ax = b.flyer.sx; ay = b.flyer.sy - 14;
      }
      if (ax === undefined) continue;
      const fade = Math.max(0, Math.min(1, b.t * 4, (b.dur - b.t) * 2.5));
      drawSideBubble(ax, ay, b.txt, fade);
    }

    ctx.restore();

    // vinětace pro filmový vzhled – gradient se vytváří jen po změně velikosti,
    // ne každý snímek
    if (!vignette) {
      vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.22)');
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBubble(x, y, text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 23px "Baloo 2", sans-serif';
    const w = Math.min(ctx.measureText(text).width + 40, W - 40);
    const bx = Math.min(Math.max(x - w / 2, 10), W - w - 10);
    const by = y - 60;
    // ostrý stín posunutou siluetou místo shadowBlur – rychlejší a bublina se nechvěje
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    GFX.rr(ctx, bx + 2, by + 4, w, 50, 24);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    GFX.rr(ctx, bx, by, w, 50, 24);
    ctx.fill();
    // ocásek bubliny
    ctx.beginPath();
    ctx.moveTo(x - 7, by + 49); ctx.lineTo(x + 12, by + 49); ctx.lineTo(x, by + 68);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3230';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + w / 2, by + 33, w - 26);
    ctx.restore();
  }

  // zalomení textu na řádky podle maximální šířky (písmo už musí být nastavené)
  function wrapLines(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // menší bublina pro postavy v pozadí – vždy celá na obrazovce,
  // ocásek ukazuje na mluvčího, i když je bublina odsunutá od kraje
  function drawSideBubble(ax, ay, text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 19px "Baloo 2", sans-serif';
    const lines = wrapLines(text, Math.min(280, W * 0.42));
    const lineH = 24;
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
    const w = tw + 28;
    const h = lines.length * lineH + 16;
    const bx = Math.min(Math.max(ax - w / 2, 8), W - w - 8);
    const by = Math.max(ay - h - 12, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    GFX.rr(ctx, bx + 2, by + 3, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    GFX.rr(ctx, bx, by, w, h, 14); ctx.fill();
    // ocásek – špička míří na mluvčího
    const tipX = Math.min(Math.max(ax, bx + 10), bx + w - 10);
    const baseX = Math.min(Math.max(tipX, bx + 18), bx + w - 18);
    ctx.beginPath();
    ctx.moveTo(baseX - 7, by + h - 1);
    ctx.lineTo(baseX + 8, by + h - 1);
    ctx.lineTo(tipX, by + h + 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3230';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 24 + i * lineH));
    ctx.restore();
  }

  /* =========================================================
     HUD & OBRAZOVKY (DOM)
     ========================================================= */
  const $ = (id) => document.getElementById(id);
  const screens = ['menu', 'shop', 'over', 'pause'];

  function showScreen(name) {
    for (const s of screens) $(`screen-${s}`).classList.toggle('visible', s === name);
    $('hud').classList.toggle('visible', name === null);
    if (name === 'menu') AUDIO.playMusic('menu');
  }

  function updateHud(full) {
    $('hud-energy-fill').style.width = Math.max(0, S.energy) + '%';
    $('hud-energy-fill').classList.toggle('low', S.energy < 25);
    $('hud-dist').textContent = Math.floor(S.worldX / PX_PER_M) + ' m';
    $('hud-coins').textContent = S.coinsRun;
    const clover = $('hud-clover');
    if (S.cloverT > 0) {
      clover.style.display = 'flex';
      clover.textContent = `🍀 ×${ECONOMY.cloverCoinValue} · ${Math.ceil(S.cloverT)} s`;
    } else clover.style.display = 'none';
    if (full) {
      const ram = $('hud-ram');
      if (S.stats && S.stats.ram) {
        ram.style.display = 'flex';
        ram.textContent = '🐏 ' + '●'.repeat(S.ramLeft) + '○'.repeat((S.stats.ram || 0) - S.ramLeft);
      } else ram.style.display = 'none';
    }
  }

  /* ---------- portréty postav (mini canvasy) ---------- */
  function drawPortrait(cv, ch) {
    const c2 = cv.getContext('2d');
    const s = cv.width / 190;
    c2.clearRect(0, 0, cv.width, cv.height);
    GFX.drawCharacter(c2, ch, cv.width / 2 - 8 * s, cv.height * 0.82, s, { runPhase: 0.6 }, 400);
  }

  /* ---------- menu ---------- */
  function initMenu() {
    $('menu-best').textContent = save.best + ' m';
    $('menu-coins').textContent = save.coins;
    const ch = charById(save.selected);
    $('menu-charname').textContent = I18N.pick(ch.name);
    $('menu-perk').textContent = I18N.pick(ch.perk);
    $('btn-sfx').textContent = (save.sfx !== false ? '🔊 ' : '🔇 ') + I18N.t('menu.sounds');
    $('btn-music').textContent = (save.music !== false ? '🎵 ' : '🚫 ') + I18N.t('menu.music');
  }

  /* ---------- obchod ---------- */
  // karusel: zvířátka seřazená od nejlevnějšího (vlevo) po nejdražší (vpravo)
  const unlockPrice = (ch) => ch.unlock.type === 'coins' ? ch.unlock.price : 0;
  const SHOP_ORDER = [...CHARACTERS].sort((a, b) => unlockPrice(a) - unlockPrice(b));

  // statistiky se ukazují relativně k celému osazenstvu (výdrž = obrácená spotřeba)
  const STAT_KEYS = [
    { key: 'speed', label: 'shop.stat.speed', val: (st) => st.speed },
    { key: 'jump', label: 'shop.stat.jump', val: (st) => st.jump },
    { key: 'stamina', label: 'shop.stat.stamina', val: (st) => 2 - st.drain },
  ];
  const STAT_RANGE = STAT_KEYS.map(sk => {
    const vals = CHARACTERS.map(ch => sk.val(ch.stats));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  });

  function buildShop() {
    const grid = $('shop-grid');
    grid.innerHTML = '';
    $('shop-coins').textContent = save.coins;
    let selectedCard = null;
    for (const ch of SHOP_ORDER) {
      const owned = save.unlocked.includes(ch.id);
      const selected = save.selected === ch.id;
      const card = document.createElement('div');
      card.className = 'char-card' + (owned ? ' owned' : ' locked') + (selected ? ' selected' : '');

      // portrét na kousku louky, v rohu cenovka / fajfka
      const wrap = document.createElement('div');
      wrap.className = 'portrait-wrap';
      const cv = document.createElement('canvas');
      cv.width = 190; cv.height = 150;
      wrap.appendChild(cv);
      const badge = document.createElement('div');
      badge.className = 'card-badge';
      if (selected) { badge.classList.add('sel'); badge.textContent = '✓'; }
      else if (owned) { badge.style.display = 'none'; }
      else if (ch.unlock.type === 'coins') { badge.textContent = `🪙 ${ch.unlock.price}`; }
      else { badge.classList.add('sel'); badge.textContent = I18N.t('shop.free'); }
      wrap.appendChild(badge);
      card.appendChild(wrap);

      const name = document.createElement('h3');
      name.textContent = I18N.pick(ch.name);
      card.appendChild(name);

      const tag = document.createElement('p');
      tag.className = 'tagline';
      tag.textContent = I18N.pick(ch.tagline);
      card.appendChild(tag);

      const perk = document.createElement('p');
      perk.className = 'perk';
      const perkText = document.createElement('span');
      perkText.className = 'perk-text';
      perkText.textContent = I18N.pick(ch.perk);
      perk.appendChild(perkText);
      card.appendChild(perk);

      const rows = document.createElement('div');
      rows.className = 'stat-rows';
      STAT_KEYS.forEach((sk, i) => {
        const { min, max } = STAT_RANGE[i];
        const pct = max > min ? 25 + 75 * (sk.val(ch.stats) - min) / (max - min) : 60;
        const row = document.createElement('div');
        row.className = 'stat-row';
        const label = document.createElement('span');
        label.textContent = I18N.t(sk.label);
        const track = document.createElement('div');
        track.className = 'stat-track';
        const fill = document.createElement('div');
        fill.className = 'stat-fill ' + sk.key;
        fill.style.width = pct.toFixed(0) + '%';
        track.appendChild(fill);
        row.appendChild(label); row.appendChild(track);
        rows.appendChild(row);
      });
      card.appendChild(rows);

      const btn = document.createElement('button');
      btn.className = 'btn small';
      if (selected) { btn.textContent = I18N.t('shop.selected'); btn.disabled = true; }
      else if (owned) { btn.textContent = I18N.t('shop.select'); }
      else {
        btn.textContent = `🪙 ${ch.unlock.price}`;
        btn.classList.add(save.coins >= ch.unlock.price ? 'buy' : 'cant');
      }
      btn.addEventListener('click', () => onCharAction(ch));
      card.appendChild(btn);
      grid.appendChild(card);
      drawPortrait(cv, ch);
      if (selected) selectedCard = card;
    }
    // vybrané zvířátko ať je po otevření rovnou vidět
    if (selectedCard) {
      requestAnimationFrame(() => {
        grid.scrollLeft = selectedCard.offsetLeft - (grid.clientWidth - selectedCard.offsetWidth) / 2;
      });
    }
  }

  // ovládání karuselu na počítači: kolečko myši a tažení
  (() => {
    const grid = $('shop-grid');
    grid.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        grid.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
    let drag = null;
    grid.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.target.closest('button')) return;
      drag = { x: e.clientX, sl: grid.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; grid.classList.add('dragging'); }
      if (drag.moved) grid.scrollLeft = drag.sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (drag && drag.moved) grid.classList.remove('dragging');
      drag = null;
    });
  })();

  function onCharAction(ch) {
    AUDIO.play('click');
    if (save.unlocked.includes(ch.id)) {
      save.selected = ch.id;
      persist();
      buildShop();
      initMenu();
      return;
    }
    if (save.coins >= ch.unlock.price) {
      save.coins -= ch.unlock.price;
      save.unlocked.push(ch.id);
      save.selected = ch.id;
      persist();
      AUDIO.play('buy');
      buildShop();
      initMenu();
      toast(I18N.t('toast.joined', { name: I18N.pick(ch.name) }));
    } else {
      const missing = ch.unlock.price - save.coins;
      toast(I18N.t('toast.needCoins', { n: missing }));
    }
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
  }

  /* ---------- tlačítka ---------- */
  $('btn-play').addEventListener('click', startRun);
  $('btn-shop').addEventListener('click', () => { buildShop(); showScreen('shop'); AUDIO.play('click'); });
  $('btn-shop-back').addEventListener('click', () => { initMenu(); showScreen('menu'); AUDIO.play('click'); });
  $('btn-again').addEventListener('click', startRun);
  $('btn-over-menu').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); initMenu(); showScreen('menu'); });
  $('btn-over-shop').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); buildShop(); showScreen('shop'); });
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-pause-menu').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); initMenu(); showScreen('menu'); });
  $('btn-sfx').addEventListener('click', () => {
    save.sfx = !(save.sfx !== false);
    persist(); AUDIO.setSfx(save.sfx); initMenu();
  });
  $('btn-music').addEventListener('click', () => {
    save.music = !(save.music !== false);
    persist(); AUDIO.setMusic(save.music); initMenu();
    if (save.music) AUDIO.playMusic('menu');
  });

  /* ---------- přepínač jazyka ---------- */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AUDIO.play('click');
      I18N.set(btn.dataset.lang);
    });
  });
  // po přepnutí jazyka obnovit texty, které skládá JS
  I18N.onChange(() => {
    initMenu();
    if ($('screen-shop').classList.contains('visible')) buildShop();
  });

  /* =========================================================
     SMYČKA
     ========================================================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // start: intro se zvířátky a logem azylu, za ním už běží demo svět
  I18N.apply(); // propíše uložený jazyk do celého UI
  resetWorld(true);
  initMenu();
  initIntro();
  showScreen('intro'); // schová menu i HUD, vidět je jen canvas
  requestAnimationFrame(frame);
})();
