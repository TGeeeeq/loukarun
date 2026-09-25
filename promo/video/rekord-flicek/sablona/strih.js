/* =========================================================
   REEL „Rekord 16 957 m" – střih

   Celé video je jedno plátno 1080×1920, které se kreslí snímek po
   snímku funkcí render(f). Nic tu neběží v reálném čase, takže každý
   snímek vyjde pokaždé stejně a pomalý screenshot nezpůsobí trhání.

   Scénář a časy jsou v poli SCENY (snímky, 30 fps). Texty jsou
   v konstantě TEXT – po jejich změně stačí pustit renderer znovu,
   herní záběry se přetáčet nemusí.

   Bezpečná zóna Reels: nahoře ~250 px (lišta aplikace), dole ~420 px
   (popisek, jméno účtu) a vpravo ve spodní půlce ~130 px (ikony
   lajku a komentářů). Všechno nosné leží v y 250–1480.
   ========================================================= */
(() => {
  const W = 1080, H = 1920, FPS = 30;
  const cv = document.getElementById('c');
  const c = cv.getContext('2d');
  const FONT = '"Baloo 2", system-ui, sans-serif';
  const HAND = '"Caveat", "Baloo 2", cursive';

  const REKORD = 16957;

  const TEXT = {
    pill: 'NOVÝ REKORD NA LOUCE',
    sub: 'S prasátkem Flíčkem.',
    proof: 'Není to překlep.',
    proofSub: 'Kartička přímo ze hry.',
    jokeTag: 'JEN PRO POŘÁDEK',
    joke: 'Skutečný Flíček by tolik neuběhl ani za celý život.',
    route: 'Jeho denní trasa: seník → miska → seník.',
    belly: 'Pak bříško nahoru a čeká, kdo ho podrbe.',
    runYou: 'Běhání nechává na vás.',
    challenge: 'Překoná to někdo?',
    missing: 'Chybí jeden metr.',
    dare: 'Doběhneš ho?',
    free: 'ZDARMA',
    freeWhere: 'na Google Play',
    freeUntil: 'jen do 28. září',
    iphone: 'Máš iPhone?',
    web1: 'Zahraj si webovou verzi.',
    web2: 'Napiš nám:',
    mail: 'info@nechmerust.org',
    endSub: 'Běh pro azyl Nech mě růst',
    endFree: 'Zdarma na Google Play do 28. 9.',
    endBio: 'Odkaz najdeš v biu',
  };

  /* ---------- scénář (snímky) ---------- */
  const SCENY = [
    { id: 'hook',      od: 0,   do: 96 },
    { id: 'dukaz',     od: 96,  do: 216 },
    { id: 'vtip',      od: 216, do: 462 },
    { id: 'vyzva',     od: 462, do: 672 },
    { id: 'cta',       od: 672, do: 816 },
    { id: 'konec',     od: 816, do: 891 },
  ];
  const DELKA = 891;
  const PRELINANI = 8; // snímků crossfade mezi scénami

  /* herní záběry: klip → první snímek, který scéna použije */
  const VYZVA_OD = 340;            // ve klipu louka
  let VYZVA_STOP = 484;            // poslední snímek před 16 957 m (dopočítá se z metry.json)

  /* ---------- pomůcky ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lin = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (t) => 1 - Math.pow(1 - t, 3);
  const eOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eBack = (t) => { const k = 1.70158; const u = t - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const fmt = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const IMG = new Map();
  function img(src) {
    let p = IMG.get(src);
    if (!p) {
      p = new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => i.decode().then(() => res(i), () => res(i));
        i.onerror = () => rej(new Error('nenačetl jsem ' + src));
        i.src = src;
      });
      IMG.set(src, p);
    }
    return p;
  }
  const ready = new Map();
  const got = (src) => ready.get(src);
  const frameSrc = (klip, i) => `klip-${klip}/${String(i).padStart(4, '0')}.jpg`;

  function rr(x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function wrap(txt, maxW) {
    const out = []; let line = '';
    for (const w of txt.split(' ')) {
      const n = line ? line + ' ' + w : w;
      if (line && c.measureText(n).width > maxW) { out.push(line); line = w; } else line = n;
    }
    if (line) out.push(line);
    return out;
  }

  /* text s obtahem a stínem – stejný rukopis jako titulky ve hře */
  function text(str, x, y, o = {}) {
    const size = o.size || 60;
    c.save();
    c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    c.font = `${o.weight || 800} ${size}px ${o.font || FONT}`;
    c.textAlign = o.align || 'center';
    c.textBaseline = 'alphabetic';
    if (o.ls) c.letterSpacing = o.ls + 'px';
    const lines = o.maxW ? wrap(str, o.maxW) : [str];
    const lh = o.lh || size * 1.12;
    const y0 = y - (lines.length - 1) * lh * (o.anchor === 'top' ? 0 : 0.5);
    lines.forEach((ln, i) => {
      const yy = y0 + i * lh;
      if (o.shadow !== false) {
        c.shadowColor = o.shadowColor || 'rgba(20,12,4,0.45)';
        c.shadowBlur = o.shadowBlur == null ? size * 0.25 : o.shadowBlur;
        c.shadowOffsetY = size * 0.07;
      }
      if (o.stroke) {
        c.lineJoin = 'round';
        c.lineWidth = o.sw || size * 0.14;
        c.strokeStyle = o.stroke;
        c.strokeText(ln, x, yy);
        c.shadowColor = 'transparent';
      }
      c.fillStyle = typeof o.fill === 'function' ? o.fill(yy, size) : (o.fill || '#fffdf5');
      c.fillText(ln, x, yy);
      c.shadowColor = 'transparent';
    });
    c.restore();
    return lines.length * lh;
  }

  const gold = (yy, size) => {
    const g = c.createLinearGradient(0, yy - size * 0.8, 0, yy + size * 0.05);
    g.addColorStop(0, '#fff8e2'); g.addColorStop(0.5, '#ffd76a'); g.addColorStop(1, '#e09a24');
    return g;
  };

  /* pilulka se štítkem */
  function pill(str, x, y, o = {}) {
    const size = o.size || 40;
    c.save();
    c.font = `${o.weight || 800} ${size}px ${FONT}`;
    if (o.ls) c.letterSpacing = o.ls + 'px';
    const w = c.measureText(str).width + size * 1.3, h = size * 1.6;
    c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    if (o.scale != null) c.scale(o.scale, o.scale);
    c.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
    if (o.bg === 'gold') {
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#fff0bd'); g.addColorStop(1, '#e8a72c');
      c.fillStyle = g;
    } else c.fillStyle = o.bg || '#fffdf5';
    rr(-w / 2, -h / 2, w, h, h / 2); c.fill();
    c.shadowColor = 'transparent';
    if (o.border) { c.strokeStyle = o.border; c.lineWidth = 3; rr(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, h / 2 - 1.5); c.stroke(); }
    c.fillStyle = o.fg || '#4a3220';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(str, 0, size * 0.06);
    c.restore();
    return { w, h };
  }

  /* herní záběr přes celou plochu */
  function gameplay(klip, i, o = {}) {
    const im = got(frameSrc(klip, i));
    if (!im) return;
    c.save();
    const z = o.zoom || 1;
    if (o.blur) c.filter = `blur(${o.blur}px) saturate(${o.sat || 1.05})`;
    else if (o.sat != null) c.filter = `saturate(${o.sat})`;
    const bw = W * z, bh = H * z;
    const ox = (W - bw) * (o.fx == null ? 0.5 : o.fx), oy = (H - bh) * (o.fy == null ? 0.5 : o.fy);
    // při rozostření přesahuje o okraj, jinak by do záběru prosvítala černá
    const pad = o.blur ? o.blur * 2.5 : 0;
    c.drawImage(im, ox - pad, oy - pad, bw + pad * 2, bh + pad * 2);
    c.restore();
    if (o.dark) { c.fillStyle = `rgba(14,22,12,${o.dark})`; c.fillRect(0, 0, W, H); }
  }

  /* ztmavení nahoře, aby titulky držely kontrast i nad světlou oblohou */
  function topShade(a = 0.55, h = 900) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(12,20,10,${a})`);
    g.addColorStop(0.6, `rgba(12,20,10,${a * 0.45})`);
    g.addColorStop(1, 'rgba(12,20,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, h);
  }
  function vignette(a = 0.4) {
    const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.5, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,10,4,${a})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  /* jiskry – deterministické, bez stavu */
  function sparks(cx, cy, t, n, seed, spread = 520) {
    if (t < 0 || t > 1) return;
    c.save();
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i * 3.1) * Math.PI * 2;
      const d = (0.35 + hash(seed + i * 7.7) * 0.65) * spread * eOut(t);
      const r = (4 + hash(seed + i * 5.3) * 9) * (1 - t);
      c.globalAlpha = (1 - t) * 0.95;
      c.fillStyle = i % 3 ? '#ffe08a' : '#fffdf5';
      c.beginPath();
      c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  /* kreslená louka pro scény bez záběru */
  const ENVS = DATA.ENVS;
  const PAL = ENVS.find(e => e.id === 'louka');
  const FLICEK = DATA.CHARACTERS.find(ch => ch.id === 'flicek');
  const GY = 1330;   // zem kreslených scén – popisky pod ní musí zůstat nad spodní zónou Reels
  function meadow(f, o = {}) {
    const T = 2000 + f * 33;
    GFX.drawSky(c, W, H, PAL, T);
    GFX.drawClouds(c, W, H, PAL, f * 0.6, T);
    GFX.drawGodRays(c, W, H, PAL, GY, T, 0.8);
    GFX.drawHills(c, W, H, PAL, f * 0.4, GY);
    c.fillStyle = PAL.ground; c.fillRect(0, GY, W, H - GY);
    c.fillStyle = PAL.groundDark;
    c.beginPath(); c.moveTo(0, GY + 150);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, GY + 150 - 22 * Math.sin(x * 0.005));
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,70,26,0.35)'; c.lineWidth = 6; c.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const x = hash(i * 13 + 6) * W, y = GY + 10 + hash(i * 3 + 1) * 120;
      const lean = (hash(i * 17 + 2) - 0.5) * 18;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean, y - 16, x + lean * 1.6, y - 30); c.stroke();
    }
    if (o.vig !== false) vignette(0.28);
  }

  function flicek(x, y, s, o = {}) {
    c.save();
    c.globalAlpha = 0.22; c.fillStyle = '#000';
    GFX.ell(c, x, y + 6, 46 * s, 8 * s); c.fill();
    c.restore();
    c.save();
    c.translate(x, y);
    if (o.flip) c.scale(-1, 1);
    GFX.drawCharacter(c, FLICEK, 0, 0, s, { runPhase: o.run || 0, airborne: !!o.air, squash: o.squash || 0 }, o.t || 0);
    c.restore();
  }

  /* =========================================================
     SCÉNY
     ========================================================= */

  /* 1) HOOK – číslo, které zastaví palec */
  function scHook(f, t, bg = t) {
    gameplay('louka', bg, { zoom: 1.0 });
    topShade(0.62, 1000);
    vignette(0.3);

    const pT = lin(t, 2, 14);
    pill(TEXT.pill, W / 2, 330, { bg: 'gold', size: 42, ls: 3, scale: eBack(pT), alpha: pT, rot: -0.04 });

    const cT = eOutExpo(lin(t, 6, 50));
    const val = t >= 50 ? REKORD : Math.round(REKORD * cT);
    const punch = 1 + 0.09 * Math.sin(Math.PI * lin(t, 50, 60)) ;
    c.save();
    c.translate(W / 2, 560);
    c.scale(punch, punch);
    c.globalAlpha = lin(t, 5, 9);
    // číslo a jednotka zvlášť, aby se při načítání nehýbal střed
    c.font = `800 214px ${FONT}`;
    const num = fmt(REKORD), unit = ' m';
    const nw = c.measureText(num).width;
    c.font = `800 140px ${FONT}`;
    const uw = c.measureText(unit).width;
    const x0 = -(nw + uw) / 2;
    const shown = fmt(val).padStart(num.length, ' ');
    text(shown, x0 + nw, 70, { size: 214, align: 'right', fill: gold, stroke: 'rgba(48,28,8,0.85)', sw: 22, shadowColor: 'rgba(255,190,80,0.55)', shadowBlur: 50 });
    text(unit, x0 + nw, 70, { size: 140, align: 'left', fill: gold, stroke: 'rgba(48,28,8,0.85)', sw: 18, shadow: false });
    c.restore();
    sparks(W / 2, 520, lin(t, 50, 78), 34, 11, 620);

    const sT = eOut(lin(t, 58, 70));
    text(TEXT.sub, W / 2, 760 + (1 - sT) * 30, { size: 70, alpha: sT, stroke: 'rgba(30,18,6,0.55)', sw: 12 });
  }

  /* 2) DŮKAZ – kartička přímo z hry */
  function scDukaz(f, t) {
    gameplay('louka', 96 + t, { blur: 22, dark: 0.38, zoom: 1.08 });
    vignette(0.45);

    const hT = eOut(lin(t, 4, 16));
    text(TEXT.proof, W / 2, 330 + (1 - hT) * 40, { size: 96, alpha: hT, stroke: 'rgba(30,18,6,0.6)', sw: 14 });
    text(TEXT.proofSub, W / 2, 420 + (1 - hT) * 40, { size: 50, weight: 600, alpha: hT * 0.92, shadowBlur: 14 });

    const card = got('karta-rekord.png');
    const k = eBack(lin(t, 0, 22));
    const size = 940;
    const cx = W / 2, cy = 1000 + (1 - k) * 700;
    const float = Math.sin(t * 0.07) * 8;
    c.save();
    c.translate(cx, cy + float);
    c.rotate(-0.07 * (1 - k) - 0.018 + Math.sin(t * 0.05) * 0.006);
    const sc = 0.86 + 0.14 * k + lin(t, 22, 120) * 0.04;
    c.scale(sc, sc);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 70; c.shadowOffsetY = 30;
    rr(-size / 2, -size / 2, size, size, 48); c.fillStyle = '#000'; c.fill();
    c.shadowColor = 'transparent';
    c.save();
    rr(-size / 2, -size / 2, size, size, 48); c.clip();
    c.drawImage(card, -size / 2, -size / 2, size, size);
    // přejezd světla přes kartičku
    const sh = lin(t, 34, 62);
    if (sh > 0 && sh < 1) {
      const sx = -size + sh * size * 2.2;
      const g = c.createLinearGradient(sx - 110, -size / 2, sx + 110, size / 2);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,250,225,0.28)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = g; c.fillRect(-size / 2, -size / 2, size, size);
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    c.strokeStyle = 'rgba(255,224,138,0.8)'; c.lineWidth = 4;
    rr(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 46); c.stroke();
    c.restore();
  }

  /* 3) VTIP – co skutečně uběhne skutečný Flíček */
  const SENIK_X = 250, MISKA_X = 830;
  function miska(x, y, s, eaten) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.globalAlpha = 0.25; c.fillStyle = '#000'; GFX.ell(c, 0, 4, 74, 12); c.fill(); c.globalAlpha = 1;
    // krmení (ubývá, jak Flíček žere)
    const fill = 1 - eaten;
    if (fill > 0.02) {
      c.save();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI;
        c.save();
        c.translate(Math.cos(a) * 36 - 0, -30 - Math.sin(a) * 10 * fill - 6 * fill);
        c.rotate(-0.9 + i * 0.3);
        c.scale(1.1, 1.1);
        c.globalAlpha = clamp(fill * 2 - i * 0.12);
        GFX.drawCarrot(c, 0, 0, 0);
        c.restore();
      }
      c.restore();
    }
    // miska
    const g = c.createLinearGradient(0, -34, 0, 0);
    g.addColorStop(0, '#d9573f'); g.addColorStop(1, '#9c3526');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-72, -34); c.lineTo(72, -34); c.lineTo(56, 0); c.lineTo(-56, 0); c.closePath(); c.fill();
    c.fillStyle = '#f07a60'; GFX.ell(c, 0, -34, 72, 11); c.fill();
    c.fillStyle = '#7a2a1d'; GFX.ell(c, 0, -34, 60, 7); c.fill();
    c.restore();
  }
  function senik(x, y, s) {
    c.save();
    c.globalAlpha = 0.25; c.fillStyle = '#000'; GFX.ell(c, x, y + 4, 44 * s, 8 * s); c.fill();
    c.restore();
    GFX.drawProp(c, 'haystack', x, y, s, null, 0);
  }

  function scVtip(f, t) {
    meadow(f);
    // světlejší podklad pod textem
    const g = c.createLinearGradient(0, 180, 0, 900);
    g.addColorStop(0, 'rgba(255,253,245,0.0)');
    g.addColorStop(1, 'rgba(255,253,245,0.0)');

    const tagT = eBack(lin(t, 4, 16));
    pill(TEXT.jokeTag, W / 2, 300, { bg: '#4a3220', fg: '#ffe08a', size: 36, ls: 4, scale: tagT, alpha: lin(t, 4, 10) });

    const jT = eOut(lin(t, 10, 24));
    text(TEXT.joke, W / 2, 500 + (1 - jT) * 30, {
      size: 84, maxW: 900, lh: 90, alpha: jT, fill: '#4a3220',
      stroke: 'rgba(255,253,245,0.95)', sw: 18, shadowColor: 'rgba(40,24,8,0.25)', shadowBlur: 20,
    });

    // titulky pod nadpisem se střídají
    const caps = [
      { s: TEXT.route, od: 40, do: 128 },
      { s: TEXT.belly, od: 142, do: 200 },
      { s: TEXT.runYou, od: 200, do: 999, gold: true },
    ];
    for (const cp of caps) {
      const a = lin(t, cp.od, cp.od + 10) * (1 - lin(t, cp.do - 6, cp.do));
      if (a <= 0) continue;
      pill(cp.s, W / 2, 740 - (1 - eOut(lin(t, cp.od, cp.od + 12))) * 24, {
        bg: cp.gold ? 'gold' : 'rgba(255,253,245,0.96)', fg: '#4a3220', size: cp.gold ? 58 : 48, weight: 800,
        alpha: a, border: cp.gold ? null : 'rgba(216,155,38,0.5)',
      });
    }

    // mapka trasy
    const dT = lin(t, 30, 44);
    senik(SENIK_X, GY, 4.2 * eBack(dT));
    miska(MISKA_X, GY, 1.5 * eBack(lin(t, 34, 48)), lin(t, 94, 120) * 0.85);
    text('seník', SENIK_X, GY + 100, { size: 70, font: HAND, weight: 700, fill: '#fffdf5', alpha: dT, shadowBlur: 10 });
    text('miska', MISKA_X, GY + 100, { size: 70, font: HAND, weight: 700, fill: '#fffdf5', alpha: lin(t, 34, 48), shadowBlur: 10 });

    // Flíčkova cesta: tam (48–92), jídlo (92–120), zpátky (120–146), bříško (146+)
    const s = 3.0;
    const go = eInOut(lin(t, 48, 92));
    const back = eInOut(lin(t, 120, 146));
    const START = SENIK_X + 150, END = MISKA_X - 170;
    let x = START + (END - START) * go - (END - START) * back;
    const walking = (t > 48 && t < 92) || (t > 120 && t < 146);

    // tečkovaná cesta za ním
    c.save();
    c.setLineDash([2, 26]); c.lineCap = 'round'; c.lineWidth = 12;
    c.strokeStyle = 'rgba(255,253,245,0.85)';
    const pathY = GY + 34;
    if (t > 48) {
      c.beginPath();
      c.moveTo(START - 20, pathY);
      c.lineTo(Math.max(START - 20, START + (END - START) * go), pathY);
      c.stroke();
    }
    c.restore();

    if (t < 146) {
      const eat = t > 92 && t < 120;
      flicek(x, GY, s, {
        run: walking ? t * 0.42 : (eat ? Math.sin(t * 0.9) * 0.4 : 0.6),
        flip: t >= 120,
        squash: eat ? Math.abs(Math.sin(t * 0.9)) * 0.25 : 0,
        t: f * 33,
      });
      if (eat) {
        // „mňam" – čistě ručně psané
        text('mňam', MISKA_X - 40 + Math.sin(t * 0.3) * 6, GY - 300 - (t % 20) * 1.5, {
          size: 64, font: HAND, weight: 700, fill: '#fffdf5', alpha: Math.sin((t - 92) / 28 * Math.PI), shadowBlur: 12,
        });
      }
    } else {
      // plácnutí na záda do seníku
      // Otáčí se kolem středu trupu (40 jednotek nad kopyty), takže nohy
      // skončí nahoře a hlava se opře o seník vlevo – leží v něm, nevisí pod zem.
      const fl = eBack(lin(t, 146, 160));
      const lx = SENIK_X + 150 - 40 * fl, ly = GY - 40 * s - 70 * fl;
      c.save();
      c.globalAlpha = 0.22; c.fillStyle = '#000'; GFX.ell(c, lx + 20, GY + 6, 150, 20); c.fill();
      c.restore();
      c.save();
      c.translate(lx, ly);
      c.scale(-1, 1);
      c.rotate(-Math.PI * 0.9 * fl);
      GFX.drawCharacter(c, FLICEK, 0, 40 * s, s, { runPhase: t * 0.55 * lin(t, 160, 168) }, f * 33);
      c.restore();
      // pár stébel přes něj – leží V seníku
      c.save();
      c.strokeStyle = '#d9b457'; c.lineWidth = 7; c.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const hx = SENIK_X - 60 + i * 34, hy = GY - 20 - hash(i + 4) * 30;
        c.beginPath(); c.moveTo(hx, GY + 2); c.quadraticCurveTo(hx + 10, hy + 10, hx + (hash(i) - 0.5) * 40, hy - 30); c.stroke();
      }
      c.restore();
      // drbání
      const dr = lin(t, 160, 170);
      for (let i = 0; i < 3; i++) {
        const k = ((t - 160) / 22 + i / 3) % 1;
        if (dr <= 0) break;
        c.save();
        c.globalAlpha = dr * (1 - k);
        c.translate(lx - 40 + i * 60, ly - 200 - k * 120);
        c.scale(1 + k * 0.4, 1 + k * 0.4);
        c.fillStyle = '#ff7f8e';
        c.beginPath();
        c.moveTo(0, 10); c.bezierCurveTo(-26, -8, -12, -30, 0, -16); c.bezierCurveTo(12, -30, 26, -8, 0, 10);
        c.fill();
        c.restore();
      }
      text('drb, drb…', lx + 250, GY - 250, { size: 76, font: HAND, weight: 700, fill: '#fffdf5', alpha: dr, shadowBlur: 12 });
    }
  }

  /* 4) VÝZVA – skutečný běh až metr před rekord */
  function scVyzva(f, t) {
    const stopAt = VYZVA_STOP - VYZVA_OD;
    const frozen = t > stopAt;
    const idx = VYZVA_OD + Math.min(t, stopAt);
    const fz = lin(t, stopAt, stopAt + 18);
    gameplay('louka', idx, { zoom: 1 + 0.07 * eOut(fz), fx: 0.45, fy: 0.72, sat: 1 - 0.45 * fz });
    topShade(0.66, 1100);
    if (frozen) { c.fillStyle = `rgba(14,20,10,${0.32 * fz})`; c.fillRect(0, 0, W, H); }

    const hT = eOut(lin(t, 2, 14));
    text(TEXT.challenge, W / 2, 330 + (1 - hT) * 30, { size: 100, alpha: hT * (1 - lin(t, stopAt + 4, stopAt + 12)), stroke: 'rgba(30,18,6,0.6)', sw: 14 });

    // počítadlo běhu
    const m = METRY.louka[idx] || REKORD - 1;
    const pw = 860, px = (W - pw) / 2, py = 430, ph = 250;
    const pT = eOut(lin(t, 6, 18));
    c.save();
    c.globalAlpha = pT;
    c.translate(0, (1 - pT) * 30);
    c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 40; c.shadowOffsetY = 14;
    const pg = c.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, 'rgba(30,44,26,0.72)'); pg.addColorStop(1, 'rgba(22,30,18,0.6)');
    c.fillStyle = pg; rr(px, py, pw, ph, 44); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,214,120,0.7)'; c.lineWidth = 3; rr(px + 2, py + 2, pw - 4, ph - 4, 42); c.stroke();
    text('BĚŽÍ', px + 50, py + 64, { size: 34, align: 'left', fill: 'rgba(255,232,178,0.85)', ls: 4, shadow: false });
    text('REKORD ' + fmt(REKORD) + ' m', px + pw - 50, py + 64, { size: 34, align: 'right', fill: '#ffd76a', ls: 2, shadow: false });
    const live = frozen ? REKORD - 1 : Math.floor(m);
    text(fmt(live) + ' m', W / 2, py + 170, {
      size: 124, fill: frozen ? gold : '#fffdf5', stroke: 'rgba(48,28,8,0.75)', sw: 14,
      shadowColor: frozen ? 'rgba(255,190,80,0.6)' : 'rgba(0,0,0,0.3)', shadowBlur: frozen ? 40 : 10,
    });
    // ukazatel
    const from = METRY.louka[VYZVA_OD];
    const fr = clamp((m - from) / (REKORD - from));
    const bx = px + 50, bw = pw - 100, by = py + ph - 44, bh = 16;
    c.fillStyle = 'rgba(255,253,245,0.18)'; rr(bx, by, bw, bh, 8); c.fill();
    const bg = c.createLinearGradient(bx, 0, bx + bw, 0);
    bg.addColorStop(0, '#ffe08a'); bg.addColorStop(1, '#ff9d3a');
    c.fillStyle = bg; rr(bx, by, Math.max(bh, bw * (frozen ? 0.997 : fr)), bh, 8); c.fill();
    c.fillStyle = '#fffdf5'; c.beginPath(); c.arc(bx + bw, by + bh / 2, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8791c'; c.beginPath(); c.arc(bx + bw, by + bh / 2, 8, 0, Math.PI * 2); c.fill();
    c.restore();

    if (frozen) {
      // záblesk v okamžiku zamrznutí
      const fl = 1 - lin(t, stopAt, stopAt + 7);
      if (fl > 0) { c.fillStyle = `rgba(255,250,230,${0.7 * fl})`; c.fillRect(0, 0, W, H); }
      // tmavý pruh pod textem – za ním běží herní nápisy „+7 ⚡", které by ho přehlušily
      const bandA = eOut(lin(t, stopAt + 2, stopAt + 14));
      c.save();
      c.globalAlpha = bandA;
      const bg2 = c.createLinearGradient(0, 720, 0, 1110);
      bg2.addColorStop(0, 'rgba(12,18,10,0)'); bg2.addColorStop(0.25, 'rgba(12,18,10,0.72)');
      bg2.addColorStop(0.75, 'rgba(12,18,10,0.72)'); bg2.addColorStop(1, 'rgba(12,18,10,0)');
      c.fillStyle = bg2; c.fillRect(0, 720, W, 390);
      c.restore();
      const mT = eBack(lin(t, stopAt + 4, stopAt + 18));
      c.save();
      c.translate(W / 2, 860); c.scale(mT, mT);
      text(TEXT.missing, 0, 0, { size: 104, stroke: 'rgba(30,18,6,0.65)', sw: 16 });
      c.restore();
      const dT = eOut(lin(t, stopAt + 14, stopAt + 26));
      text(TEXT.dare, W / 2, 990 + (1 - dT) * 30, { size: 112, alpha: dT, fill: gold, stroke: 'rgba(48,28,8,0.8)', sw: 16, shadowColor: 'rgba(255,190,80,0.5)', shadowBlur: 40 });
    }
  }

  /* 5) CTA – zdarma do 28. září + iPhone přes e-mail */
  function playButton(x, y, s, a) {
    const w = 700, h = 150;
    c.save();
    c.translate(x, y); c.scale(s, s); c.globalAlpha = a;
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 40; c.shadowOffsetY = 14;
    c.fillStyle = '#16120c'; rr(-w / 2, -h / 2, w, h, 36); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(255,253,245,0.55)'; c.lineWidth = 3; rr(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 34); c.stroke();
    // hrací trojúhelník – jednobarevný znak, ne napodobenina loga Google Play
    c.save();
    c.translate(-w / 2 + 96, 0); c.scale(2.6, 2.6);
    c.fillStyle = '#fffdf5';
    c.beginPath(); c.moveTo(-9, -15); c.lineTo(14, 0); c.lineTo(-9, 15); c.closePath(); c.fill();
    c.restore();
    text('STÁHNI NA', -w / 2 + 170, -14, { size: 34, align: 'left', weight: 700, fill: 'rgba(255,253,245,0.8)', ls: 3, shadow: false });
    text('Google Play', -w / 2 + 168, 46, { size: 70, align: 'left', fill: '#fffdf5', shadow: false });
    c.restore();
  }

  function scCta(f, t) {
    gameplay('vesnice', t, { blur: 20, zoom: 1.1 });
    c.fillStyle = 'rgba(20,38,20,0.62)'; c.fillRect(0, 0, W, H);
    vignette(0.5);

    const zT = eBack(lin(t, 2, 16));
    c.save(); c.translate(W / 2, 360); c.scale(zT, zT); c.rotate(-0.03);
    text(TEXT.free, 0, 0, { size: 220, fill: gold, stroke: 'rgba(48,28,8,0.85)', sw: 22, shadowColor: 'rgba(255,190,80,0.5)', shadowBlur: 50 });
    c.restore();
    sparks(W / 2, 300, lin(t, 12, 40), 30, 57, 560);

    const wT = eOut(lin(t, 10, 22));
    text(TEXT.freeWhere, W / 2, 480 + (1 - wT) * 24, { size: 84, alpha: wT, stroke: 'rgba(20,12,4,0.5)', sw: 12 });

    const uT = eBack(lin(t, 18, 30));
    const pulse = 1 + 0.035 * Math.sin(Math.max(0, t - 30) * 0.2);
    pill(TEXT.freeUntil, W / 2, 600, { bg: '#e8563a', fg: '#fffdf5', size: 56, scale: uT * pulse, alpha: lin(t, 18, 22), rot: 0.02 });

    const bT = eBack(lin(t, 26, 40));
    playButton(W / 2, 790, bT, lin(t, 26, 30));

    // oddělovač
    const lT = eOut(lin(t, 44, 58));
    c.save(); c.globalAlpha = 0.5 * lT; c.strokeStyle = '#ffe08a'; c.lineWidth = 3;
    c.setLineDash([4, 16]); c.lineCap = 'round';
    c.beginPath(); c.moveTo(W / 2 - 300 * lT, 960); c.lineTo(W / 2 + 300 * lT, 960); c.stroke();
    c.restore();

    const iT = eOut(lin(t, 50, 62));
    text(TEXT.iphone, W / 2, 1080 + (1 - iT) * 24, { size: 92, alpha: iT, fill: '#ffe08a', stroke: 'rgba(30,18,6,0.55)', sw: 12 });
    const w1 = eOut(lin(t, 56, 68));
    text(TEXT.web1, W / 2, 1170 + (1 - w1) * 20, { size: 58, weight: 700, alpha: w1 });
    text(TEXT.web2, W / 2, 1240 + (1 - w1) * 20, { size: 58, weight: 700, alpha: w1 });
    const mT = eBack(lin(t, 64, 78));
    pill(TEXT.mail, W / 2, 1360, { bg: '#fffdf5', fg: '#2c4f24', size: 64, scale: mT, alpha: lin(t, 64, 68), border: 'rgba(216,155,38,0.7)' });
  }

  /* 6) KONEC – logo a Flíček, který konečně běží */
  function scKonec(f, t) {
    meadow(f, { vig: false });
    c.fillStyle = 'rgba(255,246,228,0.22)'; c.fillRect(0, 0, W, H);
    vignette(0.3);
    const logo = got('logo.png');
    const lT = eBack(lin(t, 0, 16));
    const lw = 900 * lT, lh = lw * logo.height / logo.width;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    c.drawImage(logo, W / 2 - lw / 2, 640 - lh / 2, lw, lh);
    c.restore();
    const sT = eOut(lin(t, 10, 22));
    text(TEXT.endSub, W / 2, 1010 + (1 - sT) * 20, { size: 58, weight: 700, alpha: sT, fill: '#4a3220', stroke: 'rgba(255,253,245,0.9)', sw: 12, shadowBlur: 8 });
    const pT = eBack(lin(t, 16, 28));
    pill(TEXT.endFree, W / 2, 1130, { bg: '#2c4f24', fg: '#ffe08a', size: 46, scale: pT, alpha: lin(t, 16, 20) });
    const bT = eOut(lin(t, 24, 34));
    text(TEXT.endBio, W / 2, 1250, { size: 48, weight: 700, alpha: bT, fill: '#4a3220', stroke: 'rgba(255,253,245,0.9)', sw: 10, shadowBlur: 6 });

    // Flíček přeběhne přes spodek – aspoň tady opravdu běží
    const x = -200 + (W + 400) * lin(t, 0, 75);
    const hop = Math.abs(Math.sin(t * 0.26)) * 18;
    flicek(x, GY + 110 - hop, 2.6, { run: t * 0.62, t: f * 33 });
  }

  const FN = { hook: scHook, dukaz: scDukaz, vtip: scVtip, vyzva: scVyzva, cta: scCta, konec: scKonec };

  /* které soubory snímek potřebuje */
  function needs(f) {
    const out = ['karta-rekord.png', 'logo.png'];
    for (const s of SCENY) {
      if (f < s.od - PRELINANI || f >= s.do + PRELINANI) continue;
      const t = f - s.od;
      if (s.id === 'hook') out.push(frameSrc('louka', clamp(t, 0, 509)));
      if (s.id === 'dukaz') out.push(frameSrc('louka', clamp(96 + t, 0, 509)));
      if (s.id === 'vyzva') out.push(frameSrc('louka', VYZVA_OD + clamp(t, 0, VYZVA_STOP - VYZVA_OD)));
      if (s.id === 'cta') out.push(frameSrc('vesnice', clamp(t, 0, 239)));
    }
    return out;
  }

  const buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  const bc = buf.getContext('2d');

  function drawScene(s, f) {
    const t = f - s.od;
    c.save();
    FN[s.id](f, t);
    c.restore();
  }

  function render(f) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const i = SCENY.findIndex(s => f >= s.od && f < s.do);
    const s = SCENY[Math.max(0, i)];
    const prev = SCENY[i - 1];
    const k = prev ? lin(f, s.od, s.od + PRELINANI) : 1;
    if (prev && k < 1) {
      drawScene(prev, f);
      bc.clearRect(0, 0, W, H);
      bc.drawImage(cv, 0, 0);
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      drawScene(s, f);
      c.save();
      c.globalAlpha = 1 - eInOut(k);
      c.drawImage(buf, 0, 0);
      c.restore();
    } else drawScene(s, f);
    // jemné zrno – obraz nevypadá jako export z prezentace
    c.save();
    c.globalAlpha = 0.035;
    for (let n = 0; n < 60; n++) {
      c.fillStyle = n % 2 ? '#fff' : '#000';
      c.fillRect(hash(f * 91 + n) * W, hash(f * 37 + n * 3) * H, 3, 3);
    }
    c.restore();
  }

  let METRY = {};
  window.STRIH = {
    DELKA, FPS, SCENY,
    async init() {
      await Promise.all([
        document.fonts.load(`800 100px ${FONT}`, 'ěščřžýáíéůúŇň'),
        document.fonts.load(`700 60px ${FONT}`, 'ěščřžýáíéůú'),
        document.fonts.load(`600 60px ${FONT}`, 'ěščřžýáíéůú'),
        document.fonts.load(`700 60px ${HAND}`, 'seník miska mňam drb'),
      ]);
      METRY.louka = await (await fetch('klip-louka/metry.json')).json();
      // poslední snímek, na kterém je běh ještě pod rekordem
      VYZVA_STOP = METRY.louka.findIndex(m => m >= REKORD) - 1;
      if (VYZVA_STOP < VYZVA_OD) throw new Error('klip louka nedoběhl k rekordu – natoč ho znovu');
      for (const src of ['karta-rekord.png', 'logo.png']) ready.set(src, await img(src));
      return { DELKA, VYZVA_STOP, m: METRY.louka[VYZVA_STOP] };
    },
    async frame(f) {
      const list = needs(f);
      for (const src of list) if (!ready.has(src)) ready.set(src, await img(src));
      // staré snímky záběru pustit z paměti
      if (ready.size > 80) for (const k of [...ready.keys()].slice(0, 40)) if (!list.includes(k) && k.startsWith('klip-')) { ready.delete(k); IMG.delete(k); }
      render(f);
      return true;
    },
    /* obálka: dokreslený hook, ale se záběrem, kde přes prasátko neletí
       nápis „ZLATÁ MRKEV! +26" (ten je v mřížce profilu useknutý u kraje) */
    async cover() {
      const bg = 62;
      ready.set(frameSrc('louka', bg), await img(frameSrc('louka', bg)));
      c.setTransform(1, 0, 0, 1, 0, 0);
      scHook(90, 90, bg);
      return true;
    },
  };
})();
