/* =========================================================
   LOUKA RUN – herní engine
   Endless runner na podporu azylu Nech mě růst
   ========================================================= */

(() => {
  const { CHARACTERS, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY, TUTORIAL } = DATA;

  /* ---------- canvas ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, groundY = 0;
  let vignette = null; // cachovaný gradient vinětace

  /* ---------- vynucená šířka (mobil na výšku) ----------
     iPhone neumí screen.orientation.lock() a se zapnutým zámkem otočení
     (Ovládací centrum) se displej sám neotočí vůbec – totéž platí
     v in-app prohlížečích (Instagram, Facebook…). Hru proto na výšku
     otočíme o 90° sami: CSS třída .force-landscape na <html> otočí
     celé <body> (viz style.css) a tady se jen prohodí rozměry plátna
     a souřadnice doteků. Jakmile hráč telefon opravdu otočí, třída
     zmizí a hra běží v přirozené šířce. */
  const portraitMq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  const forcedLandscape = () => document.documentElement.classList.contains('force-landscape');
  // svislá souřadnice doteku v souřadnicích hry (v otočené hře ji nese clientX)
  const pointerGameY = (e) => (forcedLandscape() ? window.innerWidth - e.clientX : e.clientY);

  // levý okraj panelu menu (.menu-mid) – zvířátko v demu mu uhýbá,
  // aby na malých displejích nebylo schované za panelem
  let menuPanelLeft = Infinity;
  function measureMenuPanel() {
    const menu = document.getElementById('screen-menu');
    const mid = menu && menu.querySelector('.menu-mid');
    // getBoundingClientRect vrací souřadnice obrazovky – v otočené hře
    // odpovídá hernímu levému okraji panelu jeho horní hrana
    menuPanelLeft = (mid && menu.classList.contains('visible'))
      ? (forcedLandscape() ? mid.getBoundingClientRect().top : mid.getBoundingClientRect().left)
      : Infinity;
  }

  function resize() {
    document.documentElement.classList.toggle('force-landscape', portraitMq.matches);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = forcedLandscape() ? window.innerHeight : window.innerWidth;
    H = forcedLandscape() ? window.innerWidth : window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    groundY = H * 0.78;
    vignette = null;
    measureMenuPanel();
  }
  window.addEventListener('resize', resize);
  if (portraitMq.addEventListener) portraitMq.addEventListener('change', resize);
  else if (portraitMq.addListener) portraitMq.addListener(resize); // starší iOS Safari
  resize();

  /* ---------- uložený postup ---------- */
  const SAVE_KEY = 'loukarun_save_v1';
  const save = loadSave();
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && Array.isArray(s.unlocked)) {
        // hráči z dob před tutoriálem už hru znají – školu jim nevnucovat
        if (s.runs > 0 && s.tutorialDone === undefined) s.tutorialDone = true;
        return s;
      }
    } catch (e) { /* poškozený záznam – začneme znovu */ }
    return { coins: 0, unlocked: ['karel'], selected: 'karel', best: 0, runs: 0, sfx: true, music: true, tutorialDone: false };
  }
  // zápis nesmí shodit běh: na iPhonu (anonymní režim / plné úložiště) umí
  // localStorage.setItem vyhodit výjimku – jinak by spadl konec běhu ještě
  // před přidělením odznaků (achievementů) a nezapsaly by se ani mince/rekord
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* úložiště nedostupné – postup zůstane aspoň v paměti do konce sezení */ }
  }

  /* ---------- vývojářský (testovací) režim ----------
     Skryté menu pro pořádné testování hry – přepínače se drží ve
     vlastním záznamu, aby nešpinily normální uložený postup. */
  const DEV_KEY = 'loukarun_dev_v1';
  const DEV_COINS = 9999999;
  const dev = loadDev();
  function loadDev() {
    const d = { god: false, infCoins: false, speed: 1, forceTut: false };
    try { Object.assign(d, JSON.parse(localStorage.getItem(DEV_KEY)) || {}); } catch (e) { /* nevadí */ }
    return d;
  }
  function persistDev() { try { localStorage.setItem(DEV_KEY, JSON.stringify(dev)); } catch (e) { /* nevadí */ } }

  if (dev.infCoins) save.coins = DEV_COINS;

  AUDIO.setSfx(save.sfx !== false);
  AUDIO.setMusic(save.music !== false);

  /* ---------- stav hry ---------- */
  const S = {
    mode: 'intro',          // intro | menu | run | over | paused
    t: 0,                   // celkový čas (ms)
    worldX: 0,              // ujetá vzdálenost v px
    speed: 0,
    baseSpeed: 308,
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
    bubble: null, bubbleT: 0, nextQuoteAt: 10,
    tut: null,              // Karlova škola běhu (tutoriál prvního běhu)
    enc: null,              // novinka na trase – první setkání s překážkou
    introFlagged: new Set(),// druhy označené k představení v tomto běhu
    sideBubbles: [],        // bublinky obyvatel a letců v pozadí
    saidLowEnergy: false, lastMilestone: 0,
    milestone: null,        // krátká oslavná cedule po dosažení 500 m milníku
    special: null,          // Zvířecí koncert každých 2,5 km (rytmická minihra)
    lastSpecial: 0,         // poslední milník 2500 m, kde se koncert objevil
    speedAnchorX: 0,        // odkud se měří rozjezd rychlosti (reset po výhře v koncertu)
    shake: 0,
    demo: true,             // atrakt mód za menu
    devReturn: null,        // kam se vrátit po zavření vývojářského menu
  };

  const PX_PER_M = 42;
  const GRAVITY = 2600;

  // Na užším displeji urazí překážka kratší dráhu, než dorazí k běžci, takže
  // při stejné rychlosti zbývá míň času na reakci (na malých telefonech to
  // je „strašně rychlé“). Zpomalíme proto celý svět úměrně šířce plátna –
  // na telefonu běží o něco klidněji a čas na reakci zůstává hratelný jako
  // na širokém displeji. Na širokém plátně (≥ 760 px) se nemění vůbec nic.
  const SPEED_REF_W = 760;
  function worldSpeedScale() {
    return Math.max(0.72, Math.min(1, W / SPEED_REF_W));
  }
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

  /* ---------- AF signatura – filmová znělka autora ----------
     Logo se vynoří ze tmy, pod ním web, pak se vše prolne do
     intra hry. Jde přeskočit ťuknutím nebo klávesou. */
  const AF_HOLD = 4.7;   // kdy znělka sama začne odcházet (s)
  const AF_OUT = 1.4;    // délka prolnutí do hry (s)
  const afSplash = document.getElementById('af-splash');
  let afActive = !!afSplash;
  const afAutoLeave = afActive ? setTimeout(leaveAfSplash, AF_HOLD * 1000) : null;

  function leaveAfSplash() {
    if (!afActive) return;
    afActive = false; // intro hry se rozjede hned, ať se louka vynoří ze tmy
    clearTimeout(afAutoLeave);
    window.removeEventListener('pointerdown', skipAfSplash, true);
    window.removeEventListener('keydown', skipAfSplash, true);
    afSplash.classList.add('af-leave');
    setTimeout(() => afSplash.remove(), AF_OUT * 1000);
  }
  function skipAfSplash() {
    // krátká prodleva, ať znělka při netrpělivém ťuknutí aspoň problikne
    if (performance.now() > 700) leaveAfSplash();
  }
  if (afActive) {
    window.addEventListener('pointerdown', skipAfSplash, true);
    window.addEventListener('keydown', skipAfSplash, true);
  }

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
    if (afActive) return;           // čeká, než doběhne AF znělka
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
    if (lessonPaused()) return; // zastavená lekce – rozjede ji jen Pokračovat
    // během koncertu ťuknutí neskáče, ale trefuje rytmus
    if (S.special && S.special.phase === 'challenge') { concertTap(); return; }
    if (S.sliding > 0) S.sliding = 0;
    // odraz 880 ≈ výška skoku 149 px, dvojskok z vrcholu přidá ~69 px –
    // nejvyšší překážka má 58 px a zlatá mrkev visí ve 130 px, takže
    // obojí jde v pohodě a zvíře nelétá půl obrazovky do nebe
    const jumpPower = 880 * (S.stats?.jump || 1);
    if (!S.airborne) {
      S.vy = -jumpPower;
      S.airborne = true;
      S.jumps = 1;
      S.squash = -0.6;
      puffs(6);
      AUDIO.play('jump');
    } else if (S.jumps === 1) {
      S.vy = -jumpPower * 0.68;
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
    if (lessonPaused()) return; // zastavená lekce – rozjede ji jen Pokračovat
    if (S.special && S.special.phase === 'challenge') return; // koncert řídí jen ťukání
    if (S.airborne) { S.vy = Math.max(S.vy, 1500); } // rychlý sešup
    S.sliding = 0.8; // dřep po svajpu dolů drží nepatrně déle
    AUDIO.play('slide');
  }

  // fullscreen hned při prvním doteku – dřív to prohlížeč (bez gesta) nedovolí
  window.addEventListener('pointerdown', () => goLandscapeFullscreen(), { once: true, capture: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); uiOrJump(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); slide(); }
    if (e.code === 'Escape' || e.code === 'KeyP') { if (isDevOpen()) closeDev(); else togglePause(); }
    // skrytá klávesa pro vývojářské menu (` / ~ vlevo nahoře)
    if (e.code === 'Backquote') { e.preventDefault(); if (isDevOpen()) closeDev(); else openDev(); }
  });

  function uiOrJump() {
    if (isDevOpen()) return; // vývojářské menu je otevřené – klávesy neřídí hru
    if (S.mode === 'intro') { skipIntro(); return; }
    if (S.mode === 'menu') startRun();
    else if (S.mode === 'over') { /* tlačítka řeší DOM */ }
    else if (!continueLesson()) jump(); // mezerník u zastavené lekce = Pokračovat
  }

  let ptr = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'run') return;
    ptr = { y: pointerGameY(e), t: performance.now(), acted: false };
    jump();
    ptr.acted = 'jump';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptr || S.mode !== 'run') return;
    if (pointerGameY(e) - ptr.y > 38 && ptr.acted !== 'slide') {
      slide();
      ptr.acted = 'slide';
    }
  });
  canvas.addEventListener('pointerup', () => { ptr = null; });

  /* =========================================================
     PRŮBĚH HRY
     ========================================================= */
  // v demu za menu běhá zvířátko víc vlevo, aby ho nezakrýval panel menu.
  // Na malých displejích panel sahá téměř až k levému okraji, proto se
  // podle jeho skutečné polohy zvířátko zmenší a uhne, aby bylo vidět celé.
  // Šířka zvířátka v demu je ~150 px (scale 1); pod ni se zmenšuje až na 0.6.
  function demoScale() {
    if (!S.demo) return 1;
    const avail = Math.min(menuPanelLeft, W) - 10;
    return Math.max(0.6, Math.min(1, avail / 150));
  }
  function playerX() {
    if (!S.demo) return Math.min(W * 0.3, 260);
    const avail = Math.min(menuPanelLeft, W) - 10;
    return Math.max(40, Math.min(W * 0.16, 170, avail - 72 * demoScale()));
  }

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
    S.saidLowEnergy = false; S.lastMilestone = 0; S.milestone = null; S.nextQuoteAt = 10 + Math.random() * 8;
    S.tut = null;
    S.enc = null; S.introFlagged = new Set();
    S.special = null; S.lastSpecial = 0; S.speedAnchorX = 0;
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
    // první běh = Karlova škola běhu (?tutorial=1 ji vynutí kdykoli znovu)
    S.tut = (FORCE_TUT || dev.forceTut || !save.tutorialDone) ? makeTutorial() : null;
    if (S.tut) { S.nextObstacleX = Infinity; S.nextPickupX = Infinity; }
    S.mode = 'run';
    showScreen(null);
    updateHud(true);
    AUDIO.play('click');
  }

  function togglePause() {
    if (S.mode === 'run') { S.mode = 'paused'; showScreen('pause'); }
    else if (S.mode === 'paused') { S.mode = 'run'; showScreen(null); }
  }

  // celkové mince za běh včetně násobiče postavy (Avala: coinMult) –
  // jednotlivé floatery zůstávají v základní hodnotě, součet se násobí jednou
  function runCoins() { return Math.round(S.coinsRun * (S.stats?.coinMult || 1)); }

  function endRun() {
    S.mode = 'over';
    S.shake = 0;
    S.tut = null; // pojistka – škola běhu končí s během (bez zápisu tutorialDone)
    S.enc = null;
    S.special = null;
    save.coins += runCoins();
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
    document.getElementById('over-coins').textContent = '+' + runCoins();
    document.getElementById('over-best').textContent = save.best + ' m';
    drawPortrait(document.getElementById('over-portrait'), S.char);
    showScreen('over');
    // nově splněné odznaky (rekord/počet běhů/…) oznámíme přes obrazovkou konce
    toastAchievements(syncAchievements());
  }

  /* =========================================================
     SPAWNOVÁNÍ
     ========================================================= */
  function spawnObstacle() {
    const distM = S.worldX / PX_PER_M;
    // překážky se odemykají postupně – každý „level“ (≈ nové prostředí)
    // přinese něco nového a začátek zůstává přívětivý
    const pool = OBSTACLES.filter(p => (p.minM || 0) <= distM);
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
    maybeFlagIntro(o);
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

    // dál v běhu občas dvojitá pozemní překážka (skok–skok);
    // šance nabíhá pozvolna, ať se obtížnost nezlomí naráz
    const doubleChance = 0.12 + 0.10 * Math.min(1, Math.max(0, (distM - 800) / 800));
    if (distM > 800 && !o.flying && Math.random() < doubleChance) {
      const groundPool = pool.filter(p => !p.flying);
      const ob2 = groundPool[Math.floor(Math.random() * groundPool.length)];
      const o2 = { ...ob2, x: o.x + 340 + Math.random() * 140, y: 0, broken: false };
      const v2 = BIRD_VARIANTS[o2.id];
      if (v2) o2.v = v2[Math.floor(Math.random() * v2.length)];
      maybeFlagIntro(o2);
      S.obstacles.push(o2);
      resolvePickupConflicts(o2);
      S.nextObstacleX = o.x + 340 + 140;
    }
    resolvePickupConflicts(o);

    // mezera podle rychlosti – s ujetou vzdáleností se zmenšuje,
    // prvních pár set metrů je naopak vzdušnějších. Rozestupy držíme
    // vzdušnější, ať zbývá víc času na reakci a hra není jen samé skákání.
    const tighten = Math.max(0.72, 1 - distM / 4000);
    const easyGap = 1 + 0.45 * Math.max(0, 1 - distM / 800);
    const reaction = S.speed * (1.25 + Math.random() * 0.95) * tighten * easyGap;
    S.nextObstacleX += Math.max(470, reaction);
  }

  // itemy nesmí ležet „v“ překážce, kde by nešly sebrat: pozemní se
  // zvednou nad ni (odměna za přesný skok), pod letící překážkou
  // zůstane jen to, co jde vzít ve skluzu
  function resolvePickupConflicts(o) {
    const left = o.x - o.w / 2 - 60, right = o.x + o.w / 2 + 60;
    if (o.flying) {
      S.pickups = S.pickups.filter(p => p.taken || p.x < left || p.x > right || p.h < o.clearance - 34);
    } else {
      for (const p of S.pickups) {
        if (p.taken || p.x < left || p.x > right) continue;
        if (p.h < o.h + 50) p.h = o.h + 70;
      }
    }
  }

  function spawnPickups() {
    const x0 = S.nextPickupX;
    const distM = S.worldX / PX_PER_M;
    // S ujetou vzdáleností ubývá energie čím dál rychleji (viz ECONOMY.drainRampDist
    // a stupňující se tempo po 5 km). Aby po 5 km nezačalo mrkví „docházet“, roste
    // úměrně i jejich přísun: fuel jde od 0 na startu k 1 od 5 km výš a přelévá
    // pravděpodobnosti i množství ve prospěch mrkví a zlatých mrkví.
    const fuel = Math.min(1, distM / 5000);
    const roll = Math.random();
    let width = 0;

    // kumulativní prahy – dál v běhu je víc mrkví i zlatých mrkví a míň prázdných
    // mincových řad, takže palivo drží krok s rychleji ubývající energií
    const tAirCarrot    = 0.30 + 0.08 * fuel;                 // vzdušné mrkve
    const tCoinArc      = tAirCarrot + 0.22 - 0.06 * fuel;    // oblouk mincí
    const tGroundCarrot = tCoinArc + 0.15 + 0.06 * fuel;      // pozemní mrkve
    const tGolden       = tGroundCarrot + 0.07 + 0.06 * fuel; // ZLATÁ MRKEV – dál v běhu častěji
    const tClover       = tGolden + 0.05;                     // čtyřlístek
    // zbytek do 1.0 = řádka pozemních mincí

    if (roll < tAirCarrot) {
      // mrkve ve vzduchu – musí se pro ně skočit; dál v běhu je jich v řadě víc
      const n = 2 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < fuel ? 1 : 0);
      const h = 95 + Math.random() * 40;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 46, h: h + i * 6 });
      width = n * 46;
    } else if (roll < tCoinArc) {
      // oblouk mincí ve vzduchu
      const n = 5;
      for (let i = 0; i < n; i++) {
        S.pickups.push({ kind: 'coin', x: x0 + i * 40, h: 60 + Math.sin(i / (n - 1) * Math.PI) * 70 });
      }
      width = n * 40;
    } else if (roll < tGroundCarrot) {
      // krátká řada mrkví na zemi (odměna zadarmo); dál v běhu delší
      const n = 2 + (Math.random() < fuel ? 1 : 0);
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 46, h: 26 });
      width = n * 46;
    } else if (roll < tGolden) {
      // ZLATÁ MRKEV – vysoko, chce to dvojskok
      S.pickups.push({ kind: 'golden', x: x0, h: 130 });
      width = 40;
    } else if (roll < tClover) {
      // ČTYŘLÍSTEK PRO ŠTĚSTÍ – vzácný, chvíli po něm platí mince dvojnásob
      S.pickups.push({ kind: 'clover', x: x0, h: 105 + Math.random() * 30 });
      width = 40;
    } else {
      // řádka mincí na zemi
      const n = 4;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'coin', x: x0 + i * 40, h: 28 });
      width = n * 40;
    }
    // kdyby řada zasahovala do už naplánované překážky, srovnat konflikty
    for (const o of S.obstacles) {
      if (!o.broken && o.x + o.w / 2 + 60 > x0 && o.x - o.w / 2 - 60 < x0 + width) resolvePickupConflicts(o);
    }
    // rozestup svačin se s ujetou vzdáleností zkracuje (až o 30 %), takže mrkví,
    // mincí i zlatých mrkví s délkou běhu spíš přibývá – přísun je neustálý a
    // roste stejně jako spotřeba energie (energie ubývá, tak ať je čím doplňovat)
    const gap = (470 + Math.random() * 430) * (1 - 0.30 * fuel);
    S.nextPickupX = x0 + width + gap;
  }

  /* =========================================================
     KARLOVA ŠKOLA BĚHU – příběhový tutoriál prvního běhu
     Jede v běžném režimu 'run' (hudba i HUD plynou dál): náhodné
     spawny jsou vypnuté, skript vkládá novinky popořadě a u každé
     svět ÚPLNĚ zastaví. Žádný časový limit – hráč si lekci v klidu
     přečte a dál se jede až po kliknutí na tlačítko Pokračovat.
     Pak škola plynule předá normální hře.
     ========================================================= */
  const FORCE_TUT = new URLSearchParams(location.search).has('tutorial');

  function makeTutorial() {
    return {
      idx: -1,             // index aktuálního kroku
      phase: 'gap',        // gap | approach | paused | cooldown
      stepStartM: 0,       // kde skončil minulý krok (m)
      scale: 1, target: 1, // časová lupa (easuje se reálným dt; 0 = stojí)
      focus: null,         // sledovaný objekt kroku (překážka / první pickup)
      bubble: null,        // text { cs, en } aktivního kroku
      bubbleA: 0,          // alfa bubliny
      gate: null,          // jaká akce novinku zdolá (jen nápověda ovládání)
    };
  }

  function spawnTutStep(step) {
    if (!step.spawn) return null;
    const x0 = S.worldX + (W - playerX()) + 140; // těsně za pravým okrajem
    if (step.spawn.flyers) {
      // kámoši z oblohy přiletí přímo do záběru lekce (mlčí – slovo má Karel)
      step.spawn.flyers.forEach((type, i) => {
        S.flyers.push({
          type,
          cx: S.worldX + (W * (0.48 + i * 0.22) - playerX()) / 0.85,
          cy: 85 + i * 60,
          r: type === 'stork' ? 75 : 48,
          w: type === 'stork' ? 0.5 : 1.1,
          ph: i * 2.1, dir: i % 2 ? -1 : 1,
          trailT: 0, dropT: 3, said: true,
        });
      });
      return null;
    }
    if (step.spawn.humans) {
      // lidští obyvatelé stojí opodál v pozadí a Karel k nim doběhne (fáze
      // approach), pak se u nich svět plynule zastaví a on je představí.
      // Nejdřív pryč s náhodnými lidmi z dekorace, ať se nikdo neukáže dvakrát –
      // na představení jsou právě a jen tihle tři, každý v jiné póze.
      S.decor = S.decor.filter(d => !d.human);
      // menší postavy na užší obrazovce, ať se všichni tři vejdou celí
      const hs = W < 620 ? 0.62 : 0.82;
      // vykreslují se v parallaxu (pozadí) – rozestup a start počítáme přes něj,
      // ať začnou těsně za pravým okrajem a plynule připlují do záběru
      const gap = (W * 0.14) / FAR_PARALLAX;
      const leadX = S.worldX + (W * 1.12 - playerX()) / FAR_PARALLAX;
      let lead = null;
      HUMAN_PROPS.forEach((prop, i) => {
        const d = {
          prop,
          x: leadX + i * gap,
          far: true, human: true, said: true,
          extra: i, s: hs,
        };
        S.decor.push(d);
        if (!lead) lead = d; // vůdčí (nejlevější) postava = focus fáze approach
      });
      return lead;
    }
    if (step.spawn.obstacle) {
      const ob = OBSTACLES.find(p => p.id === step.spawn.obstacle);
      const o = { ...ob, x: x0, y: 0, broken: false };
      const variants = BIRD_VARIANTS[o.id];
      if (variants) o.v = variants[Math.floor(Math.random() * variants.length)];
      S.obstacles.push(o);
      markObstacleSeen(o.id); // Karel je ve škole představil – po ní už se neopakují
      return o;
    }
    let first = null;
    for (const p of step.spawn.pickups) {
      const it = { kind: p.kind, x: x0 + p.dx, h: p.h };
      if (!first) first = it;
      S.pickups.push(it);
    }
    return first;
  }

  function enterPause(step) {
    const T = S.tut;
    T.phase = 'paused';
    T.target = 0;        // svět se úplně zastaví – čte se bez časového tlaku
    T.gate = step.gate;
    T.bubble = step.text;
    AUDIO.play('quote');
    // u lekce o vlaštovkách a čápech se Karel chlubí, že umí hýkat –
    // půl druhé vteřiny po zobrazení bubliny to i nahlas předvede
    if (step.id === 'flyers') setTimeout(() => AUDIO.play('bray'), 1500);
  }

  function resumeTutorial() {
    const T = S.tut;
    T.phase = 'cooldown';
    T.target = 1;
    // Karlova bublina mizí hned, jakmile hráč pokračuje – text se nedrží
    // přes celou fázi míjení, ale zhasne okamžitě s kliknutím na Pokračovat
    T.bubble = null;
    T.bubbleA = 0;
  }

  // zastavenou lekci (školu běhu i novinku na trase) rozjede jedině
  // tlačítko Pokračovat (nebo mezerník) – herní vstupy zatím nic nedělají
  function lessonPaused() {
    return (S.tut && S.tut.phase === 'paused') || (S.enc && !S.enc.done)
      || (S.special && (S.special.phase === 'intro' || S.special.phase === 'result'));
  }

  function continueLesson() {
    if (S.mode !== 'run') return false;
    if (S.tut && S.tut.phase === 'paused') {
      resumeTutorial();
      AUDIO.play('click');
      return true;
    }
    if (S.enc && !S.enc.done) {
      S.enc.done = true;
      S.enc.target = 1;
      AUDIO.play('click');
      return true;
    }
    if (S.special && S.special.phase === 'intro') {
      // koncert se rozjede na zmrazeném pódiu – target zůstává 0, ať svět stojí.
      // Nejdřív krátký odpočet „připrav se“, ať to nezačne znenadání.
      S.special.phase = 'challenge';
      S.special.leadT = CONCERT.leadDur;
      S.special.beatT = 0;
      S.special.restT = 0;
      S.special.bubble = null;
      AUDIO.play('click');
      return true;
    }
    if (S.special && S.special.phase === 'result') {
      // po koncertu chvíli neberem potvrzení (SP.gateT), ať stray ťuk z minihry
      // výsledek hned nezruší; vstup zatím spolkneme (return true = žádný skok)
      if (S.special.gateT > 0) return true;
      // hráč si přečetl výsledek koncertu – svět se zase rozjede, bublina zhasne
      const SP = S.special;
      SP.phase = 'done';
      SP.target = 1;
      SP.resultT = 1.0; // krátké doznění, pak se scéna vrátí k běžné hře
      if (SP.won) {
        // oslavu spustíme až teď, ať částice hrají za rozjezdu (ne zmrazené přes bublinu)
        floater(I18N.t('fl.concert', { n: 100 }), playerX(), groundY - S.py - 150, '#ff7ad0');
        burst(playerX(), groundY - S.py - 120, '#ffe14a', 30);
        burst(playerX(), groundY - S.py - 120, '#7ad0ff', 22);
        S.shake = 0.6;
      }
      AUDIO.play('click');
      return true;
    }
    return false;
  }

  /* ---------- Zvířecí koncert (rytmická minihra každých 2,5 km) ----------
     Místo duhových schodů nastoupí pódium: svět zmrzne, právě běžící zvířátko
     zazpívá publiku. Jezdec přejíždí časovací lištu a hráč ťuká, když je ve
     zlaté zóně – trefená nota = zvířátko spustí svůj hlas. Trefí-li dost not,
     koncert je vyprodaný (výhra): po prvním se rychlost vrací na základní, po
     každém dalším zůstává +5 % základu navíc (viz resolveSpecial). Při propadáku
     se jen zkrátí nastřádané zrychlení na polovinu. Každý další koncert je navíc
     svižnější a má užší zónu (speedupPerConcert / shrinkPerConcert). */
  const CONCERT = {
    total: 4,                 // kolik not koncert má (kratší = přehlednější)
    threshold: 3,             // kolik trefit = vyprodáno (výhra)
    leadDur: 1.8,             // odpočet „připrav se“ před první notou (s)
    beatDur: 1.7,             // doba přejezdu puntíku v 1. koncertu (s); další koncerty ji zkracují
    beatDurMin: 1.15,         // rychleji už puntík nepojede
    restDur: 0.85,            // pauza po každé notě, ať zvuk dozní a je vidět výsledek (s)
    zoneHalf: 0.14,           // půlšířka zelené zóny v 1. koncertu (0..1) – první nota je nejširší
    zoneHalfMin: 0.055,       // užší už zóna nebude, ať to jde vždycky trefit
    shrinkPerNote: 0.024,     // každá další nota zónu zúží (postupné ztížení v rámci koncertu)
    shrinkPerConcert: 0.008,  // každý další koncert (5/7,5/10 km…) začíná s užší zónou
    speedupPerConcert: 0.085, // a puntík mu jede svižněji (o tolik kratší beatDur)
  };

  // zelená zóna se postupně zmenšuje: každou další notou a každým dalším koncertem
  function concertZone(SP) {
    const half = Math.max(CONCERT.zoneHalfMin,
      CONCERT.zoneHalf - (SP.beatIdx || 0) * CONCERT.shrinkPerNote - (SP.concertIdx || 0) * CONCERT.shrinkPerConcert);
    return { lo: 0.5 - half, hi: 0.5 + half };
  }

  function currentChar() {
    return (!S.demo && S.char) ? S.char : (charById(save.selected) || CHARACTERS[0]);
  }

  function startSpecial() {
    const px = playerX();
    // pořadí koncertu (0 = první na 2,5 km) – řídí tempo noty, šířku zóny i obnovu rychlosti
    const concertIdx = Math.max(0, Math.round(S.worldX / PX_PER_M / 2500) - 1);
    // ať scéna nastoupí čistě – pryč s tím, co je ještě před hráčem
    S.obstacles = S.obstacles.filter(o => (o.x - S.worldX + px) < px);
    S.pickups = S.pickups.filter(p => (p.x - S.worldX + px) < px);
    S.milestone = null;      // ať oslavná cedule 2500 m nepřekrývá lištu koncertu
    S.special = {
      phase: 'approach',     // approach (pódium najíždí) → intro (popis) → challenge (koncert) → done
      scale: 1, target: 1,   // za jízdy se nemrazí
      bubbleA: 0,
      bubble: EVENTS.concertIntro,
      resultT: 0,
      markX: S.worldX + (W + 60) - px, // pomyslný bod pódia připlouvá zprava
      total: CONCERT.total,
      // každý další koncert jede svižněji a má užší zónu
      concertIdx,
      beatDur: Math.max(CONCERT.beatDurMin, CONCERT.beatDur - concertIdx * CONCERT.speedupPerConcert),
      beatIdx: 0,            // kolikátá nota právě běží
      beatT: 0,              // 0..beatDur průběh aktuální noty
      beatPos: 0,            // 0..1 pozice puntíku na liště
      leadT: 0,              // odpočet „připrav se“ před první notou
      restT: 0,              // pauza mezi notami, ať zvuk dozní
      hits: 0,               // trefené noty
      beats: [],             // true/false výsledky not (pro vykreslení)
      beatFlash: 0,          // krátký blik: >0 hit, <0 miss
      lastHit: null,         // jak dopadla poslední nota (pro hlášku v pauze)
      won: null,
    };
  }

  // trefení rytmu – ťuknutí za koncertu (viz jump()); bere se jen, když puntík jede
  function concertTap() {
    const SP = S.special;
    if (!SP || SP.phase !== 'challenge' || SP.leadT > 0 || SP.restT > 0) return;
    const z = concertZone(SP);
    registerBeat(SP.beatPos >= z.lo && SP.beatPos <= z.hi);
  }

  function registerBeat(hit) {
    const SP = S.special;
    SP.beats.push(hit);
    SP.lastHit = hit;
    if (hit) {
      SP.hits++;
      SP.beatFlash = 0.6;
      AUDIO.voice(currentChar().id); // zvířátko spustí svůj hlas (v pauze dozní celý)
      const nx = playerX(), ny = groundY - S.py - 120;
      floater('♪', nx + (Math.random() * 44 - 22), ny, '#ffe14a');
      burst(nx, ny, '#ffd24a', 12);
    } else {
      SP.beatFlash = -0.6;
      AUDIO.play('quote'); // tichý dud
    }
    SP.beatIdx++;
    SP.beatT = 0;
    SP.beatPos = 0;
    SP.restT = CONCERT.restDur; // pauza – zvuk dozní, hráč vidí výsledek, pak přijde další nota
  }

  // tiká reálným (neškálovaným) dt – volá se před škálováním, jako updateEncounter
  function updateSpecial(dt) {
    const SP = S.special;
    const px = playerX();
    const k = SP.target < SP.scale ? ENC.easeIn : ENC.easeOut;
    SP.scale += (SP.target - SP.scale) * Math.min(1, dt * k);
    if (SP.target === 0 && SP.scale < 0.02) SP.scale = 0;
    SP.bubbleA += (((SP.phase === 'intro' || SP.phase === 'result') ? 1 : 0) - SP.bubbleA) * Math.min(1, dt * 8);
    if (SP.phase === 'result' && SP.gateT > 0) SP.gateT = Math.max(0, SP.gateT - dt);
    if (SP.beatFlash > 0) SP.beatFlash = Math.max(0, SP.beatFlash - dt);
    else if (SP.beatFlash < 0) SP.beatFlash = Math.min(0, SP.beatFlash + dt);

    if (SP.phase === 'approach') {
      // pódium klidně připluje; jakmile dorazí ke středu, svět zmrzne a naběhne popis
      if ((SP.markX - S.worldX + px) <= px + 40) {
        SP.phase = 'intro';
        SP.target = 0; // teď se svět zmrazí (ease-out) a naběhne bublina
        AUDIO.play('quote');
      }
      return;
    }
    if (SP.phase === 'challenge') {
      if (SP.leadT > 0) {
        // odpočet „připrav se“ – puntík ještě nejede, ať se hráč zorientuje
        const before = Math.ceil(SP.leadT / 0.6);
        SP.leadT -= dt;
        const after = Math.ceil(SP.leadT / 0.6);
        if (SP.leadT <= 0) AUDIO.play('carrot');       // cinknutí „začínáme“
        else if (after < before) AUDIO.play('click');  // tik odpočtu
        return;
      }
      if (SP.restT > 0) {
        // pauza mezi notami – zvuk dozní a je vidět výsledek, pak další nota (nebo konec)
        SP.restT -= dt;
        if (SP.restT <= 0 && SP.beatIdx >= SP.total) resolveSpecial(SP.hits >= CONCERT.threshold);
        return;
      }
      // puntík přejíždí lištu; když nikdo nestihne ťuknout, nota propadne (miss)
      SP.beatT += dt;
      SP.beatPos = Math.min(1, SP.beatT / SP.beatDur);
      if (SP.beatT >= SP.beatDur) registerBeat(false);
    } else if (SP.phase === 'done') {
      SP.resultT -= dt;
      if (SP.resultT <= 0) S.special = null;
    }
  }

  // aktuální strmost rychlostní rampy (px/s za metr) – každých 5 km přitvrdí;
  // jedno místo pravdy pro update smyčku i přepočty kotvy po koncertu
  function rampRateNow() {
    const tier = Math.min(4, Math.floor((S.worldX / PX_PER_M) / 5000));
    return 0.15 + tier * 0.05;
  }

  function resolveSpecial(win) {
    const SP = S.special;
    // výsledek koncertu: svět zůstane zmrazený a zvířátko v bublině řekne, jak
    // koncert dopadl a co dostalo. Dál se rozběhne až po ťuknutí na Pokračovat
    // (jako v tutoriálu) – hláška se tak nestihne ztratit dřív, než ji hráč přečte.
    SP.phase = 'result';
    SP.won = win;
    SP.target = 0; // svět stojí, dokud hráč nepotvrdí
    // krátká pojistka: hráč u minihry zběsile ťuká, a tlačítko Pokračovat
    // vyskočí přesně tam, kam ťuká – bez téhle prodlevy by ho stray ťuk hned
    // zmáčkl a výsledek by problikl. Tlačítko se proto ukáže a potvrzení začne
    // brát až po gateT (viz syncContinueBtn a continueLesson).
    SP.gateT = 0.7;
    const base = S.baseSpeed * (S.stats?.speed || 1);
    const extra = Math.max(0, S.speed - base); // nastřádané zrychlení nad základ
    if (win) {
      // vyprodáno – zvířátko chytí dech; první koncert vrací rychlost úplně na
      // základ, každý další už nechává +5 % základu navíc (kumulativně), ať se
      // běh nedá natahovat donekonečna
      const residual = base * 0.05 * (SP.concertIdx || 0);
      S.speedAnchorX = S.worldX - (residual / rampRateNow()) * PX_PER_M;
      S.energy = 100;
      S.ramLeft = S.stats?.ram || 0; // Yakulovi se doplní i náboje beranidla
      S.coinsRun += ECONOMY.concertCoins;
      SP.bubble = pickOne(EVENTS.concertWin);
      AUDIO.play('golden');
    } else {
      // propadák – rychlost se nevynuluje, jen se nastřádané zrychlení zkrátí na půl
      const keep = extra * 0.5;
      S.speedAnchorX = S.worldX - (keep / rampRateNow()) * PX_PER_M;
      SP.bubble = pickOne(EVENTS.concertMiss);
      AUDIO.play('laugh');
    }
    // běžné spawnery se znovu nahodí kus za obrazovkou
    S.nextObstacleX = S.worldX + W + 600;
    S.nextPickupX = S.worldX + W + 350;
  }

  // DOM tlačítko Pokračovat se ukazuje jen po dobu zastavené lekce
  let contBtn = null;
  function syncContinueBtn() {
    if (!contBtn) contBtn = document.getElementById('btn-tut-continue');
    // po koncertu tlačítko chvíli schováme (gateT), ať ho ťukání z minihry
    // omylem hned nezmáčkne – svět je i tak zmrazený a hláška zatím naběhne
    const gated = S.special && S.special.phase === 'result' && S.special.gateT > 0;
    const show = S.mode === 'run' && lessonPaused() && !gated;
    if (contBtn.hidden !== !show) contBtn.hidden = !show;
  }

  // obrazovkové X sledovaného objektu – lidé stojí v pozadí (parallax),
  // překážky a pickupy v popředí
  function focusScreenX(f, px) {
    return f.human ? (f.x - S.worldX) * FAR_PARALLAX + px : (f.x - S.worldX + px);
  }

  // Na úzkém displeji zastavíme novinku víc vpravo, ať po kliknutí na
  // Pokračovat zbývá delší dráha (= víc času), než doběhne k běžci.
  // Na širokém plátně zůstává původní hodnota (TUTORIAL.triggerX).
  function tutTriggerX() {
    const t = Math.max(0, Math.min(1, (760 - W) / (760 - 420)));
    return TUTORIAL.triggerX + t * (0.82 - TUTORIAL.triggerX);
  }

  // tiká reálným (neškálovaným) dt – zastavený svět nesmí zastavit i skript
  function updateTutorial(dt) {
    const T = S.tut;
    const px = playerX();
    const k = T.target < T.scale ? TUTORIAL.easeIn : TUTORIAL.easeOut;
    T.scale += (T.target - T.scale) * Math.min(1, dt * k);
    if (T.target === 0 && T.scale < 0.02) T.scale = 0; // opravdové zastavení
    T.bubbleA += ((T.bubble ? 1 : 0) - T.bubbleA) * Math.min(1, dt * 8);

    const distM = S.worldX / PX_PER_M;

    if (T.phase === 'gap') {
      const next = TUTORIAL.steps[T.idx + 1];
      if (!next) { finishTutorial(); return; }
      if (distM < T.stepStartM + next.gapM) return;
      T.idx++;
      T.focus = spawnTutStep(next);
      if (T.focus) T.phase = 'approach';
      else enterPause(next);
    } else if (T.phase === 'approach') {
      const sx = focusScreenX(T.focus, px);
      // lidi Karel dobíhá dál, ať zastaví s odstupem a bublina nezakrývá Tomáše
      const trig = T.focus.human ? 0.64 : tutTriggerX();
      if (sx < W * trig) enterPause(TUTORIAL.steps[T.idx]);
    } else if (T.phase === 'cooldown') {
      const passed = !T.focus
        || T.focus.taken || T.focus.broken
        || focusScreenX(T.focus, px) < px - 90;
      if (T.scale > 0.9 && passed) {
        const step = TUTORIAL.steps[T.idx];
        // hráč novinku minul a Karel u ní něco slíbil (zlatá mrkev: smích)
        if (step.miss && T.focus && !T.focus.taken && !T.focus.broken) {
          S.bubble = I18N.pick(step.miss);
          S.bubbleT = 4.2;
          AUDIO.play('laugh');
        }
        T.phase = 'gap';
        T.stepStartM = distM;
        T.bubble = null;
        T.focus = null;
      }
    }
    // fáze 'paused' nedělá nic – čeká na tlačítko Pokračovat
  }

  function finishTutorial() {
    // předání normální hře – spawnery se nahodí kus za obrazovkou
    S.nextObstacleX = S.worldX + W + 600;
    S.nextPickupX = S.worldX + W + 350;
    save.tutorialDone = true;
    persist();
    toastAchievements(syncAchievements()); // odznak za dokončení školy běhu
    S.tut = null;
    // ostrý běh začíná s plnou energií – škola běhu není test výdrže
    S.energy = 100;
    S.saidLowEnergy = false;
    S.nextQuoteAt = 12 + Math.random() * 6; // běžné hlášky až po chvilce
  }

  /* =========================================================
     NOVINKY NA TRASE – první setkání s každým druhem překážky
     Když se v běhu poprvé objeví něco nového (husa, včely, trakař…),
     svět se úplně zastaví jako ve škole běhu, běžec novinku
     okomentuje a dál se jede až po kliknutí na Pokračovat.
     Poznané druhy si hra pamatuje v uloženém postupu, takže
     každé představení proběhne jen jednou.
     ========================================================= */
  const ENC = {
    easeIn: 5, easeOut: 9,
    triggerX: 0.8,    // zastaví se dřív než tutoriál – v rychlé fázi hry ať zbyde čas reagovat
  };

  function markObstacleSeen(id) {
    if (!save.seenObstacles) save.seenObstacles = [];
    if (!save.seenObstacles.includes(id)) save.seenObstacles.push(id);
  }

  // při spawnu: druh, který hráč ještě nikdy nepotkal, dostane vlaječku
  function maybeFlagIntro(o) {
    if (!o.intro) return;
    if ((save.seenObstacles || []).includes(o.id) || S.introFlagged.has(o.id)) return;
    S.introFlagged.add(o.id);
    o.isNew = true;
  }

  function startEncounter(o) {
    o.isNew = false;
    markObstacleSeen(o.id);
    persist();
    S.enc = {
      o,
      scale: 1, target: 0,  // svět stojí, dokud hráč neklikne na Pokračovat
      bubbleA: 0,
      gate: o.type,         // jaká akce novinku zdolá (nápověda ovládání)
      done: false,
    };
    AUDIO.play('quote');
  }

  // hlídka: jakmile nový druh dojede do záběru, spustí se představení
  function checkEncounters() {
    if (S.tut || S.enc) return;
    const px = playerX();
    for (const o of S.obstacles) {
      if (!o.isNew || o.broken) continue;
      const sx = o.x - S.worldX + px;
      if (sx < px + 140) { o.isNew = false; continue; } // prošvihnuto – zkusí se v dalším běhu
      if (sx < W * ENC.triggerX) { startEncounter(o); break; }
    }
  }

  // tiká reálným (neškálovaným) dt – stejně jako škola běhu
  function updateEncounter(dt) {
    const E = S.enc;
    const k = E.target < E.scale ? ENC.easeIn : ENC.easeOut;
    E.scale += (E.target - E.scale) * Math.min(1, dt * k);
    if (E.target === 0 && E.scale < 0.02) E.scale = 0; // opravdové zastavení
    if (E.o.broken && !E.done) { E.done = true; E.target = 1; } // beranidlo apod.
    // bublina svítí při čtení i při míjení novinky, pak zhasne
    const passed = E.o.broken || (E.o.x - S.worldX + playerX()) < playerX() - 90;
    E.bubbleA += (((E.done && passed) ? 0 : 1) - E.bubbleA) * Math.min(1, dt * 8);
    if (E.done && passed && E.scale > 0.95 && E.bubbleA < 0.05) S.enc = null;
  }

  // malé kytičky apod. smí do popředí; všechno velké patří dozadu,
  // aby se nepletlo s překážkami na pěšině
  const NEAR_PROPS = new Set(['flower', 'mushroom', 'stump', 'basket', 'gnome', 'campfire']);

  // figurální kulisy (postavy a zvířata) – stejně jako lidé se nesmí objevit
  // dvakrát v jednom záběru; obyčejné rostliny/stavby se opakovat můžou
  const FIGURE_PROPS = new Set(['cowboy', 'cheersquad', 'grazingcow', 'catnap', 'scarecrow', 'gnome',
                                'grazingsheep', 'chickens', 'deer', 'geese']);

  // lidští obyvatelé Louky – objevují se vzácně a střídají se
  const HUMAN_PROPS = Object.keys(HUMANS);
  let humanIdx = Math.floor(Math.random() * HUMAN_PROPS.length);
  let lastDecorProp = null; // ať se stejná rekvizita/postava neobjeví hned vedle sebe

  // prostředí v místě, kde dekorace vznikne (kvůli póze i noční ospalosti)
  function envIdxAt(worldX) {
    const distM = Math.max(0, worldX) / PX_PER_M;
    return ((Math.floor(distM / ENV_LEN_M) % ENVS.length) + ENVS.length) % ENVS.length;
  }

  function spawnDecor() {
    // občas u pěšiny fandí někdo z lidí, co se o azyl starají
    // (ve škole běhu ne – ty tři představí Karel sám, ať se nepletou dvakrát)
    if (!S.tut && Math.random() < 0.13) {
      // v noci ospalá póza (3), přes den se střídají tři pracovní pózy (0–2)
      const night = ENVS[envIdxAt(S.nextDecorX)].night;
      // každý člověk je jedinečný obyvatel – stejná postava se nikdy nesmí
      // objevit dvakrát v jednom záběru. Přeskoč proto ty, kdo jsou zrovna
      // ještě ve scéně (i ti právě zařazení kousek před obrazovkou).
      const onScene = new Set(S.decor.filter(d => d.human).map(d => d.prop));
      let hp = null;
      for (let tries = 0; tries < HUMAN_PROPS.length; tries++) {
        const cand = HUMAN_PROPS[humanIdx++ % HUMAN_PROPS.length];
        if (!onScene.has(cand)) { hp = cand; break; }
      }
      // všichni tři už ve scéně jsou – tentokrát člověka vynech, ať se nikdo nezdvojí
      if (hp) {
        S.decor.push({
          prop: hp,
          x: S.nextDecorX,
          far: true,
          human: true,
          said: false,
          extra: night ? 3 : Math.floor(Math.random() * 3),
          s: 0.8 + Math.random() * 0.15,
        });
        lastDecorProp = hp;
      }
      S.nextDecorX += 640 + Math.random() * 620;
      return;
    }
    const env = currentEnv().env;
    const props = env.props;
    // figura, která je ještě ve scéně (i těsně před obrazovkou), se nesmí
    // zdvojit; a žádná rekvizita se neobjeví hned vedle té samé předchozí
    const figuresOnScene = new Set(S.decor.filter(d => FIGURE_PROPS.has(d.prop)).map(d => d.prop));
    let pool = props.filter(pp => pp !== lastDecorProp && !(FIGURE_PROPS.has(pp) && figuresOnScene.has(pp)));
    if (!pool.length) pool = props.filter(pp => !(FIGURE_PROPS.has(pp) && figuresOnScene.has(pp)));
    if (!pool.length) { S.nextDecorX += 460 + Math.random() * 640; return; } // vše blokováno – spawn vynech
    const p = pool[Math.floor(Math.random() * pool.length)];
    lastDecorProp = p;
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
      // hlášky letců (ptáků) jsou vypnuté – na malém displeji zbytečně
      // překážely ve výhledu; mluví jen sám běžec
      if (!f.said && running && f.sx > W * 0.85) f.said = true;
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
    S.bubbleT = 3.0; // kratší zobrazení, ať hláška méně překáží
    AUDIO.play('quote');
  }
  // hlášky jsou dvojjazyčné objekty { cs, en } – vybere náhodnou v aktuálním jazyce
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
  function randomQuote(list) { return I18N.pick(pickOne(list)); }

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

    // Karlova škola běhu – při lekci se svět úplně zastaví (hudba je
    // na dt nezávislá, hraje dál); vlastní logika tutoriálu ale
    // tiká reálným dt, proto se volá před škálováním
    if (S.tut && running) {
      updateTutorial(dt);
      if (S.tut) dt *= S.tut.scale;
    }

    // novinka na trase zastavuje čas stejným způsobem jako škola běhu
    if (S.enc && running && !S.tut) {
      updateEncounter(dt);
      if (S.enc) dt *= S.enc.scale;
    }

    // koncert: během popisu i samotné rytmické výzvy je svět zmrazený (jen pódium)
    if (S.special && running && !S.tut) {
      updateSpecial(dt);
      if (S.special && (S.special.phase === 'intro' || S.special.phase === 'challenge' || S.special.phase === 'result')) dt *= S.special.scale;
    }

    // tlačítko Pokračovat svítí přesně po dobu zastavené lekce
    syncContinueBtn();

    const spd = (S.demo ? S.baseSpeed * 0.8 : S.speed) * (running ? dev.speed : 1) * worldSpeedScale();

    // zrychlování – pozvolné, ať má hráč šanci doběhnout opravdu daleko;
    // rozjezd se měří od kotvy speedAnchorX (po výhře v koncertu se resetuje = běží zas pomalu)
    if (running) {
      // s přibývající vzdáleností se běh stupňuje: každých 5 km (5/10/15 km…)
      // přitvrdí – strmější náběh rychlosti i vyšší strop, ať je konec běhu výzva
      const tier = Math.min(4, Math.floor((S.worldX / PX_PER_M) / 5000)); // 0,1,2,3,4 (od 20 km výš stejné)
      const speedCap = 620 + tier * 90;       // vyšší strop, ať je pořád co zrychlovat
      S.speed = Math.min(S.baseSpeed * S.stats.speed + ((S.worldX - S.speedAnchorX) / PX_PER_M) * rampRateNow(), speedCap);
      // pódium koncertu nejdřív klidně vjede do záběru (approach), pak svět zmrzne
      if (S.special && S.special.phase === 'approach') {
        S.speed = Math.min(S.speed, 320);
      }
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
    if (running && !S.special) {
      while (S.nextObstacleX < S.worldX + W + 300) spawnObstacle();
      while (S.nextPickupX < S.worldX + W + 300) spawnPickups();
      checkEncounters();
    }

    // Zvířecí koncert každých 2,5 km – zvířátko se zastaví na pódiu a zazpívá
    if (running && !S.tut && !S.enc && !S.special && !S.airborne) {
      const distM2 = Math.floor(S.worldX / PX_PER_M);
      if (distM2 >= S.lastSpecial + 2500) {
        S.lastSpecial = Math.floor(distM2 / 2500) * 2500;
        startSpecial();
      }
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
      // odčerpávání sílí s tempem i vzdáleností, ale člen za vzdálenost se
      // zastropuje – jinak by po 5 km energie padala tak rychle, že ji přísun
      // mrkví nedožene. Se zastropovaným poklesem drží běh naživu dovednost
      // (uhýbání a sbírání), ne nedostatek paliva.
      const distRamp = Math.min(2, distM / ECONOMY.drainRampDist);
      const ramp = 1 + speedFactor * 0.45 + distRamp;
      // God Mode (vývojářský režim): energie nikdy neubývá, běh se nedá ukončit
      if (dev.god) {
        S.energy = 100;
      } else {
        // ve škole běhu ubývá energie poloviční rychlostí a nikdy neklesne
        // pod rezervu – lekce není test výdrže a nedá se při ní umřít
        S.energy -= ECONOMY.drainPerSecond * S.stats.drain * ramp * dt * (S.tut ? 0.5 : 1);
        if (S.tut) S.energy = Math.max(S.energy, 15);
        if (S.energy <= 25 && !S.saidLowEnergy) {
          S.saidLowEnergy = true;
          sayBubble(randomQuote(EVENTS.lowEnergy));
        }
        if (S.energy > 35) S.saidLowEnergy = false;
        if (S.energy <= 0) { S.energy = 0; endRun(); return; }
      }

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
    if (S.milestone) { S.milestone.t += dt; if (S.milestone.t >= S.milestone.dur) S.milestone = null; }

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
          const gGain = Math.round(ECONOMY.goldenCarrotEnergy * (S.stats.goldenBonus || 1));
          S.energy = Math.min(100, S.energy + gGain);
          floater(I18N.t('fl.golden', { n: gGain }), sx, sy - 24, '#ffce3a');
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

    // God Mode: zvířátko projde vším bez úhony
    if (S.invuln > 0 || dev.god) return;
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
      } else if (o.id === 'flock') {
        burst(sx, groundY - 90, '#55524c', 18); // tmavá pírka rozprášeného hejna
        floater(randomQuote(EVENTS.flock), sx, groundY - 160, '#e5533a');
      }
      // s ujetou vzdáleností přituhuje: každých 5 km bolí náraz do jakékoli
      // překážky o 5 % víc (viz ECONOMY.hitRampDist/hitRampStep, bez stropu)
      const hitRamp = 1 + ECONOMY.hitRampStep * Math.floor((S.worldX / PX_PER_M) / ECONOMY.hitRampDist);
      const penalty = Math.round((o.soft ? 8 : ECONOMY.hitPenalty) * (S.stats.hitFactor || 1) * hitRamp);
      // ve škole běhu drží energie rezervu – klopýtnutí nesmí běh ukončit
      S.energy = Math.max(S.tut ? 15 : 0, S.energy - penalty);
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
    // během školy běhu mluví Karel jen lekce – náhodné hlášky počkají;
    // totéž platí, dokud běžec představuje novinku na trase
    if (S.tut || S.enc || S.special) { S.nextQuoteAt = Math.max(S.nextQuoteAt, 2); return; }
    S.nextQuoteAt -= dt;
    if (S.nextQuoteAt <= 0 && S.bubbleT <= 0) {
      sayBubble(randomQuote(S.char.quotes));
      S.nextQuoteAt = 16 + Math.random() * 10;
    }
    const dist = Math.floor(S.worldX / PX_PER_M);
    if (dist - S.lastMilestone >= 500) {
      S.lastMilestone = Math.floor(dist / 500) * 500;
      // krátká oslavná cedule nahoře uprostřed – hráč si jí všimne, ale
      // nepřekáží Karlovým bublinám dole a rychle zmizí. Koncert (na 2,5 km
      // = násobek 500) má přednost, jinak by cedule překryla jeho lištu.
      if (!S.special) S.milestone = { m: S.lastMilestone, t: 0, dur: 2.2, quote: randomQuote(EVENTS.milestone) };
    }
  }

  // lidé v pozadí na běžce vesele zavolají, když kolem nich probíhá
  const lastHumanQuote = {}; // aby nikdo neopakoval stejnou hlášku dvakrát po sobě
  function humanQuotes() {
    // Hlášky lidí v pozadí (Tomáš, Tony, Maruška) jsou vypnuté – během běhu
    // jich bylo moc a na malém displeji překážely. Mluví jen sám běžec.
    return;
    // eslint-disable-next-line no-unreachable
    // ve škole běhu má slovo jen Karel – lidé zafandí až po ní;
    // a do představování novinky ani k vznešenému květu jim nic není
    if (S.tut || S.enc || S.special) return;
    const px = playerX();
    for (const d of S.decor) {
      if (!d.human || d.said) continue;
      const sx = (d.x - S.worldX) * FAR_PARALLAX + px;
      if (sx > W * 0.3 && sx < W * 0.85) {
        d.said = true;
        // hláška trefná pro aktuální prostředí (70 %), jinak obecná
        const data = HUMANS[d.prop];
        const envLines = data[currentEnv().env.id];
        const pool = (envLines && envLines.length && Math.random() < 0.7) ? envLines : data.any;
        let qi = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && pool[qi] === lastHumanQuote[d.prop]) qi = (qi + 1) % pool.length;
        lastHumanQuote[d.prop] = pool[qi];
        S.sideBubbles.push({ txt: I18N.pick(pool[qi]), t: 0, dur: 4, decor: d });
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
      ctx.globalAlpha = d.human ? 0.95
        : (d.prop === 'signpost' || d.prop === 'cowboy' || d.prop === 'farmhouse' || d.prop === 'cheersquad') ? 0.85
        : (d.prop === 'grazingcow' || d.prop === 'grazingsheep' || d.prop === 'chickens'
           || d.prop === 'deer' || d.prop === 'geese') ? 0.72 : 0.62;
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
      // stín hráče (v demu na malém displeji se zvířátko i stín zmenšují)
      const ds = demoScale();
      const shScale = Math.max(0.4, 1 - S.py / 400) * ds;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      GFX.ell(ctx, px, groundY + 6, 44 * shScale, 8 * shScale);
      ctx.fill();

      // hráč – v menu a obchodě běhá vždy právě vybrané zvířátko,
      // během běhu (a na kartě po doběhnutí) drží postava z běhu
      const ch = (!S.demo && S.char) ? S.char : (charById(save.selected) || CHARACTERS[0]);
      const flash = S.invuln > 0 && Math.floor(S.t / 80) % 2 === 0;
      if (!flash) {
        GFX.drawCharacter(ctx, ch, px, groundY - S.py, ds, {
          runPhase: S.runPhase,
          airborne: S.airborne,
          sliding: S.sliding > 0,
          stumble: S.stumble,
          squash: S.squash,
          blink: S.blink > 0,
        }, S.t);
      }
    }

    // zvýraznění novinky ve zpomaleném čase – oko hráče hned ví, kam koukat
    if (S.tut && S.tut.focus && !S.tut.focus.human && !S.tut.focus.taken && !S.tut.focus.broken && S.tut.scale < 0.8) {
      drawFocusRing(S.tut.focus, S.tut.scale, px);
    }
    if (S.enc && !S.enc.o.broken && S.enc.scale < 0.8) {
      drawFocusRing(S.enc.o, S.enc.scale, px);
    }

    // pódium a časovací lišta koncertu (kreslí se přes zmrazenou scénu)
    if (S.special && S.special.phase === 'challenge') {
      drawConcert(S.special, px);
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

    // BUBLINY se kreslí až úplně nakonec – nad částicemi i plovoucími čísly –
    // aby do nich nic nezasahovalo a text byl vždy čistý a čitelný.
    // (tutoriálová bublina a představení novinky mají přednost před hláškou)
    if (S.bubbleT > 0 && S.bubble && S.mode === 'run'
        && !(S.tut && S.tut.bubbleA > 0.1) && !(S.enc && S.enc.bubbleA > 0.1)
        && !(S.special && S.special.bubbleA > 0.1)
        // během hraní koncertu (přílet, popis, výzva) žádná hláška nezakrývá lištu;
        // výsledková hláška ve fázi 'done' se ukázat smí
        && !(S.special && S.special.phase !== 'done')) {
      drawBubble(px + 10, groundY - S.py - 160, S.bubble, Math.min(1, S.bubbleT * 3));
    }
    if (S.tut && S.tut.bubbleA > 0.02 && S.tut.bubble && S.mode === 'run') {
      // u představení lidí je bublina výš, ať Karel nezakrývá ty tři, o kterých mluví
      const humansStep = TUTORIAL.steps[S.tut.idx] && TUTORIAL.steps[S.tut.idx].id === 'humans';
      drawTutorialBubble(px, groundY - S.py - (humansStep ? 210 : 140), S.tut.bubble, S.tut.bubbleA,
        S.tut.phase === 'paused' || S.tut.phase === 'cooldown' ? S.tut.gate : null);
    }
    if (S.enc && S.enc.bubbleA > 0.02 && S.mode === 'run' && !S.tut) {
      drawTutorialBubble(px, groundY - S.py - 140, S.enc.o.intro, S.enc.bubbleA,
        S.enc.gate);
    }
    if (S.special && S.special.bubble && S.special.bubbleA > 0.02 && S.mode === 'run' && !S.tut) {
      drawTutorialBubble(px, groundY - S.py - 150, S.special.bubble, S.special.bubbleA, null);
    }

    // bublinky obyvatel a letců – plují se svým mluvčím;
    // dokud svítí Karlova lekce nebo představení novinky, nesmí do nich nikdo kecat
    const bigBubbleOn = (S.tut && S.tut.bubbleA > 0.1) || (S.enc && S.enc.bubbleA > 0.1)
      || !!S.special; // po celou dobu koncertu ať do lišty nikdo nekecá
    for (const b of (bigBubbleOn ? [] : S.sideBubbles)) {
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

    // oslavná cedule milníku – nahoře uprostřed, nad vším ostatním
    if (S.milestone && S.mode === 'run') drawMilestone();

    ctx.restore();

    // Karlova lekce o HUD – pulzující rámeček kolem ukazatele mrkvové energie
    if (S.tut && S.tut.idx >= 0 && TUTORIAL.steps[S.tut.idx].hud
        && S.tut.bubbleA > 0.1 && S.tut.scale < 0.8) {
      const hudEnergy = document.getElementById('hud-energy');
      if (hudEnergy) {
        const r = hudEnergy.getBoundingClientRect();
        ctx.save();
        ctx.globalAlpha = Math.max(0, (1 - S.tut.scale) * (0.5 + 0.3 * Math.sin(S.t * 0.008)));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        GFX.rr(ctx, r.left - 8, r.top - 6, r.width + 16, r.height + 12, 18);
        ctx.stroke();
        ctx.restore();
      }
    }

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

  // pulzující kroužek kolem představované novinky (škola běhu i novinky na trase)
  // oslavná cedule milníku – decentní „pop" nahoře uprostřed: hráč si všimne,
  // ale nepřekáží Karlovým bublinám dole a po ~2 s sama zmizí
  function drawMilestone() {
    const ms = S.milestone;
    const t = ms.t, dur = ms.dur;
    const inP = Math.min(1, t / 0.3);                                   // náběh
    const outP = Math.max(0, 1 - Math.max(0, t - (dur - 0.55)) / 0.55); // dozvuk
    const alpha = Math.min(inP, outP);
    if (alpha <= 0.001) return;
    // easeOutBack – při náběhu lehce přestřelí a usadí se
    const k = inP - 1, sB = 1.9;
    const eob = 1 + (sB + 1) * k * k * k + sB * k * k;
    const scale = 0.82 + eob * 0.18;
    const rise = (1 - outP) * -16; // ke konci lehce vypluje vzhůru

    const label = '🏅 ' + ms.m + ' m';
    const cheer = I18N.pick(ms.quote);

    ctx.save();
    ctx.globalAlpha = alpha;
    // nikdy ne výš než pod HUD (na nízkém telefonu na šířku), jinak ~čtvrtina výšky
    ctx.translate(W / 2, Math.max(H * 0.26, 128) + rise);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';

    ctx.font = '800 26px "Baloo 2", sans-serif';
    const lw = ctx.measureText(label).width;
    ctx.font = '700 14px "Baloo 2", sans-serif';
    const cw = ctx.measureText(cheer).width;
    const w = Math.min(Math.max(lw, cw) + 40, W - 24);
    const h = 66;

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    GFX.rr(ctx, -w / 2 + 3, -h / 2 + 5, w, h, 17); ctx.fill();
    ctx.fillStyle = '#ffcf4d'; // teplý okraj jako medaile
    GFX.rr(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 20); ctx.fill();
    ctx.fillStyle = '#ffffff';
    GFX.rr(ctx, -w / 2, -h / 2, w, h, 17); ctx.fill();

    ctx.font = '800 26px "Baloo 2", sans-serif';
    ctx.fillStyle = '#e0872a';
    ctx.fillText(label, 0, -3);
    ctx.font = '700 14px "Baloo 2", sans-serif';
    ctx.fillStyle = '#6b6560';
    ctx.fillText(cheer, 0, 19);
    ctx.restore();
  }

  // pódium Zvířecího koncertu: reflektor, mikrofon a časovací lišta se zlatou zónou
  function drawConcert(SP, px) {
    const cx = W / 2;
    const fade = SP.phase === 'done' ? Math.max(0, Math.min(1, SP.resultT / 1.2)) : 1;
    ctx.save();
    ctx.globalAlpha = fade;

    // jemné ztmavení scény, ať pódium vynikne
    ctx.fillStyle = 'rgba(20, 12, 30, 0.28)';
    ctx.fillRect(0, 0, W, H);

    // reflektor shora na zpěváka
    const spotY = groundY - S.py;
    const g = ctx.createLinearGradient(px, 0, px, spotY);
    g.addColorStop(0, 'rgba(255,240,180,0.30)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px - 16, 0); ctx.lineTo(px + 16, 0);
    ctx.lineTo(px + 122, spotY); ctx.lineTo(px - 122, spotY);
    ctx.closePath(); ctx.fill();

    // mikrofon před zpěvákem
    const mx = px + 76, my = groundY;
    ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 96); ctx.stroke();
    ctx.fillStyle = '#22202a';
    ctx.beginPath(); ctx.ellipse(mx, my - 104, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a4652';
    ctx.beginPath(); ctx.ellipse(mx, my - 108, 8, 10, 0, 0, Math.PI * 2); ctx.fill();

    // časovací lišta – větší a jasnější, ať je vidět i na telefonu
    const bw = Math.min(W * 0.68, 470), bh = 34;
    const bx = cx - bw / 2, by = Math.max(84, groundY - S.py - 252);
    const running = SP.leadT <= 0; // puntík už jede

    // zbývající noty nad lištou: trefené (žlutá) / miny (červená) / čeká (bílá)
    const ny = by - 34, nr = 11, gap = 30;
    const startX = cx - ((SP.total - 1) * gap) / 2;
    for (let i = 0; i < SP.total; i++) {
      const nx = startX + i * gap;
      ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      if (i < SP.beats.length) ctx.fillStyle = SP.beats[i] ? '#ffe14a' : 'rgba(255,120,120,0.85)';
      else if (i === SP.beatIdx && running) ctx.fillStyle = 'rgba(255,255,255,0.98)';
      else ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
    }

    // podklad lišty
    GFX.rr(ctx, bx, by, bw, bh, 15);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    // ZELENÁ zóna – postupně se zužuje (viz concertZone)
    const zone = concertZone(SP);
    const zx = bx + bw * zone.lo, zw = bw * (zone.hi - zone.lo);
    GFX.rr(ctx, zx, by, zw, bh, 10);
    ctx.fillStyle = SP.beatFlash > 0 ? 'rgba(150,255,160,0.98)' : 'rgba(110,215,120,0.82)'; ctx.fill();
    // šipka nad zónou – „ťukni tady“
    const zcx = zx + zw / 2;
    ctx.fillStyle = '#8ff0a0';
    ctx.beginPath(); ctx.moveTo(zcx - 11, by - 7); ctx.lineTo(zcx + 11, by - 7); ctx.lineTo(zcx, by + 5); ctx.closePath(); ctx.fill();
    // obrys
    GFX.rr(ctx, bx, by, bw, bh, 15);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    // puntík (jen když už jede)
    if (running) {
      const jx = bx + bw * SP.beatPos, jy = by + bh / 2;
      ctx.fillStyle = SP.beatFlash < 0 ? '#ff6b6b' : '#ffffff';
      ctx.beginPath(); ctx.arc(jx, jy, bh * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
    }

    // hláška pod lištou: odpočet / instrukce / výsledek noty / konec
    let msg = null, col = '#ffffff';
    if (SP.phase === 'done') { msg = SP.won ? 'VYPRODÁNO! 🎉' : 'Zkus to příště! 🎵'; col = SP.won ? '#ffe14a' : '#ffd0d0'; }
    else if (SP.leadT > 0) { msg = 'PŘIPRAV SE… ' + Math.ceil(SP.leadT / 0.6); col = '#ffe14a'; }
    else if (SP.restT > 0) { msg = SP.lastHit ? 'Trefa! 🎶' : 'Vedle!'; col = SP.lastHit ? '#8ff0a0' : '#ff9a9a'; }
    else { msg = 'Ťukni, když je puntík v ZELENÉ!'; }
    if (msg) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px "Baloo 2", sans-serif';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      const ty = by + bh + 44;
      ctx.strokeText(msg, cx, ty);
      ctx.fillStyle = col; ctx.fillText(msg, cx, ty);
    }
    ctx.restore();
  }

  function drawFocusRing(f, scale, px) {
    // cíl může být během představení až za pravým krajem (Duhový květ) –
    // prstenec přidržíme u kraje, ať hráč pořád vidí, kam se dívat
    const fx = Math.min(f.x - S.worldX + px, W - 44);
    const isPickup = f.kind !== undefined;
    const fy = isPickup
      ? groundY - f.h
      : (f.flying ? groundY - f.clearance - f.h / 2 : groundY - f.h / 2);
    const r = (isPickup ? 34 : Math.max(f.w, f.h) * 0.7) + Math.sin(S.t * 0.008) * 4;
    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - scale) * (0.5 + 0.3 * Math.sin(S.t * 0.008)));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBubble(x, y, text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // menší a plošší bublina, ať na malém displeji nepřekáží ve výhledu
    ctx.font = '700 19px "Baloo 2", sans-serif';
    const w = Math.min(ctx.measureText(text).width + 32, W - 40);
    const bx = Math.min(Math.max(x - w / 2, 10), W - w - 10);
    const by = y - 52;
    // ostrý stín posunutou siluetou místo shadowBlur – rychlejší a bublina se nechvěje
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    GFX.rr(ctx, bx + 2, by + 3, w, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    GFX.rr(ctx, bx, by, w, 42, 21);
    ctx.fill();
    // ocásek bubliny
    ctx.beginPath();
    ctx.moveTo(x - 6, by + 41); ctx.lineTo(x + 10, by + 41); ctx.lineTo(x, by + 57);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3230';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + w / 2, by + 28, w - 22);
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

  // velká vyprávěcí bublina Karlovy školy běhu – víceřádková, text se
  // vybírá až při kreslení (přepnutí jazyka se projeví okamžitě),
  // pod ní pulzuje nápověda, dokud se čeká na hráčovu akci
  function drawTutorialBubble(ax, ay, textObj, alpha, gate) {
    ctx.save();
    ctx.globalAlpha = alpha;
    // u delších hlášek písmo nepatrně zmenšíme, ať bublina nevyroste přes celou scénu
    const raw = I18N.pick(textObj);
    const long = raw.length > 130;
    const fs = long ? 19 : 22;
    const lineH = long ? 24 : 27;
    ctx.font = `700 ${fs}px "Baloo 2", sans-serif`;
    const lines = wrapLines(raw, Math.min(360, W * 0.5));
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
    const w = tw + 36;
    const h = lines.length * lineH + 22;
    const bx = Math.min(Math.max(ax - w / 2, 12), W - w - 12);
    // bublina nesmí zajet pod HUD – horní mez je spodní hrana ukazatelů
    const hudEl = document.getElementById('hud');
    const topSafe = (hudEl && hudEl.classList.contains('visible')
      ? hudEl.getBoundingClientRect().bottom : 0) + 10;
    const by = Math.max(ay - h - 16, topSafe);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    GFX.rr(ctx, bx + 3, by + 4, w, h, 18); ctx.fill();
    ctx.fillStyle = '#ffffff';
    GFX.rr(ctx, bx, by, w, h, 18); ctx.fill();
    // ocásek – špička míří na mluvčího
    const tipX = Math.min(Math.max(ax, bx + 14), bx + w - 14);
    const baseX = Math.min(Math.max(tipX, bx + 24), bx + w - 24);
    ctx.beginPath();
    ctx.moveTo(baseX - 9, by + h - 1);
    ctx.lineTo(baseX + 10, by + h - 1);
    ctx.lineTo(tipX, by + h + 14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3230';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 28 + i * lineH));
    if (gate === 'jump' || gate === 'duck') {
      // nápověda ovládání u akční novinky – hlavní tlačítko Pokračovat je
      // DOM prvek dole uprostřed, tady jen připomínka, čím se novinka zdolá
      ctx.font = '700 17px "Baloo 2", sans-serif';
      ctx.globalAlpha = alpha * (0.6 + 0.3 * Math.sin(S.t * 0.006));
      const hint = I18N.t('tut.hint.' + gate);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeText(hint, bx + w / 2, by + h + 34);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hint, bx + w / 2, by + h + 34);
    }
    ctx.restore();
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
    ctx.fillStyle = '#ffffff';
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
  const screens = ['menu', 'shop', 'over', 'pause', 'dev', 'ach'];

  function showScreen(name) {
    for (const s of screens) $(`screen-${s}`).classList.toggle('visible', s === name);
    $('hud').classList.toggle('visible', name === null);
    if (name === 'menu') AUDIO.playMusic('menu');
    measureMenuPanel();
  }

  function updateHud(full) {
    $('hud-energy-fill').style.width = Math.max(0, S.energy) + '%';
    $('hud-energy-fill').classList.toggle('low', S.energy < 25);
    $('hud-dist').textContent = Math.floor(S.worldX / PX_PER_M) + ' m';
    $('hud-coins').textContent = runCoins();
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

  /* ---------- odznaky (achievementy) ----------
     Jednoduchá sbírka, ať má hráč pro co běhat. Splnění se pozná
     z uloženého postupu (rekord, počet běhů, parta, škola běhu),
     takže nic dalšího se nemusí hlídat za běhu. */
  const ACHIEVEMENTS = [
    { id: 'tutorial', icon: '🎓', title: { cs: 'Karlova škola s vyznamenáním', en: 'Karel’s school, straight A’s' }, check: (s) => !!s.tutorialDone },
    { id: 'm1000', icon: '🥉', title: { cs: 'První kilák v kopytech', en: 'First kilometer under the hooves' }, check: (s) => (s.best || 0) >= 1000 },
    { id: 'm2000', icon: '🥈', title: { cs: 'Dvoukilometrový frajer', en: 'Two-kilometer hotshot' }, check: (s) => (s.best || 0) >= 2000 },
    { id: 'm3000', icon: '🥇', title: { cs: 'Trojka jako řemen', en: 'Rock-solid three-K' }, check: (s) => (s.best || 0) >= 3000 },
    { id: 'm5000', icon: '🏆', title: { cs: 'Šampion louky – 5 kiláků!', en: 'Meadow champion – 5 K!' }, check: (s) => (s.best || 0) >= 5000 },
    { id: 'friend', icon: '🐾', title: { cs: 'Našel sis parťáka do běhu', en: 'You found a running buddy' }, check: (s) => (s.unlocked || []).length >= 2 },
    { id: 'runs10', icon: '🔁', title: { cs: 'Deset rozběhů, nula lenosti', en: 'Ten runs, zero laziness' }, check: (s) => (s.runs || 0) >= 10 },
  ];

  // doplní nově splněné odznaky do postupu a vrátí ty čerstvě získané
  function syncAchievements() {
    if (!save.achievements) save.achievements = [];
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (!save.achievements.includes(a.id) && a.check(save)) {
        save.achievements.push(a.id);
        fresh.push(a);
      }
    }
    if (fresh.length) persist();
    return fresh;
  }

  function achCount() {
    const owned = (save.achievements || []).filter(id => ACHIEVEMENTS.some(a => a.id === id));
    return { done: owned.length, total: ACHIEVEMENTS.length };
  }

  // krátce oznámí čerstvě získané odznaky (po jednom, ať si je hráč přečte)
  function toastAchievements(fresh) {
    fresh.forEach((a, i) => {
      setTimeout(() => toast(`🎖️ ${I18N.t('ach.new')}: ${a.icon} ${I18N.pick(a.title)}`), 700 + i * 2800);
    });
  }

  function buildAch() {
    syncAchievements();
    const { done, total } = achCount();
    $('ach-count').textContent = `${done}/${total}`;
    const list = $('ach-list');
    list.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const got = (save.achievements || []).includes(a.id);
      const row = document.createElement('div');
      row.className = 'ach-row' + (got ? ' got' : '');
      const ico = document.createElement('span');
      ico.className = 'ach-ico';
      ico.textContent = got ? a.icon : '🔒';
      const name = document.createElement('span');
      name.className = 'ach-name';
      name.textContent = I18N.pick(a.title);
      const mark = document.createElement('span');
      mark.className = 'ach-mark';
      mark.textContent = got ? '✓' : '';
      row.append(ico, name, mark);
      list.appendChild(row);
    }
  }

  /* ---------- menu ---------- */
  function initMenu() {
    syncAchievements();
    const ac = achCount();
    $('menu-ach').textContent = `${ac.done}/${ac.total}`;
    $('menu-best').textContent = save.best + ' m';
    $('menu-coins').textContent = save.coins;
    const ch = charById(save.selected);
    $('menu-charname').textContent = I18N.pick(ch.name);
    $('menu-perk').textContent = I18N.pick(ch.perk);
    $('btn-sfx').textContent = (save.sfx !== false ? '🔊 ' : '🔇 ') + I18N.t('menu.sounds');
    $('btn-music').textContent = (save.music !== false ? '🎵 ' : '🚫 ') + I18N.t('menu.music');
    $('btn-install').textContent = I18N.t('menu.install');
    measureMenuPanel(); // texty mění šířku panelu, zvířátko v demu mu uhýbá
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

    // poslední karta v karuselu – pozvánka poznat zvířata naživo na webu azylu
    const cta = document.createElement('div');
    cta.className = 'char-card cta-card';
    const ctaArt = document.createElement('div');
    ctaArt.className = 'cta-art';
    ctaArt.textContent = '🐾💚';
    cta.appendChild(ctaArt);
    const ctaQ = document.createElement('h3');
    ctaQ.textContent = I18N.t('shop.cta.q');
    cta.appendChild(ctaQ);
    const ctaText = document.createElement('p');
    ctaText.className = 'cta-text';
    ctaText.textContent = I18N.t('shop.cta.text');
    cta.appendChild(ctaText);
    const ctaBtn = document.createElement('a');
    ctaBtn.className = 'btn small buy';
    ctaBtn.href = 'https://nechmerust.org/zvireci-obyvatele';
    ctaBtn.target = '_blank';
    ctaBtn.rel = 'noopener';
    ctaBtn.textContent = I18N.t('shop.cta.btn');
    cta.appendChild(ctaBtn);
    grid.appendChild(cta);

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
      if (dev.infCoins) save.coins = DEV_COINS; // vývojářský režim: peněženka zůstává plná
      save.unlocked.push(ch.id);
      save.selected = ch.id;
      persist();
      AUDIO.play('buy');
      buildShop();
      initMenu();
      toast(I18N.t('toast.joined', { name: I18N.pick(ch.name) }));
      toastAchievements(syncAchievements()); // odznak za prvního parťáka

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
  $('btn-ach').addEventListener('click', () => { buildAch(); showScreen('ach'); AUDIO.play('click'); });
  $('btn-ach-back').addEventListener('click', () => { initMenu(); showScreen('menu'); AUDIO.play('click'); });
  $('btn-again').addEventListener('click', startRun);
  $('btn-over-menu').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); initMenu(); showScreen('menu'); });
  $('btn-over-shop').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); buildShop(); showScreen('shop'); });
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-tut-continue').addEventListener('click', continueLesson);
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

  /* ---------- instalace PWA ----------
     Chrome na Androidu žádnou nabídku sám od sebe neukazuje – appka musí
     zachytit beforeinstallprompt a nabídnout instalaci vlastním tlačítkem. */
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    $('btn-install').hidden = false;
  });
  $('btn-install').addEventListener('click', async () => {
    if (!installPrompt) return;
    AUDIO.play('click');
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    $('btn-install').hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    $('btn-install').hidden = true;
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
    if ($('screen-dev').classList.contains('visible')) buildDevMenu();
  });

  /* =========================================================
     VÝVOJÁŘSKÉ (TESTOVACÍ) MENU – skryté
     Otevře se 5× ťuknutím na titul hry (v menu) nebo na nadpis
     pauzy (během běhu), na počítači klávesou `. Právě vybrané
     zvířátko u toho zahlásí vtipnou hlášku.
     ========================================================= */
  const L = (cs, en) => (I18N.lang === 'en' ? en : cs);

  function isDevOpen() { return $('screen-dev').classList.contains('visible'); }

  function sayDevQuote() {
    const ch = charById(save.selected) || CHARACTERS[0];
    const q = randomQuote(EVENTS.devMenu);
    const o = I18N.lang === 'en' ? '“' : '„';
    const c = I18N.lang === 'en' ? '”' : '“';
    toast('🔧 ' + I18N.pick(ch.name) + ': ' + o + q + c);
    AUDIO.play('quote');
  }

  function openDev() {
    if (isDevOpen()) return;
    S.devReturn = S.mode === 'run' ? 'run' : (S.mode === 'over' ? 'over' : 'menu');
    if (S.mode === 'run') S.mode = 'paused';
    buildDevMenu();
    $('screen-dev').classList.add('visible');
    $('hud').classList.remove('visible');
    sayDevQuote();
    AUDIO.play('click');
  }

  function closeDev() {
    const back = S.devReturn || 'menu';
    S.devReturn = null;
    $('screen-dev').classList.remove('visible');
    if (back === 'run') { S.mode = 'run'; showScreen(null); }
    else if (back === 'over') { S.mode = 'over'; showScreen('over'); }
    else { S.mode = 'menu'; S.demo = true; showScreen('menu'); }
    AUDIO.play('click');
  }

  // přeskočí svět na začátek zvoleného prostředí (a doplní okolí)
  function applyWarp(targetM) {
    S.worldX = Math.max(0, targetM) * PX_PER_M;
    S.obstacles = []; S.pickups = []; S.decor = []; S.particles = []; S.floaters = [];
    S.flyers = [];
    S.nextObstacleX = S.worldX + 500;
    S.nextPickupX = S.worldX + 350;
    S.nextDecorX = S.worldX;
    S.nextFlyerX = S.worldX + 400;
    S.py = 0; S.vy = 0; S.airborne = false; S.jumps = 0; S.sliding = 0;
    S.stumble = 0; S.invuln = 0;
    S.lastMilestone = Math.floor(S.worldX / PX_PER_M / 500) * 500;
    S.lastSpecial = Math.floor(S.worldX / PX_PER_M / 2500) * 2500;
    S.special = null; S.speedAnchorX = S.worldX;
    S.lastEnvId = null; // ať naskočí hudba nového prostředí
    updateHud(true);
  }

  function devWarp(idx) {
    const targetM = idx * ENV_LEN_M + 60; // kousek do prostředí
    if (S.devReturn === 'run') {
      applyWarp(targetM);
      closeDev();
    } else {
      // spustit rovnou testovací běh na daném prostředí (bez tutoriálu)
      S.devReturn = null;
      $('screen-dev').classList.remove('visible');
      startRun();
      S.tut = null;
      applyWarp(targetM);
      toast(L('Test: ', 'Test: ') + I18N.pick(ENVS[idx % ENVS.length].name));
    }
  }

  function buildDevMenu() {
    $('dev-title').textContent = '🔧 ' + L('Vývojářské menu', 'Developer menu');
    $('btn-dev-close').setAttribute('aria-label', L('Zavřít', 'Close'));
    const body = $('dev-body');
    body.innerHTML = '';

    const section = (title) => {
      const s = document.createElement('div');
      s.className = 'dev-section';
      const h = document.createElement('h3');
      h.textContent = title;
      s.appendChild(h);
      const row = document.createElement('div');
      row.className = 'dev-row';
      s.appendChild(row);
      body.appendChild(s);
      return row;
    };
    const btn = (row, label, onClick, opts = {}) => {
      const b = document.createElement('button');
      b.className = 'dev-btn' + (opts.on ? ' on' : '') + (opts.danger ? ' danger' : '') + (opts.wide ? ' wide' : '');
      b.textContent = label;
      b.addEventListener('click', () => { AUDIO.play('click'); onClick(); });
      row.appendChild(b);
      return b;
    };
    const state = (on) => on ? L('ZAP', 'ON') : L('VYP', 'OFF');

    // --- Přepínače ---
    const cheats = section(L('Cheaty', 'Cheats'));
    btn(cheats, '🛡 God Mode: ' + state(dev.god), () => {
      dev.god = !dev.god; persistDev(); buildDevMenu();
    }, { on: dev.god });
    btn(cheats, '🪙 ' + L('Nekonečno mincí', 'Unlimited coins') + ': ' + state(dev.infCoins), () => {
      dev.infCoins = !dev.infCoins;
      if (dev.infCoins) save.coins = DEV_COINS;
      persistDev(); persist(); initMenu(); buildDevMenu();
      if ($('screen-shop').classList.contains('visible')) buildShop();
    }, { on: dev.infCoins });
    btn(cheats, '🎓 ' + L('Vynutit tutoriál', 'Force tutorial') + ': ' + state(dev.forceTut), () => {
      dev.forceTut = !dev.forceTut; persistDev(); buildDevMenu();
    }, { on: dev.forceTut });

    // --- Tempo hry ---
    const speedRow = section(L('Tempo hry', 'Game speed'));
    [0.5, 1, 2, 3].forEach((mult) => {
      btn(speedRow, mult + '×', () => { dev.speed = mult; persistDev(); buildDevMenu(); }, { on: dev.speed === mult });
    });

    // --- Zvířátka ---
    const animals = section(L('Zvířátka', 'Animals'));
    const allOwned = CHARACTERS.every((c) => save.unlocked.includes(c.id));
    btn(animals, '🐾 ' + (allOwned ? L('Všechna odemčena ✓', 'All unlocked ✓') : L('Odemknout všechna zvířátka', 'Unlock all animals')), () => {
      for (const c of CHARACTERS) if (!save.unlocked.includes(c.id)) save.unlocked.push(c.id);
      persist(); initMenu(); buildDevMenu();
      if ($('screen-shop').classList.contains('visible')) buildShop();
      toast(L('Všechna zvířátka odemčena! 🐾', 'All animals unlocked! 🐾'));
    }, { wide: true, on: allOwned });

    // --- Přeskočit do prostředí ---
    const warp = section(S.devReturn === 'run'
      ? L('Přeskočit do prostředí', 'Warp to environment')
      : L('Spustit test v prostředí', 'Test run in environment'));
    ENVS.forEach((env, i) => {
      btn(warp, I18N.pick(env.name), () => devWarp(i));
    });

    // --- Nebezpečná zóna ---
    const danger = section(L('Nebezpečná zóna', 'Danger zone'));
    btn(danger, '🗑 ' + L('Vynulovat postup', 'Reset progress'), () => {
      if (!window.confirm(L('Opravdu smazat veškerý postup (mince, odemčená zvířátka, rekord)?',
        'Really wipe all progress (coins, unlocked animals, best distance)?'))) return;
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nevadí */ }
      try { localStorage.removeItem(DEV_KEY); } catch (e) { /* nevadí */ }
      location.reload();
    }, { danger: true, wide: true });

    const note = document.createElement('p');
    note.className = 'dev-note';
    note.textContent = L('Tip: na počítači otevřeš/zavřeš toto menu klávesou `.',
      'Tip: on desktop toggle this menu with the ` key.');
    body.appendChild(note);
  }

  $('btn-dev-close').addEventListener('click', closeDev);

  // skrytý spouštěč: 5 rychlých ťuknutí na určený prvek
  let devTaps = 0, devTapTimer = null;
  function devTapTrigger() {
    devTaps++;
    clearTimeout(devTapTimer);
    devTapTimer = setTimeout(() => { devTaps = 0; }, 1500);
    if (devTaps >= 5) { devTaps = 0; openDev(); }
  }
  $('game-title').addEventListener('click', devTapTrigger);
  $('pause-title').addEventListener('click', devTapTrigger);

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
  // hudba běží od úplného začátku – když prohlížeč autoplay nedovolí,
  // rozjede ji první dotek/klávesa (AUDIO si to pohlídá sám)
  AUDIO.playMusic('intro');
  requestAnimationFrame(frame);
})();
