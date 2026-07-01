/* =========================================================
   LOUKA RUN – herní engine
   Endless runner na podporu azylu Nech mě růst
   ========================================================= */

(() => {
  const { CHARACTERS, ENVS, OBSTACLES, SIGNS, EVENTS, ECONOMY } = DATA;

  /* ---------- canvas ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, groundY = 0;

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
    mode: 'menu',           // menu | run | over | paused
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
    // hráč
    py: 0, vy: 0, airborne: false, jumps: 0,
    sliding: 0,             // zbývající čas skluzu (s)
    stumble: 0, invuln: 0, squash: 0,
    runPhase: 0, blink: 0,
    // svět
    obstacles: [], pickups: [], decor: [], particles: [], floaters: [],
    nextObstacleX: 900, nextPickupX: 600, nextDecorX: 200,
    // hlášky
    bubble: null, bubbleT: 0, nextQuoteAt: 6,
    saidLowEnergy: false, lastMilestone: 0,
    shake: 0,
    demo: true,             // atrakt mód za menu
  };

  const PX_PER_M = 42;
  const GRAVITY = 2600;

  function charById(id) { return CHARACTERS.find(c => c.id === id); }

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
    }
  }

  function slide() {
    if (S.mode !== 'run') return;
    if (S.airborne) { S.vy = Math.max(S.vy, 1500); } // rychlý sešup
    S.sliding = 0.65;
    AUDIO.play('slide');
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); uiOrJump(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); slide(); }
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  });

  function uiOrJump() {
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
  function playerX() { return Math.min(W * 0.3, 260); }

  function resetWorld(demo) {
    S.worldX = 0;
    S.obstacles = []; S.pickups = []; S.decor = []; S.particles = []; S.floaters = [];
    S.nextObstacleX = demo ? Infinity : 1000;
    S.nextPickupX = demo ? Infinity : 650;
    S.nextDecorX = 100;
    S.py = 0; S.vy = 0; S.airborne = false; S.jumps = 0; S.sliding = 0;
    S.stumble = 0; S.invuln = 0; S.bubble = null;
    S.saidLowEnergy = false; S.lastMilestone = 0; S.nextQuoteAt = 6 + Math.random() * 6;
  }

  function startRun() {
    AUDIO.ensureCtx();
    S.char = charById(save.selected) || CHARACTERS[0];
    S.stats = S.char.stats;
    S.energy = ECONOMY.startEnergy;
    S.coinsRun = 0; S.carrotsRun = 0;
    S.ramLeft = S.stats.ram || 0;
    S.speed = S.baseSpeed * S.stats.speed;
    S.demo = false;
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
    save.coins += S.coinsRun;
    save.runs += 1;
    const dist = Math.floor(S.worldX / PX_PER_M);
    const isBest = dist > save.best;
    if (isBest) save.best = dist;
    persist();
    AUDIO.play('finish');

    // příběhový konec
    const story = S.char.stories[Math.floor(Math.random() * S.char.stories.length)];
    document.getElementById('over-title').textContent = isBest ? '🏆 NOVÝ REKORD!' : 'CÍL DNEŠNÍHO BĚHU!';
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
    const pool = OBSTACLES;
    const ob = pool[Math.floor(Math.random() * pool.length)];
    const o = {
      ...ob,
      x: S.nextObstacleX,
      y: 0, // dopočítá se při kreslení (svět → obrazovka)
      broken: false,
    };
    S.obstacles.push(o);
    // mezera podle rychlosti – vždy dost času zareagovat
    const reaction = S.speed * (0.85 + Math.random() * 0.9);
    S.nextObstacleX += Math.max(340, reaction);

    // občas mince nad překážkou
    if (Math.random() < 0.45 && !o.flying) {
      for (let i = 0; i < 3; i++) {
        S.pickups.push({ kind: 'coin', x: o.x - 26 + i * 26, h: o.h + 70 + Math.sin(i / 2 * Math.PI) * 24 });
      }
    }
  }

  function spawnPickups() {
    const x0 = S.nextPickupX;
    const roll = Math.random();
    if (roll < 0.42) {
      // řada mrkví na zemi
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 46, h: 26 });
      S.nextPickupX = x0 + n * 46 + 420 + Math.random() * 380;
    } else if (roll < 0.72) {
      // oblouk mincí ve vzduchu
      const n = 5;
      for (let i = 0; i < n; i++) {
        S.pickups.push({ kind: 'coin', x: x0 + i * 40, h: 60 + Math.sin(i / (n - 1) * Math.PI) * 70 });
      }
      S.nextPickupX = x0 + n * 40 + 420 + Math.random() * 380;
    } else if (roll < 0.78) {
      // ZLATÁ MRKEV
      S.pickups.push({ kind: 'golden', x: x0, h: 96 });
      S.nextPickupX = x0 + 700 + Math.random() * 500;
    } else {
      // mrkve ve vzduchu (za dvojskok)
      const n = 3;
      for (let i = 0; i < n; i++) S.pickups.push({ kind: 'carrot', x: x0 + i * 44, h: 120 + i * 8 });
      S.nextPickupX = x0 + n * 44 + 460 + Math.random() * 400;
    }
  }

  function spawnDecor() {
    const env = currentEnv().env;
    const props = env.props;
    const p = props[Math.floor(Math.random() * props.length)];
    const far = Math.random() < 0.5;
    S.decor.push({
      prop: p,
      x: S.nextDecorX,
      far,
      s: far ? 0.55 + Math.random() * 0.25 : 0.8 + Math.random() * 0.4,
      extra: p === 'signpost' ? SIGNS[Math.floor(Math.random() * SIGNS.length)] : null,
    });
    S.nextDecorX += 260 + Math.random() * 420;
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
    S.bubbleT = 2.6;
    AUDIO.play('quote');
  }
  function randomQuote(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* =========================================================
     UPDATE
     ========================================================= */
  let ambientTimer = 0;

  function update(dt) {
    S.t += dt * 1000;

    if (S.mode === 'paused' || S.mode === 'over') return;
    const running = S.mode === 'run';
    const spd = S.demo ? S.baseSpeed * 0.8 : S.speed;

    // zrychlování
    if (running) {
      S.speed = Math.min(S.baseSpeed * S.stats.speed + (S.worldX / PX_PER_M) * 0.35, 760);
    }

    S.worldX += spd * dt * (S.stumble > 0 ? 0.55 : 1);

    // fyzika hráče
    if (S.airborne || S.py > 0) {
      S.vy += GRAVITY * dt;
      S.py -= S.vy * dt;
      if (S.py <= 0) {
        S.py = 0; S.vy = 0;
        if (S.airborne) { S.squash = 0.8; puffs(5); AUDIO.play('land'); }
        S.airborne = false; S.jumps = 0;
      }
    }
    S.sliding = Math.max(0, S.sliding - dt);
    S.stumble = Math.max(0, S.stumble - dt);
    S.invuln = Math.max(0, S.invuln - dt);
    S.squash *= Math.pow(0.0001, dt); // rychlé odeznění
    S.runPhase += dt * (10 + spd * 0.012);
    S.shake = Math.max(0, S.shake - dt * 3);

    // mrkání
    S.blink -= dt;
    if (S.blink < -3 - Math.random() * 3) S.blink = 0.12;

    // spawn
    while (S.nextDecorX < S.worldX + W + 400) spawnDecor();
    if (running) {
      while (S.nextObstacleX < S.worldX + W + 300) spawnObstacle();
      while (S.nextPickupX < S.worldX + W + 300) spawnPickups();
    }

    // úklid za obrazovkou
    const cut = S.worldX - 300;
    S.obstacles = S.obstacles.filter(o => o.x > cut);
    S.pickups = S.pickups.filter(p => p.x > cut && !p.taken);
    S.decor = S.decor.filter(d => d.x > cut - 400);

    // hudba podle prostředí
    if (running) {
      const envId = currentEnv().env.id;
      if (envId !== S.lastEnvId) { S.lastEnvId = envId; AUDIO.playMusic(envId); }
    }

    if (running) {
      // energie
      const speedFactor = (S.speed - S.baseSpeed) / 400;
      S.energy -= ECONOMY.drainPerSecond * S.stats.drain * (1 + speedFactor * 0.5) * dt;
      if (S.energy <= 25 && !S.saidLowEnergy) {
        S.saidLowEnergy = true;
        sayBubble(randomQuote(EVENTS.lowEnergy));
      }
      if (S.energy > 35) S.saidLowEnergy = false;
      if (S.energy <= 0) { S.energy = 0; endRun(); return; }

      collide(dt);
      quotes(dt);
      updateHud(false);
    }

    // částice
    for (const p of S.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav) p.vy += 500 * dt;
      p.life -= dt;
    }
    S.particles = S.particles.filter(p => p.life > 0);
    for (const f of S.floaters) { f.y -= 50 * dt; f.life -= dt * 0.9; }
    S.floaters = S.floaters.filter(f => f.life > 0);

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
          floater('ZLATÁ MRKEV! +' + ECONOMY.goldenCarrotEnergy + ' ⚡', sx, sy - 24, '#ffce3a');
          burst(sx, sy, '#ffd24a', 22);
          sayBubble(randomQuote(EVENTS.goldenCarrot));
          AUDIO.play('golden');
        } else {
          S.coinsRun++;
          floater('+1', sx, sy - 16, '#ffd24a');
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
        floater('BERANIDLO! 💥', sx, groundY - o.h - 30, '#ffd24a');
        S.shake = 0.6;
        AUDIO.play('ram');
        updateHud(true);
        continue;
      }

      // náraz – nenásilný: zvíře jen klopýtne, slepice uteče
      o.broken = true;
      if (o.id === 'chicken') {
        burst(sx, groundY - 30, '#f5f0e0', 12); // peříčka
        floater('Kokodák!!', sx, groundY - o.h - 26, '#e5533a');
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

    // dekorace (vzdálené za bližšími)
    for (const d of S.decor) {
      if (!d.far) continue;
      const sx = (d.x - S.worldX) * 0.75 + px;
      if (sx < -200 || sx > W + 200) continue;
      ctx.globalAlpha = 0.85;
      GFX.drawProp(ctx, d.prop, sx, groundY + 6, d.s, d.extra, S.t);
      ctx.globalAlpha = 1;
    }
    for (const d of S.decor) {
      if (d.far) continue;
      const sx = d.x - S.worldX + px;
      if (sx < -200 || sx > W + 200) continue;
      GFX.drawProp(ctx, d.prop, sx, groundY + 58, d.s, d.extra, S.t);
    }

    // sběratelné
    for (const p of S.pickups) {
      if (p.taken) continue;
      const sx = p.x - S.worldX + px;
      if (sx < -60 || sx > W + 60) continue;
      const sy = groundY - p.h;
      if (p.kind === 'coin') GFX.drawCoin(ctx, sx, sy, S.t);
      else GFX.drawCarrot(ctx, sx, sy, S.t, p.kind === 'golden');
    }

    // překážky
    for (const o of S.obstacles) {
      if (o.broken) continue;
      const sx = o.x - S.worldX + px;
      if (sx < -160 || sx > W + 160) continue;
      o.screenX = sx;
      GFX.drawObstacle(ctx, {
        ...o, x: sx,
        y: o.flying ? groundY - o.clearance : groundY,
      }, S.t);
    }

    // stín hráče
    const shScale = Math.max(0.4, 1 - S.py / 400);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    GFX.ell(ctx, px, groundY + 6, 44 * shScale, 8 * shScale);
    ctx.fill();

    // hráč
    const ch = S.char || charById(save.selected) || CHARACTERS[0];
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

    // bublina s hláškou
    if (S.bubbleT > 0 && S.bubble && S.mode === 'run') {
      drawBubble(px + 10, groundY - S.py - 120, S.bubble, Math.min(1, S.bubbleT * 3));
    }

    // částice
    for (const p of S.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2) * (p.a || 1);
      if (p.glow) {
        ctx.shadowColor = p.c; ctx.shadowBlur = 10;
      }
      ctx.fillStyle = p.c;
      const sway = p.sway ? Math.sin(S.t * 0.004 + p.sway) * 6 : 0;
      ctx.beginPath();
      ctx.arc(p.x + sway, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // plovoucí texty
    for (const f of S.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = 'bold 20px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // vinětace pro filmový vzhled
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBubble(x, y, text, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '600 17px "Baloo 2", sans-serif';
    const w = Math.min(ctx.measureText(text).width + 28, W - 40);
    const bx = Math.min(Math.max(x - w / 2, 10), W - w - 10);
    const by = y - 46;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    GFX.rr(ctx, bx, by, w, 38, 18);
    ctx.fill();
    // ocásek bubliny
    ctx.beginPath();
    ctx.moveTo(x - 6, by + 37); ctx.lineTo(x + 10, by + 37); ctx.lineTo(x, by + 52);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3230';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + w / 2, by + 25, w - 20);
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
    $('menu-charname').textContent = ch.name;
    $('menu-perk').textContent = ch.perk;
    $('btn-sfx').textContent = save.sfx !== false ? '🔊 Zvuky' : '🔇 Zvuky';
    $('btn-music').textContent = save.music !== false ? '🎵 Hudba' : '🚫 Hudba';
  }

  /* ---------- obchod ---------- */
  function buildShop() {
    const grid = $('shop-grid');
    grid.innerHTML = '';
    $('shop-coins').textContent = save.coins;
    for (const ch of CHARACTERS) {
      const owned = save.unlocked.includes(ch.id);
      const selected = save.selected === ch.id;
      const card = document.createElement('div');
      card.className = 'char-card' + (owned ? ' owned' : ' locked') + (selected ? ' selected' : '');

      const cv = document.createElement('canvas');
      cv.width = 190; cv.height = 150;
      card.appendChild(cv);

      const name = document.createElement('h3');
      name.textContent = ch.name;
      card.appendChild(name);

      const tag = document.createElement('p');
      tag.className = 'tagline';
      tag.textContent = ch.tagline;
      card.appendChild(tag);

      const perk = document.createElement('p');
      perk.className = 'perk';
      perk.textContent = ch.perk;
      card.appendChild(perk);

      const btn = document.createElement('button');
      btn.className = 'btn small';
      if (selected) { btn.textContent = '✓ Vybráno'; btn.disabled = true; }
      else if (owned) { btn.textContent = 'Vybrat'; }
      else if (ch.unlock.type === 'coins') {
        btn.textContent = `🪙 ${ch.unlock.price}`;
        btn.classList.add(save.coins >= ch.unlock.price ? 'buy' : 'cant');
      } else {
        btn.textContent = `⭐ PREMIUM · ${ch.unlock.price}`;
        btn.classList.add('premium');
      }
      btn.addEventListener('click', () => onCharAction(ch));
      card.appendChild(btn);
      grid.appendChild(card);
      drawPortrait(cv, ch);
    }
  }

  function onCharAction(ch) {
    AUDIO.play('click');
    if (save.unlocked.includes(ch.id)) {
      save.selected = ch.id;
      persist();
      buildShop();
      initMenu();
      return;
    }
    if (ch.unlock.type === 'coins') {
      if (save.coins >= ch.unlock.price) {
        save.coins -= ch.unlock.price;
        save.unlocked.push(ch.id);
        save.selected = ch.id;
        persist();
        AUDIO.play('buy');
        buildShop();
        initMenu();
      } else {
        const missing = ch.unlock.price - save.coins;
        toast(`Chybí ti ještě ${missing} mincí. Běhej a sbírej! 🪙`);
      }
    } else {
      // premium – v demo verzi vysvětlíme a odemkneme
      $('premium-name').textContent = ch.name;
      $('premium-modal').classList.add('visible');
      $('btn-premium-unlock').onclick = () => {
        save.unlocked.push(ch.id);
        save.selected = ch.id;
        persist();
        AUDIO.play('buy');
        $('premium-modal').classList.remove('visible');
        buildShop();
        initMenu();
        toast(`${ch.name} se přidává k běžeckému týmu! 🎉`);
      };
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
  $('btn-over-menu').addEventListener('click', () => { S.demo = true; resetWorld(true); initMenu(); showScreen('menu'); });
  $('btn-over-shop').addEventListener('click', () => { S.demo = true; resetWorld(true); buildShop(); showScreen('shop'); });
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-resume').addEventListener('click', togglePause);
  $('btn-pause-menu').addEventListener('click', () => { S.mode = 'menu'; S.demo = true; resetWorld(true); initMenu(); showScreen('menu'); });
  $('btn-premium-close').addEventListener('click', () => $('premium-modal').classList.remove('visible'));
  $('btn-sfx').addEventListener('click', () => {
    save.sfx = !(save.sfx !== false);
    persist(); AUDIO.setSfx(save.sfx); initMenu();
  });
  $('btn-music').addEventListener('click', () => {
    save.music = !(save.music !== false);
    persist(); AUDIO.setMusic(save.music); initMenu();
    if (save.music) AUDIO.playMusic('menu');
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

  // start: demo běh za menu
  resetWorld(true);
  initMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
})();
