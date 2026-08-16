/* =========================================================
   LOUKA RUN – herní engine
   Endless runner na podporu azylu Nech mě růst
   ========================================================= */

(() => {
  const { CHARACTERS, ENVS, OBSTACLES, BIRD_VARIANTS, HUMANS, SIGNS, EVENTS, ECONOMY, TUTORIAL } = DATA;

  /* ---------- verze hry (jediný zdroj; při vydání zvyš i cache v sw.js) ---------- */
  const GAME_VERSION = '1.8.0';
  { const el = document.getElementById('game-version'); if (el) el.textContent = 'v' + GAME_VERSION; }

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
  // obdélník DOM prvku v souřadnicích hry – getBoundingClientRect vrací
  // souřadnice obrazovky, takže v otočené hře se osy prohodí stejně jako u doteků
  function gameRect(el) {
    const r = el.getBoundingClientRect();
    return forcedLandscape()
      ? { left: r.top, top: window.innerWidth - r.right,
          width: r.height, height: r.width, bottom: window.innerWidth - r.left }
      : r;
  }

  // levý okraj decku (.menu-deck) – zvířátko v demu mu uhýbá, aby na
  // malých displejích nebylo schované za panelem
  let menuPanelLeft = Infinity;
  function measureMenuPanel() {
    const menu = document.getElementById('screen-menu');
    const deck = menu && menu.querySelector('.menu-deck');
    menuPanelLeft = (deck && menu.classList.contains('visible'))
      ? gameRect(deck).left
      : Infinity;
  }

  /* ---------- automatická kvalita ----------
     Na slabším telefonu se po pár vteřinách trhaného běhu sníží rozlišení
     plátna (DPR) – GPU má rázem o třetinu až polovinu méně pixelů a hra
     zůstane plynulá.

     Nově se kvalita umí i vrátit nahoru: jedno zaškobrtnutí (načtení
     skladby, notifikace, přepnutí aplikace) jinak srazilo obraz na celý
     zbytek běhu, i když telefon dávno zase stíhal. Návrat je záměrně
     mnohem opatrnější než pokles – vyžaduje 10 vteřin nepřerušené
     plynulosti a hlídá si, kolikrát už se na daném stupni propadlo, takže
     na opravdu slabém telefonu se po druhém propadu přestane vracet
     a obraz nepulzuje sem a tam. */
  const DPR_STEPS = [2, 1.5, 1.15];
  let dprStep = 0;
  let slowT = 0;      // nastřádaný „pomalý čas“ (s) – žene pokles kvality
  let fastT = 0;      // nastřádaný plynulý čas (s) – žene návrat kvality
  let dropCount = 0;  // kolikrát už kvalita spadla; po druhém pádu se nevrací
  function autoQuality(rawDt) {
    if (S.mode !== 'run') return;
    // pod ~42 fps se střádá „pomalý čas“, svižné snímky ho zase umazávají
    if (rawDt > 0.024) { slowT += rawDt; fastT = 0; }
    else { slowT = Math.max(0, slowT - rawDt * 0.5); fastT += rawDt; }
    if (slowT > 2 && dprStep < DPR_STEPS.length - 1) {
      dprStep++; dropCount++; slowT = 0; fastT = 0; resize();
      return;
    }
    if (fastT > 10 && dprStep > 0 && dropCount < 2) {
      dprStep--; fastT = 0; resize();
    }
  }

  /* ---------- útlum efektů menu ----------
     autoQuality() řeší jen běh (v menu se schválně nespouští, aby stání
     v nabídce nesrazilo kvalitu celé hry). Menu má ale vlastní ozdoby –
     poletující pyl, sklo, přejezd světla po titulu – a na slabém telefonu
     soupeří o snímek s pořád běžící scénou na plátně. Když se menu začne
     trhat, ozdoby zhasnou. Zpátky se nezapínají: blikající efekty působí
     hůř než žádné. */
  let menuSlowT = 0;
  let lowFx = false;
  function setLowFx() {
    if (lowFx) return;
    lowFx = true;
    document.documentElement.classList.add('low-fx');
  }
  function menuFxWatch(rawDt) {
    if (lowFx) return;
    // telefon, kterému už jednou spadlo rozlišení, ozdoby stejně neutáhne
    if (dprStep > 0) { setLowFx(); return; }
    if (S.mode !== 'menu') { menuSlowT = 0; return; }
    if (rawDt > 0.025) menuSlowT += rawDt;
    else menuSlowT = Math.max(0, menuSlowT - rawDt * 0.5);
    if (menuSlowT > 1.5) setLowFx();
  }

  function resize() {
    document.documentElement.classList.toggle('force-landscape', portraitMq.matches);
    DPR = Math.min(window.devicePixelRatio || 1, DPR_STEPS[dprStep]);
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
  // na Androidu se ještě před prvním čtením zkusí obnovit záloha z nativních
  // Preferences (localStorage ve WebView umí vymazat kdejaká čistička)
  STORE.recover(SAVE_KEY);
  const save = loadSave();
  function loadSave() {
    try {
      const s = JSON.parse(STORE.getSync(SAVE_KEY));
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
    try { STORE.set(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* úložiště nedostupné – postup zůstane aspoň v paměti do konce sezení */ }
  }

  AUDIO.setSfx(save.sfx !== false);
  AUDIO.setMusic(save.music !== false);
  // vibrace patří ke zvukům – kdo si je vypne, chce mít úplný klid
  PLATFORM.setHaptics(save.sfx !== false);

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
    goldenRun: 0,           // zlaté mrkve za běh (denní mise)
    hitsRun: 0,             // nárazy za běh (sčítá se do save.hitsTotal kvůli odznaku)
    cleanDist: 0,           // nejdelší úsek bez nárazu v px (denní mise)
    cleanFrom: 0,           // odkud se ten úsek počítá
    ramLeft: 0,
    cloverT: 0,             // zbývající čas bonusu čtyřlístku (s) – mince mají dvojnásobnou hodnotu
    // řetěz sběrů – viz sekce COMBO
    combo: 0,               // kolik věcí za sebou bez přerušení
    comboT: 0,              // zbývá času do vypršení řetězu (s)
    comboWin: 0,            // jak dlouhé bylo okno naposled (kvůli prstenci – mění se s rychlostí)
    comboPop: 0,            // pružinový doskok čísla (1 → 0)
    comboRing: 0,           // jak moc je prstenec vidět (0 → 1), plynulý náběh i zánik
    comboBreak: 0,          // doběh praskliny po nárazu (s)
    comboBest: 0,           // nejdelší řetěz běhu (do výsledků)
    comboWaves: [],         // rázové vlny nového stupně (screen space)
    comboFlash: 0,          // záblesk přes obrazovku u vysokých stupňů (1 → 0)
    comboFlashCol: '#fff',  // barva toho záblesku
    // hráč
    py: 0, vy: 0, airborne: false, jumps: 0,
    sliding: 0,             // zbývající čas skluzu (s)
    jumpBuf: 0,             // zapamatované ťuknutí těsně před dopadem (s)
    jumpImpulse: 0,         // síla probíhajícího odrazu – po puštění se stoupání zkrátí
    swayFollow: 0,          // zpožděná svislá rychlost – žene druhotný pohyb uší a ocasu
    stumble: 0, invuln: 0, squash: 0,
    runPhase: 0, blink: 0,
    // svět
    obstacles: [], pickups: [], decor: [], particles: [], floaters: [],
    fg: [], nextFgX: 0,     // tráva a kvítí v popředí – letí před běžcem
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
  // …a naopak: tráva a kvítí u samé kamery se řítí RYCHLEJI než pěšina.
  // Teprve tahle vrstva před běžcem dělá z plochých kulis hloubku – oko
  // porovná pomalé kopce vzadu s letící trávou vpředu a scéna se „rozestoupí“.
  const FG_PARALLAX = 1.35;

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
        spawnParticle(a.x - 30 * a.scale, groundY - 3,
          -80 - Math.random() * 60, -10 - Math.random() * 30,
          3 + Math.random() * 4, 0.4, '#e8dcc4', 0.6);
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
    maybeGreet();
  }

  /* ---------- Karlovo uvítání ----------
     Poprvé se otevře samo (poselství o azylu a o sbírce na seno má
     vidět každý), pak už jen na přání – buď tlačítkem v menu, nebo
     napořád, když si hráč zapne „fešák režim". */
  function maybeGreet() {
    if (typeof KAREL === 'undefined') return;
    if (save.karelSeen && !save.karelAlways) return;
    // menu se prolíná – ať se portál neotevře do rozjeté animace
    setTimeout(() => {
      if (S.mode === 'menu' && curScreen === 'menu' && !KAREL.isOpen()) {
        KAREL.open({ lowFx: lowFx || reduceMotionMq.matches });
      }
    }, 620);
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
      S.jumpImpulse = jumpPower;
      S.airborne = true;
      S.jumps = 1;
      S.squash = -0.6;
      puffs(6);
      AUDIO.play('jump');
      PLATFORM.haptic('light');
    } else if (S.jumps === 1) {
      S.vy = -jumpPower * 0.68;
      S.jumpImpulse = jumpPower * 0.68;
      S.jumps = 2;
      AUDIO.play('djump');
      PLATFORM.haptic('light');
      // obláček pod nohama při dvojskoku
      for (let i = 0; i < 5; i++) {
        spawnParticle(playerX(), groundY - S.py - 6, (Math.random() - 0.5) * 120,
          Math.random() * 60 + 20, 5 + Math.random() * 5, 0.5, '#ffffff', 0.8);
      }
    } else {
      // ťuknutí těsně před dopadem se zapamatuje a skočí se hned po doteku země,
      // takže žádný klik nepřijde vniveč
      S.jumpBuf = 0.16;
    }
  }

  /* Plovoucí skok: krátké ťuknutí = hop přes balík, podržení = plný oblouk.
     Po puštění se stoupání zkrátí na 70 % odrazu – i ten nejkratší hop tak
     má ~66 px, což bezpečně přeskočí nejvyšší překážku (58 px) i s tím
     nejhůř skákajícím zvířátkem (jump 0,95). Nikdy se nezasahuje do pádu,
     jen do stoupání, takže se hráč nemůže ťuknutím „přisát“ k zemi. */
  const JUMP_CUT = 0.70;
  function releaseJump() {
    if (!S.jumpImpulse) return;
    const cut = -S.jumpImpulse * JUMP_CUT;
    if (S.vy < cut) S.vy = cut;
    S.jumpImpulse = 0;
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
    if (e.code === 'KeyP') togglePause();
    // Escape řeší PLATFORM.onBack – tam chodí i hardwarové Zpět na Androidu,
    // ať se obě cesty chovají úplně stejně
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') releaseJump();
  });

  function uiOrJump() {
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
  // puštění se hlídá na okně, ne na plátně: prst může sjet mimo canvas
  // (nad HUD tlačítka) a pointerup by pak plátnu vůbec nedorazil
  window.addEventListener('pointerup', () => { ptr = null; releaseJump(); });
  window.addEventListener('pointercancel', () => { ptr = null; releaseJump(); });

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
    S.obstacles = []; S.pickups = []; S.decor = []; S.floaters = [];
    clearParticles(); // zásobník se nezahazuje, jen se uvolní všechny sloty
    S.fg = []; S.nextFgX = 0;
    S.flyers = [];
    S.nextObstacleX = demo ? Infinity : 1600;
    S.nextPickupX = demo ? Infinity : 650;
    S.nextDecorX = 100;
    S.nextFlyerX = 400;
    S.py = 0; S.vy = 0; S.airborne = false; S.jumps = 0; S.sliding = 0; S.jumpBuf = 0; S.jumpImpulse = 0; S.swayFollow = 0;
    S.combo = 0; S.comboT = 0; S.comboPop = 0; S.comboRing = 0; S.comboBreak = 0; S.comboBest = 0;
    S.comboWin = ECONOMY.comboWindow; S.comboWaves.length = 0; S.comboFlash = 0;
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
    S.coinsRun = 0; S.carrotsRun = 0; S.goldenRun = 0; S.hitsRun = 0;
    S.cleanDist = 0; S.cleanFrom = 0;
    S.cloverT = 0;
    S.ramLeft = S.stats.ram || 0;
    S.speed = S.baseSpeed * S.stats.speed;
    S.demo = false;
    S.lastEnvId = null; // ať hned naskočí hudba prvního prostředí
    resetWorld(false);
    // první běh = Karlova škola běhu (?tutorial=1 ji vynutí kdykoli znovu)
    S.tut = (FORCE_TUT || !save.tutorialDone) ? makeTutorial() : null;
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
    // rozjetý řetěz se ještě vyplatí – nesmí propadnout jen proto, že
    // došla energie zrovna uprostřed sbírání
    endCombo();
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
    // nejdelší řetěz napříč všemi běhy – jen kvůli odznakům
    if (S.comboBest > (save.bestCombo || 0)) save.bestCombo = S.comboBest;
    // kolikátý běh s touhle postavou – odemyká deníčky z azylu
    if (!save.charRuns) save.charRuns = {};
    save.charRuns[S.char.id] = (save.charRuns[S.char.id] || 0) + 1;
    // denní mise
    S.cleanDist = Math.max(S.cleanDist, S.worldX - S.cleanFrom);
    const daily = ensureDaily();
    daily.runsToday = (daily.runsToday || 0) + 1;
    const runStats = {
      dist,
      carrots: S.carrotsRun,
      coins: runCoins(),
      combo: S.comboBest,
      golden: S.goldenRun,
      clean: Math.floor(S.cleanDist / PX_PER_M),
    };
    checkDaily(runStats);
    // osobní úkoly zvířátka – ze stejných čísel jako denní mise
    const hadTrophy = !!charTrophy(S.char);
    const freshTasks = checkCharTasks(S.char, runStats);
    const wonTrophy = !hadTrophy && !!charTrophy(S.char);
    // sčítance pro odznaky – jinak by se nedalo poznat, co hráč nasbíral za život
    save.metersTotal = (save.metersTotal || 0) + dist;
    save.carrotsTotal = (save.carrotsTotal || 0) + S.carrotsRun;
    save.hitsTotal = (save.hitsTotal || 0) + S.hitsRun;
    if (dist > 0 && dist < 30) save.tinyRun = true;
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) save.nightRun = true;
    // příběhový konec – každé zvířátko střídá své příběhy popořadě,
    // takže tři doběhy za sebou vyprávějí tři různé konce
    if (!save.storyIdx) save.storyIdx = {};
    const sIdx = (save.storyIdx[S.char.id] || 0) % S.char.stories.length;
    const story = I18N.pick(S.char.stories[sIdx]);
    save.storyIdx[S.char.id] = sIdx + 1;
    // …a co už hráč slyšel, se dá dohledat v deníčku (sbírka příběhů)
    if (!save.storySeen) save.storySeen = {};
    const seen = save.storySeen[S.char.id] || (save.storySeen[S.char.id] = []);
    if (!seen.includes(sIdx)) seen.push(sIdx);
    persist();
    AUDIO.play('finish');
    revealOver({
      story, isBest,
      dist,
      carrots: S.carrotsRun,
      coins: runCoins(),
      best: save.best,
      combo: S.comboBest,
    });
    // nově splněné úkoly a odznaky oznámíme přes obrazovkou konce.
    // Trofej má přednost – je to větší událost než jednotlivý úkol.
    if (wonTrophy) {
      setTimeout(() => {
        toast(`🎁 ${I18N.pick(S.char.name)}: ${I18N.pick(S.char.trophy.name)}!`);
        PLATFORM.haptic('success');
      }, 900);
    } else {
      freshTasks.forEach((t, i) => {
        setTimeout(() => toast(`${t.icon} ${I18N.t('task.done')}`), 900 + i * 2600);
      });
    }
    toastAchievements(syncAchievements(), (wonTrophy ? 1 : freshTasks.length) * 2600);
  }

  /* =========================================================
     CÍLOVÁ OBRAZOVKA
     Karta, portrét, konfety i nástup řádků jsou v CSS (sekce „KONEC BĚHU"
     ve style.css) a spouští je třídy .anim / .record. Tady zbývá to, co
     CSS neumí: vypsat vtip písmenko po písmenku a dopočítat čísla.
     Obojí jede z jedné smyčky na requestAnimationFrame – úloha vrátí true,
     když je hotová. Odchod z obrazovky smyčku zruší (viz showScreen).
     ========================================================= */
  const overTasks = [];
  let overRaf = 0;
  let overSkip = null; // dopsat vtip hned – ťuknutím do karty

  function overTick(now) {
    for (let i = overTasks.length - 1; i >= 0; i--) {
      if (overTasks[i](now)) overTasks.splice(i, 1);
    }
    overRaf = overTasks.length ? requestAnimationFrame(overTick) : 0;
  }
  function overRun(task) {
    overTasks.push(task);
    if (!overRaf) overRaf = requestAnimationFrame(overTick);
  }
  function overStop() {
    overTasks.length = 0;
    overSkip = null;
    if (overRaf) cancelAnimationFrame(overRaf);
    overRaf = 0;
  }

  // číslo naběhne z nuly a na konci ještě poskočí (třída .pop)
  function overCount(el, to, fmt, delay, dur, done) {
    el.textContent = fmt(0);
    let t0 = 0;
    overRun((now) => {
      if (!t0) t0 = now + delay;
      if (now < t0) return false;
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) return false;
      el.classList.add('pop');
      if (done) done();
      return true;
    });
  }

  // psací stroj. Rychlost se dopočítá z délky, ať dlouhý vtip netrvá věčně
  // a krátký nebliknul dřív, než na něj hráč stihne pohlédnout.
  function overType(el, text, delay) {
    const panel = el.parentElement;
    const chars = Array.from(text); // Array.from kvůli emoji – ta jsou dvě jednotky
    const per = Math.min(17, 1700 / Math.max(1, chars.length));
    let t0 = 0, shown = -1;
    const finish = () => {
      el.textContent = text;
      panel.classList.add('done', 'punch');
      AUDIO.play('quote');
      overSkip = null;
    };
    overSkip = () => { overTasks.length = 0; finish(); };
    overRun((now) => {
      if (!t0) t0 = now + delay;
      if (now < t0) return false;
      const n = Math.min(chars.length, Math.floor((now - t0) / per) + 1);
      if (n !== shown) { shown = n; el.textContent = chars.slice(0, n).join(''); }
      if (n < chars.length) return false;
      finish();
      return true;
    });
  }

  function revealOver(d) {
    const card = document.querySelector('#screen-over .over-card');
    const storyEl = $('over-story');
    const textEl = storyEl.querySelector('.story-text');
    const ghostEl = storyEl.querySelector('.story-ghost');
    const meters = (v) => v + ' m';

    overStop();
    card.classList.remove('anim', 'record');
    storyEl.classList.remove('done', 'punch');
    for (const el of document.querySelectorAll('#screen-over .stat-val')) el.classList.remove('pop');

    $('over-title').textContent = d.isBest ? I18N.t('over.record') : I18N.t('over.finish');
    storyEl.setAttribute('aria-label', d.story); // čtečka dostane celý vtip najednou, ne po písmenkách
    ghostEl.textContent = d.story; // neviditelná kopie – drží panelu výšku celého vtipu
    drawPortrait($('over-portrait'), S.char);

    // šetrný režim / slabý telefon: rovnou hotový výsledek, žádná show
    if (lowFx || reduceMotionMq.matches) {
      textEl.textContent = d.story;
      storyEl.classList.add('done');
      $('over-dist').textContent = meters(d.dist);
      $('over-carrots').textContent = d.carrots;
      $('over-coins').textContent = '+' + d.coins;
      $('over-best').textContent = meters(d.best);
      $('over-combo').textContent = d.combo;
      showScreen('over');
      return;
    }

    textEl.textContent = '';
    card.classList.add('anim');
    if (d.isBest) card.classList.add('record');
    void card.offsetWidth; // restart CSS animací – druhý doběh v řadě by jinak naskočil bez nich
    showScreen('over');

    overType(textEl, d.story, 320);
    overCount($('over-dist'), d.dist, meters, 400, 900);
    overCount($('over-carrots'), d.carrots, String, 470, 800);
    overCount($('over-coins'), d.coins, (v) => '+' + v, 540, 800,
      () => { if (d.coins > 0) AUDIO.play('coin'); });
    overCount($('over-best'), d.best, meters, 610, 900);
    overCount($('over-combo'), d.combo, String, 680, 700);
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

    // dál v běhu občas dvojitá pozemní překážka (skok–skok); šance nabíhá
    // pozvolna a s každým stupněm obtížnosti (koncertem) dál roste
    const lvl = difficultyLevel();
    const doubleChance = Math.min(0.5,
      0.12 + 0.10 * Math.min(1, Math.max(0, (distM - 800) / 800)) + 0.04 * lvl);
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
      // od 2. stupně (5 km) se ke dvojici občas přidá i třetí do trojkombinace
      if (lvl >= 2 && Math.random() < Math.min(0.35, 0.12 * (lvl - 1))) {
        const ob3 = groundPool[Math.floor(Math.random() * groundPool.length)];
        const o3 = { ...ob3, x: o2.x + 340 + Math.random() * 140, y: 0, broken: false };
        const v3 = BIRD_VARIANTS[o3.id];
        if (v3) o3.v = v3[Math.floor(Math.random() * v3.length)];
        maybeFlagIntro(o3);
        S.obstacles.push(o3);
        resolvePickupConflicts(o3);
        S.nextObstacleX = o2.x + 340 + 140;
      }
    }
    resolvePickupConflicts(o);

    // mezera podle rychlosti – s ujetou vzdáleností se zmenšuje,
    // prvních pár set metrů je naopak vzdušnějších. Rozestupy držíme
    // vzdušnější, ať zbývá čas na reakci; vyšší stupně je dál stahují.
    const tighten = Math.max(Math.max(0.55, 0.72 - 0.03 * lvl), 1 - distM / 4000);
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
    // a stupňující se tempo). Přísun mrkví s tím zprvu drží krok: fuel jde od 0
    // na startu k 1 u 5 km. Od 3. stupně obtížnosti (7,5 km) ale zase pomalu
    // řídne – pozdní kilometry jsou o hospodaření s energií a někde má běh
    // i dobrému hráči skončit.
    const fuel = Math.max(0.35, Math.min(1, distM / 5000) - 0.10 * Math.max(0, difficultyLevel() - 2));
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
     koncert je vyprodaný (výhra): zvířátko chytí dech a část nastřádaného
     zrychlení setřese – ale s každým dalším koncertem čím dál menší
     (viz resolveSpecial). Při propadáku zůstává tempo skoro celé. Každý další
     koncert je navíc svižnější a má užší zónu (speedupPerConcert /
     shrinkPerConcert). */
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
    shrinkPerConcert: 0.012,  // každý další koncert (5/7,5/10 km…) začíná s užší zónou
    speedupPerConcert: 0.10,  // a puntík mu jede svižněji (o tolik kratší beatDur)
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
      if (SP.resultT <= 0) {
        S.special = null;
        // koncert skončil = louka přituhla (nový stupeň obtížnosti) –
        // ohlásí se cedulí ve stylu milníků, ať hráč ví, že přitvrzení je záměr.
        // Zameškaný milník (2500 m je i násobek 500) by ceduli hned přepsal,
        // proto se dožene tady – koncertní cedule ho nahrazuje.
        S.lastMilestone = Math.floor((S.worldX / PX_PER_M) / 500) * 500;
        S.milestone = {
          label: { cs: '⚡ Louka zrychluje!', en: '⚡ The meadow speeds up!' },
          t: 0, dur: 2.6, quote: randomQuote(EVENTS.speedUp),
        };
      }
    }
  }

  // STUPEŇ OBTÍŽNOSTI – po každém Zvířecím koncertu (2,5 km) louka přituhne.
  // Jedno číslo řídí všechno: strmost rychlosti, hustotu překážek, přísun
  // mrkví, spotřebu energie i bolestivost nárazů. Cíl: dobrý hráč doběhne
  // ~8 km (3 koncerty), pak už louka vyhrává.
  function difficultyLevel() {
    return Math.min(8, Math.floor((S.worldX / PX_PER_M) / 2500));
  }

  // aktuální strmost rychlostní rampy (px/s za metr) – roste se stupněm;
  // jedno místo pravdy pro update smyčku i přepočty kotvy po koncertu
  function rampRateNow() {
    return 0.15 + difficultyLevel() * 0.05;
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
      // vyprodáno – zvířátko chytí dech, ale každý další koncert ho vrací míň:
      // po 1. zůstane čtvrtina nastřádaného zrychlení, pak 45 %, 65 %… až 80 %.
      // Od ~3. koncertu se tempo už nedá úplně setřást (cíl: doběhnout ~8 km)
      const residual = extra * Math.min(0.25 + 0.20 * (SP.concertIdx || 0), 0.80);
      S.speedAnchorX = S.worldX - (residual / rampRateNow()) * PX_PER_M;
      S.energy = 100;
      S.ramLeft = S.stats?.ram || 0; // Yakulovi se doplní i náboje beranidla
      S.coinsRun += ECONOMY.concertCoins;
      SP.bubble = pickOne(EVENTS.concertWin);
      AUDIO.play('golden');
    } else {
      // propadák – nastřádané zrychlení skoro celé zůstává, s dalšími koncerty víc
      const keep = extra * Math.min(0.60 + 0.10 * (SP.concertIdx || 0), 0.95);
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
          spawnParticle(f.sx - f.flip * 14, f.sy + 2, -20 * f.flip, 8, 2, 0.9, '#ffffff', 0.55);
        }
      } else if (f.type === 'stork') {
        // čáp občas upustí pírko, které se snáší dolů
        f.dropT -= dt;
        if (f.dropT <= 0 && f.sx > 0 && f.sx < W) {
          f.dropT = 5 + Math.random() * 6;
          spawnParticle(f.sx, f.sy + 6, -30, 35, 3, 4, '#f5f2ea', 0.85, false, Math.random() * 6);
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

  /* Kolik má být vidět slunečních paprsků. Zlatá hodinka je jejich domov,
     v lese jde jen o náznak světla mezi korunami; jinde nic. Přechod mezi
     prostředími se plynule prolne, ať paprsky nenaskočí skokem. */
  const RAY_AMT = { zapad: 1, les: 0.5 };
  function godRayAmount() {
    const { env, nextEnv, blend } = currentEnv();
    return GFX.lerp(RAY_AMT[env.id] || 0, RAY_AMT[nextEnv.id] || 0, blend);
  }

  // paleta se míchá jen když se opravdu změní (mimo 70m přechod je konstantní) –
  // míchání 9 barev × 2 volání za snímek zbytečně krmilo garbage collector
  let palCacheKey = '';
  let palCacheVal = null;
  function blendedPalette() {
    const { env, nextEnv, blend } = currentEnv();
    const q = Math.round(blend * 64) / 64; // 64 kroků přechodu oko nerozezná od plynulého
    const key = env.id + nextEnv.id + q;
    if (key === palCacheKey) return palCacheVal;
    const keys = ['skyTop', 'skyBottom', 'hillFar', 'hillNear', 'ground', 'groundDark', 'path', 'sun', 'clouds'];
    const pal = {};
    for (const k of keys) pal[k] = GFX.lerpColor(env[k], nextEnv[k], q);
    pal.nightAmt = GFX.lerp(env.night ? 1 : 0, nextEnv.night ? 1 : 0, q);
    pal.particles = q < 0.5 ? env.particles : nextEnv.particles;
    palCacheKey = key; palCacheVal = pal;
    return pal;
  }

  /* =========================================================
     ČÁSTICE, BUBLINY, TEXTY
     ========================================================= */

  /* Zásobník částic (object pool)
     Pole s částicemi se sice uklízelo na místě (compact), ale samotné
     částice se pořád vyráběly jako nové objekty – při každém dopadu,
     výbuchu a okvětním lístku. Garbage collector to pak uklízel přesně
     v okamžicích, kdy hráč skáče, a obraz uměl škubnout.

     Teď je zásobník pevný: 320 částic se vyrobí jednou při startu a dál
     se jen recyklují. Volná částice pozná podle life <= 0. Když dojdou
     (opravdu velký výbuch), přepíše se nejstarší – lepší než alokovat.
     Parametry se předávají jednotlivě, ne v objektu, aby při každém
     zrození nevznikal aspoň ten popisný literál. */
  const PARTICLE_POOL = 320;
  let poolCursor = 0;
  function initParticlePool() {
    S.particles.length = 0;
    for (let i = 0; i < PARTICLE_POOL; i++) {
      S.particles.push({ x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, c: '#fff', a: 1, grav: false, sway: 0, glow: false });
    }
  }

  function spawnParticle(x, y, vx, vy, r, life, c, a, grav, sway, glow) {
    let p = null;
    for (let i = 0; i < PARTICLE_POOL; i++) {
      const cand = S.particles[(poolCursor + i) % PARTICLE_POOL];
      if (cand.life <= 0) { poolCursor = (poolCursor + i + 1) % PARTICLE_POOL; p = cand; break; }
    }
    if (!p) { p = S.particles[poolCursor]; poolCursor = (poolCursor + 1) % PARTICLE_POOL; }
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.r = r; p.life = life;
    p.c = c; p.a = a === undefined ? 1 : a;
    p.grav = !!grav; p.sway = sway || 0; p.glow = !!glow;
    return p;
  }

  function clearParticles() { for (const p of S.particles) p.life = 0; }

  /* ---------- popředí ----------
     Trsy trávy a kvítí těsně u kamery. Kreslí se AŽ ZA hráčem, takže mu
     na okamžik přeběhnou přes kopýtka – přesně to dělá dojem, že běží
     loukou, a ne po nakreslené kulise. Na nejslabším stupni kvality
     (dprStep 2) se vrstva vypne úplně; je to čistá ozdoba. */
  function spawnFg() {
    const kind = Math.random();
    S.fg.push({
      x: S.nextFgX,
      kind: kind < 0.62 ? 'grass' : (kind < 0.88 ? 'flower' : 'stone'),
      s: 0.8 + Math.random() * 0.7,
      lean: (Math.random() - 0.5) * 0.5,
      hue: Math.floor(Math.random() * 3),
    });
    S.nextFgX += 70 + Math.random() * 170;
  }

  const FG_FLOWERS = ['#ffffff', '#ffe08a', '#ff9fc4'];
  function drawForeground(px) {
    if (dprStep >= 2 || !S.fg.length) return;
    const pal = blendedPalette();
    const dark = GFX.lerpColor(pal.groundDark, '#000000', 0.25);
    ctx.save();
    ctx.globalAlpha = 0.62;
    for (const d of S.fg) {
      const sx = (d.x - S.worldX) * FG_PARALLAX + px;
      if (sx < -80 || sx > W + 80) continue;
      // popředí sedí níž než pěšina a nejvyšší stébla dosáhnou hráči ke
      // kopýtkům – právě to přeběhnutí přes nohy dělá dojem běhu loukou.
      // Výš už ne: tráva přes překážky by hru zhoršila, ne vylepšila.
      const by = groundY + 46 * d.s;
      const h = 34 * d.s;
      if (d.kind === 'stone') {
        ctx.fillStyle = dark;
        GFX.ell(ctx, sx, by, 11 * d.s, 6 * d.s);
        ctx.fill();
        continue;
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3.2 * d.s;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + i * 6 * d.s, by);
        ctx.quadraticCurveTo(sx + i * 8 * d.s + d.lean * 12, by - h * 0.6, sx + i * 9 * d.s + d.lean * 26, by - h);
        ctx.stroke();
      }
      if (d.kind === 'flower') {
        ctx.fillStyle = FG_FLOWERS[d.hue];
        ctx.beginPath();
        ctx.arc(sx + d.lean * 26, by - h - 2 * d.s, 4.5 * d.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function puffs(n) {
    for (let i = 0; i < n; i++) {
      spawnParticle(
        playerX() - 20 + Math.random() * 20,
        groundY - 4 - Math.random() * 8,
        -60 - Math.random() * 90, -20 - Math.random() * 50,
        4 + Math.random() * 6, 0.45 + Math.random() * 0.3,
        '#e8dcc4', 0.7,
      );
    }
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 220;
      spawnParticle(x, y, Math.cos(a) * v, Math.sin(a) * v - 120,
        3 + Math.random() * 5, 0.5 + Math.random() * 0.5, color, 1, true);
    }
  }

  function floater(txt, x, y, color) {
    S.floaters.push({ txt, x, y, life: 1, color });
  }

  /* =========================================================
     ŘETĚZ SBĚRŮ (COMBO)

     Sbírej mrkve, mince a čtyřlístky rychle za sebou. Řetěz se počítá od
     prvního kousku, ale ukáže se až od pátého (ECONOMY.comboMin) – dvě
     náhodné mince nemají hráči blikat před očima. Mince po cestě mají
     pořád normální hodnotu; odměna přijde jednorázově, až řetěz skončí.
     Náraz řetěz přetrhne a vyplatí jen půlku – trest, který bolí, ale
     nesebere hráči celou snahu.

     Prstenec i číslo se kreslí na plátno (ne do DOM): mění se každý
     snímek a v DOM by se rozjížděly vůči zbytku obrazu.
     ========================================================= */
  const COMBO_X = () => W / 2;      // pod ukazatelem vzdálenosti nahoře uprostřed
  const COMBO_Y = 104;
  const COMBO_R = 26;

  // index nejvyššího dosaženého stupně, nebo -1, když řetěz ještě neplatí
  function comboTierIdx(n) {
    const tiers = ECONOMY.comboTiers;
    let idx = -1;
    for (let i = 0; i < tiers.length; i++) if (n >= tiers[i].at) idx = i;
    return idx;
  }

  function comboBonus(n, ratio = 1) {
    const idx = comboTierIdx(n);
    if (idx < 0) return 0;
    return Math.floor(n * ECONOMY.comboCoinRate * ECONOMY.comboTiers[idx].mul * ratio);
  }

  // barva plynule přechází mezi stupni, ať se prstenec nepřebarvuje skokem
  function comboColor(n) {
    const tiers = ECONOMY.comboTiers;
    const idx = Math.max(0, comboTierIdx(n));
    const cur = tiers[idx];
    const next = tiers[idx + 1];
    if (!next) return cur.color;
    const q = Math.min(1, Math.max(0, (n - cur.at) / (next.at - cur.at)));
    return GFX.lerpColor(cur.color, next.color, q);
  }

  /* Okno na další sběr se krátí s rychlostí. Mrkve a mince stojí ve světě
     v metrech, ne v sekundách – při 620 px/s proletí hráč stejnou mezeru
     dvakrát rychleji než na startu, takže pevné okno by řetěz na konci běhu
     udrželo skoro samo. Krátíme ho ale jen odmocninou poměru rychlostí
     (ECONOMY.comboSpeedBite), ne celým poměrem: plné krácení bylo naplno
     neúnosné a řetěz se trhal kolem čtyřicítky. comboWindowMin je podlaha. */
  function comboWindow() {
    const base = S.baseSpeed * (S.stats?.speed || 1);
    const rel = Math.max(1, (S.speed || base) / base);
    return Math.max(ECONOMY.comboWindowMin, ECONOMY.comboWindow / Math.pow(rel, ECONOMY.comboSpeedBite));
  }

  function bumpCombo() {
    const before = comboTierIdx(S.combo);
    S.combo++;
    S.comboWin = comboWindow();
    S.comboT = S.comboWin;
    S.comboPop = 1;
    S.comboBreak = 0;
    if (S.combo > S.comboBest) S.comboBest = S.combo;
    const after = comboTierIdx(S.combo);
    if (after < 0) return;                 // pod pátým kouskem je řetěz neviditelný
    AUDIO.comboTone(S.combo - ECONOMY.comboMin);
    if (after > before) {                  // nový stupeň – oslava sílí s číslem
      const tier = ECONOMY.comboTiers[after];
      const fx = tier.fx || 0;
      burst(COMBO_X(), COMBO_Y, tier.color, 16 + fx * 12);
      floater(I18N.t(tier.name), COMBO_X(), COMBO_Y + 64, tier.color);
      PLATFORM.haptic(fx >= 2 ? 'heavy' : 'medium');
      if (fx >= 1) {
        AUDIO.play('golden');
        S.shake = Math.max(S.shake, 0.22 + fx * 0.13);
        if (dprStep < 2) S.comboWaves.push({ t: 0, col: tier.color, fx });
      }
      // záblesk je jediný efekt přes celou obrazovku – komu bliká, tomu vadí
      if (fx >= 2 && dprStep < 2 && !reduceMotionMq.matches) {
        S.comboFlash = 1; S.comboFlashCol = tier.color;
      }
      if (fx >= 3) {                       // dva stupně nejvyšší – jiskry i od hráče
        burst(playerX(), groundY - S.py - 40, tier.color, 24);
      }
    }
  }

  // ratio 1 = řetěz doběhl v klidu, 0.5 = přetržený nárazem
  function cashCombo(ratio, broken) {
    const n = S.combo;
    S.combo = 0; S.comboT = 0;
    if (comboTierIdx(n) < 0) return;       // krátký řetěz nic nevyplácí
    const gain = comboBonus(n, ratio);
    if (gain > 0) {
      S.coinsRun += gain;
      updateHud(true);
    }
    const col = broken ? '#e5533a' : comboColor(n);
    floater(
      broken ? I18N.t('combo.break') + '  +' + gain + ' 🪙' : I18N.t('combo.payout', { n, c: gain }),
      COMBO_X(), COMBO_Y + 64, col,
    );
    burst(COMBO_X(), COMBO_Y, col, broken ? 10 : 22);
    if (broken) return;                    // zvuk i vibrace nárazu už zazněly
    AUDIO.play('golden');
    PLATFORM.haptic('success');
  }

  function endCombo() { cashCombo(1, false); }
  function breakCombo() {
    if (comboTierIdx(S.combo) >= 0) S.comboBreak = 0.6;
    cashCombo(0.5, true);
  }

  function updateCombo(dt) {
    if (S.comboT > 0) {
      S.comboT -= dt;
      if (S.comboT <= 0) { S.comboT = 0; endCombo(); }
    }
    // doskok čísla a náběh/zánik prstence – stejné tlumení jako u squashe,
    // takže se combo hýbe ve stejném rytmu jako zbytek hry
    S.comboPop *= Math.pow(0.0015, dt);
    S.comboBreak = Math.max(0, S.comboBreak - dt);
    const want = comboTierIdx(S.combo) >= 0 ? 1 : 0;
    S.comboRing += (want - S.comboRing) * Math.min(1, dt * 12);
    if (S.comboRing < 0.004 && want === 0) S.comboRing = 0;
    // oslava nového stupně – vlny i záblesk běží vlastním časem
    S.comboFlash = Math.max(0, S.comboFlash - dt * 3.4);
    for (const w of S.comboWaves) w.t += dt;
    compact(S.comboWaves, (w) => w.t < 0.75);
  }

  /* Rázové vlny a záblesk nového stupně. Kreslí se do screen space (mimo
     třes), aby oslava neubližovala čitelnosti běhu pod ní. */
  function drawComboFx(c) {
    if (S.comboFlash > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = S.comboFlash * S.comboFlash * 0.2;
      c.fillStyle = S.comboFlashCol;
      c.fillRect(0, 0, W, H);
      c.restore();
    }
    if (!S.comboWaves.length) return;
    c.save();
    for (const w of S.comboWaves) {
      const q = w.t / 0.75;
      c.globalAlpha = (1 - q) * (1 - q) * 0.9;
      c.strokeStyle = w.col;
      c.lineWidth = (3 + w.fx * 2) * (1 - q * 0.7);
      c.beginPath();
      c.arc(COMBO_X(), COMBO_Y, 20 + q * (150 + w.fx * 70), 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  function drawCombo(c) {
    drawComboFx(c);
    if (S.comboRing <= 0 && S.comboBreak <= 0) return;
    const n = S.combo;
    const shown = S.comboRing;
    const tierIdx = comboTierIdx(n);
    const fx = tierIdx >= 0 ? (ECONOMY.comboTiers[tierIdx].fx || 0) : 0;
    const col = S.comboBreak > 0 ? '#e5533a' : comboColor(n || ECONOMY.comboMin);
    const x = COMBO_X(), y = COMBO_Y;
    // prasklý řetěz odlétá nahoru a mizí, dokončený se jen scvrkne
    const pop = 1 + S.comboPop * 0.35;
    const r = COMBO_R * (0.5 + shown * 0.5) * pop;

    c.save();
    c.globalAlpha = Math.max(shown, S.comboBreak / 0.6) * 0.95;
    c.translate(x, y - (1 - shown) * 14);

    if (dprStep < 2) {
      // slabý telefon prstenec vynechá – zůstane jen čitelné číslo
      // od třetího stupně kolem prstence dýchá záře v barvě stupně
      if (fx >= 1 && S.comboBreak <= 0) {
        const glow = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * (2 + fx * 0.35));
        glow.addColorStop(0, GFX.hexA(col, 0.32 + fx * 0.07));
        glow.addColorStop(1, GFX.hexA(col, 0));
        c.fillStyle = glow;
        c.beginPath();
        c.arc(0, 0, r * (2 + fx * 0.35), 0, Math.PI * 2);
        c.fill();
      }
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(0,0,0,0.28)';
      c.lineWidth = 6;
      c.stroke();
      if (S.comboT > 0) {
        // okno se s rychlostí zkracuje, takže se ubývající oblouk musí
        // měřit proti oknu, které opravdu běží – ne proti základnímu
        const frac = S.comboT / (S.comboWin || ECONOMY.comboWindow);
        c.beginPath();
        c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        c.strokeStyle = col;
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.stroke();
      }
      // nejvyšší stupně obíhají jiskry
      if (fx >= 2 && S.comboBreak <= 0) {
        const sparks = fx >= 3 ? 5 : 3;
        for (let i = 0; i < sparks; i++) {
          const a = S.t * 0.0026 + (i / sparks) * Math.PI * 2;
          c.beginPath();
          c.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, 2.4 + fx * 0.5, 0, Math.PI * 2);
          c.fillStyle = col;
          c.fill();
        }
      }
    }

    c.font = `700 ${Math.round((20 + fx * 2) * pop)}px "Baloo 2", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.strokeText(String(n || ''), 0, 1);
    c.fillStyle = col;
    c.fillText(String(n || ''), 0, 1);
    c.restore();
  }

  // hlášky jsou dvojjazyčné objekty { cs, en } – vybere náhodnou v aktuálním jazyce
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
  function randomQuote(list) { return I18N.pick(pickOne(list)); }

  /* =========================================================
     UPDATE
     ========================================================= */
  let ambientTimer = 0;
  const PETAL_COLORS = ['#ff8fb1', '#ffffff', '#ffe08a'];
  const LEAF_COLORS = ['#e5a53a', '#c9762a', '#a8b83a'];

  // úklid pole na místě – .filter() každý snímek vytvářel nová pole
  // (7 polí × 60 snímků/s) a garbage collector pak uměl škubnout obrazem
  function compact(arr, keep) {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      if (keep(arr[i])) arr[w++] = arr[i];
    }
    arr.length = w;
  }

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

    const spd = (S.demo ? S.baseSpeed * 0.8 : S.speed) * worldSpeedScale();

    // zrychlování – pozvolné, ať má hráč šanci doběhnout opravdu daleko;
    // rozjezd se měří od kotvy speedAnchorX (po výhře v koncertu se resetuje = běží zas pomalu)
    if (running) {
      // s každým stupněm obtížnosti (koncert, 2,5 km) je náběh rychlosti
      // strmější (rampRateNow) a strop vyšší, ať je pořád co zrychlovat
      const speedCap = 620 + difficultyLevel() * 60;
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
        if (S.airborne) { S.squash = 0.8; puffs(5); AUDIO.play('land'); PLATFORM.haptic('light'); }
        S.airborne = false; S.jumps = 0; S.jumpImpulse = 0;
        if (S.jumpBuf > 0) { S.jumpBuf = 0; jump(); } // zapamatované ťuknutí
      }
    }
    S.jumpBuf = Math.max(0, S.jumpBuf - dt);
    updateCombo(dt);
    S.sliding = Math.max(0, S.sliding - dt);
    S.stumble = Math.max(0, S.stumble - dt);
    S.invuln = Math.max(0, S.invuln - dt);
    S.squash *= Math.pow(0.0001, dt); // rychlé odeznění
    // zpožděný sledovač svislé rychlosti – rozdíl proti skutečné rychlosti
    // rozhýbe uši, ocas a vlnu (druhotný pohyb, viz GFX.drawCharacter)
    S.swayFollow += (S.vy - S.swayFollow) * Math.min(1, dt * 9);
    const phaseBefore = S.runPhase;
    S.runPhase += dt * (10 + spd * 0.012);

    /* Kroky a vrstva rychlosti. Krok padne pokaždé, když běžecká fáze
       překročí násobek π (tedy jednou za nohu) – takže rychlejší běh
       automaticky dupe hustěji. Ve skluzu a ve vzduchu se nekrokuje. */
    if (S.mode === 'run' && !S.airborne && S.sliding <= 0 && !lessonPaused()) {
      if (Math.floor(phaseBefore / Math.PI) !== Math.floor(S.runPhase / Math.PI)) {
        AUDIO.step(currentEnv().env.id, S.stumble > 0 ? 0.5 : 1);
      }
    }
    AUDIO.setIntensity(S.mode === 'run' ? (spd - 320) / 380 : 0);

    // mrkání
    S.blink -= dt;
    if (S.blink < -3 - Math.random() * 3) S.blink = 0.12;

    // spawn
    while (S.nextDecorX < S.worldX + W / FAR_PARALLAX + 500) spawnDecor();
    // popředí letí rychleji, takže se musí zakládat blíž a uklízet dřív
    while (S.nextFgX < S.worldX + W / FG_PARALLAX + 200) spawnFg();
    compact(S.fg, d => (d.x - S.worldX) * FG_PARALLAX > -300);
    while (S.nextFlyerX < S.worldX + W + 700) spawnFlyer();
    compact(S.flyers, f => f.cx > S.worldX - 700);
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
    compact(S.obstacles, o => o.x > cut);
    compact(S.pickups, p => p.x > cut && !p.taken);
    compact(S.decor, d => d.x > cut - 1300); // pomalejší parallax = déle na obrazovce

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
      // mrkví nedožene. Strop se od 3. stupně obtížnosti pomalu zvedá (2 → 3),
      // takže hluboko za 8. kilometrem výdrž prostě dojde.
      const distRampCap = 2 + Math.min(1, 0.2 * Math.max(0, difficultyLevel() - 2));
      const distRamp = Math.min(distRampCap, distM / ECONOMY.drainRampDist);
      const ramp = 1 + speedFactor * 0.45 + distRamp;
      // ve škole běhu ubývá energie poloviční rychlostí a nikdy neklesne
      // pod rezervu – lekce není test výdrže a nedá se při ní umřít
      S.energy -= ECONOMY.drainPerSecond * S.stats.drain * ramp * dt * (S.tut ? 0.5 : 1);
      if (S.tut) S.energy = Math.max(S.energy, 15);
      if (S.energy <= 0) { S.energy = 0; endRun(); return; }

      collide(dt);
      quotes(dt);
      humanQuotes();
      updateHud(false);
    }

    // částice – zásobník má pevnou délku, mrtvé sloty se jen přeskočí
    for (const p of S.particles) {
      if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vy += 500 * dt;
      p.life -= dt;
    }
    for (const f of S.floaters) { f.y -= 40 * dt; f.life -= dt * 0.55; }
    compact(S.floaters, f => f.life > 0);
    for (const b of S.sideBubbles) b.t += dt;
    compact(S.sideBubbles, b => b.t < b.dur);
    if (S.milestone) { S.milestone.t += dt; if (S.milestone.t >= S.milestone.dur) S.milestone = null; }

    // ambientní částice prostředí (barvy jako konstanty – pole v cyklu by se
    // jinak vyrábělo čtyřikrát za vteřinu jen kvůli jednomu náhodnému odstínu)
    ambientTimer -= dt;
    if (ambientTimer <= 0) {
      ambientTimer = 0.25;
      const pal = blendedPalette();
      if (pal.particles === 'petals' || pal.particles === 'leaves') {
        spawnParticle(W + 20, Math.random() * groundY * 0.8,
          -spd * 0.35 - 30, 30 + Math.random() * 40, 4, 4,
          pal.particles === 'petals' ? PETAL_COLORS[Math.floor(Math.random() * 3)] : LEAF_COLORS[Math.floor(Math.random() * 3)],
          0.8, false, Math.random() * 6);
      } else if (pal.particles === 'fireflies') {
        spawnParticle(Math.random() * W, groundY - 30 - Math.random() * 200,
          (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30,
          2.5, 3, '#ffe88a', 0.9, false, 0, true);
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
        bumpCombo();
        PLATFORM.haptic('light');
        if (p.kind === 'carrot') {
          S.carrotsRun++;
          const gain = ECONOMY.carrotEnergy * (S.stats.carrotBonus || 1);
          S.energy = Math.min(100, S.energy + gain);
          floater('+' + Math.round(gain) + ' ⚡', sx, sy - 20, '#f28c28');
          burst(sx, sy, '#f28c28', 6);
          AUDIO.play('carrot');
        } else if (p.kind === 'golden') {
          S.carrotsRun++;
          S.goldenRun++;
          const gGain = Math.round(ECONOMY.goldenCarrotEnergy * (S.stats.goldenBonus || 1));
          S.energy = Math.min(100, S.energy + gGain);
          floater(I18N.t('fl.golden', { n: gGain }), sx, sy - 24, '#ffce3a');
          burst(sx, sy, '#ffd24a', 22);
          AUDIO.play('golden');
        } else if (p.kind === 'clover') {
          S.cloverT = ECONOMY.cloverDuration;
          floater(I18N.t('fl.clover', { n: ECONOMY.cloverCoinValue }), sx, sy - 24, '#8ee87a');
          burst(sx, sy, '#6fce58', 18);
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
      } else if (o.id === 'flock') {
        burst(sx, groundY - 90, '#55524c', 18); // tmavá pírka rozprášeného hejna
        floater(randomQuote(EVENTS.flock), sx, groundY - 160, '#e5533a');
      }
      // s každým stupněm obtížnosti (koncert, 2,5 km) bolí náraz do jakékoli
      // překážky o 5 % víc (viz ECONOMY.hitRampStep)
      const hitRamp = 1 + ECONOMY.hitRampStep * difficultyLevel();
      const penalty = Math.round((o.soft ? 8 : ECONOMY.hitPenalty) * (S.stats.hitFactor || 1) * hitRamp);
      // ve škole běhu drží energie rezervu – klopýtnutí nesmí běh ukončit
      S.energy = Math.max(S.tut ? 15 : 0, S.energy - penalty);
      S.hitsRun++;
      S.stumble = 0.7;
      S.invuln = 1.1;
      S.shake = 0.8;
      floater('-' + penalty + ' ⚡', px, pyTop - 20, '#e5533a');
      AUDIO.play('hit');
      PLATFORM.haptic('heavy');
      breakCombo();  // náraz řetěz utne – a musí to být vidět i cítit
      // konec čistého úseku – uložíme, jestli byl zatím nejdelší
      S.cleanDist = Math.max(S.cleanDist, S.worldX - S.cleanFrom);
      S.cleanFrom = S.worldX;
      if (S.energy <= 0) { endRun(); return; }
    }
  }

  /* ---------- hlášky ---------- */
  function quotes(dt) {
    // během školy běhu mluví Karel jen lekce – náhodné hlášky počkají;
    // totéž platí, dokud běžec představuje novinku na trase
    if (S.tut || S.enc || S.special) return;
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
    // sluneční paprsky mezi kopci a zemí – při západu naplno, v lese jen náznak
    if (dprStep < 2) GFX.drawGodRays(ctx, W, H, pal, groundY, S.t, godRayAmount());
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
      // ostrý stín na zemi pod překážkou stačí.
      // Souřadnice se do objektu vloží jen na dobu kreslení – kopie objektu
      // pro každou překážku každý snímek zbytečně krmila garbage collector.
      const wx = o.x;
      o.x = sx;
      o.y = o.flying ? groundY - o.clearance : groundY;
      GFX.drawObstacle(ctx, o, S.t);
      o.x = wx;
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
          sway: (S.vy - S.swayFollow) / 700,
          trophy: charTrophy(ch),
        }, S.t);
      }
    }

    // tráva a kvítí přeběhnou hráči přes kopýtka – vrstva hloubky
    drawForeground(px);

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
      if (p.life <= 0) continue;
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

    // řetěz sběrů – mimo třes, ať se počítadlo neklepe a jde přečíst
    if (S.mode === 'run' || S.mode === 'paused') drawCombo(ctx);

    // Karlova lekce o HUD – pulzující rámeček kolem ukazatele mrkvové energie
    if (S.tut && S.tut.idx >= 0 && TUTORIAL.steps[S.tut.idx].hud
        && S.tut.bubbleA > 0.1 && S.tut.scale < 0.8) {
      const hudEnergy = document.getElementById('hud-energy');
      if (hudEnergy) {
        const r = gameRect(hudEnergy);
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

    const label = ms.label ? I18N.pick(ms.label) : '🏅 ' + ms.m + ' m';
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
      ? gameRect(hudEl).bottom : 0) + 10;
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
  const screens = ['menu', 'shop', 'over', 'pause', 'ach', 'settings', 'diary'];

  let curScreen = null; // co je zrovna vidět – potřebuje to tlačítko Zpět
  function showScreen(name) {
    curScreen = name;
    if (name !== 'menu') closeDaily();
    if (name !== 'over') overStop(); // odchod z cíle zastaví psaní vtipu i počítadla
    for (const s of screens) $(`screen-${s}`).classList.toggle('visible', s === name);
    $('hud').classList.toggle('visible', name === null);
    if (name === 'menu') AUDIO.playMusic('menu');
    // na pauze se hudba i efekty ztiší – ať je slyšet, že hra čeká
    AUDIO.duck(name === 'pause');
    // obrazovky se prolínají, takže rozvržení decku je usazené až v dalším
    // snímku – dřív by se změřila jeho poloha ještě před přechodem
    requestAnimationFrame(measureMenuPanel);
  }

  // společný návrat do menu – dřív byla tahle čtveřice zkopírovaná na
  // čtyřech místech a snadno se rozešla
  function backToMenu() {
    S.mode = 'menu';
    S.demo = true;
    resetWorld(true);
    initMenu();
    showScreen('menu');
  }

  /* ---------- tlačítko Zpět (Android) / Escape (web) ----------
     Vrací true, když jsme událost spotřebovali. false znamená „jsme na
     úvodní obrazovce“ – tam se aplikace na Androidu ukončí. */
  function goBack() {
    // Karlova scéna leží nade vším – Zpět ji zavře jako první
    if (typeof KAREL !== 'undefined' && KAREL.isOpen()) { KAREL.close(); return true; }
    if (S.mode === 'intro') return true;   // během intra se nikam nechodí
    if (S.mode === 'run') { togglePause(); return true; }
    if (S.mode === 'paused') { togglePause(); return true; }
    // rozbalené mise jsou nejvrchnější vrstva – zavřou se první
    if (curScreen === 'menu' && !$('daily-pop').hidden) {
      closeDaily(); AUDIO.play('click');
      return true;
    }
    // otevřená knížka je nad obchodem – Zpět ji jen zavře
    if (curScreen === 'diary') {
      showScreen('shop'); AUDIO.play('click');
      return true;
    }
    if (curScreen === 'shop' || curScreen === 'ach' || curScreen === 'over' || curScreen === 'settings') {
      backToMenu(); AUDIO.play('click');
      return true;
    }
    return false; // menu
  }

  // do DOM se zapisuje jen při změně zobrazené hodnoty – zápis stylu/textu
  // každý snímek nutil prohlížeč přepočítávat rozložení i bez viditelné změny
  const hudLast = { energy: -1, low: null, dist: -1, coins: -1, clover: -1 };
  function updateHud(full) {
    const energy = Math.round(Math.max(0, S.energy) * 2) / 2; // po půl procentu stačí
    if (energy !== hudLast.energy) {
      hudLast.energy = energy;
      $('hud-energy-fill').style.width = energy + '%';
    }
    const low = S.energy < 25;
    if (low !== hudLast.low) {
      hudLast.low = low;
      $('hud-energy-fill').classList.toggle('low', low);
    }
    const dist = Math.floor(S.worldX / PX_PER_M);
    if (dist !== hudLast.dist) {
      hudLast.dist = dist;
      $('hud-dist').textContent = dist + ' m';
    }
    const coins = runCoins();
    if (coins !== hudLast.coins) {
      hudLast.coins = coins;
      $('hud-coins').textContent = coins;
    }
    const cloverS = S.cloverT > 0 ? Math.ceil(S.cloverT) : 0;
    if (cloverS !== hudLast.clover) {
      hudLast.clover = cloverS;
      const clover = $('hud-clover');
      if (cloverS > 0) {
        clover.style.display = 'flex';
        clover.textContent = `🍀 ×${ECONOMY.cloverCoinValue} · ${cloverS} s`;
      } else clover.style.display = 'none';
    }
    if (full) {
      const ram = $('hud-ram');
      if (S.stats && S.stats.ram) {
        ram.style.display = 'flex';
        ram.textContent = '🐏 ' + '●'.repeat(S.ramLeft) + '○'.repeat((S.stats.ram || 0) - S.ramLeft);
      } else ram.style.display = 'none';
    }
  }

  /* ---------- portréty postav (mini canvasy) ---------- */
  function drawPortrait(cv, ch, phase = 0.6) {
    const c2 = cv.getContext('2d');
    const s = cv.width / 190;
    c2.clearRect(0, 0, cv.width, cv.height);
    GFX.drawCharacter(c2, ch, cv.width / 2 - 8 * s, cv.height * 0.82, s, { runPhase: phase, trophy: charTrophy(ch) }, 400);
  }

  /* =========================================================
     DENÍČEK Z AZYLU

     Knížka přes celou obrazovku. Má dvě části: zápisky ošetřovatelů,
     které se odemykají běháním s daným zvířátkem (DIARY_STEP běhů za
     zápisek), a „Věděli jste?“ – zajímavosti o druhu, které jsou
     přístupné vždycky, i u nekoupeného zvířátka. Vzdělávací část je
     důvod, proč hra existuje, a nemá smysl ji schovávat za odměnu.

     Listuje se po dvoustranách. Stránky jsou obyčejné DOM prvky;
     překlopení dělá jediný list (#book-leaf) nad nimi, pod kterým je
     už nový obsah – nic se tedy nekreslí dvakrát.
     ========================================================= */
  /* ---------- osobní úkoly zvířátka ----------
     Tři cíle na jeden běh u každého zvířátka. Vyhodnocují se ze stejné
     tabulky výsledků jako denní mise (dist/carrots/coins/combo/golden/
     clean), takže se za běhu nic nového neměří. Za všechny tři si
     zvířátko vyslouží trofej, kterou od té chvíle nosí ve hře, na
     portrétech i na kartičce ke sdílení – je to jediná odměna, která je
     doopravdy vidět, a proto stojí za to o ni běhat. */
  function charTasksDone(ch) {
    return (save.charTasks && save.charTasks[ch.id]) || [];
  }
  function charTrophy(ch) {
    if (!ch || !ch.trophy || !ch.tasks) return null;
    return charTasksDone(ch).length >= ch.tasks.length ? ch.trophy.kind : null;
  }
  function checkCharTasks(ch, run) {
    if (!ch || !ch.tasks) return [];
    if (!save.charTasks) save.charTasks = {};
    const done = save.charTasks[ch.id] || (save.charTasks[ch.id] = []);
    const fresh = [];
    for (const t of ch.tasks) {
      if (done.includes(t.id)) continue;
      if ((run[t.stat] || 0) >= t.goal) { done.push(t.id); fresh.push(t); }
    }
    return fresh;
  }
  // kolik zvířátek už má trofej – pro odznaky
  function trophyCount() { return CHARACTERS.filter(charTrophy).length; }

  const DIARY_STEP = 3;      // po kolika bězích s postavou přibude zápisek
  const BOOK_TURN_MS = 640;  // musí sedět s .book-leaf v style.css
  let bookChar = null, bookPages = [], bookSpread = 0, bookBusy = false;

  function diaryUnlocked(ch) {
    const runs = (save.charRuns && save.charRuns[ch.id]) || 0;
    return Math.min((ch.diary || []).length, Math.floor(runs / DIARY_STEP));
  }

  function buildBookPages(ch) {
    const pages = [{ type: 'cover' }, { type: 'tasks' }];
    const have = diaryUnlocked(ch);
    (ch.diary || []).forEach((entry, i) => {
      pages.push(i < have ? { type: 'entry', i, text: I18N.pick(entry) } : { type: 'locked', i });
    });
    // sbírka příběhových konců – co hráč s tímhle zvířátkem už slyšel
    const seen = (save.storySeen && save.storySeen[ch.id]) || [];
    (ch.stories || []).forEach((st, i) => {
      pages.push(seen.includes(i) ? { type: 'story', i, text: I18N.pick(st) } : { type: 'storyLocked', i });
    });
    (ch.facts || []).forEach((f, i) => pages.push({ type: 'fact', i, text: I18N.pick(f) }));
    pages.push({ type: 'end' });
    if (pages.length % 2) pages.push({ type: 'blank' });  // dvoustrana musí vyjít
    return pages;
  }

  /* ---------- vlepené drobnosti ----------
     Prázdná spodní půlka stránky vypadala jako nedopsaný sešit. Teď se do
     ní lepí fotky, čmáranice, poznámky na okraj a stopa, kterou po sobě
     zvířátko nechalo (Karlův kousanec, Avalin slintanec, Flíčkovo bláto…).

     Výběr je DETERMINISTICKÝ podle jména zvířátka a čísla stránky – stejná
     stránka tak vypadá pokaždé stejně a při listování sem a tam se nic
     nepřeskládá. Vrstva je absolutní a leží pod textem, takže ať se vybere
     cokoli, nikdy neodstrčí obsah. */
  function scrapHash(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  // jednoduché skici perem – kreslí se v mřížce 48×48
  const DOODLES = {
    carrot: '<path d="M19 19 L31 23 L23 43 Q21 46 19 43 Z"/><path d="M19 19 L13 9"/><path d="M23 20 L23 7"/><path d="M27 21 L34 11"/>',
    hoof: '<path d="M18 15 Q24 19 22 30 Q20 36 16 33 Q13 24 18 15 Z"/><path d="M30 15 Q36 19 34 30 Q32 36 28 33 Q25 24 30 15 Z"/>',
    heart: '<path d="M24 40 C7 27 10 13 19 13 Q24 13 24 19 Q24 13 29 13 C38 13 41 27 24 40 Z"/>',
    star: '<path d="M24 8 L29 19 L41 20 L32 28 L35 40 L24 34 L13 40 L16 28 L7 20 L19 19 Z"/>',
    daisy: '<circle cx="24" cy="24" r="4"/><ellipse cx="24" cy="13" rx="4" ry="7"/><ellipse cx="24" cy="35" rx="4" ry="7"/><ellipse cx="13" cy="24" rx="7" ry="4"/><ellipse cx="35" cy="24" rx="7" ry="4"/><ellipse cx="16" cy="16" rx="6" ry="3.4" transform="rotate(-45 16 16)"/><ellipse cx="32" cy="32" rx="6" ry="3.4" transform="rotate(-45 32 32)"/>',
    apple: '<path d="M24 15 Q16 12 13 20 Q10 32 18 40 Q24 44 30 40 Q38 32 35 20 Q32 12 24 15 Z"/><path d="M24 15 L24 8"/><path d="M24 11 Q31 6 34 11 Q29 15 24 12"/>',
    fence: '<path d="M13 12 L13 42"/><path d="M24 9 L24 42"/><path d="M35 12 L35 42"/><path d="M8 19 L40 16"/><path d="M8 30 L40 27"/>',
    cloud: '<path d="M14 32 Q6 32 8 25 Q10 19 17 21 Q19 12 28 14 Q37 16 36 24 Q43 25 41 31 Q39 34 33 32 Z"/>',
    wool: '<circle cx="18" cy="26" r="7"/><circle cx="28" cy="22" r="8"/><circle cx="33" cy="31" r="6"/><circle cx="22" cy="34" r="6"/>',
    horns: '<path d="M24 34 Q10 32 11 21 Q12 13 19 14"/><path d="M24 34 Q38 32 37 21 Q36 13 29 14"/>',
    clover: '<circle cx="18" cy="18" r="6"/><circle cx="30" cy="18" r="6"/><circle cx="18" cy="30" r="6"/><circle cx="30" cy="30" r="6"/><path d="M24 34 Q26 40 22 44"/>',
  };

  function doodleSvg(kind) {
    const inner = DOODLES[kind] || DOODLES.star;
    return `<svg viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
  }

  /* Co se na stránku vlepí. Rozpočet je nejvýš dvě věci plus stopa –
     víc už z deníku dělá nástěnku.

     Rozhoduje ZBYTEK PO DĚLENÍ čísla stránky, ne náhoda: fotka padne na
     každou čtvrtou stránku, poznámka na každou třetí, stopa na každou
     pátou. Tím je zaručeno, že se na jedné dvoustraně nikdy neobjeví
     dvě fotky (levá i pravá by musely mít stejný zbytek po čtyřech) a že
     dvě sousední stránky nemají stejnou čmáranici. Posun (slot) je
     odvozený od jména zvířátka, takže každý deník začíná jinde. */
  function pageExtras(page, num) {
    const sc = bookChar && bookChar.scrap;
    if (!sc || !page) return [];
    if (page.type === 'cover' || page.type === 'end' || page.type === 'blank') return [];
    const seed = scrapHash(bookChar.id);
    const photoSlot = Math.floor(seed * 4);
    const noteSlot = Math.floor(seed * 97) % 3;
    const stainSlot = Math.floor(seed * 313) % 5;
    // na výstřižek se zajímavostí ani na seznam úkolů se fotka nevejde
    const roomy = page.type !== 'fact' && page.type !== 'tasks';
    const out = [];

    if (roomy && sc.photos.length && num % 4 === photoSlot) {
      out.push({
        kind: 'photo',
        caption: I18N.pick(sc.photos[num % sc.photos.length]),
        side: num % 8 < 4 ? 'l' : 'r',
        pose: 0.35 + (num % 5) * 0.42,        // jiný krok = jiná fotka
      });
    } else if (sc.notes.length && num % 3 !== noteSlot) {
      // poznámka padne na dvě stránky ze tří – prázdný spodek pak zbude
      // jen občas, a to je dobře: pořád je to deník, ne nástěnka
      out.push({ kind: 'note', text: I18N.pick(sc.notes[num % sc.notes.length]) });
    }
    if (sc.doodles.length && num % 2 === 0 || (num % 3 === 1 && sc.doodles.length)) {
      const hasPhoto = out.length && out[0].kind === 'photo';
      out.push({
        kind: 'doodle',
        name: sc.doodles[num % sc.doodles.length],
        side: hasPhoto ? (out[0].side === 'l' ? 'r' : 'l') : (num % 2 ? 'l' : 'r'),
      });
    }
    if (num % 5 === stainSlot) out.push({ kind: 'stain', name: sc.stain });
    return out;
  }

  function renderExtras(el, page, num) {
    const list = pageExtras(page, num);
    if (!list.length) return;
    const layer = document.createElement('div');
    layer.className = 'page-extras';
    layer.setAttribute('aria-hidden', 'true');
    for (const d of list) {
      if (d.kind === 'photo') {
        const box = document.createElement('div');
        box.className = 'scrap-photo ' + d.side;
        const tape = document.createElement('span');
        tape.className = 'scrap-tape';
        const cv = document.createElement('canvas');
        cv.width = 190; cv.height = 150;
        box.append(tape, cv);
        const cap = document.createElement('span');
        cap.className = 'scrap-caption';
        cap.textContent = d.caption;
        box.appendChild(cap);
        layer.appendChild(box);
        drawPortrait(cv, bookChar, d.pose);
      } else if (d.kind === 'note') {
        const n = document.createElement('p');
        n.className = 'scrap-note';
        n.textContent = d.text;
        layer.appendChild(n);
      } else if (d.kind === 'doodle') {
        const g = document.createElement('span');
        g.className = 'scrap-doodle ' + d.side;
        g.innerHTML = doodleSvg(d.name);
        layer.appendChild(g);
      } else if (d.kind === 'stain') {
        const s = document.createElement('span');
        s.className = 'scrap-stain stain-' + d.name;
        layer.appendChild(s);
      }
    }
    el.appendChild(layer);
    fitExtras(el, num);
  }

  /* Vlepené drobnosti se NESMÍ potkat s textem. Kde text končí, se nedá
     odhadnout procentem – zápisek má dva řádky, seznam úkolů deset a na
     širokém displeji se všechno zalomí jinak. Vrstvu proto po vykreslení
     změříme a posadíme přesně pod poslední řádek. Co se do zbylého místa
     nevejde, vypadne: nejdřív fotka (nahradí ji poznámka), pak čmáranice,
     nakonec celá vrstva. Stránky jsou v rozvržení i když je obrazovka
     schovaná (jen visibility: hidden), takže měření platí i napoprvé. */
  function fitExtras(el, num) {
    const layer = el.querySelector('.page-extras');
    if (!layer) return;
    const pageNum = el.querySelector('.page-num');
    let textBottom = 0;
    for (const n of el.children) {
      if (n === layer || n === pageNum) continue;
      textBottom = Math.max(textBottom, n.offsetTop + n.offsetHeight);
    }
    const limit = (pageNum ? pageNum.offsetTop : el.clientHeight) - 6;
    const top = Math.min(textBottom + 14, limit);
    const room = limit - top;

    const photo = layer.querySelector('.scrap-photo');
    if (photo && room < 168) {
      photo.remove();
      // za fotku nastoupí poznámka, ať stránka nezůstane úplně holá
      const notes = (bookChar.scrap && bookChar.scrap.notes) || [];
      if (notes.length && room >= 40 && !layer.querySelector('.scrap-note')) {
        const n = document.createElement('p');
        n.className = 'scrap-note';
        n.textContent = I18N.pick(notes[num % notes.length]);
        layer.insertBefore(n, layer.firstChild);
      }
    }
    const doodle = layer.querySelector('.scrap-doodle');
    if (doodle && room < 96) doodle.remove();
    const note = layer.querySelector('.scrap-note');
    if (note && room < 40) note.remove();
    // stopa je plochá a leží u okraje – vejde se skoro vždycky
    if (!layer.children.length || room < 24) { layer.remove(); return; }

    layer.style.top = top + 'px';
    layer.style.bottom = 'auto';
    layer.style.height = room + 'px';
  }

  // ke které části knížky stránka patří – barví popisek a přepíná sazbu
  const PAGE_SECTION = {
    cover: 'cover', tasks: 'tasks',
    entry: 'notes', locked: 'notes',
    story: 'stories', storyLocked: 'stories',
    fact: 'facts', end: 'end',
  };

  function renderPage(el, page, num) {
    el.innerHTML = '';
    el.dataset.sec = (page && PAGE_SECTION[page.type]) || '';
    if (!page || page.type === 'blank') return;
    const add = (cls, txt, tag = 'p') => {
      const n = document.createElement(tag);
      n.className = cls; n.textContent = txt;
      el.appendChild(n);
      return n;
    };
    const species = bookChar.speciesName ? I18N.pick(bookChar.speciesName) : '';
    if (page.type === 'cover') {
      // titulní strana sedí uprostřed papíru, ne nahoře – jako v knize
      const mid = document.createElement('div');
      mid.className = 'page-mid';
      el.appendChild(mid);
      const cv = document.createElement('canvas');
      cv.className = 'page-portrait'; cv.width = 190; cv.height = 150;
      mid.appendChild(cv);
      drawPortrait(cv, bookChar);
      const put = (cls, txt, tag = 'p') => {
        const n = document.createElement(tag);
        n.className = cls; n.textContent = txt;
        mid.appendChild(n);
      };
      put('page-title', I18N.pick(bookChar.name), 'h3');
      put('page-species', species, 'span');
      put('page-quote', '„' + I18N.pick(bookChar.tagline) + '“');
      put('page-sign', I18N.t('diary.home'));
    } else if (page.type === 'entry') {
      add('page-kicker', I18N.t('diary.entries'), 'span');
      add('page-head', I18N.t('diary.entry', { n: page.i + 1 }), 'h3');
      add('page-body', page.text);
      add('page-sign', I18N.t('diary.sign'));
    } else if (page.type === 'locked') {
      add('page-kicker', I18N.t('diary.entries'), 'span');
      const mid = document.createElement('div');
      mid.className = 'page-mid';
      const wax = document.createElement('div');
      wax.className = 'page-wax'; wax.textContent = '🔒';
      const txt = document.createElement('p');
      txt.className = 'page-locked-text';
      const runs = (save.charRuns && save.charRuns[bookChar.id]) || 0;
      const left = (page.i + 1) * DIARY_STEP - runs;
      // čeština skloňuje: 1 běh, 2–4 běhy, 5+ běhů
      const w = I18N.lang === 'cs'
        ? (left === 1 ? 'běh' : left < 5 ? 'běhy' : 'běhů')
        : (left === 1 ? 'run' : 'runs');
      txt.textContent = I18N.t('diary.locked', { n: left, w });
      mid.append(wax, txt);
      el.appendChild(mid);
    } else if (page.type === 'fact') {
      /* Zajímavost není zápisek – je to výstřižek z encyklopedie vlepený
         do deníku. Proto vlastní kartička, tištěné patkové písmo a páska
         přes horní roh; rukopis ošetřovatelů zůstává jen na zápiscích. */
      add('page-kicker', I18N.t('diary.factsTab'), 'span');
      const card = document.createElement('div');
      card.className = 'fact-card';
      const badge = document.createElement('span');
      badge.className = 'fact-badge';
      badge.textContent = '💡 ' + I18N.t('diary.facts');
      const body = document.createElement('p');
      body.className = 'fact-body';
      body.textContent = page.text;
      const src = document.createElement('span');
      src.className = 'fact-src';
      src.textContent = species;
      card.append(badge, body, src);
      el.appendChild(card);
      // přečtené zajímavosti se sčítají kvůli odznaku „chodící encyklopedie“
      if (!save.factsRead) save.factsRead = [];
      const key = `${bookChar.id}:${page.i}`;
      if (!save.factsRead.includes(key)) { save.factsRead.push(key); persist(); }
    } else if (page.type === 'story') {
      add('page-kicker', I18N.t('diary.stories'), 'span');
      add('page-head', I18N.t('diary.story', { n: page.i + 1 }), 'h3');
      add('page-body', page.text);
    } else if (page.type === 'storyLocked') {
      add('page-kicker', I18N.t('diary.stories'), 'span');
      const mid = document.createElement('div');
      mid.className = 'page-mid';
      const q = document.createElement('div');
      q.className = 'page-wax page-wax-soft'; q.textContent = '?';
      const txt = document.createElement('p');
      txt.className = 'page-locked-text';
      txt.textContent = I18N.t('diary.storyLocked');
      mid.append(q, txt);
      el.appendChild(mid);
    } else if (page.type === 'tasks') {
      /* Osobní úkoly – jediné místo, kde je vidět, co po hráči zvířátko
         chce a co si tím vyslouží. Splněné se odškrtnou, trofej dole. */
      const done = charTasksDone(bookChar);
      add('page-kicker', I18N.t('task.title'), 'span');
      add('page-head', I18N.t('task.head', { name: I18N.pick(bookChar.name) }), 'h3');
      const list = document.createElement('ul');
      list.className = 'task-list';
      (bookChar.tasks || []).forEach((t) => {
        const li = document.createElement('li');
        li.className = 'task-row' + (done.includes(t.id) ? ' done' : '');
        const mark = document.createElement('span');
        mark.className = 'task-mark';
        mark.textContent = done.includes(t.id) ? '✓' : t.icon;
        const txt = document.createElement('span');
        txt.textContent = I18N.pick(t.title);
        li.append(mark, txt);
        list.appendChild(li);
      });
      el.appendChild(list);
      const prize = document.createElement('p');
      prize.className = 'task-prize' + (charTrophy(bookChar) ? ' won' : '');
      prize.textContent = (charTrophy(bookChar) ? '🎁 ' : '🔒 ')
        + I18N.t(charTrophy(bookChar) ? 'task.won' : 'task.prize', { prize: I18N.pick(bookChar.trophy.name) });
      el.appendChild(prize);
    } else if (page.type === 'end') {
      const mid = document.createElement('div');
      mid.className = 'page-mid';
      const p = document.createElement('p');
      p.className = 'page-body';
      p.textContent = I18N.t('diary.endText');
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = 'https://nechmerust.org';
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = I18N.t('diary.endLink');
      mid.append(p, a);
      el.appendChild(mid);
    }
    add('page-num', String(num), 'div');
    renderExtras(el, page, num);
  }

  function drawSpread() {
    renderPage($('book-left'), bookPages[bookSpread * 2], bookSpread * 2 + 1);
    renderPage($('book-right'), bookPages[bookSpread * 2 + 1], bookSpread * 2 + 2);
    const total = Math.ceil(bookPages.length / 2);
    $('book-pos').textContent = `${bookSpread + 1}/${total}`;
    $('btn-diary-prev').disabled = bookSpread === 0;
    $('btn-diary-next').disabled = bookSpread >= total - 1;
  }

  function turnBook(dir) {
    const total = Math.ceil(bookPages.length / 2);
    const next = bookSpread + dir;
    if (bookBusy || !bookChar || next < 0 || next >= total) return;
    AUDIO.play('click');
    PLATFORM.haptic('light');
    if (lowFx || reduceMotionMq.matches) { bookSpread = next; drawSpread(); return; }
    /* Líc listu je otisk odcházející stránky. Plátno (portrét na titulní
       straně) se musí překreslit ručně – innerHTML bitmapu nepřenese –
       a data-sec se kopíruje taky, jinak by měl list na otočce jinou
       barvu popisku než stránka, ze které vznikl. */
    const from = dir > 0 ? $('book-right') : $('book-left');
    const leaf = $('book-leaf');
    const face = $('leaf-front');
    face.innerHTML = from.innerHTML;
    leaf.dataset.sec = from.dataset.sec || '';
    const srcs = from.querySelectorAll('canvas'), dsts = face.querySelectorAll('canvas');
    for (let i = 0; i < srcs.length && i < dsts.length; i++) {
      dsts[i].width = srcs[i].width; dsts[i].height = srcs[i].height;
      dsts[i].getContext('2d').drawImage(srcs[i], 0, 0);
    }
    // otisk se nesmí znovu rozanimovat – je to fotka, ne nová stránka
    face.querySelectorAll('*').forEach((n) => { n.style.animation = 'none'; });
    leaf.className = 'book-leaf ' + (dir > 0 ? 'turn-next' : 'turn-prev');
    $('book').classList.add('turning');
    bookBusy = true;
    bookSpread = next;
    drawSpread();
    setTimeout(() => {
      leaf.className = 'book-leaf';
      face.innerHTML = '';
      $('book').classList.remove('turning');
      bookBusy = false;
    }, BOOK_TURN_MS);
  }

  function openDiary(ch) {
    bookChar = ch;
    bookPages = buildBookPages(ch);
    bookSpread = 0;
    $('book-title').textContent = '📔 ' + I18N.pick(ch.name);
    $('book-hint').textContent = I18N.t('diary.hint');
    drawSpread();
    AUDIO.play('click');
    showScreen('diary');
  }

  /* ---------- odznaky (achievementy) ----------
     Jednoduchá sbírka, ať má hráč pro co běhat. Splnění se pozná
     z uloženého postupu (rekord, počet běhů, parta, škola běhu),
     takže nic dalšího se nemusí hlídat za běhu.

     Pozn.: nové milníky 12/16/20 km přidány zatím jen do webu (sw.js v24→v25).
     Android/Play verzi je potřeba přebuildit na počítači podle RELEASE.md
     (zvednout versionCode/versionName v android/app/build.gradle + bundleRelease). */
  const ACHIEVEMENTS = [
    { id: 'tutorial', icon: '🎓', title: { cs: 'Karlova škola s vyznamenáním', en: 'Karel’s school, straight A’s' }, check: (s) => !!s.tutorialDone },
    { id: 'm1000', icon: '🥉', title: { cs: 'První kilák v kopytech', en: 'First kilometer under the hooves' }, check: (s) => (s.best || 0) >= 1000 },
    { id: 'm2000', icon: '🥈', title: { cs: 'Dvoukilometrový frajer', en: 'Two-kilometer hotshot' }, check: (s) => (s.best || 0) >= 2000 },
    { id: 'm3000', icon: '🥇', title: { cs: 'Trojka jako řemen', en: 'Rock-solid three-K' }, check: (s) => (s.best || 0) >= 3000 },
    { id: 'm5000', icon: '🏆', title: { cs: 'Šampion louky – 5 kiláků!', en: 'Meadow champion – 5 K!' }, check: (s) => (s.best || 0) >= 5000 },
    { id: 'm8000', icon: '👑', title: { cs: 'Legenda louky – 8 kiláků!', en: 'Meadow legend – 8 K!' }, check: (s) => (s.best || 0) >= 8000 },
    { id: 'm12000', icon: '🌟', title: { cs: 'Tucet kiláků v kopytech!', en: 'A full dozen K under the hooves!' }, check: (s) => (s.best || 0) >= 12000 },
    { id: 'm16000', icon: '🔥', title: { cs: 'Šestnáctka – kopyta v jednom ohni!', en: 'Sixteen K – hooves on fire!' }, check: (s) => (s.best || 0) >= 16000 },
    { id: 'm20000', icon: '🦄', title: { cs: 'Dvacítka – bájný běžec louky!', en: 'Twenty K – the meadow’s living legend!' }, check: (s) => (s.best || 0) >= 20000 },
    { id: 'chain30', icon: '🔗', title: { cs: 'Řetěz třiceti kousků', en: 'A thirty-piece chain' }, check: (s) => (s.bestCombo || 0) >= 30 },
    { id: 'chain80', icon: '⛓️', title: { cs: 'Osmdesát bez zaváhání', en: 'Eighty without a wobble' }, check: (s) => (s.bestCombo || 0) >= 80 },
    { id: 'chain175', icon: '💫', title: { cs: 'Božský řetěz – 175 v jednom tahu!', en: 'Divine chain – 175 in one go!' }, check: (s) => (s.bestCombo || 0) >= 175 },
    { id: 'friend', icon: '🐾', title: { cs: 'Našel sis parťáka do běhu', en: 'You found a running buddy' }, check: (s) => (s.unlocked || []).length >= 2 },
    { id: 'runs10', icon: '🔁', title: { cs: 'Deset rozběhů, nula lenosti', en: 'Ten runs, zero laziness' }, check: (s) => (s.runs || 0) >= 10 },
    { id: 'runs50', icon: '🔂', title: { cs: 'Padesát rozběhů. Louka už zná tvůj rozvrh.', en: 'Fifty runs. The meadow knows your schedule now.' }, check: (s) => (s.runs || 0) >= 50 },
    { id: 'runs150', icon: '🧭', title: { cs: 'Sto padesát běhů. Zkoušel jsi někdy jít pěšky?', en: 'A hundred and fifty runs. Ever tried walking?' }, check: (s) => (s.runs || 0) >= 150 },
    { id: 'gang', icon: '🐾', title: { cs: 'Celá parta pohromadě. Nikdo nezůstal v ohradě.', en: 'The whole gang together. Nobody left behind in the pen.' }, check: (s) => (s.unlocked || []).length >= CHARACTERS.length },
    { id: 'miser', icon: '🪙', title: { cs: 'Skrblík z louky: 5 000 mincí a pořád nic.', en: 'Meadow miser: 5,000 coins and still not spending.' }, check: (s) => (s.coins || 0) >= 5000 },
    { id: 'snail', icon: '🐌', title: { cs: 'Rekord v neběhání. Necelých třicet metrů, zato s citem.', en: 'A record in not running. Under thirty metres, but with feeling.' }, check: (s) => !!s.tinyRun },
    { id: 'owl', icon: '🦉', title: { cs: 'Noční směna. Tohle už není běhání, to je nespavost.', en: 'Night shift. That is not running any more, that is insomnia.' }, check: (s) => !!s.nightRun },
    { id: 'wall', icon: '🧱', title: { cs: 'Sto nárazů. Překážky si na tebe dělají čárky.', en: 'A hundred hits. The obstacles are keeping score now.' }, check: (s) => (s.hitsTotal || 0) >= 100 },
    { id: 'carrots1000', icon: '🥕', title: { cs: 'Tisíc mrkví. Zahradník přešel na jinou plodinu.', en: 'A thousand carrots. The gardener has switched crops.' }, check: (s) => (s.carrotsTotal || 0) >= 1000 },
    { id: 'marathon', icon: '🏃', title: { cs: 'Maraton na etapy: 42 195 m dohromady. Bez tréninku!', en: 'A marathon in instalments: 42,195 m all told. Untrained!' }, check: (s) => (s.metersTotal || 0) >= 42195 },
    { id: 'dressed', icon: '🎩', title: { cs: 'Módní ikona louky. První trofej padla.', en: 'Meadow fashion icon. First trophy in the bag.' }, check: () => trophyCount() >= 1 },
    { id: 'wardrobe', icon: '🧣', title: { cs: 'Kompletní šatník. Celá parta vyšňořená.', en: 'Full wardrobe. The whole gang dressed up.' }, check: () => trophyCount() >= CHARACTERS.length },
    { id: 'endings', icon: '📖', title: { cs: 'Sběratel konců. Od jednoho zvířátka jsi slyšel všechno.', en: 'Ending collector. You have heard everything one animal has to say.' }, check: (s) => CHARACTERS.some(c => ((s.storySeen && s.storySeen[c.id]) || []).length >= (c.stories || []).length) },
    { id: 'diaryfull', icon: '📔', title: { cs: 'Přečetl jsi někomu celý deník. Snad to nevadí.', en: 'You read someone’s entire diary. Hopefully they do not mind.' }, check: () => CHARACTERS.some(c => (c.diary || []).length && diaryUnlocked(c) >= c.diary.length) },
    { id: 'bookworm', icon: '🤓', title: { cs: 'Chodící encyklopedie. Přečteno všech třicet zajímavostí.', en: 'Walking encyclopedia. All thirty facts read.' }, check: (s) => (s.factsRead || []).length >= CHARACTERS.reduce((n, c) => n + (c.facts || []).length, 0) },
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
  function toastAchievements(fresh, delay = 0) {
    fresh.forEach((a, i) => {
      setTimeout(() => toast(`🎖️ ${I18N.t('ach.new')}: ${a.icon} ${I18N.pick(a.title)}`), 700 + delay + i * 2800);
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

  /* =========================================================
     DENNÍ MISE

     Tři úkoly na den. Losují se deterministicky z data, takže na všech
     zařízeních (i po přeinstalaci) vyjdou stejné a nejde je „přetočit“
     smazáním dat. Sledují čísla, která hra už stejně počítá – žádné nové
     měření za běhu, jen jiný pohled na výsledek běhu.

     Odměna se nepřipisuje sama: hráč si ji vyzvedne v menu. Je to jeden
     klik navíc, ale dává důvod se do menu vrátit a mise si přečíst.
     ========================================================= */
  const DAILY_COUNT = 3;
  const DAILY_REWARD = 30;
  const QUESTS = [
    { id: 'dist', targets: [800, 1200, 1800, 2500], val: (r) => r.dist },
    { id: 'carrots', targets: [25, 40, 60], val: (r) => r.carrots },
    { id: 'coins', targets: [30, 50, 80], val: (r) => r.coins },
    { id: 'combo', targets: [8, 12, 18, 30], val: (r) => r.combo },
    { id: 'golden', targets: [1, 2, 3], val: (r) => r.golden },
    { id: 'clean', targets: [400, 700, 1000], val: (r) => r.clean },
    // jediná kumulativní mise – počítá běhy za celý dnešek, ne za jeden běh
    { id: 'runs', targets: [2, 3, 4], val: (r, d) => d.runsToday || 0 },
  ];

  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // FNV-1a – z data udělá stabilní číslo, ze kterého se pak losuje
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFrom(seed) {
    let s = seed || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function ensureDaily() {
    const day = dayKey();
    if (save.daily && save.daily.day === day) return save.daily;
    const rnd = rngFrom(seedFrom(day));
    const pool = QUESTS.slice();
    const picks = [];
    for (let i = 0; i < DAILY_COUNT && pool.length; i++) {
      const q = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      picks.push({ id: q.id, target: q.targets[Math.floor(rnd() * q.targets.length)], done: false, claimed: false });
    }
    save.daily = { day, runsToday: 0, picks };
    persist();
    return save.daily;
  }

  // po doběhnutí zkontroluje mise; vrací true, když něco nově cvaklo
  function checkDaily(runStats) {
    const d = ensureDaily();
    let changed = false;
    for (const p of d.picks) {
      if (p.done) continue;
      const q = QUESTS.find(x => x.id === p.id);
      if (q && q.val(runStats, d) >= p.target) { p.done = true; changed = true; }
    }
    if (changed) persist();
    return changed;
  }

  function claimDaily(idx) {
    const d = ensureDaily();
    const p = d.picks[idx];
    if (!p || !p.done || p.claimed) return;
    p.claimed = true;
    save.coins += DAILY_REWARD;
    persist();
    AUDIO.play('buy');
    PLATFORM.haptic('success');
    toast(I18N.t('toast.daily') + ' +' + DAILY_REWARD + ' 🪙');
    initMenu();
  }

  // vysouvací panel misí – zdrojem pravdy je atribut hidden (kvůli čtečkám),
  // vzhled přechodu si CSS řeší samo
  function closeDaily() {
    const pop = $('daily-pop');
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    $('btn-daily').setAttribute('aria-expanded', 'false');
  }
  function toggleDaily() {
    const pop = $('daily-pop');
    const open = pop.hidden;
    pop.hidden = !open;
    $('btn-daily').setAttribute('aria-expanded', String(open));
    AUDIO.play('click');
  }

  // vrací { done, total }, ať odznak v menu ví, co má ukázat
  function buildDaily() {
    const d = ensureDaily();
    const list = $('daily-list');
    list.innerHTML = '';
    const stat = {
      done: d.picks.filter(p => p.done || p.claimed).length,
      total: d.picks.length,
      claimable: d.picks.filter(p => p.done && !p.claimed).length,
    };
    const allClaimed = d.picks.every(p => p.claimed);
    if (allClaimed) {
      const p = document.createElement('p');
      p.className = 'daily-alldone';
      p.textContent = I18N.t('daily.allDone');
      list.appendChild(p);
      return stat;
    }
    d.picks.forEach((p, i) => {
      if (p.claimed) return;
      const row = document.createElement('div');
      row.className = 'daily-row' + (p.done ? ' done' : '');
      const txt = document.createElement('span');
      txt.className = 'daily-text';
      txt.textContent = I18N.t('q.' + p.id, { n: p.target });
      row.appendChild(txt);
      if (p.done) {
        const b = document.createElement('button');
        b.className = 'btn tiny daily-claim';
        b.textContent = I18N.t('daily.claim', { n: DAILY_REWARD });
        b.addEventListener('click', () => claimDaily(i));
        row.appendChild(b);
      }
      list.appendChild(row);
    });
    return stat;
  }

  /* =========================================================
     SDÍLECÍ KARTIČKA
     Čtverec 1080×1080 pro sociální sítě. Kulisu kreslí přímo herní GFX
     v paletě Zlaté hodinky, takže obrázek vypadá jako hra, ne jako
     tabulka výsledků – a nepotřebuje k tomu jediný nový soubor.

     Rozvržení má pevné zóny, aby si zvířátko a text nikdy nelezly do
     cesty (dřív postavě trčely uši přes řádek se statistikami):

       0–190     značka LOUKA RUN + podtitul
       210–450   cedule s doběhnutou vzdáleností
       470–556   tři žetony: mince, mrkve, řetěz
       ~600–840  bublina s hláškou postavy, vždy vpravo (x 452–1024)
       vlevo dole zvířátko (x ~90–430), úplně dole lišta s oběma verzemi
     ========================================================= */
  const SHARE_URL = 'https://nechmerust.org';
  const SHARE_FONT = '"Baloo 2", system-ui, sans-serif';

  /* Hláška, kterou zvířátko komentuje výsledek běhu. Kategorie se vybírá
     podle toho, co je na běhu nejpozoruhodnější – takže rekordní řetěz
     dostane jinou poznámku než sotva rozběhnutých dvě stě metrů. Kdyby
     postava hlášky neměla, zaskočí za ni její běžná hláška ze hry. */
  function shareQuip(chr, dist, coins, combo) {
    const q = chr.shareQuips;
    if (!q) return I18N.pick(chr.quotes[Math.floor(Math.random() * chr.quotes.length)]);
    const key = dist < 250 ? 'short'
      : combo >= 12 ? 'chain'
      : coins >= 120 ? 'rich'
      : dist >= 2000 ? 'far'
      : 'plain';
    return I18N.pick(q[key] || q.plain)
      .replace(/\{d\}/g, dist)
      .replace(/\{c\}/g, coins)
      .replace(/\{k\}/g, combo);
  }

  // plátno neumí zalamovat text samo
  function shareWrap(c, text, maxW) {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && c.measureText(next).width > maxW) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  // skleněný žeton (statistiky i lišta dole)
  function shareChip(c, x, y, w, h, dark) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.28)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.fillStyle = dark ? 'rgba(28,20,10,0.42)' : 'rgba(255,253,245,0.92)';
    GFX.rr(c, x, y, w, h, h / 2); c.fill();
    c.restore();
    c.strokeStyle = dark ? 'rgba(255,224,138,0.45)' : 'rgba(216,155,38,0.5)';
    c.lineWidth = 3;
    GFX.rr(c, x + 1.5, y + 1.5, w - 3, h - 3, (h - 3) / 2); c.stroke();
  }

  /* Hrací trojúhelník Google Play – jednobarevně a v malém, aby v rohu jen
     nenápadně řekl „hra je i v telefonu". Čtyřbarevnou značku schválně
     nekreslíme: přebarvená napodobenina by vypadala hůř než decentní znak. */
  function drawPlayMark(c, x, y, s) {
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#fffdf5';
    c.beginPath();
    c.moveTo(-8, -13); c.lineTo(12, 0); c.lineTo(-8, 13); c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 2.2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-8, -13); c.lineTo(2.5, 0); c.lineTo(-8, 13); c.stroke();
    c.restore();
  }

  // zeměkoule u webové adresy – protějšek trojúhelníku Google Play
  function drawWebMark(c, x, y, s) {
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.strokeStyle = '#fffdf5'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 5.5, 12, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(12, 0); c.stroke();
    c.restore();
  }

  function buildShareCard(dist, coins, chr, combo, carrots, isBest) {
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1080;
    const c = cv.getContext('2d');
    const W = 1080, H = 1080, GY = 742;
    /* Paleta: zlatá obloha ze Zlaté hodinky nad zelenou Rozkvetlou loukou.
       Čistá Zlatá hodinka je celá do hněda a zvířátko v ní zaniká; tahle
       směs má teplé nebe i trávu, na které je postava vidět. */
    const meadow = ENVS.find(e => e.id === 'louka') || ENVS[0];
    const dusk = ENVS.find(e => e.id === 'zapad') || meadow;
    const pal = {
      ...meadow,
      skyTop: '#7fc6ef', skyBottom: '#ffd9a0',
      hillFar: '#9fd39a', hillNear: '#6bb268',
      sun: dusk.sun, clouds: '#fff1de',
    };
    const T = 3200; // pevný čas, ať je kartička pokaždé stejná

    /* ---------- kulisa ---------- */
    GFX.drawSky(c, W, H, pal, T);
    GFX.drawClouds(c, W, H, pal, 0, T);
    GFX.drawHills(c, W, H, pal, 0, GY);
    GFX.drawGodRays(c, W, H, pal, GY, T, 1);

    /* Tráva se kreslí ručně, ne přes GFX.drawGround: herní pěšina by
       kartičku přeťala vodorovným pruhem přesně tam, kde má být volná
       louka. Místo ní je popředí o odstín tmavší, oddělené měkkou vlnou –
       zvířátko tak stojí „blíž ke kameře" a nevisí ve vzduchu. */
    c.fillStyle = pal.ground; c.fillRect(0, GY, W, H - GY);
    c.fillStyle = pal.groundDark;
    c.beginPath(); c.moveTo(0, 902);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, 902 - 26 * Math.sin(x * 0.0042));
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    // trsy trávy na hraně popředí
    c.strokeStyle = 'rgba(30,70,26,0.35)'; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = GFX.hash(i * 13 + 6) * W;
      const y = 902 - 26 * Math.sin(x * 0.0042) + 6;
      const lean = (GFX.hash(i * 17 + 2) - 0.5) * 16;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean, y - 16, x + lean * 1.6, y - 28); c.stroke();
    }

    // poletující pyl – hloubka a trocha jiskry
    c.save();
    for (let i = 0; i < 30; i++) {
      c.globalAlpha = 0.12 + GFX.hash(i * 5 + 1) * 0.26;
      c.fillStyle = '#fff3c9';
      c.beginPath();
      c.arc(GFX.hash(i * 3 + 2) * W, 200 + GFX.hash(i * 7 + 3) * 700,
        3 + GFX.hash(i * 11 + 4) * 9, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    // ztmavení k okrajům – text drží kontrast a obraz působí „nafoceně"
    const vig = c.createRadialGradient(W / 2, H * 0.44, H * 0.26, W / 2, H * 0.5, H * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(46,24,8,0.44)');
    c.fillStyle = vig; c.fillRect(0, 0, W, H);

    /* ---------- zvířátko (vlevo dole, mimo veškerý text) ---------- */
    const chX = 226, chY = 962, chS = 2.95;
    c.save();
    c.globalAlpha = 0.24; c.fillStyle = '#000';
    GFX.ell(c, chX + 8, chY + 14, 148, 22); c.fill();
    c.restore();
    GFX.drawCharacter(c, chr, chX, chY, chS, { runPhase: 0.6, trophy: charTrophy(chr) }, 400);

    /* ---------- značka ---------- */
    c.font = '800 96px ' + SHARE_FONT;
    c.textAlign = 'left';
    const t1 = 'LOUKA ', t2 = 'RUN';
    const w1 = c.measureText(t1).width, w2 = c.measureText(t2).width;
    const tx = W / 2 - (w1 + w2) / 2;
    c.lineJoin = 'round'; c.lineWidth = 14;
    c.strokeStyle = 'rgba(58,32,12,0.55)';
    c.shadowColor = 'rgba(0,0,0,0.32)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
    c.strokeText(t1, tx, 130); c.strokeText(t2, tx + w1, 130);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.fillStyle = '#fffdf5'; c.fillText(t1, tx, 130);
    c.fillStyle = '#ffc94a'; c.fillText(t2, tx + w1, 130);

    c.textAlign = 'center';
    c.font = '600 34px ' + SHARE_FONT;
    c.fillStyle = 'rgba(52,32,14,0.78)';
    c.fillText(I18N.t('share.card.sub'), W / 2, 184);

    /* ---------- cedule s výsledkem ---------- */
    const px = 100, py = 214, pw = W - 200, ph = 232;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 36; c.shadowOffsetY = 14;
    const pg = c.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, 'rgba(30,44,26,0.58)');
    pg.addColorStop(1, 'rgba(22,30,18,0.44)');
    c.fillStyle = pg; GFX.rr(c, px, py, pw, ph, 46); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(255,214,120,0.7)'; c.lineWidth = 3;
    GFX.rr(c, px + 2, py + 2, pw - 4, ph - 4, 44); c.stroke();

    // rekord dostane zlatou pentli přes roh cedule
    if (isBest) {
      c.save();
      c.translate(px + pw - 108, py + 6);
      c.rotate(-0.12);
      c.font = '800 34px ' + SHARE_FONT;
      const rt = I18N.t('share.card.record');
      const rw = c.measureText(rt).width + 52;
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
      const rg = c.createLinearGradient(0, -26, 0, 26);
      rg.addColorStop(0, '#fff0bd'); rg.addColorStop(1, '#e8a72c');
      c.fillStyle = rg;
      GFX.rr(c, -rw / 2, -26, rw, 52, 26); c.fill();
      c.shadowColor = 'transparent'; c.shadowBlur = 0;
      c.fillStyle = '#4a3220'; c.textAlign = 'center';
      c.letterSpacing = '2px';
      c.fillText(rt, 0, 12);
      c.letterSpacing = '0px';
      c.restore();
    }

    c.textAlign = 'center';
    c.font = '700 32px ' + SHARE_FONT;
    c.fillStyle = 'rgba(255,232,178,0.85)';
    c.letterSpacing = '4px';
    c.fillText(I18N.t('share.card.dist'), W / 2, py + 62);
    c.letterSpacing = '0px';

    const num = dist + ' m';
    c.font = '800 150px ' + SHARE_FONT;
    const ng = c.createLinearGradient(0, py + 84, 0, py + 200);
    ng.addColorStop(0, '#fff8e2'); ng.addColorStop(0.55, '#ffd76a'); ng.addColorStop(1, '#e09a24');
    c.lineWidth = 16; c.strokeStyle = 'rgba(48,28,8,0.75)';
    c.shadowColor = 'rgba(255,196,90,0.5)'; c.shadowBlur = 34;
    c.strokeText(num, W / 2, py + 192);
    c.shadowColor = 'transparent'; c.shadowBlur = 0;
    c.fillStyle = ng; c.fillText(num, W / 2, py + 192);

    /* ---------- žetony se statistikami ---------- */
    // prázdné hodnoty se nevypisují – žeton „ŘETĚZ ×0" by se jen chlubil nulou
    const chips = [{ icon: 'coin', text: String(coins) }];
    if (carrots > 0) chips.push({ icon: 'carrot', text: String(carrots) });
    if (combo > 0) chips.push({ icon: null, text: I18N.t('share.card.chain') + ' ×' + combo });
    c.font = '700 42px ' + SHARE_FONT;
    const chH = 82, chGap = 20;
    for (const ch of chips) ch.w = 46 + (ch.icon ? 54 : 0) + c.measureText(ch.text).width;
    let cx = W / 2 - (chips.reduce((s, ch) => s + ch.w, 0) + chGap * (chips.length - 1)) / 2;
    const chYtop = 474;
    for (const ch of chips) {
      shareChip(c, cx, chYtop, ch.w, chH, true);
      let inner = cx + 23;
      if (ch.icon === 'coin') {
        c.save(); c.translate(inner + 22, chYtop + chH / 2); c.scale(1.9, 1.9);
        GFX.drawCoin(c, 0, 0, 0); c.restore();
        inner += 54;
      } else if (ch.icon === 'carrot') {
        c.save(); c.translate(inner + 22, chYtop + chH / 2 - 4); c.scale(1.5, 1.5);
        GFX.drawCarrot(c, 0, 0, 0); c.restore();
        inner += 54;
      }
      c.textAlign = 'left';
      c.fillStyle = '#fff3d0';
      c.fillText(ch.text, inner, chYtop + chH / 2 + 15);
      cx += ch.w + chGap;
    }

    /* ---------- bublina s hláškou ----------
       Sedí vždy vpravo a ocáskem míří k hlavě zvířátka, které stojí vlevo –
       ať je hláška jakkoli dlouhá, na postavu nikdy nedosáhne. */
    const quip = shareQuip(chr, dist, coins, combo);
    const bx = 452, bw = W - bx - 56, pad = 38;
    let fs = 42;
    let lines;
    for (;;) {
      c.font = '700 ' + fs + 'px ' + SHARE_FONT;
      lines = shareWrap(c, quip, bw - pad * 2);
      if (lines.length <= 4 || fs <= 32) break;
      fs -= 3;
    }
    const lh = Math.round(fs * 1.3);
    const bh = lines.length * lh + pad * 2 + 46;
    const bBottom = 846, by = bBottom - bh;

    c.save();
    c.shadowColor = 'rgba(0,0,0,0.34)'; c.shadowBlur = 34; c.shadowOffsetY = 12;
    c.fillStyle = '#fffdf5';
    c.beginPath(); // ocásek k hlavě
    c.moveTo(bx + 30, by + bh - 92);
    c.lineTo(396, 800);
    c.lineTo(bx + 116, by + bh - 8);
    c.closePath(); c.fill();
    GFX.rr(c, bx, by, bw, bh, 44); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(216,155,38,0.5)'; c.lineWidth = 3;
    GFX.rr(c, bx + 1.5, by + 1.5, bw - 3, bh - 3, 42); c.stroke();

    // uvozovka jako v cílové obrazovce
    c.textAlign = 'left';
    c.font = '800 92px ' + SHARE_FONT;
    c.fillStyle = 'rgba(216,155,38,0.32)';
    c.fillText('“', bx + 20, by + 88);

    c.font = '700 ' + fs + 'px ' + SHARE_FONT;
    c.fillStyle = '#4a3220';
    lines.forEach((ln, i) => c.fillText(ln, bx + pad, by + pad + lh * (i + 0.78)));

    c.textAlign = 'right';
    c.font = '600 32px ' + SHARE_FONT;
    c.fillStyle = 'rgba(120,92,52,0.9)';
    c.fillText('— ' + I18N.pick(chr.name), bx + bw - pad, by + bh - pad + 6);

    /* ---------- lišta: hra běží na webu i v telefonu ---------- */
    const fh = 132;
    const fg = c.createLinearGradient(0, H - fh, 0, H);
    fg.addColorStop(0, 'rgba(26,16,6,0)');
    fg.addColorStop(0.45, 'rgba(26,16,6,0.5)');
    fg.addColorStop(1, 'rgba(20,12,4,0.8)');
    c.fillStyle = fg; c.fillRect(0, H - fh, W, fh);

    const barY = H - 84, barH = 62;
    c.font = '700 34px ' + SHARE_FONT;
    const webText = SHARE_URL.replace('https://', '');
    const wW = 44 + 40 + c.measureText(webText).width + 30;
    shareChip(c, 44, barY, wW, barH, true);
    drawWebMark(c, 44 + 40, barY + barH / 2, 1.05);
    c.textAlign = 'left'; c.fillStyle = '#fff3d0';
    c.fillText(webText, 44 + 74, barY + barH / 2 + 12);

    const gpText = 'Google Play';
    const gW = 44 + 36 + c.measureText(gpText).width + 30;
    shareChip(c, W - 44 - gW, barY, gW, barH, true);
    drawPlayMark(c, W - 44 - gW + 38, barY + barH / 2, 1.05);
    c.fillStyle = '#fff3d0';
    c.fillText(gpText, W - 44 - gW + 68, barY + barH / 2 + 12);

    return cv;
  }

  function shareRun() {
    const dist = Math.floor(S.worldX / PX_PER_M);
    const chr = S.char || charById(save.selected) || CHARACTERS[0];
    // save.best je v tuhle chvíli už po zápisu z endRun, takže rovnost = rekord
    const cv = buildShareCard(dist, runCoins(), chr, S.comboBest, S.carrotsRun, dist >= save.best && dist > 0);
    const text = I18N.t('share.text', { d: dist, name: I18N.pick(chr.name), url: SHARE_URL });
    AUDIO.play('click');
    cv.toBlob((blob) => {
      PLATFORM.share({ title: I18N.t('share.title'), text, blob, filename: 'louka-run.png' });
    }, 'image/png');
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
    // stejné pruhy rychlost/skok/výdrž jako na kartě v obchodě
    const stats = $('menu-stats');
    stats.innerHTML = '';
    stats.appendChild(statRows(ch));
    syncAudioBtns();
    $('btn-install').textContent = I18N.t('menu.install');
    const d = buildDaily();
    $('daily-badge').textContent = `${d.done}/${d.total}`;
    // odznak svítí, jen když je opravdu co vyzvednout – jinak by pulzoval pořád
    $('btn-daily').classList.toggle('lucky', d.claimable > 0);
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
  // pruhy rychlost/skok/výdrž – stejné v obchodě i v decku hlavního menu
  function statRows(ch) {
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
    return rows;
  }

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

      card.appendChild(statRows(ch));

      /* Deníček z azylu – opravdové útržky ze života zvířátka a zajímavosti
         o jeho druhu. Na kartě je jen ochutnávka: karta v karuselu má pevnou
         výšku (#shop-grid má overflow-y: hidden), takže celý deníček by
         přetlačil statistiky i tlačítko mimo záběr. Kliknutím se otevře
         knížka přes celou obrazovku, ve které se dá listovat.

         Otevírá se i u nekoupeného zvířátka – zajímavosti o druhu za
         odměnu schované nejsou, zamčené zůstávají jen osobní zápisky. */
      if ((ch.diary && ch.diary.length) || (ch.facts && ch.facts.length)) {
        const box = document.createElement('button');
        box.className = 'diary';
        box.type = 'button';
        const dTitle = document.createElement('div');
        dTitle.className = 'diary-title';
        const have = diaryUnlocked(ch);
        dTitle.textContent = I18N.t('shop.diary');
        if (ch.diary && ch.diary.length) dTitle.textContent += `  ${have}/${ch.diary.length}`;
        box.appendChild(dTitle);
        const p = document.createElement('p');
        if (have > 0) {
          p.className = 'diary-entry';
          p.textContent = I18N.pick(ch.diary[have - 1]);
        } else {
          p.className = 'diary-entry locked';
          p.textContent = '🔒 ' + I18N.t('shop.diaryLocked', { n: DIARY_STEP });
        }
        box.appendChild(p);
        const more = document.createElement('span');
        more.className = 'diary-more';
        more.textContent = I18N.t('shop.diaryOpen', { n: (ch.facts || []).length });
        box.appendChild(more);
        box.addEventListener('click', () => openDiary(ch));
        card.appendChild(box);
      }

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
  /* Start běhu z menu má krátkou „nápřahovku“: tlačítko se přikrčí, kroužek
     kolem něj praskne a obrazovka blikne. Je to 180 ms, po kterých teprve
     hra vystartuje – dost na to, aby stisk něco znamenal, a málo na to, aby
     to zdržovalo. V šetrném režimu i na slabém telefonu se přeskočí. */
  const LAUNCH_MS = 180;
  const reduceMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  $('btn-play').addEventListener('click', () => {
    if (lowFx || reduceMotionMq.matches) { startRun(); return; }
    const menu = $('screen-menu');
    menu.classList.add('launching');
    AUDIO.play('click');
    setTimeout(() => { menu.classList.remove('launching'); startRun(); }, LAUNCH_MS);
  });
  $('btn-shop').addEventListener('click', () => { buildShop(); showScreen('shop'); AUDIO.play('click'); });
  $('btn-shop-back').addEventListener('click', () => { initMenu(); showScreen('menu'); AUDIO.play('click'); });
  $('btn-ach').addEventListener('click', () => { buildAch(); showScreen('ach'); AUDIO.play('click'); });
  $('btn-ach-back').addEventListener('click', () => { initMenu(); showScreen('menu'); AUDIO.play('click'); });
  $('btn-settings').addEventListener('click', () => { showScreen('settings'); AUDIO.play('click'); });
  $('btn-settings-back').addEventListener('click', () => { initMenu(); showScreen('menu'); AUDIO.play('click'); });
  /* ---------- listování v deníčku ---------- */
  $('btn-diary-close').addEventListener('click', () => { AUDIO.play('click'); showScreen('shop'); });
  $('btn-diary-prev').addEventListener('click', () => turnBook(-1));
  $('btn-diary-next').addEventListener('click', () => turnBook(1));
  // tažení prstem po knížce listuje jako v opravdové knize; v otočené
  // hře nese vodorovnou osu clientY (stejně jako u pointerGameY)
  const bookX = (e) => (forcedLandscape() ? e.clientY : e.clientX);
  let bookDrag = null;
  $('book').addEventListener('pointerdown', (e) => { bookDrag = bookX(e); });
  $('book').addEventListener('pointerup', (e) => {
    if (bookDrag === null) return;
    const dx = bookX(e) - bookDrag;
    bookDrag = null;
    if (Math.abs(dx) > 42) turnBook(dx < 0 ? 1 : -1);
  });
  $('book').addEventListener('pointercancel', () => { bookDrag = null; });
  window.addEventListener('keydown', (e) => {
    if (curScreen !== 'diary') return;
    if (e.code === 'ArrowRight') { e.preventDefault(); turnBook(1); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); turnBook(-1); }
  });

  $('btn-daily').addEventListener('click', toggleDaily);
  $('btn-again').addEventListener('click', startRun);
  $('btn-share').addEventListener('click', shareRun);
  $('btn-over-menu').addEventListener('click', backToMenu);
  $('btn-over-shop').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); buildShop(); showScreen('shop'); });
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-tut-continue').addEventListener('click', continueLesson);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-pause-menu').addEventListener('click', backToMenu);

  // ťuknutí do karty dopíše vtip hned – kdo pointu nechce číst po písmenkách,
  // nemusí čekat (tlačítka si klik nechají pro sebe)
  $('screen-over').addEventListener('pointerdown', (e) => {
    if (overSkip && !e.target.closest('button')) overSkip();
  });

  // ťuknutí mimo panel misí ho zavře – jinak by v menu překážel
  $('screen-menu').addEventListener('pointerdown', (e) => {
    if (!$('daily-pop').hidden && !e.target.closest('.menu-missions')) closeDaily();
  });

  /* ---------- parallax (jen myš) ----------
     Vrstvy menu se posunou podle kurzoru. Schválně jen na jemném ukazovateli:
     na telefonu je hra otočená o 90° (souřadnice by se musely prohazovat)
     a snímkový rozpočet patří scéně na plátně, ne ozdobě. */
  if (window.matchMedia('(pointer: fine)').matches) {
    const menu = $('screen-menu');
    let px = 0, py = 0, queued = false;
    menu.addEventListener('pointermove', (e) => {
      if (lowFx || reduceMotionMq.matches) return;
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        menu.style.setProperty('--px', px.toFixed(3));
        menu.style.setProperty('--py', py.toFixed(3));
      });
    });
    menu.addEventListener('pointerleave', () => {
      menu.style.setProperty('--px', '0');
      menu.style.setProperty('--py', '0');
    });
  }
  /* ---------- zvuk a hudba ----------
     Stejná dvojice přepínačů je v nastavení i na pauze: když hráče uprostřed
     běhu vyruší hudba, nemá důvod kvůli ztlumení opouštět rozběhnutý běh.
     Popisky drží obě dvojice pohromadě syncAudioBtns(). */
  function labelAudioBtn(id, on, onIcon, offIcon, key) {
    const b = $(id);
    if (!b) return;
    b.textContent = (on ? onIcon : offIcon) + ' ' + I18N.t(key);
    b.classList.toggle('muted', !on);
    b.setAttribute('aria-pressed', String(on));
  }
  function syncAudioBtns() {
    const sfx = save.sfx !== false, music = save.music !== false;
    labelAudioBtn('btn-sfx', sfx, '🔊', '🔇', 'menu.sounds');
    labelAudioBtn('btn-pause-sfx', sfx, '🔊', '🔇', 'menu.sounds');
    labelAudioBtn('btn-music', music, '🎵', '🚫', 'menu.music');
    labelAudioBtn('btn-pause-music', music, '🎵', '🚫', 'menu.music');
  }
  function toggleSfx() {
    save.sfx = !(save.sfx !== false);
    persist(); AUDIO.setSfx(save.sfx); PLATFORM.setHaptics(save.sfx); syncAudioBtns();
  }
  function toggleMusic() {
    save.music = !(save.music !== false);
    persist(); AUDIO.setMusic(save.music); syncAudioBtns();
    // po zapnutí navázat tam, kde hráč je – na pauze zní stopa prostředí, ne menu
    if (save.music) AUDIO.playMusic(S.mode === 'paused' ? (S.lastEnvId || 'louka') : 'menu');
  }
  /* ---------- Karel: tlačítko v menu a napojení scény ----------
     Uložený stav drží hra (je v jednom saveu se vším ostatním), scéna
     si o něj řekne přes hooks – js/karel.js sám do úložiště nesahá. */
  $('btn-karel').addEventListener('click', () => {
    AUDIO.play('click');
    $('btn-karel').classList.remove('nudge');
    KAREL.open({ lowFx: lowFx || reduceMotionMq.matches });
  });
  KAREL.init({
    getAlways: () => !!save.karelAlways,
    setAlways: (on) => { save.karelAlways = !!on; save.karelSeen = true; persist(); },
    onSeen: () => {
      if (save.karelSeen) return;
      save.karelSeen = true;
      persist();
      // ať je po prvním setkání vidět, kde Karla příště najít
      $('btn-karel').classList.add('nudge');
      setTimeout(() => { if (!KAREL.isOpen()) toast(I18N.t('toast.karel')); }, 900);
    },
  });

  $('btn-sfx').addEventListener('click', toggleSfx);
  $('btn-music').addEventListener('click', toggleMusic);
  $('btn-pause-sfx').addEventListener('click', toggleSfx);
  $('btn-pause-music').addEventListener('click', toggleMusic);

  // hardwarové Zpět na Androidu i Escape v prohlížeči – bez tohohle by
  // aplikace na Androidu skončila i uprostřed běhu
  PLATFORM.onBack(goBack);

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
  });

  /* =========================================================
     SMYČKA
     ========================================================= */
  /* ---------- výkonnostní overlay (?perf=1) ----------
     Diagnostika na reálném zařízení: FPS, průměr/špička frame-time, počet
     dlouhých snímků (>50 ms = pravděpodobně GC/zádrhel) a aktuální DPR krok
     (ukáže, jestli autoQuality snížil rozlišení). Ve výchozím stavu vypnutý –
     když neběží, nestojí vůbec nic. */
  const PERF = (() => {
    if (!new URLSearchParams(location.search).has('perf')) return null;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;'
      + 'font:12px/1.35 monospace;color:#0f0;background:rgba(0,0,0,.62);'
      + 'padding:5px 8px;border-radius:6px;white-space:pre;pointer-events:none;'
      + 'text-shadow:0 1px 1px #000';
    document.body.appendChild(el);
    const N = 90;                 // okno ~1,5 s při 60 fps
    const times = new Float32Array(N);
    let idx = 0, filled = 0, longFrames = 0, sinceDraw = 0;
    return {
      record(rawMs) {
        times[idx] = rawMs;
        idx = (idx + 1) % N;
        if (filled < N) filled++;
        if (rawMs > 50) longFrames++;
        if (++sinceDraw < 15) return; // překreslit ~4×/s, ať overlay sám nežere
        sinceDraw = 0;
        let sum = 0, max = 0;
        for (let i = 0; i < filled; i++) { const v = times[i]; sum += v; if (v > max) max = v; }
        const avg = sum / filled;
        el.textContent =
          `FPS ${Math.round(1000 / avg)}  avg ${avg.toFixed(1)}ms\n`
          + `max ${max.toFixed(1)}ms  dlouhé>50ms ${longFrames}\n`
          + `DPR ${DPR.toFixed(2)} (krok ${dprStep})`;
      },
    };
  })();

  let last = performance.now();
  function frame(now) {
    const rawDt = Math.max(0, (now - last) / 1000);
    const dt = Math.min(rawDt, 0.05);
    last = now;
    if (PERF) PERF.record(rawDt * 1000);
    // Karlova scéna kreslí i vlastní pozadí, takže herní plátno pod ní
    // není vidět – na tu dobu se svět neaktualizuje ani nekreslí a celý
    // snímkový rozpočet zůstane portálu a postavě
    if (typeof KAREL !== 'undefined' && KAREL.isOpen()) {
      requestAnimationFrame(frame);
      return;
    }
    autoQuality(rawDt);
    menuFxWatch(rawDt);
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // start: intro se zvířátky a logem azylu, za ním už běží demo svět
  I18N.apply(); // propíše uložený jazyk do celého UI
  initParticlePool(); // pevný zásobník částic – vyrobí se jednou a dál se recykluje
  resetWorld(true);
  initMenu();
  initIntro();
  showScreen('intro'); // schová menu i HUD, vidět je jen canvas
  // hudba běží od úplného začátku – když prohlížeč autoplay nedovolí,
  // rozjede ji první dotek/klávesa (AUDIO si to pohlídá sám)
  AUDIO.playMusic('intro');
  requestAnimationFrame(frame);
})();
