/* =========================================================
   LOUKA RUN – grafika
   Vše kreslené procedurálně do canvasu (žádné externí assety)
   ========================================================= */

const GFX = (() => {

  /* ---------- pomocné funkce ---------- */
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColor(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  }
  function shade(hex, amt) { // amt -1..1
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + 255 * amt, g + 255 * amt, b + 255 * amt);
  }
  // deterministický pseudo-náhodný generátor (pro stabilní krajinu)
  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function rr(ctx, x, y, w, h, r) { // rounded rect
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  }

  // stoupající „Zzz“ nad ospalou postavou (x,y = kotva u hlavy, v jednotkách před *s)
  function drawZzz(ctx, s, t, x, y) {
    const baseAlpha = ctx.globalAlpha;
    ctx.fillStyle = '#dfe8ff';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const ph = (((t || 0) * 0.0009 + i * 0.33) % 1 + 1) % 1;
      ctx.globalAlpha = baseAlpha * (1 - ph) * 0.9;
      ctx.font = `bold ${(8 + i * 3) * s}px "Baloo 2", sans-serif`;
      ctx.fillText('z', (x + ph * 10) * s, (y - ph * 26) * s);
    }
    ctx.globalAlpha = baseAlpha;
  }

  /* =========================================================
     OBLOHA, KOPCE, ZEMĚ
     ========================================================= */
  // gradienty oblohy a sluneční záře se přepočítají jen při změně barev/rozměrů,
  // ne každý snímek – plynulejší vykreslování
  const skyCache = { key: '', grad: null };
  const glowCache = { key: '', grad: null };

  function drawSky(ctx, W, H, pal, t) {
    const skyKey = pal.skyTop + pal.skyBottom + H;
    if (skyCache.key !== skyKey) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, pal.skyTop);
      g.addColorStop(1, pal.skyBottom);
      skyCache.key = skyKey; skyCache.grad = g;
    }
    ctx.fillStyle = skyCache.grad;
    ctx.fillRect(0, 0, W, H);

    // slunce / měsíc
    const sx = W * 0.78, sy = H * 0.22;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const glowKey = pal.sun + W + 'x' + H;
    if (glowCache.key !== glowKey) {
      const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
      glow.addColorStop(0, pal.sun);
      glow.addColorStop(1, pal.sun + '00');
      glowCache.key = glowKey; glowCache.grad = glow;
    }
    ctx.fillStyle = glowCache.grad;
    ctx.beginPath(); ctx.arc(sx, sy, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pal.sun;
    ctx.beginPath(); ctx.arc(sx, sy, pal.nightAmt > 0.5 ? 24 : 34, 0, Math.PI * 2); ctx.fill();
    if (pal.nightAmt > 0.5) { // měsíc – kráter
      ctx.fillStyle = shade(pal.sun, -0.12);
      ctx.beginPath(); ctx.arc(sx - 7, sy - 5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 8, sy + 7, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // hvězdy v noci
    if (pal.nightAmt > 0.05) {
      ctx.save();
      ctx.globalAlpha = pal.nightAmt;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) {
        const x = hash(i) * W, y = hash(i + 99) * H * 0.55;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.001 + i));
        ctx.globalAlpha = pal.nightAmt * tw;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
    }
  }

  function drawClouds(ctx, W, H, pal, camX, t) {
    ctx.save();
    ctx.fillStyle = pal.clouds;
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      const speed = 0.04 + hash(i) * 0.05;
      const cw = 90 + hash(i + 7) * 120;
      const x = ((hash(i + 3) * 2000 - camX * speed - t * 0.006 * (i % 3 + 1)) % (W + cw * 2 + 200) + W + cw * 2 + 200) % (W + cw * 2 + 200) - cw;
      const y = 40 + hash(i + 11) * H * 0.3;
      ell(ctx, x, y, cw * 0.5, cw * 0.16); ctx.fill();
      ell(ctx, x - cw * 0.22, y + 4, cw * 0.3, cw * 0.12); ctx.fill();
      ell(ctx, x + cw * 0.24, y + 5, cw * 0.26, cw * 0.11); ctx.fill();
    }
    ctx.restore();
  }

  function drawHills(ctx, W, H, pal, camX, groundY) {
    // vzdálené kopce
    hillLayer(ctx, W, pal.hillFar, camX * 0.15, groundY, 120, 0.0016, 900);
    // bližší kopce
    hillLayer(ctx, W, pal.hillNear, camX * 0.35, groundY, 70, 0.003, 500);
  }
  /* Sluneční paprsky (god-rays)
     Měkké světelné klíny od slunce k zemi. Kreslí se režimem 'lighter',
     takže se jen přisvětlují – nikdy nezaclání a nezhorší čitelnost
     překážek. Vykreslují se po kopcích a před zemí, aby vypadaly jako
     světlo prodírající se scénou, ne jako nálepka přes celý obraz.
     amt 0 = nic, 1 = plná síla (západ slunce; v lese jen náznak). */
  function drawGodRays(ctx, W, H, pal, groundY, t, amt) {
    if (amt <= 0.01) return;
    const sx = W * 0.78, sy = H * 0.04;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sx, sy);
    for (let i = 0; i < 4; i++) {
      // klíny se velmi pomalu rozevírají a zavírají, ať obraz „dýchá“
      const base = -0.95 + i * 0.42 + Math.sin(t * 0.00013 + i) * 0.05;
      const wide = 0.10 + 0.035 * Math.sin(t * 0.00021 + i * 2.1);
      const len = H * 1.5;
      const g = ctx.createLinearGradient(0, 0, Math.sin(base) * len, Math.cos(base) * len);
      g.addColorStop(0, hexA(pal.sun, 0.16 * amt));
      g.addColorStop(1, hexA(pal.sun, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(base - wide) * len, Math.cos(base - wide) * len);
      ctx.lineTo(Math.sin(base + wide) * len, Math.cos(base + wide) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // #rrggbb → rgba() s danou průhledností
  function hexA(hex, a) {
    const h = (hex || '#ffffff').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function hillLayer(ctx, W, color, off, groundY, amp, freq, seedBase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= W; x += 12) {
      const wx = x + off;
      const y = groundY - 30
        - amp * (0.6 + 0.4 * Math.sin(wx * freq + seedBase))
        - amp * 0.4 * Math.sin(wx * freq * 2.7 + seedBase * 1.3);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, groundY);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(ctx, W, H, pal, camX, groundY) {
    // tráva
    ctx.fillStyle = pal.ground;
    ctx.fillRect(0, groundY, W, H - groundY);
    // pěšina přímo pod kopyty
    ctx.fillStyle = pal.path;
    rr(ctx, -10, groundY + 2, W + 20, 32, 0);
    ctx.fill();
    // kamínky na pěšině pro pocit rychlosti
    ctx.fillStyle = shade(pal.path, -0.12);
    for (let i = 0; i < 10; i++) {
      const x = ((hash(i + 5) * 3000 - camX) % (W + 300) + W + 300) % (W + 300) - 150;
      ell(ctx, x, groundY + 12 + hash(i + 9) * 14, 6 + hash(i) * 6, 2.5);
      ctx.fill();
    }
    // tmavší pruhy trávy pod pěšinou
    ctx.fillStyle = pal.groundDark;
    for (let i = 0; i < 14; i++) {
      const w = 40 + hash(i) * 80;
      const x = ((hash(i + 5) * 3000 - camX) % (W + 300) + W + 300) % (W + 300) - 150;
      ctx.globalAlpha = 0.5;
      ell(ctx, x + 30, groundY + 70 + hash(i + 13) * 20, w * 0.4, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // trsy trávy
    ctx.strokeStyle = pal.groundDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const x = ((hash(i + 21) * 4000 - camX * 1.0) % (W + 100) + W + 100) % (W + 100) - 50;
      const y = groundY + 44 + hash(i + 31) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 3, y - 8, x - 5, y - 12);
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y - 9, x + 2, y - 14);
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 7, x + 7, y - 10);
      ctx.stroke();
    }
  }

  /* =========================================================
     DEKORACE V POZADÍ (vtipné kulisy)
     ========================================================= */
  const PROPS = {
    sunflower(ctx, s) {
      ctx.strokeStyle = '#4c8a3f'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4 * s, -40 * s, 0, -78 * s); ctx.stroke();
      ctx.fillStyle = '#4c8a3f';
      ell(ctx, -10 * s, -34 * s, 12 * s, 5 * s, -0.5); ctx.fill();
      ell(ctx, 10 * s, -48 * s, 12 * s, 5 * s, 0.5); ctx.fill();
      ctx.fillStyle = '#ffce3a';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        ell(ctx, Math.cos(a) * 14 * s, -78 * s + Math.sin(a) * 14 * s, 9 * s, 5 * s, a); ctx.fill();
      }
      ctx.fillStyle = '#7a4a1e';
      ctx.beginPath(); ctx.arc(0, -78 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
    },
    flower(ctx, s) {
      ctx.strokeStyle = '#4c8a3f'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22 * s); ctx.stroke();
      const cols = ['#ff8fb1', '#c78fff', '#fff'];
      ctx.fillStyle = cols[Math.floor(hash(s * 91) * cols.length)];
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 6 * s, -22 * s + Math.sin(a) * 6 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(0, -22 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    },
    beehive(ctx, s) {
      ctx.fillStyle = '#e0a33c';
      ell(ctx, 0, -30 * s, 24 * s, 26 * s); ctx.fill();
      ctx.strokeStyle = '#b87f26'; ctx.lineWidth = 3 * s;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, -30 * s, (10 + i * 7) * s, 0.3, Math.PI - 0.3); ctx.stroke();
      }
      ctx.fillStyle = '#5a3d15';
      ell(ctx, 0, -14 * s, 6 * s, 5 * s); ctx.fill();
    },
    signpost(ctx, s, extra) {
      ctx.fillStyle = '#8a6a45';
      rr(ctx, -5 * s, -92 * s, 10 * s, 92 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#c9a06b';
      rr(ctx, -72 * s, -90 * s, 144 * s, 32 * s, 6 * s); ctx.fill();
      ctx.strokeStyle = '#a8845a'; ctx.lineWidth = 2 * s;
      rr(ctx, -68 * s, -86 * s, 136 * s, 24 * s, 4 * s); ctx.stroke();
      ctx.fillStyle = '#4a3220';
      ctx.font = `bold ${14 * s}px "Baloo 2", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(extra || 'Mrkvov 2 km', 0, -69 * s, 126 * s);
    },
    appletree(ctx, s) {
      ctx.fillStyle = '#7a5a38';
      rr(ctx, -8 * s, -70 * s, 16 * s, 70 * s, 6 * s); ctx.fill();
      ctx.fillStyle = '#5f9e4a';
      ell(ctx, 0, -95 * s, 52 * s, 42 * s); ctx.fill();
      ell(ctx, -34 * s, -78 * s, 30 * s, 24 * s); ctx.fill();
      ell(ctx, 34 * s, -80 * s, 30 * s, 24 * s); ctx.fill();
      ctx.fillStyle = '#e5533a';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc((hash(i + 40) - 0.5) * 80 * s, (-70 - hash(i + 50) * 50) * s, 5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    tree(ctx, s) {
      ctx.fillStyle = '#6e5236';
      rr(ctx, -7 * s, -60 * s, 14 * s, 60 * s, 5 * s); ctx.fill();
      ctx.fillStyle = '#3f7a4a';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (-150 + i * 34) * s);
        ctx.lineTo((36 + i * 10) * s, (-70 + i * 22) * s);
        ctx.lineTo((-36 - i * 10) * s, (-70 + i * 22) * s);
        ctx.closePath(); ctx.fill();
      }
    },
    mushroom(ctx, s) {
      ctx.fillStyle = '#f2ede0';
      rr(ctx, -7 * s, -20 * s, 14 * s, 20 * s, 5 * s); ctx.fill();
      ctx.fillStyle = '#e5533a';
      ctx.beginPath(); ctx.arc(0, -20 * s, 20 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-8 * s, -26 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6 * s, -30 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    },
    gnome(ctx, s) {
      // zahradní trpaslík – klasika
      ctx.fillStyle = '#4a6ecb';
      rr(ctx, -10 * s, -30 * s, 20 * s, 26 * s, 8 * s); ctx.fill();
      ctx.fillStyle = '#f5cfa8';
      ctx.beginPath(); ctx.arc(0, -34 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ell(ctx, 0, -27 * s, 6 * s, 8 * s); ctx.fill(); // vousy
      ctx.fillStyle = '#d8422f';
      ctx.beginPath(); ctx.moveTo(-9 * s, -38 * s); ctx.lineTo(9 * s, -38 * s); ctx.lineTo(0, -60 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-3 * s, -35 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3 * s, -35 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
    },
    stump(ctx, s) {
      ctx.fillStyle = '#7a5a38';
      rr(ctx, -16 * s, -20 * s, 32 * s, 20 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#c9a06b';
      ell(ctx, 0, -20 * s, 16 * s, 6 * s); ctx.fill();
      ctx.strokeStyle = '#a8845a'; ctx.lineWidth = 1.5 * s;
      ell(ctx, 0, -20 * s, 10 * s, 3.6 * s); ctx.stroke();
      ell(ctx, 0, -20 * s, 5 * s, 1.8 * s); ctx.stroke();
    },
    owlbox(ctx, s) {
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 6 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70 * s); ctx.stroke();
      ctx.fillStyle = '#8a6a45';
      rr(ctx, -14 * s, -100 * s, 28 * s, 32 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#3a2a18';
      ctx.beginPath(); ctx.arc(0, -88 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8422f';
      ctx.beginPath(); ctx.moveTo(-16 * s, -100 * s); ctx.lineTo(16 * s, -100 * s); ctx.lineTo(0, -112 * s); ctx.closePath(); ctx.fill();
    },
    scarecrow(ctx, s) {
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -66 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-26 * s, -50 * s); ctx.lineTo(26 * s, -50 * s); ctx.stroke();
      ctx.fillStyle = '#5d8ac2'; // košile
      rr(ctx, -12 * s, -52 * s, 24 * s, 26 * s, 6 * s); ctx.fill();
      ctx.fillStyle = '#f5d79a'; // hlava z pytle
      ctx.beginPath(); ctx.arc(0, -62 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8a03c'; // klobouk
      ell(ctx, 0, -70 * s, 14 * s, 4 * s); ctx.fill();
      rr(ctx, -7 * s, -82 * s, 14 * s, 12 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-3.5 * s, -63 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5 * s, -63 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      // vrabec na rameni – strašák evidentně nefunguje
      ctx.fillStyle = '#7a6a58';
      ell(ctx, 20 * s, -54 * s, 5 * s, 4 * s); ctx.fill();
      ctx.beginPath(); ctx.arc(24 * s, -57 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    },
    ladder(ctx, s) {
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(-10 * s, 0); ctx.lineTo(-4 * s, -70 * s);
      ctx.moveTo(10 * s, 0); ctx.lineTo(4 * s, -70 * s);
      for (let i = 1; i < 6; i++) {
        ctx.moveTo(-9 * s + i * 0.8 * s, -i * 11 * s);
        ctx.lineTo(9 * s - i * 0.8 * s, -i * 11 * s);
      }
      ctx.stroke();
    },
    basket(ctx, s) {
      ctx.fillStyle = '#b5854a';
      ctx.beginPath();
      ctx.moveTo(-18 * s, -24 * s); ctx.lineTo(18 * s, -24 * s); ctx.lineTo(12 * s, 0); ctx.lineTo(-12 * s, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a6234'; ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-15 * s, -16 * s); ctx.lineTo(15 * s, -16 * s);
      ctx.moveTo(-13 * s, -8 * s); ctx.lineTo(13 * s, -8 * s);
      ctx.stroke();
      ctx.fillStyle = '#e5533a';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 9 * s, -27 * s, 5 * s, 0, Math.PI * 2); ctx.fill(); }
    },
    cottage(ctx, s) {
      ctx.fillStyle = '#f2e5d0';
      rr(ctx, -50 * s, -70 * s, 100 * s, 70 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#c05a3a';
      ctx.beginPath(); ctx.moveTo(-60 * s, -70 * s); ctx.lineTo(60 * s, -70 * s); ctx.lineTo(0, -115 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5a38';
      rr(ctx, -12 * s, -40 * s, 24 * s, 40 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#9ec7e8';
      rr(ctx, -40 * s, -58 * s, 20 * s, 18 * s, 2 * s); ctx.fill();
      rr(ctx, 20 * s, -58 * s, 20 * s, 18 * s, 2 * s); ctx.fill();
      // komín s kouřem
      ctx.fillStyle = '#a86a4a';
      rr(ctx, 22 * s, -108 * s, 12 * s, 24 * s, 2 * s); ctx.fill();
    },
    fencebg(ctx, s) {
      ctx.strokeStyle = '#a8845a'; ctx.lineWidth = 4 * s;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { ctx.moveTo(i * 18 * s - 36 * s, 0); ctx.lineTo(i * 18 * s - 36 * s, -30 * s); }
      ctx.moveTo(-40 * s, -12 * s); ctx.lineTo(40 * s, -12 * s);
      ctx.moveTo(-40 * s, -24 * s); ctx.lineTo(40 * s, -24 * s);
      ctx.stroke();
    },
    tractor(ctx, s) {
      ctx.fillStyle = '#d8422f';
      rr(ctx, -40 * s, -46 * s, 56 * s, 26 * s, 6 * s); ctx.fill();
      rr(ctx, -6 * s, -70 * s, 32 * s, 30 * s, 5 * s); ctx.fill();
      ctx.fillStyle = '#9ec7e8';
      rr(ctx, 0, -64 * s, 20 * s, 16 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-24 * s, -14 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18 * s, -12 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(-24 * s, -14 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18 * s, -12 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    },
    laundry(ctx, s) {
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(-40 * s, 0); ctx.lineTo(-40 * s, -55 * s);
      ctx.moveTo(40 * s, 0); ctx.lineTo(40 * s, -55 * s);
      ctx.stroke();
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(-40 * s, -52 * s); ctx.quadraticCurveTo(0, -44 * s, 40 * s, -52 * s); ctx.stroke();
      const cols = ['#e88fb1', '#8fc7e8', '#ffe08a'];
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        const x = -26 * s + i * 26 * s;
        ctx.beginPath();
        ctx.moveTo(x, -49 * s); ctx.lineTo(x + 16 * s, -49 * s);
        ctx.lineTo(x + 14 * s, -28 * s); ctx.lineTo(x + 2 * s, -28 * s);
        ctx.closePath(); ctx.fill();
      });
    },
    dovecote(ctx, s) {
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80 * s); ctx.stroke();
      ctx.fillStyle = '#f2e5d0';
      rr(ctx, -18 * s, -108 * s, 36 * s, 30 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#c05a3a';
      ctx.beginPath(); ctx.moveTo(-22 * s, -108 * s); ctx.lineTo(22 * s, -108 * s); ctx.lineTo(0, -124 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2a18';
      ctx.beginPath(); ctx.arc(0, -94 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      // holubice
      ctx.fillStyle = '#fff';
      ell(ctx, 14 * s, -112 * s, 6 * s, 4 * s); ctx.fill();
      ctx.beginPath(); ctx.arc(19 * s, -115 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    },
    haystack(ctx, s) {
      ctx.fillStyle = '#e8c56a';
      ctx.beginPath(); ctx.moveTo(-34 * s, 0); ctx.quadraticCurveTo(0, -80 * s, 34 * s, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9a03c'; ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, -20 * s); ctx.quadraticCurveTo(-4 * s, -26 * s, 4 * s, -18 * s);
      ctx.moveTo(-6 * s, -42 * s); ctx.quadraticCurveTo(4 * s, -48 * s, 10 * s, -40 * s);
      ctx.stroke();
      // vidle zapíchnuté vedle
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(40 * s, 0); ctx.lineTo(48 * s, -50 * s); ctx.stroke();
    },
    windmill(ctx, s, extra, t) {
      ctx.fillStyle = '#d8cfc0';
      ctx.beginPath();
      ctx.moveTo(-20 * s, 0); ctx.lineTo(20 * s, 0); ctx.lineTo(12 * s, -90 * s); ctx.lineTo(-12 * s, -90 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c05a3a';
      ctx.beginPath(); ctx.arc(0, -92 * s, 14 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(0, -92 * s);
      ctx.rotate((t || 0) * 0.001);
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s;
      ctx.fillStyle = '#f2e5d0';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -44 * s); ctx.stroke();
        rr(ctx, -6 * s, -44 * s, 12 * s, 30 * s, 3 * s); ctx.fill();
      }
      ctx.restore();
    },
    tent(ctx, s) {
      ctx.fillStyle = '#e8874a';
      ctx.beginPath(); ctx.moveTo(-36 * s, 0); ctx.lineTo(36 * s, 0); ctx.lineTo(0, -52 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b5602a';
      ctx.beginPath(); ctx.moveTo(-10 * s, 0); ctx.lineTo(10 * s, 0); ctx.lineTo(0, -30 * s); ctx.closePath(); ctx.fill();
    },
    campfire(ctx, s, extra, t) {
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, -2 * s); ctx.lineTo(14 * s, -8 * s);
      ctx.moveTo(-14 * s, -8 * s); ctx.lineTo(14 * s, -2 * s);
      ctx.stroke();
      const f = 1 + 0.15 * Math.sin((t || 0) * 0.02);
      ctx.fillStyle = '#ff9d3a';
      ctx.beginPath();
      ctx.moveTo(-10 * s, -6 * s);
      ctx.quadraticCurveTo(-8 * s, -30 * s * f, 0, -38 * s * f);
      ctx.quadraticCurveTo(8 * s, -30 * s * f, 10 * s, -6 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(-5 * s, -6 * s);
      ctx.quadraticCurveTo(0, -22 * s * f, 5 * s, -6 * s);
      ctx.closePath(); ctx.fill();
    },
    butterflyZone(ctx, s, extra, t) {
      // pár motýlů poletujících na místě
      for (let i = 0; i < 3; i++) {
        const a = (t || 0) * 0.002 + i * 2.1;
        const x = Math.cos(a) * 26 * s + Math.sin(a * 1.7) * 10;
        const y = -50 * s + Math.sin(a * 1.3) * 18 * s;
        const flap = Math.abs(Math.sin((t || 0) * 0.02 + i));
        ctx.fillStyle = ['#ff8fb1', '#8fc7e8', '#ffe08a'][i];
        ell(ctx, x - 4 * s, y, 5 * s * flap + 1, 4 * s, -0.4); ctx.fill();
        ell(ctx, x + 4 * s, y, 5 * s * flap + 1, 4 * s, 0.4); ctx.fill();
      }
    },

    // kovboj vedoucí kravku – místní hospodář ve westernové póze (jako z fotky)
    cowboy(ctx, s, extra, t) {
      // --- kravička na provaze ---
      ctx.save();
      ctx.translate(-52 * s, 0);
      ctx.strokeStyle = '#e8ddc8'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14 * s, -2 * s); ctx.lineTo(-14 * s, -20 * s);
      ctx.moveTo(-2 * s, -2 * s); ctx.lineTo(-2 * s, -20 * s);
      ctx.moveTo(10 * s, -2 * s); ctx.lineTo(10 * s, -20 * s);
      ctx.moveTo(22 * s, -2 * s); ctx.lineTo(22 * s, -20 * s);
      ctx.stroke();
      ctx.fillStyle = '#f0e7d6';
      rr(ctx, -20 * s, -52 * s, 48 * s, 34 * s, 14 * s); ctx.fill();
      ctx.fillStyle = '#c07a44';
      ell(ctx, -6 * s, -40 * s, 10 * s, 8 * s); ctx.fill();
      ell(ctx, 16 * s, -46 * s, 7 * s, 6 * s); ctx.fill();
      ctx.fillStyle = '#f0e7d6';
      ell(ctx, -26 * s, -30 * s, 12 * s, 10 * s, -0.5); ctx.fill();
      ctx.fillStyle = '#e79a9a'; ell(ctx, -33 * s, -24 * s, 5 * s, 4 * s, -0.5); ctx.fill();
      ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(-24 * s, -40 * s); ctx.lineTo(-26 * s, -46 * s);
      ctx.moveTo(-19 * s, -40 * s); ctx.lineTo(-16 * s, -46 * s); ctx.stroke();
      ctx.strokeStyle = '#e8ddc8'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(27 * s, -46 * s); ctx.quadraticCurveTo(34 * s, -34 * s, 30 * s, -20 * s); ctx.stroke();
      ctx.restore();
      // provaz od ruky ke kravce
      ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2.5 * s;
      ctx.beginPath(); ctx.moveTo(-10 * s, -58 * s); ctx.quadraticCurveTo(-30 * s, -42 * s, -86 * s, -30 * s); ctx.stroke();
      // --- kovboj ---
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -12 * s, -54 * s, 11 * s, 54 * s, 4 * s); ctx.fill();
      rr(ctx, 3 * s, -54 * s, 11 * s, 54 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      rr(ctx, -15 * s, -8 * s, 15 * s, 8 * s, 3 * s); ctx.fill();
      rr(ctx, 2 * s, -8 * s, 15 * s, 8 * s, 3 * s); ctx.fill();
      // červená kostkovaná košile
      ctx.fillStyle = '#c23a34';
      rr(ctx, -16 * s, -100 * s, 32 * s, 50 * s, 8 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(-9 * s, -100 * s); ctx.lineTo(-9 * s, -50 * s);
      ctx.moveTo(3 * s, -100 * s); ctx.lineTo(3 * s, -50 * s);
      ctx.moveTo(-16 * s, -84 * s); ctx.lineTo(16 * s, -84 * s);
      ctx.moveTo(-16 * s, -68 * s); ctx.lineTo(16 * s, -68 * s);
      ctx.stroke();
      // rozepnutá džínová bunda
      ctx.fillStyle = '#5b86b3';
      rr(ctx, -20 * s, -102 * s, 14 * s, 52 * s, 7 * s); ctx.fill();
      rr(ctx, 6 * s, -102 * s, 14 * s, 52 * s, 7 * s); ctx.fill();
      ctx.fillStyle = '#4a6f96';
      ctx.beginPath(); ctx.moveTo(-14 * s, -102 * s); ctx.lineTo(-4 * s, -96 * s); ctx.lineTo(-14 * s, -92 * s); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14 * s, -102 * s); ctx.lineTo(4 * s, -96 * s); ctx.lineTo(14 * s, -92 * s); ctx.closePath(); ctx.fill();
      // ruka drží provaz
      ctx.strokeStyle = '#5b86b3'; ctx.lineWidth = 8 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14 * s, -96 * s); ctx.quadraticCurveTo(-16 * s, -76 * s, -10 * s, -58 * s); ctx.stroke();
      ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(-10 * s, -57 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      // druhá ruka palcem za pásek
      ctx.strokeStyle = '#5b86b3'; ctx.lineWidth = 8 * s;
      ctx.beginPath(); ctx.moveTo(14 * s, -96 * s); ctx.quadraticCurveTo(24 * s, -84 * s, 18 * s, -70 * s); ctx.stroke();
      // hlava + zrzavý plnovous
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(0, -116 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b5622e';
      ctx.beginPath(); ctx.arc(0, -110 * s, 13 * s, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a4a24'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.arc(0, -113 * s, 4 * s, 0.2, Math.PI - 0.4); ctx.stroke();
      ctx.fillStyle = '#3a2a1c';
      ctx.beginPath(); ctx.arc(-4 * s, -119 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5 * s, -119 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
      // kovbojský klobouk
      ctx.fillStyle = '#6b4a2c';
      ell(ctx, 0, -127 * s, 20 * s, 6 * s); ctx.fill();
      rr(ctx, -9 * s, -143 * s, 18 * s, 17 * s, 5 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      rr(ctx, -9 * s, -130 * s, 18 * s, 3 * s, 1 * s); ctx.fill();
    },
    // baráček se svítícími okny – v podvečer a v noci vzadu hřejivě svítí
    farmhouse(ctx, s, extra, t) {
      const flick = 0.82 + 0.18 * Math.sin((t || 0) * 0.005);
      ctx.fillStyle = '#e6d3b3';
      rr(ctx, -58 * s, -78 * s, 116 * s, 78 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#7a4636';
      ctx.beginPath(); ctx.moveTo(-70 * s, -78 * s); ctx.lineTo(70 * s, -78 * s); ctx.lineTo(0, -128 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a5a3a'; rr(ctx, 30 * s, -120 * s, 13 * s, 26 * s, 2 * s); ctx.fill();
      ctx.fillStyle = 'rgba(220,220,220,0.5)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(37 * s + Math.sin((t || 0) * 0.003 + i) * 3 * s, (-128 - i * 11) * s, (4 + i * 1.5) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5a3d28'; rr(ctx, -10 * s, -42 * s, 20 * s, 42 * s, 3 * s); ctx.fill();
      const win = (wx, wy, ww, wh) => {
        const g = ctx.createRadialGradient(wx, wy, 2 * s, wx, wy, ww * 1.8);
        g.addColorStop(0, 'rgba(255,206,110,' + (0.9 * flick) + ')');
        g.addColorStop(1, 'rgba(255,206,110,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(wx, wy, ww * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b4a30'; rr(ctx, wx - ww / 2 - 2 * s, wy - wh / 2 - 2 * s, ww + 4 * s, wh + 4 * s, 2 * s); ctx.fill();
        ctx.fillStyle = 'rgba(255,224,150,' + flick + ')'; rr(ctx, wx - ww / 2, wy - wh / 2, ww, wh, 1.5 * s); ctx.fill();
        ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 1.5 * s;
        ctx.beginPath(); ctx.moveTo(wx, wy - wh / 2); ctx.lineTo(wx, wy + wh / 2); ctx.moveTo(wx - ww / 2, wy); ctx.lineTo(wx + ww / 2, wy); ctx.stroke();
      };
      win(-34 * s, -56 * s, 22 * s, 20 * s);
      win(34 * s, -56 * s, 22 * s, 20 * s);
    },
    // pasoucí se kravka – klidný obyvatel pastviny, ať je pozadí živější
    grazingcow(ctx, s, extra, t) {
      const tail = Math.sin((t || 0) * 0.004);
      ctx.strokeStyle = '#e8ddc8'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20 * s, -2 * s); ctx.lineTo(-20 * s, -26 * s);
      ctx.moveTo(-6 * s, -2 * s); ctx.lineTo(-6 * s, -26 * s);
      ctx.moveTo(12 * s, -2 * s); ctx.lineTo(12 * s, -26 * s);
      ctx.moveTo(26 * s, -2 * s); ctx.lineTo(26 * s, -26 * s);
      ctx.stroke();
      ctx.fillStyle = '#f0e7d6'; rr(ctx, -28 * s, -64 * s, 62 * s, 42 * s, 18 * s); ctx.fill();
      ctx.fillStyle = '#c07a44';
      ell(ctx, -8 * s, -50 * s, 13 * s, 10 * s); ctx.fill();
      ell(ctx, 20 * s, -56 * s, 9 * s, 7 * s); ctx.fill();
      ctx.save(); ctx.translate(-34 * s, -30 * s); ctx.rotate(-0.35);
      ctx.fillStyle = '#f0e7d6'; ell(ctx, 0, 0, 14 * s, 11 * s); ctx.fill();
      ctx.fillStyle = '#e79a9a'; ell(ctx, -10 * s, 4 * s, 5 * s, 4 * s); ctx.fill();
      ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(2 * s, -9 * s); ctx.lineTo(0, -15 * s); ctx.moveTo(8 * s, -8 * s); ctx.lineTo(11 * s, -14 * s); ctx.stroke();
      ctx.fillStyle = '#f0e7d6'; ell(ctx, 9 * s, -2 * s, 5 * s, 3 * s, 0.5); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#e8ddc8'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(33 * s, -58 * s); ctx.quadraticCurveTo((42 + tail * 4) * s, -40 * s, (38 + tail * 6) * s, -22 * s); ctx.stroke();
      ctx.strokeStyle = '#6ea24a'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(-40 * s, -2 * s); ctx.lineTo(-42 * s, -10 * s); ctx.moveTo(-36 * s, -2 * s); ctx.lineTo(-35 * s, -11 * s); ctx.stroke();
    },
    // pasoucí se ovečky – dvě chundelaté, přední občas zvedne hlavu od trávy
    grazingsheep(ctx, s, extra, t) {
      const lift = Math.max(0, Math.sin((t || 0) * 0.0012) - 0.4) * 20; // 0..12 zvednutí hlavy
      for (let i = 0; i < 2; i++) {
        const ox = (i ? 24 : -20) * s;
        const sc = (i ? 0.78 : 1) * s;
        const hy = (-13 - (i ? 0 : lift)) * sc; // hlavu zvedá jen přední ovečka
        ctx.strokeStyle = '#8a7a66'; ctx.lineWidth = 3.5 * sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ox - 9 * sc, -2 * sc); ctx.lineTo(ox - 9 * sc, -16 * sc);
        ctx.moveTo(ox + 9 * sc, -2 * sc); ctx.lineTo(ox + 9 * sc, -16 * sc);
        ctx.stroke();
        ctx.fillStyle = '#f2eee0';
        ell(ctx, ox, -24 * sc, 17 * sc, 11 * sc); ctx.fill();
        ell(ctx, ox - 9 * sc, -31 * sc, 9 * sc, 7 * sc); ctx.fill();
        ell(ctx, ox + 8 * sc, -30 * sc, 8 * sc, 6 * sc); ctx.fill();
        ell(ctx, ox + 17 * sc, -27 * sc, 4 * sc, 4 * sc); ctx.fill(); // ocásek
        ctx.fillStyle = '#6e6052';
        ell(ctx, ox - 17 * sc, hy, 6 * sc, 7.5 * sc, -0.4); ctx.fill(); // hlava
        ell(ctx, ox - 13 * sc, hy - 6 * sc, 3.5 * sc, 2 * sc, -0.5); ctx.fill(); // ouško
        ctx.fillStyle = '#f2eee0';
        ell(ctx, ox - 16 * sc, hy - 7 * sc, 5 * sc, 3.5 * sc); ctx.fill(); // čupřina
        ctx.strokeStyle = '#6ea24a'; ctx.lineWidth = 2 * sc;
        ctx.beginPath();
        ctx.moveTo(ox - 22 * sc, -2 * sc); ctx.lineTo(ox - 24 * sc, -9 * sc);
        ctx.moveTo(ox - 18 * sc, -2 * sc); ctx.lineTo(ox - 17 * sc, -10 * sc);
        ctx.stroke();
      }
    },
    // zobající slepičky – každá kluje v jiném rytmu
    chickens(ctx, s, extra, t) {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 22 * s;
        const sc = (0.85 + (i % 2) * 0.15) * s;
        const peck = Math.max(0, Math.sin((t || 0) * 0.006 + i * 2.1)); // 0..1 klovnutí
        ctx.strokeStyle = '#d9a03c'; ctx.lineWidth = 2.5 * sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ox - 3 * sc, -2 * sc); ctx.lineTo(ox - 3 * sc, -8 * sc);
        ctx.moveTo(ox + 3 * sc, -2 * sc); ctx.lineTo(ox + 3 * sc, -8 * sc);
        ctx.stroke();
        ctx.fillStyle = ['#f0e7d6', '#c07a44', '#8a6a52'][i];
        ell(ctx, ox, -14 * sc, 10 * sc, 8 * sc); ctx.fill();
        ctx.beginPath(); ctx.moveTo(ox + 8 * sc, -18 * sc); // ocásek
        ctx.lineTo(ox + 15 * sc, -24 * sc); ctx.lineTo(ox + 10 * sc, -14 * sc);
        ctx.closePath(); ctx.fill();
        const hx = ox - 9 * sc, hyC = -20 * sc + peck * 12 * sc; // hlava klove dolů
        ell(ctx, hx, hyC, 4.5 * sc, 4.5 * sc); ctx.fill();
        ctx.fillStyle = '#d9534f'; ell(ctx, hx + 1 * sc, hyC - 4.5 * sc, 2.5 * sc, 2 * sc); ctx.fill(); // hřebínek
        ctx.fillStyle = '#e8973a';
        ctx.beginPath(); ctx.moveTo(hx - 4 * sc, hyC); ctx.lineTo(hx - 9 * sc, hyC + 2 * sc); ctx.lineTo(hx - 4 * sc, hyC + 3 * sc); ctx.closePath(); ctx.fill(); // zobáček
      }
    },
    // srnka – zvědavě postává, jen ouško jí občas cukne
    deer(ctx, s, extra, t) {
      const ear = Math.sin((t || 0) * 0.008) > 0.92 ? 0.4 : 0;
      ctx.strokeStyle = '#8a6748'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14 * s, -2 * s); ctx.lineTo(-13 * s, -26 * s);
      ctx.moveTo(-4 * s, -2 * s); ctx.lineTo(-5 * s, -26 * s);
      ctx.moveTo(10 * s, -2 * s); ctx.lineTo(9 * s, -26 * s);
      ctx.moveTo(17 * s, -2 * s); ctx.lineTo(16 * s, -26 * s);
      ctx.stroke();
      ctx.fillStyle = '#a97e54';
      ell(ctx, 0, -34 * s, 22 * s, 12 * s); ctx.fill();
      ctx.fillStyle = '#f2eadb'; ell(ctx, 18 * s, -30 * s, 5 * s, 5 * s); ctx.fill(); // zrcátko
      ctx.strokeStyle = '#a97e54'; ctx.lineWidth = 7 * s;
      ctx.beginPath(); ctx.moveTo(-16 * s, -38 * s); ctx.lineTo(-24 * s, -58 * s); ctx.stroke(); // krk
      ctx.fillStyle = '#a97e54';
      ell(ctx, -26 * s, -62 * s, 7 * s, 5.5 * s, -0.3); ctx.fill(); // hlava
      ctx.fillStyle = '#3d2f24'; ell(ctx, -32 * s, -63 * s, 2 * s, 2 * s); ctx.fill(); // čumáček
      ctx.fillStyle = '#a97e54';
      ctx.save(); ctx.translate(-24 * s, -67 * s); ctx.rotate(-0.5 - ear);
      ell(ctx, 0, -4 * s, 2.5 * s, 5 * s); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(-20 * s, -66 * s); ctx.rotate(0.35);
      ell(ctx, 0, -4 * s, 2.5 * s, 5 * s); ctx.fill();
      ctx.restore();
    },
    // husy – jedna hlídá s krkem nahoru, druhá se pase
    geese(ctx, s, extra, t) {
      const sway = Math.sin((t || 0) * 0.0025) * 2;
      for (let i = 0; i < 2; i++) {
        const ox = (i ? 22 : -16) * s;
        const sc = (i ? 0.9 : 1) * s;
        ctx.strokeStyle = '#e8973a'; ctx.lineWidth = 2.5 * sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ox - 3 * sc, -2 * sc); ctx.lineTo(ox - 3 * sc, -10 * sc);
        ctx.moveTo(ox + 4 * sc, -2 * sc); ctx.lineTo(ox + 4 * sc, -10 * sc);
        ctx.stroke();
        ctx.fillStyle = '#f4f1e6';
        ell(ctx, ox, -16 * sc, 13 * sc, 9 * sc); ctx.fill();
        ctx.beginPath(); ctx.moveTo(ox + 10 * sc, -20 * sc); // ocásek
        ctx.lineTo(ox + 17 * sc, -25 * sc); ctx.lineTo(ox + 12 * sc, -16 * sc);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 4 * sc;
        if (i === 0) {
          const hx = ox - (8 + sway) * sc, hy = -40 * sc; // hlídka, krk se pohupuje
          ctx.beginPath(); ctx.moveTo(ox - 7 * sc, -20 * sc); ctx.quadraticCurveTo(ox - 12 * sc, -32 * sc, hx, hy); ctx.stroke();
          ctx.fillStyle = '#f4f1e6'; ell(ctx, hx, hy - 2 * sc, 4.5 * sc, 4 * sc); ctx.fill();
          ctx.fillStyle = '#e8973a';
          ctx.beginPath(); ctx.moveTo(hx - 4 * sc, hy - 3 * sc); ctx.lineTo(hx - 10 * sc, hy - 1 * sc); ctx.lineTo(hx - 4 * sc, hy); ctx.closePath(); ctx.fill();
        } else {
          const hx = ox - 13 * sc, hy = -6 * sc; // pastva, krk obloukem k zemi
          ctx.beginPath(); ctx.moveTo(ox - 7 * sc, -18 * sc); ctx.quadraticCurveTo(ox - 15 * sc, -14 * sc, hx, hy); ctx.stroke();
          ctx.fillStyle = '#f4f1e6'; ell(ctx, hx, hy, 4 * sc, 3.5 * sc); ctx.fill();
          ctx.fillStyle = '#e8973a';
          ctx.beginPath(); ctx.moveTo(hx - 3 * sc, hy); ctx.lineTo(hx - 9 * sc, hy + 2 * sc); ctx.lineTo(hx - 2 * sc, hy + 3 * sc); ctx.closePath(); ctx.fill();
        }
      }
    },

    /* ---------- lidští obyvatelé Louky ---------- */
    tomas(ctx, s, extra, t) {
      // Tomáš – pilně staví a slepice mu z hlavy dělá stavební dozor
      // pózy: 0 = buší kladivem, 1 = řeže pilou, 2 = fandí s kladivem, 3 = spí (noc)
      const v = (extra || 0) % 4;
      const swing = Math.sin((t || 0) * 0.004);
      if (v === 0) {
        // hromádka prken vedle něj
        ctx.fillStyle = '#c9a06b';
        rr(ctx, 18 * s, -10 * s, 46 * s, 6 * s, 2 * s); ctx.fill();
        rr(ctx, 22 * s, -17 * s, 40 * s, 6 * s, 2 * s); ctx.fill();
      } else if (v === 1) {
        // koza s prknem, které zrovna řeže
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-42 * s, 0); ctx.lineTo(-33 * s, -26 * s); ctx.lineTo(-24 * s, 0);
        ctx.stroke();
        ctx.fillStyle = '#c9a06b';
        rr(ctx, -56 * s, -33 * s, 46 * s, 7 * s, 2 * s); ctx.fill();
      }
      // nohy – pracovní kalhoty a boty
      ctx.fillStyle = '#7a6248';
      rr(ctx, -13 * s, -52 * s, 11 * s, 52 * s, 4 * s); ctx.fill();
      rr(ctx, 2 * s, -52 * s, 11 * s, 52 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#4a3a28';
      rr(ctx, -16 * s, -8 * s, 15 * s, 8 * s, 3 * s); ctx.fill();
      rr(ctx, 1 * s, -8 * s, 15 * s, 8 * s, 3 * s); ctx.fill();
      // zelená mikina s kapsou
      ctx.fillStyle = '#3f7d4a';
      rr(ctx, -18 * s, -102 * s, 36 * s, 54 * s, 10 * s); ctx.fill();
      ctx.fillStyle = '#356b40';
      rr(ctx, -10 * s, -72 * s, 20 * s, 14 * s, 5 * s); ctx.fill();
      // kulaté logo s muchomůrkou
      ctx.fillStyle = '#e8c56a';
      ctx.beginPath(); ctx.arc(0, -88 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2ede0';
      rr(ctx, -1.4 * s, -90 * s, 2.8 * s, 6 * s, 1 * s); ctx.fill();
      ctx.fillStyle = '#d8422f';
      ctx.beginPath(); ctx.arc(0, -90 * s, 4 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
      if (v === 0) {
        // ruka s kladivem – pilně buší
        ctx.save();
        ctx.translate(-14 * s, -96 * s);
        ctx.rotate(-0.5 + swing * 0.45);
        ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18 * s, 12 * s); ctx.stroke();
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.moveTo(-18 * s, 12 * s); ctx.lineTo(-28 * s, -6 * s); ctx.stroke();
        ctx.fillStyle = '#5a5a5a';
        rr(ctx, -36 * s, -14 * s, 16 * s, 9 * s, 3 * s); ctx.fill();
        ctx.restore();
      } else if (v === 1) {
        // ruka s pilou – řeže prkno na koze
        const hx = (-30 + swing * 7) * s, hy = -40 * s;
        ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14 * s, -94 * s); ctx.quadraticCurveTo(-26 * s, -70 * s, hx, hy); ctx.stroke();
        // čepel pily zakousnutá do prkna
        ctx.fillStyle = '#b8bfc4';
        ctx.beginPath();
        ctx.moveTo(hx - 2 * s, hy + 2 * s);
        ctx.lineTo(hx - 26 * s, hy + 5 * s);
        ctx.lineTo(hx - 24 * s, hy + 11 * s);
        ctx.lineTo(hx - 2 * s, hy + 9 * s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a6a45';
        rr(ctx, hx - 3 * s, hy, 7 * s, 11 * s, 2 * s); ctx.fill();
      } else if (v === 2) {
        // fandí – obě ruce nad hlavou, v jedné vítězně kladivo
        const palmL = (-28 + swing * 3) * s, palmR = (28 - swing * 3) * s;
        ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14 * s, -96 * s); ctx.quadraticCurveTo(-26 * s, -112 * s, palmL, -128 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14 * s, -96 * s); ctx.quadraticCurveTo(26 * s, -112 * s, palmR, -128 * s); ctx.stroke();
        ctx.fillStyle = '#e8b88a';
        ctx.beginPath(); ctx.arc(palmL, -130 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(palmR, -130 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(palmR, -132 * s);
        ctx.rotate(0.3 + swing * 0.15);
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16 * s); ctx.stroke();
        ctx.fillStyle = '#5a5a5a';
        rr(ctx, -8 * s, -24 * s, 16 * s, 9 * s, 3 * s); ctx.fill();
        ctx.restore();
      } else {
        // spí – obě ruce svěšené podél těla, kladivo odloženo u nohou
        ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14 * s, -96 * s); ctx.quadraticCurveTo(-20 * s, -78 * s, -17 * s, -60 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14 * s, -96 * s); ctx.quadraticCurveTo(20 * s, -78 * s, 17 * s, -60 * s); ctx.stroke();
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 3.5 * s;
        ctx.beginPath(); ctx.moveTo(22 * s, -2 * s); ctx.lineTo(40 * s, -2 * s); ctx.stroke();
        ctx.fillStyle = '#5a5a5a';
        rr(ctx, 38 * s, -8 * s, 14 * s, 8 * s, 3 * s); ctx.fill();
      }
      if (v === 0 || v === 1) {
        // druhá ruka v bok
        ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(14 * s, -96 * s); ctx.quadraticCurveTo(26 * s, -84 * s, 16 * s, -70 * s); ctx.stroke();
      }
      // hlava s úsměvem
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(0, -117 * s, 14 * s, 0, Math.PI * 2); ctx.fill();
      if (v === 3) {
        // ospalý – zavřené oči, pootevřená pusa a bublinka Zzz
        ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(-4 * s, -119 * s, 2.4 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(8.4 * s, -119 * s);
        ctx.arc(6 * s, -119 * s, 2.4 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#a8543a';
        ell(ctx, 1 * s, -110 * s, 2 * s, 2.6 * s); ctx.fill();
        drawZzz(ctx, s, t, 18, -132);
      } else {
        ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.8 * s;
        ctx.beginPath(); ctx.arc(1 * s, -112 * s, 5 * s, 0.2, Math.PI - 0.6); ctx.stroke();
        ctx.fillStyle = '#3a2a1c';
        ctx.beginPath(); ctx.arc(-4 * s, -119 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * s, -119 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      }
      // blond číro z dredů
      ctx.fillStyle = '#c9a55a';
      for (let i = 0; i < 5; i++) {
        ell(ctx, (-8 + i * 4) * s, (-130 - hash(i) * 3) * s, 3 * s, 7 * s, (i - 2) * 0.15);
        ctx.fill();
      }
      // slepice na hlavě (hnědka jako z fotky)
      const hop = Math.sin((t || 0) * 0.006) * 1.5;
      ctx.save();
      ctx.translate(2 * s, (-140 + hop) * s);
      ctx.fillStyle = '#c98a4a';
      ell(ctx, 0, 0, 10 * s, 7 * s); ctx.fill();
      ctx.fillStyle = '#a86a34';
      ell(ctx, 8 * s, -4 * s, 4 * s, 6 * s, 0.5); ctx.fill();
      ctx.fillStyle = '#c98a4a';
      ctx.beginPath(); ctx.arc(-9 * s, -6 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e5533a';
      ctx.beginPath(); ctx.arc(-10 * s, -11 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-7.5 * s, -12 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0a03c';
      ctx.beginPath(); ctx.moveTo(-13 * s, -6 * s); ctx.lineTo(-18 * s, -5 * s); ctx.lineTo(-13 * s, -4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-10 * s, -7 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    tony(ctx, s, extra, t) {
      // Tony – pečuje o zvířata i o wi-fi signál
      // pózy: 0 = drbe berana a hlídá appku, 1 = streamuje a mává, 2 = krmí berana, 3 = klimbá (noc)
      const v = (extra || 0) % 4;
      // beran vedle něj (blažený) – kus od Tonyho, ať mu není vidět jen zadek
      ctx.save();
      // při streamování beran nadšeně poskakuje
      ctx.translate(46 * s, v === 1 ? -Math.abs(Math.sin((t || 0) * 0.008)) * 7 * s : 0);
      ctx.scale(1.2, 1.2);
      ctx.fillStyle = '#ece5d4';
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 15 * s, -25 * s + Math.sin(a) * 9 * s, 8.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ell(ctx, 0, -25 * s, 19 * s, 13 * s); ctx.fill();
      ctx.strokeStyle = '#b5a890'; ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(-8 * s, -14 * s); ctx.lineTo(-8 * s, 0);
      ctx.moveTo(8 * s, -14 * s); ctx.lineTo(8 * s, 0);
      ctx.stroke();
      // hlava berana s točeným rohem
      ctx.fillStyle = '#f2ede0';
      ell(ctx, -19 * s, -35 * s, 9 * s, 8 * s, -0.15); ctx.fill();
      ctx.strokeStyle = '#c7ad85'; ctx.lineWidth = 4.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-15 * s, -39 * s, 7 * s, -0.5, Math.PI * 1.35); ctx.stroke();
      ctx.fillStyle = '#d9b8a8';
      ell(ctx, -25 * s, -32 * s, 4 * s, 3.4 * s, -0.2); ctx.fill();
      // blaženě zavřené oko – tohle drbání je přesně ono
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.arc(-20 * s, -37 * s, 2 * s, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.restore();
      // nohy a boty
      ctx.fillStyle = '#4a4438';
      rr(ctx, -16 * s, -50 * s, 10 * s, 50 * s, 4 * s); ctx.fill();
      rr(ctx, -3 * s, -50 * s, 10 * s, 50 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#332c22';
      rr(ctx, -19 * s, -7 * s, 14 * s, 7 * s, 3 * s); ctx.fill();
      rr(ctx, -6 * s, -7 * s, 14 * s, 7 * s, 3 * s); ctx.fill();
      // bunda
      ctx.fillStyle = '#6f6a52';
      rr(ctx, -20 * s, -98 * s, 30 * s, 50 * s, 9 * s); ctx.fill();
      const scratch = Math.sin((t || 0) * 0.01) * 3;
      const wave = Math.sin((t || 0) * 0.006);
      ctx.strokeStyle = '#6f6a52'; ctx.lineWidth = 8 * s; ctx.lineCap = 'round';
      if (v === 0) {
        // ruka drbající berana
        ctx.beginPath(); ctx.moveTo(6 * s, -88 * s); ctx.quadraticCurveTo(20 * s, -66 * s, (10 + scratch) * s, -42 * s); ctx.stroke();
        // ruka s telefonem
        ctx.beginPath(); ctx.moveTo(-16 * s, -88 * s); ctx.quadraticCurveTo(-30 * s, -78 * s, -26 * s, -66 * s); ctx.stroke();
        ctx.fillStyle = '#2c2c30';
        rr(ctx, -33 * s, -78 * s, 12 * s, 18 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#9fd9f2';
        rr(ctx, -31 * s, -76 * s, 8 * s, 13 * s, 2 * s); ctx.fill();
        // nad telefonem občas problikne notifikace
        if (Math.sin((t || 0) * 0.005) > 0) {
          ctx.fillStyle = '#ffd24a';
          ctx.font = `bold ${9 * s}px "Baloo 2", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('₿', -27 * s, -84 * s);
        }
      } else if (v === 1) {
        // streamuje – telefon vysoko nad hlavou, druhou rukou mává běžci
        ctx.beginPath(); ctx.moveTo(-16 * s, -88 * s); ctx.quadraticCurveTo(-26 * s, -104 * s, -25 * s, -120 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6 * s, -88 * s); ctx.quadraticCurveTo(18 * s, -102 * s, (22 - wave * 4) * s, -116 * s); ctx.stroke();
        ctx.fillStyle = '#d9a878';
        ctx.beginPath(); ctx.arc((22 - wave * 4) * s, -118 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        // telefon natočený na běžce
        ctx.fillStyle = '#2c2c30';
        rr(ctx, -31 * s, -140 * s, 12 * s, 19 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#9fd9f2';
        rr(ctx, -29 * s, -138 * s, 8 * s, 14 * s, 2 * s); ctx.fill();
        // srdíčka od sledujících
        if (Math.sin((t || 0) * 0.005) > -0.3) {
          ctx.fillStyle = '#ff8fb1';
          ctx.font = `bold ${9 * s}px "Baloo 2", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('♥', -19 * s, -142 * s);
        }
      } else if (v === 2) {
        // krmí berana – kýbl granulí přímo pod jeho čumákem
        ctx.beginPath(); ctx.moveTo(6 * s, -88 * s); ctx.quadraticCurveTo(18 * s, -70 * s, 21 * s, -52 * s); ctx.stroke();
        // druhá ruka v kapse (jen krátký náznak)
        ctx.beginPath(); ctx.moveTo(-16 * s, -88 * s); ctx.quadraticCurveTo(-24 * s, -78 * s, -18 * s, -68 * s); ctx.stroke();
        ctx.fillStyle = '#7a8aa0';
        ctx.beginPath();
        ctx.moveTo(14 * s, -50 * s); ctx.lineTo(30 * s, -50 * s);
        ctx.lineTo(28 * s, -35 * s); ctx.lineTo(16 * s, -35 * s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9a06b';
        ell(ctx, 22 * s, -50 * s, 7 * s, 2.6 * s); ctx.fill();
      } else {
        // klimbá – jedna ruka drží telefon nízko v klíně, druhá svěšená
        ctx.beginPath(); ctx.moveTo(6 * s, -88 * s); ctx.quadraticCurveTo(16 * s, -74 * s, 12 * s, -62 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-16 * s, -88 * s); ctx.quadraticCurveTo(-22 * s, -74 * s, -18 * s, -60 * s); ctx.stroke();
        ctx.fillStyle = '#2c2c30';
        rr(ctx, 6 * s, -66 * s, 12 * s, 17 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#3a4658'; // ztmavlý spánkový režim displeje
        rr(ctx, 8 * s, -64 * s, 8 * s, 12 * s, 2 * s); ctx.fill();
      }
      // hlava s plnovousem
      ctx.fillStyle = '#d9a878';
      ctx.beginPath(); ctx.arc(-5 * s, -112 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e2620';
      ell(ctx, -5 * s, -101 * s, 11 * s, 7 * s); ctx.fill();
      ctx.strokeStyle = '#d9a878'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.arc(-5 * s, -101 * s, 3.4 * s, 0.2, Math.PI - 0.2); ctx.stroke();
      // kudrnatá koruna nahoře (ať zbyde místo na oči)
      ctx.fillStyle = '#2e2620';
      ctx.beginPath(); ctx.arc(-5 * s, -117 * s, 13 * s, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.08 + i * 0.21);
        ctx.beginPath();
        ctx.arc(-5 * s + Math.cos(a) * 12 * s, -118 * s + Math.sin(a) * 10 * s, 5.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (v === 3) {
        // klimbající zavřené oči a Zzz nad hlavou
        ctx.strokeStyle = '#2d2015'; ctx.lineWidth = 1.4 * s;
        ctx.beginPath();
        ctx.arc(-10 * s, -110 * s, 2.2 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(1.2 * s, -110 * s);
        ctx.arc(-1 * s, -110 * s, 2.2 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        drawZzz(ctx, s, t, 12, -126);
      } else {
        // usměvavé oči
        ctx.fillStyle = '#2d2015';
        ctx.beginPath(); ctx.arc(-10 * s, -110 * s, 1.7 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-1 * s, -110 * s, 1.7 * s, 0, Math.PI * 2); ctx.fill();
      }
    },
    maruska(ctx, s, extra, t) {
      // Maruška – zpívá bylinkám i miminku v bříšku
      // pózy: 0 = zpívá s bylinkami, 1 = maluje, 2 = mává a posílá srdíčka, 3 = podřimuje (noc)
      const v = (extra || 0) % 4;
      const sway = Math.sin((t || 0) * 0.003);
      if (v === 1) {
        // malířský stojan s rozmalovanou loukou
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-52 * s, 0); ctx.lineTo(-44 * s, -68 * s);
        ctx.moveTo(-36 * s, 0); ctx.lineTo(-44 * s, -68 * s);
        ctx.stroke();
        ctx.fillStyle = '#f6f1e2';
        rr(ctx, -60 * s, -80 * s, 32 * s, 27 * s, 2 * s); ctx.fill();
        ctx.strokeStyle = '#c9a06b'; ctx.lineWidth = 2 * s;
        rr(ctx, -60 * s, -80 * s, 32 * s, 27 * s, 2 * s); ctx.stroke();
        // na plátně zelená louka a mrkvička
        ctx.fillStyle = '#a5cd6f';
        rr(ctx, -57 * s, -65 * s, 26 * s, 9 * s, 2 * s); ctx.fill();
        ctx.fillStyle = '#f28c38';
        ell(ctx, -46 * s, -68 * s, 2.2 * s, 5 * s, 0.3); ctx.fill();
        ctx.fillStyle = '#4c8a3f';
        ell(ctx, -48 * s, -74 * s, 2 * s, 2.6 * s, -0.4); ctx.fill();
      }
      // dlouhé blond vlasy vzadu
      ctx.fillStyle = '#e2b96a';
      ctx.beginPath();
      ctx.moveTo(-13 * s, -118 * s);
      ctx.quadraticCurveTo((-24 + sway * 2) * s, -80 * s, -18 * s, -44 * s);
      ctx.quadraticCurveTo(-9 * s, -56 * s, -5 * s, -98 * s);
      ctx.closePath(); ctx.fill();
      // rezavá sukně
      ctx.fillStyle = '#c4763c';
      ctx.beginPath();
      ctx.moveTo(-22 * s, 0);
      ctx.quadraticCurveTo(-14 * s, -40 * s, -9 * s, -72 * s);
      ctx.lineTo(11 * s, -72 * s);
      ctx.quadraticCurveTo(16 * s, -40 * s, 24 * s, 0);
      ctx.closePath(); ctx.fill();
      // proužky na sukni
      ctx.strokeStyle = '#8a5330'; ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(-19 * s, -14 * s); ctx.quadraticCurveTo(1 * s, -20 * s, 21 * s, -14 * s);
      ctx.moveTo(-16 * s, -30 * s); ctx.quadraticCurveTo(1 * s, -35 * s, 18 * s, -30 * s);
      ctx.stroke();
      // trup a krásné těhotenské bříško
      ctx.fillStyle = '#c4763c';
      rr(ctx, -9 * s, -102 * s, 20 * s, 34 * s, 8 * s); ctx.fill();
      ell(ctx, 8 * s, -80 * s, 11 * s, 13 * s); ctx.fill();
      // ruka něžně položená na bříšku
      ctx.strokeStyle = '#f0c9a0'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6 * s, -94 * s); ctx.quadraticCurveTo(2 * s, -86 * s, 13 * s, -88 * s); ctx.stroke();
      if (v === 0) {
        // druhá ruka s kytičkou bylinek
        ctx.beginPath(); ctx.moveTo(-4 * s, -96 * s); ctx.quadraticCurveTo(-18 * s, -96 * s, -22 * s, -106 * s); ctx.stroke();
        ctx.strokeStyle = '#4c8a3f'; ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(-22 * s, -108 * s); ctx.lineTo(-27 * s, -122 * s);
        ctx.moveTo(-22 * s, -108 * s); ctx.lineTo(-20 * s, -124 * s);
        ctx.moveTo(-22 * s, -108 * s); ctx.lineTo(-14 * s, -120 * s);
        ctx.stroke();
        ctx.fillStyle = '#c78fff';
        ctx.beginPath(); ctx.arc(-27 * s, -123 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(-20 * s, -125 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8fb1';
        ctx.beginPath(); ctx.arc(-13 * s, -121 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      } else if (v === 1) {
        // druhá ruka se štětcem u plátna
        const bx = (-24 + sway * 2) * s;
        ctx.beginPath(); ctx.moveTo(-4 * s, -96 * s); ctx.quadraticCurveTo(-16 * s, -88 * s, bx, -72 * s); ctx.stroke();
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 2.2 * s;
        ctx.beginPath(); ctx.moveTo(bx, -72 * s); ctx.lineTo(bx - 7 * s, -66 * s); ctx.stroke();
        ctx.fillStyle = '#ff8fb1';
        ctx.beginPath(); ctx.arc(bx - 8 * s, -65 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
      } else if (v === 2) {
        // druhá ruka mává nad hlavou
        const wx = (-18 + sway * 4) * s;
        ctx.beginPath(); ctx.moveTo(-4 * s, -96 * s); ctx.quadraticCurveTo(-14 * s, -112 * s, wx, -128 * s); ctx.stroke();
        ctx.fillStyle = '#f0c9a0';
        ctx.beginPath(); ctx.arc(wx, -130 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      } else {
        // podřimuje – druhá ruka klidně spočívá také na bříšku
        ctx.beginPath(); ctx.moveTo(-4 * s, -96 * s); ctx.quadraticCurveTo(-10 * s, -84 * s, -2 * s, -82 * s); ctx.stroke();
      }
      // hlava
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(0, -114 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
      // pěšinka s ofinkou
      ctx.fillStyle = '#e2b96a';
      ctx.beginPath(); ctx.arc(0, -117 * s, 12.5 * s, Math.PI * 0.95, Math.PI * 2.08); ctx.fill();
      if (v === 0 || v === 3) {
        // zavřené oči – zpívá (0) nebo podřimuje (3)
        ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(-4 * s, -112 * s, 2.6 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(7.6 * s, -112 * s);
        ctx.arc(5 * s, -112 * s, 2.6 * s, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#a8543a';
        if (v === 0) {
          ell(ctx, 1 * s, -106 * s, 2.4 * s, 3 * s); ctx.fill(); // zpívající pusa
        } else {
          // klidný spokojený úsměv a Zzz
          ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.4 * s;
          ctx.beginPath(); ctx.arc(0.5 * s, -108 * s, 2.6 * s, 0.3, Math.PI - 0.3); ctx.stroke();
          drawZzz(ctx, s, t, 15, -128);
        }
      } else {
        // otevřené oči a úsměv
        ctx.fillStyle = '#6b4a2e';
        ctx.beginPath(); ctx.arc(-4 * s, -113 * s, 1.7 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5 * s, -113 * s, 1.7 * s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.6 * s;
        ctx.beginPath(); ctx.arc(0.5 * s, -109 * s, 3.5 * s, 0.25, Math.PI - 0.35); ctx.stroke();
      }
      // tvářičky
      ctx.fillStyle = 'rgba(230,120,110,0.35)';
      ell(ctx, -8 * s, -108 * s, 2.6 * s, 1.8 * s); ctx.fill();
      ell(ctx, 9 * s, -108 * s, 2.6 * s, 1.8 * s); ctx.fill();
      // notičky (při zpěvu) nebo srdíčka (když fandí) stoupající vzhůru
      if (v === 0 || v === 2) {
        const baseAlpha = ctx.globalAlpha;
        ctx.fillStyle = v === 2 ? '#ff8fb1' : '#fff';
        ctx.font = `bold ${11 * s}px "Baloo 2", sans-serif`;
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
          const ph = (((t || 0) * 0.0012 + i * 0.33) % 1 + 1) % 1;
          ctx.globalAlpha = baseAlpha * (1 - ph) * 0.9;
          ctx.fillText(v === 2 ? '♥' : (i % 2 ? '♫' : '♪'), (14 + i * 8 + Math.sin(ph * 6 + i) * 4) * s, (-118 - ph * 30) * s);
        }
        ctx.globalAlpha = baseAlpha;
      }
    },

    /* ---------- další vtipné kulisy ---------- */
    catnap(ctx, s, extra, t) {
      // kočka spící na pařezu – bok se jí zvedá, jak oddechuje
      ctx.fillStyle = '#7a5a38';
      rr(ctx, -16 * s, -20 * s, 32 * s, 20 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#c9a06b';
      ell(ctx, 0, -20 * s, 16 * s, 6 * s); ctx.fill();
      const breathe = 1 + Math.sin((t || 0) * 0.003) * 0.05;
      ctx.fillStyle = '#8a7364';
      ell(ctx, 0, -27 * s, 14 * s, 8 * s * breathe); ctx.fill();
      // hlava položená na tlapkách
      ctx.beginPath(); ctx.arc(-9 * s, -30 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
      // ouška
      ctx.beginPath(); ctx.moveTo(-13 * s, -34 * s); ctx.lineTo(-11 * s, -39 * s); ctx.lineTo(-8 * s, -34 * s); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7 * s, -35 * s); ctx.lineTo(-4 * s, -39 * s); ctx.lineTo(-2 * s, -33 * s); ctx.closePath(); ctx.fill();
      // ocásek přehozený přes okraj
      ctx.strokeStyle = '#8a7364'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12 * s, -25 * s); ctx.quadraticCurveTo(19 * s, -30 * s, 12 * s, -34 * s); ctx.stroke();
      // zavřené oko
      ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.arc(-11 * s, -30 * s, 2 * s, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      // stoupající Zzz
      const base = ctx.globalAlpha;
      const ph = (((t || 0) * 0.0008) % 1 + 1) % 1;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.globalAlpha = base * (1 - ph);
      ctx.font = `bold ${8 * s}px "Baloo 2", sans-serif`;
      ctx.fillText('z', (-15 - ph * 6) * s, (-42 - ph * 14) * s);
      ctx.font = `bold ${11 * s}px "Baloo 2", sans-serif`;
      ctx.fillText('Z', (-8 - ph * 10) * s, (-48 - ph * 18) * s);
      ctx.globalAlpha = base;
    },
    snail(ctx, s, extra, t) {
      // závodní šnek s vlaječkou – taky dnes trénuje
      const stretch = 1 + Math.sin((t || 0) * 0.004) * 0.06;
      ctx.fillStyle = '#d9c48a';
      ell(ctx, -6 * s * stretch, -5 * s, 16 * s * stretch, 5 * s); ctx.fill();
      ctx.beginPath(); ctx.arc(-18 * s * stretch, -9 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      // tykadla s očima
      ctx.strokeStyle = '#d9c48a'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20 * s, -13 * s); ctx.lineTo(-24 * s, -20 * s);
      ctx.moveTo(-17 * s, -13 * s); ctx.lineTo(-15 * s, -21 * s);
      ctx.stroke();
      ctx.fillStyle = '#4a3a2c';
      ctx.beginPath(); ctx.arc(-24 * s, -21 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-15 * s, -22 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      // ulita se spirálou
      ctx.fillStyle = '#c98a4a';
      ctx.beginPath(); ctx.arc(4 * s, -14 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a86a34'; ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(4 * s, -14 * s, 8 * s, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(4 * s, -14 * s, 4 * s, Math.PI * 1.5, Math.PI * 3);
      ctx.stroke();
      // závodní vlaječka na ulitě
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(8 * s, -24 * s); ctx.lineTo(8 * s, -35 * s); ctx.stroke();
      ctx.fillStyle = '#e5533a';
      ctx.beginPath(); ctx.moveTo(8 * s, -35 * s); ctx.lineTo(18 * s, -32.5 * s); ctx.lineTo(8 * s, -30 * s); ctx.closePath(); ctx.fill();
    },
    frogpond(ctx, s, extra, t) {
      // rybníček se žabkou na leknínu, občas kuňkne bublinu
      ctx.fillStyle = '#7ec3d8';
      ell(ctx, 0, -4 * s, 34 * s, 9 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ell(ctx, -12 * s, -6 * s, 12 * s, 3 * s); ctx.fill();
      // rákosí
      ctx.strokeStyle = '#4c8a3f'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30 * s, -4 * s); ctx.lineTo(-32 * s, -26 * s);
      ctx.moveTo(-26 * s, -4 * s); ctx.lineTo(-25 * s, -22 * s);
      ctx.stroke();
      ctx.fillStyle = '#8a6a45';
      ell(ctx, -32 * s, -28 * s, 2.6 * s, 6 * s); ctx.fill(); // orobinec
      // leknín
      ctx.fillStyle = '#4c8a3f';
      ell(ctx, 8 * s, -6 * s, 9 * s, 3.5 * s); ctx.fill();
      // žabka
      ctx.fillStyle = '#6aab52';
      ell(ctx, 8 * s, -13 * s, 6 * s, 5 * s); ctx.fill();
      ctx.beginPath(); ctx.arc(4 * s, -17 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12 * s, -17 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(4 * s, -17.4 * s, 1.1 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12 * s, -17.4 * s, 1.1 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(4 * s, -17.4 * s, 0.55 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12 * s, -17.4 * s, 0.55 * s, 0, Math.PI * 2); ctx.fill();
      // kuňkací bublina
      const b = Math.max(0, Math.sin((t || 0) * 0.0035));
      ctx.fillStyle = 'rgba(255,240,200,0.85)';
      ell(ctx, 16 * s, -13 * s, 4 * s * b, 3.5 * s * b); ctx.fill();
    },
    cheersquad(ctx, s, extra, t) {
      // dva zajíčci-fanoušci: poskakují, mávají tlapkami a jeden mává vlaječkou,
      // ať to vypadá, že fandí běžci (Karlovi i ostatním zvířátkům)
      const T = t || 0;
      const flags = ['#e5533a', '#f2b134', '#5aa0e0', '#8ac24a'];
      const flagCol = flags[(extra || 0) % flags.length];

      // jeden fanoušek na pozici bx, s danou fází poskoku a barvou ouška
      function fan(bx, phase, earCol) {
        const bob = Math.abs(Math.sin(T * 0.006 + phase)) * 6 * s;
        const y = -bob;
        // stín na zemi
        ctx.fillStyle = 'rgba(20,14,6,0.15)';
        ell(ctx, bx, 0, 11 * s, 3 * s); ctx.fill();
        // uši
        ctx.fillStyle = '#d8ccbd';
        ell(ctx, bx - 4 * s, y - 34 * s, 3 * s, 9 * s); ctx.fill();
        ell(ctx, bx + 4 * s, y - 34 * s, 3 * s, 9 * s); ctx.fill();
        ctx.fillStyle = earCol;
        ell(ctx, bx - 4 * s, y - 34 * s, 1.4 * s, 6 * s); ctx.fill();
        ell(ctx, bx + 4 * s, y - 34 * s, 1.4 * s, 6 * s); ctx.fill();
        // tělo + bříško
        ctx.fillStyle = '#d8ccbd';
        ell(ctx, bx, y - 13 * s, 9 * s, 11 * s); ctx.fill();
        ctx.fillStyle = '#ece2d6';
        ell(ctx, bx, y - 11 * s, 5 * s, 7 * s); ctx.fill();
        // hlava
        ctx.fillStyle = '#d8ccbd';
        ctx.beginPath(); ctx.arc(bx, y - 26 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill();
        // zvednuté tlapky – kmitají, jako když mávají
        const wave = Math.sin(T * 0.012 + phase) * 4 * s;
        ctx.strokeStyle = '#d8ccbd'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 6 * s, y - 16 * s); ctx.lineTo(bx - 11 * s, y - 30 * s + wave);
        ctx.moveTo(bx + 6 * s, y - 16 * s); ctx.lineTo(bx + 11 * s, y - 30 * s - wave);
        ctx.stroke();
        // oči + čumáček
        ctx.fillStyle = '#4a3a2c';
        ctx.beginPath(); ctx.arc(bx - 2.4 * s, y - 27 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 2.4 * s, y - 27 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c98a8a';
        ctx.beginPath(); ctx.arc(bx, y - 24 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      }

      fan(-13 * s, 0, '#e6a6a6');
      fan(11 * s, Math.PI, '#b6c6e6');

      // vlaječka, kterou pravý fanoušek mává (plápolá)
      const flap = Math.sin(T * 0.009) * 4 * s;
      const bob2 = Math.abs(Math.sin(T * 0.006 + Math.PI)) * 6 * s;
      const fx = 22 * s, fy = -bob2 - 30 * s;
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, fy + 16 * s); ctx.lineTo(fx, fy - 14 * s); ctx.stroke();
      ctx.fillStyle = flagCol;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 14 * s);
      ctx.quadraticCurveTo(fx + 12 * s, fy - 12 * s + flap, fx + 20 * s, fy - 9 * s);
      ctx.quadraticCurveTo(fx + 12 * s, fy - 6 * s + flap, fx, fy - 4 * s);
      ctx.closePath(); ctx.fill();

      // radostné srdíčko stoupá a mizí
      const base = ctx.globalAlpha;
      const ph = (((T * 0.001) % 1) + 1) % 1;
      ctx.globalAlpha = base * (1 - ph);
      const hx = -2 * s, hy = (-46 - ph * 16) * s, hs = 3 * s;
      ctx.fillStyle = '#e5533a';
      ctx.beginPath();
      ctx.arc(hx - hs * 0.5, hy, hs * 0.5, Math.PI, 0);
      ctx.arc(hx + hs * 0.5, hy, hs * 0.5, Math.PI, 0);
      ctx.lineTo(hx, hy + hs * 1.2);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = base;
    },
    molehill(ctx, s, extra, t) {
      // krtinec – krtek se občas vykoukne ven, pak zas schová
      ctx.fillStyle = '#7a5a38';
      ell(ctx, 0, -6 * s, 30 * s, 12 * s); ctx.fill();
      ctx.fillStyle = shade('#7a5a38', 0.1);
      ell(ctx, -2 * s, -9 * s, 20 * s, 7 * s); ctx.fill();
      // hroudy hlíny kolem
      ctx.fillStyle = '#6e5236';
      for (let i = 0; i < 3; i++) {
        const a = hash(i + 61) * Math.PI * 2;
        const r = (24 + hash(i + 71) * 10) * s;
        ell(ctx, Math.cos(a) * r, -1 * s + Math.sin(a) * 3 * s, 4 * s, 2.6 * s, a);
        ctx.fill();
      }
      const pop = Math.max(0, Math.sin((t || 0) * 0.0022));
      if (pop > 0.05) {
        const moleY = -10 * s - pop * 14 * s;
        // tělo
        ctx.fillStyle = '#5a4a42';
        ell(ctx, 0, moleY, 9 * s, 10 * s); ctx.fill();
        // světlejší bříško
        ctx.fillStyle = shade('#5a4a42', 0.18);
        ell(ctx, 0, moleY + 3 * s, 5 * s, 6 * s); ctx.fill();
        // růžový čenich
        ctx.fillStyle = '#e79aa0';
        ctx.beginPath(); ctx.arc(0, moleY - 9 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
        // oči
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-3.5 * s, moleY - 5 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3.5 * s, moleY - 5 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        // růžové tlapky u paty
        ctx.fillStyle = '#e79aa0';
        ctx.beginPath(); ctx.arc(-6 * s, -5 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 * s, -5 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
      }
    },
    hedgehog(ctx, s, extra, t) {
      // ježek nese na bodlinách jablíčko
      const bob = Math.sin((t || 0) * 0.003) * 1.5 * s;
      const by = -10 * s + bob;
      // nožky
      ctx.fillStyle = '#6e5236';
      ctx.beginPath(); ctx.arc(-9 * s, -2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(9 * s, -2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      // tělo – hnědý zaoblený hrbolek
      ctx.fillStyle = '#8a6a45';
      ell(ctx, 0, by, 20 * s, 13 * s); ctx.fill();
      // bodliny vějířem po hřbetě
      ctx.strokeStyle = shade('#6e5236', -0.05); ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * (1.05 + i * 0.09);
        const x1 = Math.cos(a) * 16 * s, y1 = by + Math.sin(a) * 10 * s;
        const x2 = Math.cos(a) * 27 * s, y2 = by + Math.sin(a) * 17 * s;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // špičatý tan čumáček vpředu vlevo
      ctx.fillStyle = '#d9c48a';
      ctx.beginPath();
      ctx.moveTo(-16 * s, by - 4 * s);
      ctx.lineTo(-30 * s, by);
      ctx.lineTo(-16 * s, by + 5 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-29 * s, by, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      // oko
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-14 * s, by - 5 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-13.5 * s, by - 5.4 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
      // jablíčko na zádech s stopkou a lístkem
      const ax = 6 * s, ay = by - 12 * s;
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.moveTo(ax, ay - 5 * s); ctx.lineTo(ax + 1.5 * s, ay - 8 * s); ctx.stroke();
      ctx.fillStyle = '#4c8a3f';
      ell(ctx, ax + 3 * s, ay - 8 * s, 2.4 * s, 1.4 * s, 0.6); ctx.fill();
      ctx.fillStyle = '#d9432f';
      ctx.beginPath(); ctx.arc(ax, ay, 5 * s, 0, Math.PI * 2); ctx.fill();
    },
    storknest(ctx, s, extra, t) {
      // čáp stojící v hnízdě na kůlu – vysoká kulisa do pozadí
      ctx.fillStyle = '#8a6a45';
      rr(ctx, -3.5 * s, -70 * s, 7 * s, 70 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#7a5a38';
      ell(ctx, 0, -74 * s, 26 * s, 12 * s); ctx.fill();
      ctx.strokeStyle = shade('#7a5a38', -0.15); ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(-20 * s, -78 * s); ctx.lineTo(14 * s, -68 * s);
      ctx.moveTo(-16 * s, -68 * s); ctx.lineTo(18 * s, -78 * s);
      ctx.moveTo(-22 * s, -72 * s); ctx.lineTo(20 * s, -74 * s);
      ctx.stroke();
      // tenké červenooranžové nohy dolů do hnízda
      ctx.strokeStyle = '#e08a3a'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5 * s, -92 * s); ctx.lineTo(-6 * s, -76 * s);
      ctx.moveTo(4 * s, -92 * s); ctx.lineTo(5 * s, -76 * s);
      ctx.stroke();
      // tělo
      ctx.fillStyle = '#f5f2ea';
      ell(ctx, 0, -104 * s, 16 * s, 12 * s); ctx.fill();
      // zvednutý krk
      ctx.strokeStyle = '#f5f2ea'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8 * s, -112 * s); ctx.quadraticCurveTo(18 * s, -128 * s, 12 * s, -142 * s);
      ctx.stroke();
      // hlava
      const hx = 12 * s, hy = -142 * s;
      ctx.fillStyle = '#f5f2ea';
      ctx.beginPath(); ctx.arc(hx, hy, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(hx + 2 * s, hy - 1 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
      // klapající zobák – rozevírá se podle clack
      const clack = Math.abs(Math.sin((t || 0) * 0.004));
      const gap = clack * 8 * s;
      ctx.fillStyle = '#e08a3a';
      ctx.beginPath();
      ctx.moveTo(hx + 4 * s, hy - 1.5 * s);
      ctx.lineTo(hx + 22 * s, hy - gap - 1.5 * s);
      ctx.lineTo(hx + 6 * s, hy);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx + 4 * s, hy + 1.5 * s);
      ctx.lineTo(hx + 22 * s, hy + gap + 1.5 * s);
      ctx.lineTo(hx + 6 * s, hy);
      ctx.closePath(); ctx.fill();
    },
    fireflies(ctx, s, extra, t) {
      // roj světlušek pro noční scény
      const T = t || 0;
      const baseAlpha = ctx.globalAlpha;
      for (let i = 0; i < 6; i++) {
        let fx = (hash(i) - 0.5) * 60 * s;
        let fy = -20 * s - hash(i + 10) * 55 * s;
        fx += Math.sin(T * 0.0012 + i) * 6 * s;
        fy += Math.cos(T * 0.0016 + i * 1.7) * 5 * s;
        const glow = 0.35 + 0.65 * Math.abs(Math.sin(T * 0.004 + i * 2.1));
        ctx.globalAlpha = glow * 0.35;
        ctx.fillStyle = 'rgba(255, 240, 130, 1)';
        ctx.beginPath(); ctx.arc(fx, fy, 4.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#fff8c0';
        ctx.beginPath(); ctx.arc(fx, fy, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = baseAlpha;
    },

    /* ---------- postavy a zvířata, které oživují scénu ----------
       Přidáno kvůli tomu, aby scéna nebyla prázdná: kulisy se u pěšiny
       střídají hustěji (viz decorGap v js/game.js) a každá se aspoň
       trochu hýbe. Kreslí se procedurálně jako všechno ostatní, bez
       obrázků a bez gradientů, ať přidaný život nestojí snímky. */

    market(ctx, s, extra, t) {
      // trhový stánek s pruhovanou plachtou, bedýnkami a mávající trhovkyní
      const T = t || 0;
      // dva sloupky
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, -54 * s, -90 * s, 8 * s, 90 * s, 2 * s); ctx.fill();
      rr(ctx, 46 * s, -90 * s, 8 * s, 90 * s, 2 * s); ctx.fill();
      // plachta – šikmá krémová stříška
      ctx.fillStyle = '#f4f1e6';
      ctx.beginPath();
      ctx.moveTo(-60 * s, -96 * s); ctx.lineTo(60 * s, -96 * s);
      ctx.lineTo(50 * s, -80 * s); ctx.lineTo(-50 * s, -80 * s);
      ctx.closePath(); ctx.fill();
      // červené pruhy na plachtě
      ctx.fillStyle = '#e8564a';
      for (let i = 0; i < 5; i += 2) {
        const f0 = i / 5, f1 = (i + 1) / 5;
        const xt0 = (-60 + f0 * 120) * s, xt1 = (-60 + f1 * 120) * s;
        const xb0 = (-50 + f0 * 100) * s, xb1 = (-50 + f1 * 100) * s;
        ctx.beginPath();
        ctx.moveTo(xt0, -96 * s); ctx.lineTo(xt1, -96 * s);
        ctx.lineTo(xb1, -80 * s); ctx.lineTo(xb0, -80 * s);
        ctx.closePath(); ctx.fill();
      }
      // volánek pod stříškou
      for (let i = 0; i < 6; i++) {
        const sx = (-50 + (i + 0.5) * (100 / 6)) * s;
        ctx.fillStyle = i % 2 === 0 ? '#e8564a' : '#f4f1e6';
        ctx.beginPath(); ctx.arc(sx, -80 * s, 8.5 * s, 0, Math.PI); ctx.fill();
      }
      // pult
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -50 * s, -34 * s, 100 * s, 34 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#c9a06b';
      rr(ctx, -50 * s, -38 * s, 100 * s, 8 * s, 2 * s); ctx.fill();
      // bedýnka se zeleninou vlevo
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -42 * s, -50 * s, 26 * s, 16 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#e8564a';
      ctx.beginPath(); ctx.arc(-36 * s, -50 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-27 * s, -51 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4c8a3f';
      ctx.beginPath(); ctx.arc(-32 * s, -56 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      // bedýnka s jablky vpravo
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, 12 * s, -50 * s, 26 * s, 16 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#d9432f';
      ctx.beginPath(); ctx.arc(19 * s, -50 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(29 * s, -51 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(24 * s, -56 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      // trhovkyně za pultem
      ctx.fillStyle = '#5b86b3';
      rr(ctx, -14 * s, -78 * s, 28 * s, 46 * s, 8 * s); ctx.fill();
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(0, -86 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c05a44';
      ctx.beginPath(); ctx.arc(0, -90 * s, 12 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-4 * s, -86 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4 * s, -86 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.arc(0, -82 * s, 2.6 * s, 0.2, Math.PI - 0.2); ctx.stroke();
      // klidná ruka
      ctx.strokeStyle = '#f0c9a0'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-13 * s, -72 * s); ctx.quadraticCurveTo(-18 * s, -60 * s, -14 * s, -50 * s); ctx.stroke();
      // mávající ruka, kýve se v zápěstí
      ctx.save();
      ctx.translate(13 * s, -72 * s);
      ctx.rotate(-0.6 + Math.sin(T * 0.005) * 0.4);
      ctx.strokeStyle = '#f0c9a0'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20 * s); ctx.stroke();
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(0, -22 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    well(ctx, s, extra, t) {
      // kamenná studna s dřevěnou stříškou a vědrem na provaze
      const T = t || 0;
      ctx.fillStyle = '#8f8776';
      rr(ctx, -24 * s, -30 * s, 48 * s, 30 * s, 3 * s); ctx.fill();
      ctx.strokeStyle = '#b8ae9c'; ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-24 * s, -18 * s); ctx.lineTo(24 * s, -18 * s);
      ctx.moveTo(-24 * s, -8 * s); ctx.lineTo(24 * s, -8 * s);
      ctx.stroke();
      ctx.fillStyle = '#b8ae9c';
      ell(ctx, 0, -30 * s, 26 * s, 8 * s); ctx.fill();
      ctx.fillStyle = '#5a5348';
      ell(ctx, 0, -30 * s, 18 * s, 5 * s); ctx.fill();
      // sloupky stříšky
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, -26 * s, -74 * s, 7 * s, 44 * s, 2 * s); ctx.fill();
      rr(ctx, 19 * s, -74 * s, 7 * s, 44 * s, 2 * s); ctx.fill();
      // dřevěná stříška
      ctx.fillStyle = '#9c6b3f';
      ctx.beginPath();
      ctx.moveTo(-34 * s, -74 * s); ctx.lineTo(34 * s, -74 * s); ctx.lineTo(0, -96 * s);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(0, -74 * s); ctx.lineTo(0, -96 * s); ctx.stroke();
      // vědro na provaze, pohupuje se ze strany na stranu
      const swing = Math.sin(T * 0.0022) * 0.35;
      ctx.save();
      ctx.translate(0, -72 * s);
      ctx.rotate(swing);
      ctx.strokeStyle = '#c9a06b'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34 * s); ctx.stroke();
      ctx.fillStyle = '#8a6a45';
      rr(ctx, -8 * s, 34 * s, 16 * s, 14 * s, 2 * s); ctx.fill();
      ctx.strokeStyle = '#5a3d15'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.arc(0, 34 * s, 8 * s, Math.PI, 0); ctx.stroke();
      ctx.restore();
    },

    kids(ctx, s, extra, t) {
      // dvě děti si hrají s poskakujícím míčem
      const T = t || 0;
      const bounce = Math.abs(Math.sin(T * 0.004));
      const ballY = -6 * s - bounce * 30 * s;
      const hop = Math.abs(Math.sin(T * 0.004 + 1.6)) * 6 * s;
      for (let i = 0; i < 2; i++) {
        const cx = i === 0 ? -28 * s : 26 * s;
        const cy = i === 0 ? 0 : -hop;
        const shirt = i === 0 ? '#5aa0e0' : '#f2b134';
        const armUp = i === 0 ? (1 - bounce) : bounce;
        ctx.strokeStyle = '#f0c9a0'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy); ctx.lineTo(cx - 5 * s, cy + 14 * s);
        ctx.moveTo(cx + 4 * s, cy); ctx.lineTo(cx + 5 * s, cy + 14 * s);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ell(ctx, cx - 5 * s, cy + 15 * s, 4 * s, 2.4 * s); ctx.fill();
        ell(ctx, cx + 5 * s, cy + 15 * s, 4 * s, 2.4 * s); ctx.fill();
        ctx.fillStyle = shirt;
        rr(ctx, cx - 10 * s, cy - 30 * s, 20 * s, 30 * s, 8 * s); ctx.fill();
        ctx.strokeStyle = '#f0c9a0'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 9 * s, cy - 24 * s);
        ctx.lineTo(cx - 16 * s, cy - 36 * s - armUp * 8 * s);
        ctx.moveTo(cx + 9 * s, cy - 24 * s);
        ctx.lineTo(cx + 16 * s, cy - 36 * s - armUp * 8 * s);
        ctx.stroke();
        ctx.fillStyle = '#f0c9a0';
        ctx.beginPath(); ctx.arc(cx, cy - 40 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = i === 0 ? '#5a3d28' : '#e2b96a';
        ctx.beginPath(); ctx.arc(cx, cy - 45 * s, 9 * s, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(cx - 3 * s, cy - 40 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 3 * s, cy - 40 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.2 * s;
        ctx.beginPath(); ctx.arc(cx, cy - 37 * s, 2.4 * s, 0.2, Math.PI - 0.2); ctx.stroke();
      }
      // míč – odraz od země
      ctx.fillStyle = '#e8564a';
      ctx.beginPath(); ctx.arc(-2 * s, ballY, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.arc(-2 * s, ballY, 7 * s, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(-2 * s, ballY, 7 * s, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();
    },

    cyclist(ctx, s, extra, t) {
      // vesničan na kole s bedýnkou na nosiči, kola se otáčejí
      const T = t || 0;
      const spin = T * 0.006;
      const bob = Math.sin(T * 0.005) * 1.5 * s;
      ctx.save();
      ctx.translate(-24 * s, -16 * s);
      ctx.rotate(spin);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2 * s;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i / 5 * Math.PI * 2) * 15 * s, Math.sin(i / 5 * Math.PI * 2) * 15 * s);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.arc(-24 * s, -16 * s, 16 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.save();
      ctx.translate(26 * s, -16 * s);
      ctx.rotate(spin * 1.02);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2 * s;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i / 5 * Math.PI * 2) * 15 * s, Math.sin(i / 5 * Math.PI * 2) * 15 * s);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.arc(26 * s, -16 * s, 16 * s, 0, Math.PI * 2); ctx.stroke();
      // rám kola
      ctx.strokeStyle = '#5aa0e0'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-24 * s, -16 * s); ctx.lineTo(-4 * s, -40 * s);
      ctx.lineTo(26 * s, -16 * s);
      ctx.moveTo(-4 * s, -40 * s); ctx.lineTo(6 * s, -40 * s);
      ctx.moveTo(6 * s, -40 * s); ctx.lineTo(20 * s, -30 * s);
      ctx.stroke();
      // řídítka
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(20 * s, -30 * s); ctx.lineTo(24 * s, -42 * s);
      ctx.moveTo(18 * s, -42 * s); ctx.lineTo(30 * s, -42 * s);
      ctx.stroke();
      ctx.fillStyle = '#5a3d15';
      rr(ctx, -8 * s, -44 * s, 12 * s, 5 * s, 2 * s); ctx.fill();
      // bedýnka na nosiči
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -32 * s, -30 * s, 16 * s, 12 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#4c8a3f';
      ctx.beginPath(); ctx.arc(-26 * s, -31 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-20 * s, -30 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      // jezdec – trup se lehce pohupuje
      ctx.fillStyle = '#c23a34';
      rr(ctx, -6 * s, -72 * s + bob, 24 * s, 32 * s, 8 * s); ctx.fill();
      ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2 * s, -40 * s + bob); ctx.lineTo(-4 * s, -16 * s);
      ctx.moveTo(2 * s, -40 * s + bob); ctx.lineTo(14 * s, -20 * s);
      ctx.stroke();
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(4 * s, -78 * s + bob, 10 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a4a1e';
      ctx.beginPath(); ctx.arc(4 * s, -83 * s + bob, 9 * s, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(8 * s, -78 * s + bob, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c23a34'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(6 * s, -62 * s + bob); ctx.lineTo(22 * s, -42 * s); ctx.stroke();
    },

    benchchat(ctx, s, extra, t) {
      // dva vesničané na lavičce – hlavy pokyvují, bublinka s tečkami
      const T = t || 0;
      const nod1 = Math.sin(T * 0.003) * 0.12;
      const nod2 = Math.sin(T * 0.003 + 1.4) * 0.12;
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, -38 * s, -22 * s, 76 * s, 8 * s, 2 * s); ctx.fill();
      rr(ctx, -38 * s, -46 * s, 76 * s, 8 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#5a3417';
      rr(ctx, -34 * s, -14 * s, 6 * s, 14 * s, 2 * s); ctx.fill();
      rr(ctx, 28 * s, -14 * s, 6 * s, 14 * s, 2 * s); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const cx = i === 0 ? -18 * s : 18 * s;
        const shirt = i === 0 ? '#8ac24a' : '#e8564a';
        const nod = i === 0 ? nod1 : nod2;
        ctx.fillStyle = '#4a3320';
        rr(ctx, cx - 10 * s, -20 * s, 8 * s, 8 * s, 2 * s); ctx.fill();
        rr(ctx, cx + 2 * s, -20 * s, 8 * s, 8 * s, 2 * s); ctx.fill();
        ctx.fillStyle = shirt;
        rr(ctx, cx - 11 * s, -46 * s, 22 * s, 28 * s, 7 * s); ctx.fill();
        ctx.save();
        ctx.translate(cx, -50 * s);
        ctx.rotate(nod);
        ctx.fillStyle = '#f0c9a0';
        ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = i === 0 ? '#5a3d28' : '#e2b96a';
        ctx.beginPath(); ctx.arc(0, -4 * s, 8 * s, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-3 * s, -1 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3 * s, -1 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.2 * s;
        ctx.beginPath(); ctx.arc(0, 2 * s, 2.2 * s, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.restore();
      }
      // bublinka s třemi tečkami, objevují se a mizí
      const base = ctx.globalAlpha;
      ctx.fillStyle = '#f4f1e6';
      rr(ctx, 8 * s, -78 * s, 26 * s, 16 * s, 6 * s); ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = base * (0.25 + 0.75 * Math.max(0, Math.sin(T * 0.004 - i * 0.7)));
        ctx.fillStyle = '#8a7364';
        ctx.beginPath(); ctx.arc((14 + i * 7) * s, -70 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = base;
    },

    catwall(ctx, s, extra, t) {
      // kočka sedící na zídce s truhlíky kvítek, ocas se vlní, uši cukají
      const T = t || 0;
      const tailWave = Math.sin(T * 0.004) * 0.5;
      const earTwitch = Math.sin(T * 0.01) > 0.9 ? 0.3 : 0;
      ctx.fillStyle = '#8f8776';
      rr(ctx, -60 * s, -22 * s, 120 * s, 22 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#b8ae9c';
      rr(ctx, -60 * s, -26 * s, 120 * s, 6 * s, 2 * s); ctx.fill();
      ctx.strokeStyle = '#726b5c'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(-40 * s, -22 * s); ctx.lineTo(-40 * s, -8 * s);
      ctx.moveTo(-14 * s, -8 * s); ctx.lineTo(-14 * s, -22 * s);
      ctx.moveTo(16 * s, -22 * s); ctx.lineTo(16 * s, -8 * s);
      ctx.moveTo(42 * s, -8 * s); ctx.lineTo(42 * s, -22 * s);
      ctx.moveTo(-60 * s, -14 * s); ctx.lineTo(60 * s, -14 * s);
      ctx.stroke();
      // truhlík vlevo
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, -56 * s, -38 * s, 24 * s, 12 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#4c8a3f';
      ctx.beginPath(); ctx.arc(-50 * s, -40 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-42 * s, -41 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8564a';
      ctx.beginPath(); ctx.arc(-49 * s, -45 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.arc(-42 * s, -46 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      // truhlík vpravo
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, 32 * s, -38 * s, 24 * s, 12 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#4c8a3f';
      ctx.beginPath(); ctx.arc(38 * s, -40 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(46 * s, -41 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c78fff';
      ctx.beginPath(); ctx.arc(39 * s, -45 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8fb1';
      ctx.beginPath(); ctx.arc(46 * s, -46 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      // kočka
      ctx.fillStyle = '#8a6a52';
      ell(ctx, 0, -34 * s, 13 * s, 15 * s); ctx.fill();
      ctx.strokeStyle = '#8a6a52'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(11 * s, -30 * s);
      ctx.quadraticCurveTo(24 * s, -34 * s - tailWave * 14 * s, 20 * s, -50 * s - tailWave * 6 * s);
      ctx.stroke();
      ctx.fillStyle = '#8a6a52';
      ctx.beginPath(); ctx.arc(-2 * s, -52 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(-9 * s, -58 * s); ctx.rotate(-0.4 - earTwitch);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3 * s, -6 * s); ctx.lineTo(3 * s, -4 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(5 * s, -58 * s); ctx.rotate(0.4 + earTwitch);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3 * s, -4 * s); ctx.lineTo(3 * s, -6 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-6 * s, -52 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2 * s, -52 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98a8a';
      ctx.beginPath(); ctx.arc(-2 * s, -49 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,45,30,0.5)'; ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(-9 * s, -50 * s); ctx.lineTo(-18 * s, -49 * s);
      ctx.moveTo(3 * s, -50 * s); ctx.lineTo(10 * s, -49 * s);
      ctx.stroke();
    },

    // piknik na kostkované dece – dva kamarádi u koše, z hrnku stoupá pára
    picnic(ctx, s, extra, t) {
      // piknik na kostkované dece – dva kamarádi u koše, z hrnku stoupá pára
      const T = t || 0;
      // deka rozprostřená v trávě; kostky se kreslí do výřezu, ať nepřetečou
      ctx.save();
      ell(ctx, 0, -5 * s, 52 * s, 12 * s); ctx.clip();
      ctx.fillStyle = '#f4f1e6';
      ctx.fillRect(-54 * s, -20 * s, 108 * s, 30 * s);
      ctx.strokeStyle = '#e0705c'; ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(-54 * s, -11 * s); ctx.lineTo(54 * s, -11 * s);
      ctx.moveTo(-54 * s, -4 * s); ctx.lineTo(54 * s, -4 * s);
      ctx.moveTo(-34 * s, -20 * s); ctx.lineTo(-40 * s, 8 * s);
      ctx.moveTo(-6 * s, -20 * s); ctx.lineTo(-12 * s, 8 * s);
      ctx.moveTo(22 * s, -20 * s); ctx.lineTo(16 * s, 8 * s);
      ctx.stroke();
      ctx.restore();
      // proutěný koš na kraji deky
      ctx.fillStyle = '#d9b86a';
      rr(ctx, 34 * s, -22 * s, 22 * s, 18 * s, 4 * s); ctx.fill();
      ctx.strokeStyle = '#9c6b3f'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(36 * s, -16 * s); ctx.lineTo(54 * s, -16 * s);
      ctx.moveTo(36 * s, -10 * s); ctx.lineTo(54 * s, -10 * s);
      ctx.stroke();
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath(); ctx.arc(45 * s, -22 * s, 9 * s, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#d9432f';
      ctx.beginPath(); ctx.arc(41 * s, -26 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
      // hrníček uprostřed deky
      ctx.fillStyle = '#f4f1e6';
      rr(ctx, -5 * s, -16 * s, 11 * s, 9 * s, 2 * s); ctx.fill();
      ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(7 * s, -12 * s, 3.2 * s, -0.8, 0.8); ctx.stroke();
      // pára stoupající z hrnku – kroužky s klesající průhledností
      const base = ctx.globalAlpha;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * s;
      for (let i = 0; i < 3; i++) {
        const ph = (((T * 0.0009 + i * 0.33) % 1) + 1) % 1;
        ctx.globalAlpha = base * (1 - ph) * 0.75;
        ctx.beginPath();
        ctx.arc(Math.sin(ph * 6 + i) * 3 * s, -18 * s - ph * 24 * s, 3.4 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = base;
      // levý kamarád – sedí s nataženými nohami k prostředku deky
      ctx.fillStyle = '#5d8ac2';
      rr(ctx, -30 * s, -12 * s, 26 * s, 8 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      rr(ctx, -8 * s, -12 * s, 7 * s, 7 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#5d8ac2';
      rr(ctx, -42 * s, -38 * s, 20 * s, 28 * s, 8 * s); ctx.fill();
      ctx.strokeStyle = '#5d8ac2'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-24 * s, -30 * s); ctx.quadraticCurveTo(-14 * s, -24 * s, -8 * s, -18 * s); ctx.stroke();
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(-32 * s, -46 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3d28';
      ctx.beginPath(); ctx.arc(-32 * s, -50 * s, 9 * s, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-35 * s, -46 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-29 * s, -46 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.arc(-32 * s, -43 * s, 2.4 * s, 0.2, Math.PI - 0.2); ctx.stroke();
      // pravý kamarád – sedí čelem k němu a mává
      const wave = Math.sin(T * 0.005) * 4;
      ctx.fillStyle = '#c86a8a';
      rr(ctx, 4 * s, -12 * s, 24 * s, 8 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      rr(ctx, 2 * s, -12 * s, 7 * s, 7 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#c86a8a';
      rr(ctx, 22 * s, -38 * s, 20 * s, 28 * s, 8 * s); ctx.fill();
      ctx.strokeStyle = '#c86a8a'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(26 * s, -32 * s); ctx.quadraticCurveTo(18 * s, -46 * s, (16 + wave) * s, -56 * s); ctx.stroke();
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc((16 + wave) * s, -58 * s, 3.8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(32 * s, -46 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e2b96a';
      ctx.beginPath(); ctx.arc(32 * s, -50 * s, 9 * s, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(28 * s, -46 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(35 * s, -46 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.arc(32 * s, -43 * s, 2.4 * s, 0.2, Math.PI - 0.2); ctx.stroke();
    },

    // dva nízké úlky, u nich včelař v bílém obleku, kolem obletují včelky
    beekeeper(ctx, s, extra, t) {
      // dva úly a včelař v bílém obleku; kolem obletují včelky
      const T = t || 0;
      for (let i = 0; i < 2; i++) {
        const ox = (i ? -18 : -52) * s;
        const hh = (i ? 30 : 34) * s;
        // podstavec
        ctx.fillStyle = '#7a4a1e';
        rr(ctx, ox - 2 * s, -6 * s, 26 * s, 6 * s, 2 * s); ctx.fill();
        // dva nástavky
        ctx.fillStyle = '#e8ddc8';
        rr(ctx, ox, -hh * 0.55, 22 * s, hh * 0.55 - 5 * s, 2 * s); ctx.fill();
        ctx.fillStyle = '#d8cbb2';
        rr(ctx, ox, -hh, 22 * s, hh * 0.5, 2 * s); ctx.fill();
        // stříška
        ctx.fillStyle = '#8fa8c4';
        rr(ctx, ox - 3 * s, -hh - 7 * s, 28 * s, 8 * s, 2 * s); ctx.fill();
        // česno
        ctx.fillStyle = '#5a4a35';
        rr(ctx, ox + 6 * s, -10 * s, 10 * s, 3 * s, 1 * s); ctx.fill();
      }
      // včelař – bílý oblek, klobouk se síťkou, v ruce rámek
      ctx.fillStyle = '#f4f1e6';
      rr(ctx, 20 * s, -44 * s, 8 * s, 22 * s, 3 * s); ctx.fill();
      rr(ctx, 30 * s, -44 * s, 8 * s, 22 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      rr(ctx, 18 * s, -24 * s, 11 * s, 5 * s, 2 * s); ctx.fill();
      rr(ctx, 29 * s, -24 * s, 11 * s, 5 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      rr(ctx, 18 * s, -74 * s, 22 * s, 31 * s, 7 * s); ctx.fill();
      // ruka s rámkem plným plástve
      ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(20 * s, -66 * s); ctx.lineTo(8 * s, -54 * s); ctx.stroke();
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -4 * s, -58 * s, 16 * s, 20 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#e0b23c';
      rr(ctx, -1 * s, -54 * s, 10 * s, 13 * s, 1 * s); ctx.fill();
      // hlava, klobouk a síťka
      ctx.fillStyle = '#dfe6ea';
      ctx.beginPath(); ctx.arc(29 * s, -84 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9aa8b0'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(21 * s, -86 * s); ctx.lineTo(37 * s, -86 * s);
      ctx.moveTo(21 * s, -82 * s); ctx.lineTo(37 * s, -82 * s);
      ctx.stroke();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, 29 * s, -93 * s, 15 * s, 4 * s); ctx.fill();
      rr(ctx, 22 * s, -101 * s, 14 * s, 9 * s, 3 * s); ctx.fill();
      // včelky na kroužcích kolem úlů
      ctx.fillStyle = '#e0b23c';
      for (let i = 0; i < 3; i++) {
        const a = T * 0.0028 + i * 2.1;
        const bx = (-34 + i * 12) * s + Math.cos(a) * 14 * s;
        const by = (-46 - i * 8) * s + Math.sin(a * 1.3) * 9 * s;
        ell(ctx, bx, by, 2.6 * s, 1.9 * s); ctx.fill();
        ctx.fillStyle = '#3a2a1c';
        ctx.beginPath(); ctx.arc(bx + 1.6 * s, by, 1 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e0b23c';
      }
    },

    // veverka sedí na pařezu s oříškem, ocásek se vlní a hlava občas cukne
    squirrel(ctx, s, extra, t) {
      ctx.fillStyle = '#7a5a38';
      rr(ctx, -16 * s, -20 * s, 32 * s, 20 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#c9a06b';
      ell(ctx, 0, -20 * s, 16 * s, 6 * s); ctx.fill();
      ctx.strokeStyle = '#a8845a'; ctx.lineWidth = 1.5 * s;
      ell(ctx, 0, -20 * s, 10 * s, 3.6 * s); ctx.stroke();
      // ocásek – vlnitá křivka s pohyblivým kontrolním bodem
      const T = t || 0;
      const wag = Math.sin(T * 0.003) * 14 * s;
      ctx.strokeStyle = '#c9773a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(9 * s, -30 * s);
      ctx.quadraticCurveTo(28 * s + wag, -46 * s, 12 * s + wag * 0.5, -62 * s);
      ctx.stroke();
      ctx.strokeStyle = '#e8b98a'; ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(9 * s, -32 * s);
      ctx.quadraticCurveTo(24 * s + wag * 0.9, -46 * s, 12 * s + wag * 0.5, -58 * s);
      ctx.stroke();
      // tělo
      ctx.fillStyle = '#c9773a';
      ell(ctx, -4 * s, -34 * s, 14 * s, 16 * s); ctx.fill();
      ctx.fillStyle = '#f0e0c8';
      ell(ctx, -6 * s, -30 * s, 8 * s, 10 * s); ctx.fill();
      // hlava – jemné cuknutí
      const jerk = Math.sin(T * 0.01) > 0.9 ? 2 * s : 0;
      const hx = -10 * s + jerk, hy = -48 * s;
      ctx.fillStyle = '#c9773a';
      ctx.beginPath(); ctx.arc(hx, hy, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 8 * s, hy - 6 * s); ctx.lineTo(hx - 11 * s, hy - 14 * s); ctx.lineTo(hx - 3 * s, hy - 8 * s); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + 2 * s, hy - 7 * s); ctx.lineTo(hx + 4 * s, hy - 15 * s); ctx.lineTo(hx + 8 * s, hy - 7 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f0e0c8';
      ell(ctx, hx - 4 * s, hy + 3 * s, 5 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(hx - 3 * s, hy - 1 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 3 * s, hy - 2 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a24';
      ctx.beginPath(); ctx.arc(hx - 6 * s, hy + 2 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
      // tlapky drží oříšek
      ctx.fillStyle = '#c9773a';
      ell(ctx, -10 * s, -26 * s, 5 * s, 4 * s); ctx.fill();
      ell(ctx, -2 * s, -26 * s, 5 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#8a6a45';
      ctx.beginPath(); ctx.arc(-6 * s, -28 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
    },

    // kachní rodinka jde k louži, každé se pohupuje s malým fázovým zpožděním
    ducks(ctx, s, extra, t) {
      ctx.fillStyle = '#8fc7e8';
      ell(ctx, 46 * s, -3 * s, 20 * s, 7 * s); ctx.fill();
      const T = t || 0;
      for (let i = 0; i < 4; i++) {
        const sc = (i === 0 ? 1 : 0.55) * s;
        const ox = -50 * s + i * 22 * s;
        const oy = Math.sin(T * 0.006 + i * 0.8) * 2 * sc;
        ctx.fillStyle = '#f4f1e6';
        ell(ctx, ox, -10 * sc + oy, 12 * sc, 9 * sc); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ox + 9 * sc, -14 * sc + oy);
        ctx.lineTo(ox + 16 * sc, -20 * sc + oy);
        ctx.lineTo(ox + 11 * sc, -8 * sc + oy);
        ctx.closePath(); ctx.fill();
        const sway = Math.sin(T * 0.006 + i * 0.8 + 1) * 0.25;
        ctx.save();
        ctx.translate(ox - 8 * sc, -18 * sc + oy);
        ctx.rotate(sway);
        ctx.fillStyle = '#f4f1e6';
        ctx.beginPath(); ctx.arc(0, 0, 6 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8973a';
        ctx.beginPath(); ctx.moveTo(-5 * sc, 1 * sc); ctx.lineTo(-11 * sc, 3 * sc); ctx.lineTo(-5 * sc, 4 * sc); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-2 * sc, -2 * sc, 1.2 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    },

    // sběračka jablek na nízkém štaflíku, koš u nohou, ruka se natahuje pro jablko
    applepicker(ctx, s, extra, t) {
      // sběr jablek ze štaflí – ruka se natahuje po jablku a zpět
      const T = t || 0;
      const reach = Math.abs(Math.sin(T * 0.0022));
      // spodní větev jabloně, do které se natahuje
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 6 * s;
      ctx.beginPath(); ctx.moveTo(40 * s, -60 * s); ctx.quadraticCurveTo(10 * s, -78 * s, -18 * s, -84 * s); ctx.stroke();
      ctx.fillStyle = '#4c8a3f';
      ell(ctx, -14 * s, -92 * s, 26 * s, 14 * s); ctx.fill();
      ell(ctx, 16 * s, -84 * s, 22 * s, 12 * s); ctx.fill();
      ctx.fillStyle = '#d9432f';
      ctx.beginPath(); ctx.arc(-20 * s, -82 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2 * s, -80 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(20 * s, -76 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      // spadlá jablka v trávě
      ctx.beginPath(); ctx.arc(-40 * s, -3 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-32 * s, -2 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
      // koš u štaflí
      ctx.fillStyle = '#d9b86a';
      rr(ctx, 18 * s, -17 * s, 22 * s, 17 * s, 4 * s); ctx.fill();
      ctx.strokeStyle = '#9c6b3f'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(20 * s, -12 * s); ctx.lineTo(38 * s, -12 * s);
      ctx.moveTo(20 * s, -6 * s); ctx.lineTo(38 * s, -6 * s);
      ctx.stroke();
      ctx.fillStyle = '#d9432f';
      ctx.beginPath(); ctx.arc(25 * s, -20 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(33 * s, -21 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
      // štafle – dvě bočnice a příčky
      ctx.strokeStyle = '#9c6b3f'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22 * s, 0); ctx.lineTo(-13 * s, -44 * s);
      ctx.moveTo(-2 * s, 0); ctx.lineTo(-7 * s, -44 * s);
      ctx.stroke();
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(-20 * s, -12 * s); ctx.lineTo(-4 * s, -12 * s);
      ctx.moveTo(-18 * s, -26 * s); ctx.lineTo(-6 * s, -26 * s);
      ctx.moveTo(-15 * s, -42 * s); ctx.lineTo(-6 * s, -42 * s);
      ctx.stroke();
      // postava stojící na horní příčce
      ctx.fillStyle = '#4a3320';
      rr(ctx, -16 * s, -48 * s, 8 * s, 6 * s, 2 * s); ctx.fill();
      rr(ctx, -6 * s, -48 * s, 8 * s, 6 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#5d8ac2';
      rr(ctx, -15 * s, -70 * s, 7 * s, 23 * s, 3 * s); ctx.fill();
      rr(ctx, -6 * s, -70 * s, 7 * s, 23 * s, 3 * s); ctx.fill();
      ctx.fillStyle = '#3f7d4a';
      rr(ctx, -17 * s, -96 * s, 21 * s, 29 * s, 7 * s); ctx.fill();
      // ruka po jablku
      const hx = -2 * s + reach * 8 * s, hy = -96 * s - reach * 12 * s;
      ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1 * s, -90 * s); ctx.quadraticCurveTo(6 * s, -96 * s, hx, hy); ctx.stroke();
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(hx, hy, 3.6 * s, 0, Math.PI * 2); ctx.fill();
      // druhá ruka drží štafle
      ctx.strokeStyle = '#3f7d4a'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15 * s, -88 * s); ctx.quadraticCurveTo(-22 * s, -76 * s, -14 * s, -68 * s); ctx.stroke();
      // hlava se šátkem
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(-6 * s, -105 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8422f';
      ctx.beginPath(); ctx.arc(-6 * s, -108 * s, 9.5 * s, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-15 * s, -107 * s); ctx.lineTo(-9 * s, -106 * s); ctx.lineTo(-16 * s, -98 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-3 * s, -104 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-9 * s, -104 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a8543a'; ctx.lineWidth = 1.2 * s;
      ctx.beginPath(); ctx.arc(-6 * s, -101 * s, 2.4 * s, 0.2, Math.PI - 0.2); ctx.stroke();
    },

    // kobyla klidně stojí a natáčí hlavu k hříběti, které vedle ní poskakuje
    foalplay(ctx, s, extra, t) {
      const T = t || 0;
      // --- kobyla ---
      ctx.save();
      ctx.translate(-24 * s, 0);
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-18 * s, -20 * s); ctx.lineTo(-18 * s, 0);
      ctx.moveTo(-8 * s, -20 * s); ctx.lineTo(-8 * s, 0);
      ctx.moveTo(10 * s, -20 * s); ctx.lineTo(10 * s, 0);
      ctx.moveTo(20 * s, -20 * s); ctx.lineTo(20 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#8a6a45';
      ell(ctx, 0, -34 * s, 26 * s, 16 * s); ctx.fill();
      // ocásek – kýve se
      const tailSway = Math.sin(T * 0.0025) * 0.3;
      ctx.save();
      ctx.translate(-24 * s, -30 * s);
      ctx.rotate(tailSway);
      ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6 * s, 14 * s, -2 * s, 28 * s); ctx.stroke();
      ctx.restore();
      // krk
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 12 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(16 * s, -44 * s); ctx.quadraticCurveTo(28 * s, -54 * s, 34 * s, -58 * s); ctx.stroke();
      // hlava se natáčí k hříběti
      const turn = Math.sin(T * 0.0012) * 0.25;
      ctx.save();
      ctx.translate(34 * s, -58 * s);
      ctx.rotate(turn);
      ctx.fillStyle = '#8a6a45';
      ell(ctx, 6 * s, 0, 12 * s, 7 * s); ctx.fill();
      ctx.fillStyle = '#6e5236';
      ell(ctx, 15 * s, 4 * s, 5 * s, 3.5 * s); ctx.fill();
      ctx.fillStyle = '#4a3320';
      ctx.beginPath(); ctx.moveTo(-2 * s, -6 * s); ctx.lineTo(-4 * s, -14 * s); ctx.lineTo(2 * s, -7 * s); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6 * s, -7 * s); ctx.lineTo(6 * s, -15 * s); ctx.lineTo(11 * s, -8 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a3320';
      ell(ctx, -1 * s, -4 * s, 5 * s, 4 * s, -0.3); ctx.fill();
      ctx.fillStyle = '#2a2018';
      ctx.beginPath(); ctx.arc(9 * s, -2 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1c';
      ctx.beginPath(); ctx.arc(18 * s, 5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.restore();
      // --- hříbě – poskakuje nahoru a dolů ---
      const jump = Math.abs(Math.sin(T * 0.006)) * 14 * s;
      const fs = s * 0.6;
      ctx.save();
      ctx.translate(34 * s, -jump);
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 4 * fs; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10 * fs, -14 * fs); ctx.lineTo(-10 * fs, 0);
      ctx.moveTo(-3 * fs, -14 * fs); ctx.lineTo(-3 * fs, 0);
      ctx.moveTo(7 * fs, -14 * fs); ctx.lineTo(7 * fs, 0);
      ctx.moveTo(14 * fs, -14 * fs); ctx.lineTo(14 * fs, 0);
      ctx.stroke();
      ctx.fillStyle = '#a9825a';
      ell(ctx, 2 * fs, -22 * fs, 17 * fs, 11 * fs); ctx.fill();
      // ohon hříběte se kýve
      const foalTail = Math.sin(T * 0.004 + 1) * 0.4;
      ctx.save();
      ctx.translate(-14 * fs, -20 * fs);
      ctx.rotate(foalTail);
      ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 3.5 * fs; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-5 * fs, 10 * fs, -1 * fs, 18 * fs); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#a9825a'; ctx.lineWidth = 8 * fs; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(11 * fs, -30 * fs); ctx.quadraticCurveTo(19 * fs, -38 * fs, 23 * fs, -42 * fs); ctx.stroke();
      ctx.fillStyle = '#a9825a';
      ell(ctx, 27 * fs, -44 * fs, 8 * fs, 5 * fs); ctx.fill();
      ctx.fillStyle = '#4a3320';
      ctx.beginPath(); ctx.moveTo(22 * fs, -48 * fs); ctx.lineTo(21 * fs, -54 * fs); ctx.lineTo(26 * fs, -49 * fs); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(29 * fs, -49 * fs); ctx.lineTo(30 * fs, -55 * fs); ctx.lineTo(33 * fs, -48 * fs); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2018';
      ctx.beginPath(); ctx.arc(30 * fs, -44 * fs, 1.2 * fs, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    // liška sedící v kapradí – ohon se vlní, ouška cukají, občas mrkne
    fox(ctx, s, extra, t) {
      // liška sedící v kapradí – ohon se vlní, ouška cukají, občas mrkne
      const T = t || 0;
      // kapradí za liškou
      ctx.strokeStyle = '#3f7a4a'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30 * s, 0); ctx.quadraticCurveTo(-42 * s, -18 * s, -28 * s, -32 * s);
      ctx.moveTo(30 * s, 0); ctx.quadraticCurveTo(42 * s, -16 * s, 30 * s, -28 * s);
      ctx.stroke();
      ctx.fillStyle = '#3f7a4a';
      ell(ctx, -28 * s, -32 * s, 5 * s, 3 * s, -0.6); ctx.fill();
      ell(ctx, 30 * s, -28 * s, 5 * s, 3 * s, 0.5); ctx.fill();
      // ohon svinutý po zemi za tělem – vlní se do strany
      const tailWave = Math.sin(T * 0.0025) * 5 * s;
      ctx.fillStyle = '#c96a2e';
      ctx.beginPath();
      ctx.moveTo(8 * s, -14 * s);
      ctx.quadraticCurveTo(30 * s, -20 * s + tailWave, 36 * s, -4 * s + tailWave * 0.4);
      ctx.quadraticCurveTo(26 * s, -1 * s, 10 * s, -4 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, 35 * s, -5 * s + tailWave * 0.4, 5 * s, 4 * s, -0.3); ctx.fill();
      // sedící tělo – zadek na zemi, hruď vzhůru
      ctx.fillStyle = '#d97a3a';
      ell(ctx, 6 * s, -14 * s, 15 * s, 13 * s); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8 * s, -2 * s);
      ctx.quadraticCurveTo(-12 * s, -30 * s, -2 * s, -36 * s);
      ctx.quadraticCurveTo(12 * s, -34 * s, 14 * s, -6 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, -4 * s, -14 * s, 7 * s, 11 * s, 0.1); ctx.fill();
      // přední packy
      ctx.fillStyle = '#7a4020';
      ell(ctx, -6 * s, -2 * s, 5 * s, 3 * s); ctx.fill();
      ell(ctx, 3 * s, -2 * s, 5 * s, 3 * s); ctx.fill();
      // hlava s klínovým čumákem
      ctx.fillStyle = '#d97a3a';
      ctx.beginPath(); ctx.arc(-4 * s, -44 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8 * s, -47 * s);
      ctx.lineTo(-22 * s, -39 * s);
      ctx.lineTo(-7 * s, -36 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ctx.beginPath();
      ctx.moveTo(-10 * s, -40 * s); ctx.lineTo(-20 * s, -39 * s); ctx.lineTo(-9 * s, -36 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2a1c';
      ctx.beginPath(); ctx.arc(-21 * s, -39 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      // ouška cukají
      const twitchL = Math.pow(Math.max(0, Math.sin(T * 0.004)), 8);
      const twitchR = Math.pow(Math.max(0, Math.sin(T * 0.004 + 1.4)), 8);
      ctx.fillStyle = '#d97a3a';
      ctx.save(); ctx.translate(-10 * s, -52 * s); ctx.rotate(-0.25 - twitchL * 0.45);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3 * s, -11 * s); ctx.lineTo(5 * s, -4 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(2 * s, -53 * s); ctx.rotate(0.2 + twitchR * 0.45);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4 * s, -11 * s); ctx.lineTo(-4 * s, -4 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
      // oči – občas mrknou
      const blinkPh = ((T * 0.00055) % 1 + 1) % 1;
      ctx.strokeStyle = '#3a2a1c'; ctx.fillStyle = '#3a2a1c'; ctx.lineWidth = 1.3 * s; ctx.lineCap = 'round';
      if (blinkPh > 0.93) {
        ctx.beginPath(); ctx.moveTo(-12 * s, -46 * s); ctx.lineTo(-8 * s, -46 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2 * s, -47 * s); ctx.lineTo(2 * s, -47 * s); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(-10 * s, -46 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -47 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
      }
    },

    // datel na kmeni – hlava rychle klove, od kmene odletují třísky
    woodpecker(ctx, s, extra, t) {
      // datel na kmeni – hlava rychle klove, od kmene odletují třísky
      const T = t || 0;
      ctx.fillStyle = '#7a4a1e';
      rr(ctx, -16 * s, -104 * s, 30 * s, 104 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, -16 * s, -104 * s, 11 * s, 104 * s, 4 * s); ctx.fill();
      ctx.strokeStyle = shade('#7a4a1e', -0.15); ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(-2 * s, -16 * s); ctx.lineTo(0, -42 * s);
      ctx.moveTo(6 * s, -62 * s); ctx.lineTo(8 * s, -88 * s);
      ctx.moveTo(-8 * s, -72 * s); ctx.lineTo(-6 * s, -96 * s);
      ctx.stroke();
      // klování: hlava se rychle přibližuje ke kmeni
      const peck = Math.max(0, Math.sin(T * 0.02));
      const bx = 22 * s, by = -60 * s;
      // ocásek opřený o kmen
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(bx + 3 * s, by + 6 * s); ctx.lineTo(bx + 9 * s, by + 26 * s); ctx.lineTo(bx - 3 * s, by + 14 * s);
      ctx.closePath(); ctx.fill();
      // tělo hlavou vzhůru, přitisknuté ke kmeni
      ell(ctx, bx, by, 9 * s, 15 * s, 0.12); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, bx - 4 * s, by + 2 * s, 4.5 * s, 9 * s, 0.12); ctx.fill();
      // křídlo s bílým pruhem
      ctx.fillStyle = '#1c1c1c';
      ell(ctx, bx + 3 * s, by, 5.5 * s, 11 * s, 0.12); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, bx + 3 * s, by + 1 * s, 3.2 * s, 2.2 * s, 0.5); ctx.fill();
      ell(ctx, bx + 4 * s, by - 5 * s, 3 * s, 2 * s, 0.5); ctx.fill();
      // hlava – klove ke kmeni
      const hx = bx - 4 * s - peck * 5 * s, hy = by - 17 * s;
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath(); ctx.arc(hx, hy, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f1e6';
      ell(ctx, hx - 1 * s, hy + 2 * s, 4 * s, 3 * s); ctx.fill();
      // červená čepička
      ctx.fillStyle = '#d8422f';
      ctx.beginPath(); ctx.arc(hx + 1 * s, hy - 4 * s, 6 * s, Math.PI * 1.05, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(hx - 2 * s, hy - 2 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
      // dlouhý šedý zobák míří do kmene
      ctx.fillStyle = '#8a8578';
      ctx.beginPath();
      ctx.moveTo(hx - 5 * s, hy - 2 * s);
      ctx.lineTo(hx - 18 * s - peck * 4 * s, hy + 1 * s);
      ctx.lineTo(hx - 5 * s, hy + 3 * s);
      ctx.closePath(); ctx.fill();
      // odletující třísky
      const baseAlpha = ctx.globalAlpha;
      ctx.fillStyle = '#c9a06b';
      for (let i = 0; i < 2; i++) {
        const ph = (((T * 0.0016) + i * 0.5) % 1 + 1) % 1;
        const cx = hx - 14 * s - ph * (14 + i * 6) * s;
        const cy = hy - ph * (12 + i * 8) * s;
        ctx.globalAlpha = baseAlpha * (1 - ph);
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx - 4 * s, cy - 2 * s); ctx.lineTo(cx - 1 * s, cy + 3 * s);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = baseAlpha;
    },

    // houbař v kapradí sbírá hřiby – ruka jde k zemi a zase zpět
    mushroomer(ctx, s, extra, t) {
      const T = t || 0;
      const bend = (Math.sin(T * 0.0016) + 1) / 2; // 0 = vzpřímen, 1 = v předklonu
      // dva hřiby u nohou
      ctx.fillStyle = '#e8ddc8';
      rr(ctx, -36 * s, -9 * s, 6 * s, 9 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#9c6b3f';
      ctx.beginPath(); ctx.arc(-33 * s, -9 * s, 8 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8ddc8';
      rr(ctx, 24 * s, -6 * s, 5 * s, 6 * s, 2 * s); ctx.fill();
      ctx.fillStyle = '#9c6b3f';
      ctx.beginPath(); ctx.arc(26.5 * s, -6 * s, 6 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
      // proutěný koš vedle
      ctx.fillStyle = '#b5854a';
      ctx.beginPath();
      ctx.moveTo(12 * s, -22 * s); ctx.lineTo(32 * s, -22 * s); ctx.lineTo(28 * s, -2 * s); ctx.lineTo(16 * s, -2 * s);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a6234'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(14 * s, -15 * s); ctx.lineTo(30 * s, -15 * s);
      ctx.moveTo(15 * s, -8 * s); ctx.lineTo(29 * s, -8 * s);
      ctx.stroke();
      // nohy
      ctx.strokeStyle = '#5b86b3'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6 * s, -2 * s); ctx.lineTo(-9 * s, -40 * s);
      ctx.moveTo(6 * s, -2 * s); ctx.lineTo(4 * s, -40 * s);
      ctx.stroke();
      // předkloněné tělo – kazajka
      ctx.fillStyle = '#c9a06b';
      rr(ctx, -13 * s, -72 * s + bend * 14 * s, 26 * s, 34 * s, 8 * s); ctx.fill();
      // hlava
      const hy = -84 * s + bend * 20 * s;
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(-2 * s, hy, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8a03c';
      ell(ctx, -2 * s, hy - 5 * s, 10 * s, 3 * s); ctx.fill();
      // paže se otáčí od ramene dolů k hřibu a zpátky
      ctx.save();
      ctx.translate(-9 * s, -62 * s + bend * 10 * s);
      ctx.rotate(bend * 1.3 - 0.15);
      ctx.strokeStyle = '#c9a06b'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26 * s); ctx.stroke();
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(0, 27 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    // kůň táhne valník naložený senem – kolo se točí, kůň pokyvuje hlavou a mává ohonem
    haycart(ctx, s, extra, t) {
      const T = t || 0;
      const nod = Math.sin(T * 0.0028) * 3 * s;
      const tailSwing = Math.sin(T * 0.004) * 6 * s;
      const cx = 26 * s;
      // kolo (paprsky se točí)
      ctx.save();
      ctx.translate(cx, -14 * s);
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(T * 0.0018);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 13 * s, Math.sin(a) * 13 * s);
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#8a6a45';
      ctx.beginPath(); ctx.arc(cx, -14 * s, 3 * s, 0, Math.PI * 2); ctx.fill(); // náboj
      // korba
      ctx.fillStyle = '#9c6b3f';
      rr(ctx, cx - 26 * s, -46 * s, 52 * s, 32 * s, 3 * s); ctx.fill();
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 26 * s, -34 * s); ctx.lineTo(cx + 26 * s, -34 * s);
      ctx.moveTo(cx - 26 * s, -22 * s); ctx.lineTo(cx + 26 * s, -22 * s);
      ctx.stroke();
      // seno naložené na voze
      ctx.fillStyle = '#d9b86a';
      ctx.beginPath();
      ctx.moveTo(cx - 30 * s, -44 * s);
      ctx.quadraticCurveTo(cx - 10 * s, -78 * s, cx + 8 * s, -50 * s);
      ctx.quadraticCurveTo(cx + 20 * s, -70 * s, cx + 32 * s, -44 * s);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade('#d9b86a', -0.15); ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * s, -56 * s); ctx.lineTo(cx - 6 * s, -62 * s);
      ctx.moveTo(cx + 4 * s, -60 * s); ctx.lineTo(cx + 12 * s, -66 * s);
      ctx.moveTo(cx + 14 * s, -50 * s); ctx.lineTo(cx + 22 * s, -56 * s);
      ctx.stroke();
      // oj – táhlo ke koni
      ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 2.6 * s;
      ctx.beginPath(); ctx.moveTo(cx - 26 * s, -30 * s); ctx.lineTo(-24 * s, -22 * s); ctx.stroke();
      // --- kůň ---
      const hx0 = -46 * s;
      // nohy
      ctx.strokeStyle = shade('#8a6a45', -0.1); ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx0 - 12 * s, -2 * s); ctx.lineTo(hx0 - 14 * s, -30 * s);
      ctx.moveTo(hx0 + 2 * s, -2 * s); ctx.lineTo(hx0 + 3 * s, -30 * s);
      ctx.moveTo(hx0 + 16 * s, -2 * s); ctx.lineTo(hx0 + 15 * s, -30 * s);
      ctx.stroke();
      // ohon – kývá se
      ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx0 + 20 * s, -34 * s);
      ctx.quadraticCurveTo(hx0 + 30 * s + tailSwing, -16 * s, hx0 + 24 * s + tailSwing * 1.5, 2 * s);
      ctx.stroke();
      // tělo
      ctx.fillStyle = '#8a6a45';
      ell(ctx, hx0 + 4 * s, -34 * s, 22 * s, 16 * s); ctx.fill();
      // krk – pokyvuje
      ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 10 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx0 - 14 * s, -40 * s);
      ctx.lineTo(hx0 - 20 * s, -66 * s + nod + 6 * s);
      ctx.stroke();
      // hlava
      const headY = -66 * s + nod;
      ctx.fillStyle = '#8a6a45';
      ctx.beginPath(); ctx.arc(hx0 - 22 * s, headY, 9 * s, 0, Math.PI * 2); ctx.fill();
      // hříva
      ctx.fillStyle = shade('#8a6a45', -0.2);
      ell(ctx, hx0 - 16 * s, headY - 6 * s, 4 * s, 10 * s, 0.3); ctx.fill();
      // čumák
      ctx.fillStyle = shade('#8a6a45', -0.1);
      ell(ctx, hx0 - 30 * s, headY + 3 * s, 6 * s, 4 * s); ctx.fill();
      // oko
      ctx.fillStyle = '#2a2015';
      ctx.beginPath(); ctx.arc(hx0 - 24 * s, headY - 2 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      // ucho
      ctx.fillStyle = '#8a6a45';
      ctx.beginPath();
      ctx.moveTo(hx0 - 18 * s, headY - 8 * s); ctx.lineTo(hx0 - 14 * s, headY - 16 * s); ctx.lineTo(hx0 - 11 * s, headY - 7 * s);
      ctx.closePath(); ctx.fill();
    },

    // dítě u dalekohledu – dalekohled se mírně naklání, nahoře probleskují hvězdičky
    stargazer(ctx, s, extra, t) {
      const T = t || 0;
      // složená deka vedle
      ctx.fillStyle = '#b8c4e0';
      rr(ctx, 24 * s, -10 * s, 26 * s, 10 * s, 3 * s); ctx.fill();
      ctx.strokeStyle = '#5a5f6e'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(28 * s, -10 * s); ctx.lineTo(28 * s, 0);
      ctx.moveTo(36 * s, -10 * s); ctx.lineTo(36 * s, 0);
      ctx.moveTo(44 * s, -10 * s); ctx.lineTo(44 * s, 0);
      ctx.stroke();
      // trojnožka
      ctx.strokeStyle = '#5a5f6e'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4 * s, 0); ctx.lineTo(-14 * s, -36 * s);
      ctx.moveTo(4 * s, 0); ctx.lineTo(-14 * s, -36 * s);
      ctx.moveTo(-20 * s, -8 * s); ctx.lineTo(-14 * s, -36 * s);
      ctx.stroke();
      // dalekohled – mírně se naklání
      const tilt = Math.sin(T * 0.0009) * 0.12;
      ctx.save();
      ctx.translate(-14 * s, -36 * s);
      ctx.rotate(-0.5 + tilt);
      ctx.fillStyle = '#b8c4e0';
      rr(ctx, -6 * s, -34 * s, 12 * s, 34 * s, 4 * s); ctx.fill();
      ctx.fillStyle = '#5a5f6e';
      rr(ctx, -7 * s, -36 * s, 14 * s, 6 * s, 2 * s); ctx.fill();
      ctx.restore();
      // dítě klečící u dalekohledu
      ctx.fillStyle = '#5b86b3';
      rr(ctx, -32 * s, -30 * s, 20 * s, 22 * s, 7 * s); ctx.fill();
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(-22 * s, -36 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1c';
      ell(ctx, -22 * s, -40 * s, 8 * s, 5 * s); ctx.fill(); // vlásky
      ctx.strokeStyle = '#5b86b3'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14 * s, -28 * s); ctx.quadraticCurveTo(-6 * s, -32 * s, -8 * s, -38 * s); ctx.stroke(); // ruka k okuláru
      // dvě probleskující hvězdičky nad dalekohledem
      const baseAlpha = ctx.globalAlpha;
      for (let i = 0; i < 2; i++) {
        const sx = (-24 + i * 20) * s, sy = (-70 - i * 14) * s;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(T * 0.003 + i * 2.4));
        ctx.globalAlpha = baseAlpha * tw;
        ctx.fillStyle = '#fff8dd';
        ell(ctx, sx, sy, 1.4 * s, 6 * s); ctx.fill();
        ell(ctx, sx, sy, 6 * s, 1.4 * s); ctx.fill();
      }
      ctx.globalAlpha = baseAlpha;
    },

    // netopýři poletující nad zemí – každý s vlastní fází, výškou a máváním křídel
    bats(ctx, s, extra, t) {
      const T = t || 0;
      for (let i = 0; i < 4; i++) {
        const phase = i * 1.7 + hash(i + 5) * 2;
        const bx = (-45 + i * 30) * s + Math.sin(T * 0.0011 + phase) * 10 * s;
        const by = -60 * s - hash(i + 15) * 30 * s + Math.sin(T * 0.0016 + phase) * 8 * s;
        const flap = Math.sin(T * 0.012 + phase); // -1..1 mávání
        const wingW = (10 + flap * 7) * s;
        ctx.fillStyle = '#2e2a3a';
        ell(ctx, bx, by, 4 * s, 3 * s); ctx.fill(); // tělíčko
        ctx.fillStyle = '#4a4560';
        ell(ctx, bx - wingW * 0.6, by - 1 * s, wingW, 3.5 * s, -0.25); ctx.fill();
        ell(ctx, bx + wingW * 0.6, by - 1 * s, wingW, 3.5 * s, 0.25); ctx.fill();
        ctx.fillStyle = '#2e2a3a';
        ell(ctx, bx - 2.5 * s, by - 3 * s, 1.4 * s, 1.6 * s); ctx.fill(); // ouško
        ell(ctx, bx + 2.5 * s, by - 3 * s, 1.4 * s, 1.6 * s); ctx.fill();
      }
    },
  };

  function drawProp(ctx, prop, x, y, s, extra, t) {
    const fn = PROPS[prop];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    fn(ctx, s, extra, t);
    ctx.restore();
  }

  /* =========================================================
     PŘEKÁŽKY
     ========================================================= */
  function drawObstacle(ctx, ob, t) {
    const { x, y, w, h } = ob;
    ctx.save();
    ctx.translate(x, y);
    switch (ob.id) {
      case 'hay': {
        ctx.fillStyle = '#e8c56a';
        rr(ctx, -w / 2, -h, w, h, 10); ctx.fill();
        ctx.strokeStyle = '#c9a03c'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 8, -h + 10); ctx.lineTo(w / 2 - 8, -h + 10);
        ctx.moveTo(-w / 2 + 8, -h / 2); ctx.lineTo(w / 2 - 8, -h / 2);
        ctx.moveTo(-w / 2 + 8, -10); ctx.lineTo(w / 2 - 8, -10);
        ctx.stroke();
        ctx.strokeStyle = '#a8842a';
        ctx.beginPath(); ctx.moveTo(-w / 6, -h); ctx.lineTo(-w / 6, 0); ctx.moveTo(w / 6, -h); ctx.lineTo(w / 6, 0); ctx.stroke();
        break;
      }
      case 'fence': {
        ctx.strokeStyle = '#a8845a'; ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 6, 0); ctx.lineTo(-w / 2 + 6, -h);
        ctx.moveTo(w / 2 - 6, 0); ctx.lineTo(w / 2 - 6, -h);
        ctx.moveTo(-w / 2, -h * 0.35); ctx.lineTo(w / 2, -h * 0.35);
        ctx.moveTo(-w / 2, -h * 0.75); ctx.lineTo(w / 2, -h * 0.75);
        ctx.stroke();
        ctx.fillStyle = '#a8845a';
        ctx.beginPath(); ctx.arc(-w / 2 + 6, -h, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(w / 2 - 6, -h, 5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'mud': {
        ctx.fillStyle = '#6e4a2e';
        ell(ctx, 0, -6, w / 2, 12); ctx.fill();
        ctx.fillStyle = '#8a6242';
        ell(ctx, -w / 6, -9, w / 5, 5); ctx.fill();
        // bublina
        const b = Math.abs(Math.sin(t * 0.004));
        ctx.strokeStyle = '#8a6242'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w / 5, -10, 4 * b, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'rock': {
        ctx.fillStyle = '#9a9a94';
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2 + 6, -h * 0.7);
        ctx.lineTo(-w / 6, -h);
        ctx.lineTo(w / 3, -h * 0.85);
        ctx.lineTo(w / 2, -h * 0.3);
        ctx.lineTo(w / 2 - 4, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b8b8b0';
        ctx.beginPath();
        ctx.moveTo(-w / 6, -h); ctx.lineTo(w / 3, -h * 0.85); ctx.lineTo(0, -h * 0.6); ctx.closePath();
        ctx.fill();
        // mech
        ctx.fillStyle = '#6aab52';
        ell(ctx, -w / 4, -h * 0.75, 8, 4, -0.4); ctx.fill();
        break;
      }
      case 'branch': {
        ctx.strokeStyle = '#6e5236'; ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h * 0.4); ctx.quadraticCurveTo(0, -h, w / 2, -h * 0.5);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-w / 6, -h * 0.75); ctx.lineTo(-w / 6 + 14, -h * 0.75 - 16);
        ctx.moveTo(w / 5, -h * 0.72); ctx.lineTo(w / 5 + 12, -h * 0.72 - 14);
        ctx.stroke();
        ctx.fillStyle = '#5f9e4a';
        ell(ctx, -w / 6 + 16, -h * 0.75 - 18, 10, 6, 0.5); ctx.fill();
        ell(ctx, w / 5 + 14, -h * 0.72 - 16, 9, 6, 0.5); ctx.fill();
        break;
      }
      case 'chicken': {
        const v = ob.v || {};
        const body = v.body || '#f5f0e0';
        const tail = v.tail || '#e0d8c0';
        const hop = Math.abs(Math.sin(t * 0.012)) * 6;
        ctx.translate(0, -hop);
        ctx.fillStyle = body;
        ell(ctx, 0, -h * 0.45, w * 0.42, h * 0.36); ctx.fill();
        // kropenatá varianta – tmavé tečky
        if (v.speckled) {
          ctx.fillStyle = 'rgba(60,50,40,0.55)';
          for (let i = 0; i < 7; i++) {
            const a = i * 2.4;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * w * 0.26, -h * 0.45 + Math.sin(a * 1.7) * h * 0.2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // ocásek
        ctx.fillStyle = tail;
        ell(ctx, w * 0.34, -h * 0.62, 10, 14, 0.6); ctx.fill();
        // hlava
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(-w * 0.34, -h * 0.78, 11, 0, Math.PI * 2); ctx.fill();
        // hřebínek
        ctx.fillStyle = '#e5533a';
        ctx.beginPath(); ctx.arc(-w * 0.36, -h * 0.98, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-w * 0.30, -h * 1.0, 4, 0, Math.PI * 2); ctx.fill();
        // zobák a oko (s bílým podkladem, ať je vidět i na tmavém peří)
        ctx.fillStyle = '#f0a03c';
        ctx.beginPath(); ctx.moveTo(-w * 0.44, -h * 0.78); ctx.lineTo(-w * 0.56, -h * 0.74); ctx.lineTo(-w * 0.44, -h * 0.70); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-w * 0.36, -h * 0.8, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-w * 0.36, -h * 0.8, 2, 0, Math.PI * 2); ctx.fill();
        // nožky
        ctx.strokeStyle = '#f0a03c'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-5, -h * 0.12); ctx.lineTo(-5, 0);
        ctx.moveTo(6, -h * 0.12); ctx.lineTo(6, 0);
        ctx.stroke();
        break;
      }
      case 'goose': {
        const v = ob.v || {};
        const body = v.body || '#f8f6ee';
        const wing = v.tail || '#e2ded0';
        const bob = Math.sin(t * 0.014) * 3;
        // tělo
        ctx.fillStyle = body;
        ell(ctx, 6, -h * 0.34, w * 0.46, h * 0.24); ctx.fill();
        // zvednutý ocásek
        ctx.fillStyle = wing;
        ell(ctx, w * 0.44, -h * 0.48, 11, 8, -0.7); ctx.fill();
        // křídlo
        ell(ctx, 10, -h * 0.36, w * 0.26, h * 0.15, 0.15); ctx.fill();
        // dlouhý krk natažený dopředu – husa syčí
        const hx = -w * 0.46 + Math.sin(t * 0.006) * 3;
        const hy = -h * 0.92 + bob;
        ctx.strokeStyle = body; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-w * 0.16, -h * 0.4);
        ctx.quadraticCurveTo(-w * 0.44, -h * 0.62, hx, hy);
        ctx.stroke();
        // hlava
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, Math.PI * 2); ctx.fill();
        // otevřený zobák – kejhá
        const gape = 2.5 + Math.abs(Math.sin(t * 0.02)) * 3;
        ctx.fillStyle = '#f0862c';
        ctx.beginPath(); ctx.moveTo(hx - 6, hy - 2); ctx.lineTo(hx - 17, hy - gape - 2); ctx.lineTo(hx - 5, hy + 1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 6, hy + 1); ctx.lineTo(hx - 16, hy + gape + 2); ctx.lineTo(hx - 4, hy + 4); ctx.closePath(); ctx.fill();
        // oko
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx - 1, hy - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(hx - 2, hy - 3, 1.8, 0, Math.PI * 2); ctx.fill();
        // syčení
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx - 20, hy - 5); ctx.lineTo(hx - 27, hy - 7);
        ctx.moveTo(hx - 19, hy + 3); ctx.lineTo(hx - 26, hy + 5);
        ctx.stroke();
        // nožky – pochodují
        const step = Math.sin(t * 0.014) * 4;
        ctx.strokeStyle = '#f0862c'; ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-2 + step, -h * 0.14); ctx.lineTo(-2 + step, 0);
        ctx.moveTo(10 - step, -h * 0.14); ctx.lineTo(10 - step, 0);
        ctx.stroke();
        break;
      }
      case 'barrow': {
        ctx.fillStyle = '#5d8ac2';
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h); ctx.lineTo(w / 3, -h * 0.35); ctx.lineTo(-w / 3, -h * 0.35);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(w / 3, -h * 0.5); ctx.lineTo(w / 2 + 12, -h * 0.2);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-w / 4, -10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(-w / 4, -10, 4, 0, Math.PI * 2); ctx.fill();
        // mrkve v trakaři (nedosažitelné, jen k vzteku)
        ctx.fillStyle = '#f28c28';
        for (let i = -1; i <= 1; i++) { ell(ctx, i * 12, -h - 4, 5, 8, i * 0.3); ctx.fill(); }
        ctx.fillStyle = '#5f9e4a';
        for (let i = -1; i <= 1; i++) { ell(ctx, i * 12 + i * 2, -h - 13, 3, 5, i * 0.3); ctx.fill(); }
        break;
      }
      case 'beeline': {
        // řada včel letících za sebou
        for (let i = 0; i < 4; i++) {
          const bx = -w / 2 + i * (w / 3.5);
          const by = -h * 0.5 + Math.sin(t * 0.01 + i * 1.4) * 6;
          ctx.fillStyle = '#ffd24a';
          ell(ctx, bx, by, 9, 7); ctx.fill();
          ctx.strokeStyle = '#4a3220'; ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(bx - 3, by - 6); ctx.lineTo(bx - 3, by + 6);
          ctx.moveTo(bx + 3, by - 6); ctx.lineTo(bx + 3, by + 6);
          ctx.stroke();
          const flap = Math.abs(Math.sin(t * 0.03 + i));
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ell(ctx, bx, by - 8, 6, 4 * flap + 1, -0.3); ctx.fill();
          ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.arc(bx - 7, by - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'flock': {
        // vír špačků – vysoký sloup malých ptáčků kroužících nad pěšinou;
        // pseudonáhoda z indexu, ať hejno každý snímek „netancuje“ jinak
        ctx.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const seed = Math.sin(i * 12.9898) * 43758.5453;
          const rnd = seed - Math.floor(seed);
          const fy = -14 - (h - 28) * (i / 29);
          // sloup se vlní – uprostřed je širší, u krajů se stahuje
          const belly = 0.55 + 0.45 * Math.sin((i / 29) * Math.PI);
          const bx = Math.sin(t * 0.0028 + i * 1.7) * (w * 0.36) * belly + (rnd - 0.5) * 14;
          const by = fy + Math.sin(t * 0.005 + i * 2.3) * 6;
          const sc = 0.7 + rnd * 0.5;
          const flap = Math.sin(t * 0.02 + i * 1.3);
          ctx.strokeStyle = rnd < 0.35 ? '#615c54' : '#3f3c38';
          ctx.lineWidth = 2.4 * sc;
          ctx.beginPath();
          ctx.moveTo(bx - 6 * sc, by - 4 * sc * flap);
          ctx.quadraticCurveTo(bx - 2 * sc, by + 2 * sc, bx, by);
          ctx.quadraticCurveTo(bx + 2 * sc, by + 2 * sc, bx + 6 * sc, by - 4 * sc * flap);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  /* =========================================================
     LETCI KROUŽÍCÍ NA OBLOZE (jen pro radost, nejsou překážka)
     ========================================================= */
  function drawFlyer(ctx, type, x, y, rot, flip, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.rotate(rot);
    if (type === 'stork') {
      const flap = Math.sin(t * 0.008);
      ctx.fillStyle = '#f5f2ea';
      ell(ctx, 0, 0, 20, 6); ctx.fill();
      // krk dopředu, červený zobák
      ctx.strokeStyle = '#f5f2ea'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(26, -5); ctx.stroke();
      ctx.strokeStyle = '#d9503a'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(26, -5); ctx.lineTo(38, -4); ctx.stroke();
      // nohy natažené dozadu
      ctx.beginPath(); ctx.moveTo(-16, 1); ctx.lineTo(-30, 4); ctx.stroke();
      // křídla – bílá s černými konci
      ctx.fillStyle = '#f5f2ea';
      ell(ctx, -2, -4 - flap * 8, 16, 5, -0.35 - flap * 0.45); ctx.fill();
      ctx.fillStyle = '#3a3835';
      ell(ctx, -12, -8 - flap * 12, 8, 3.4, -0.5 - flap * 0.5); ctx.fill();
    } else if (type === 'owl') {
      const flap = Math.sin(t * 0.012);
      ctx.fillStyle = '#8a6a4a';
      ell(ctx, 0, 0, 11, 8); ctx.fill();
      ctx.fillStyle = '#c9b490';
      ell(ctx, 4, 1, 5, 4.5); ctx.fill();
      ctx.fillStyle = '#6e5236';
      ell(ctx, -4, -4 - flap * 6, 10, 4, -0.4 - flap * 0.5); ctx.fill();
      // velké oko a ouško
      ctx.fillStyle = '#ffe88a';
      ctx.beginPath(); ctx.arc(8, -4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(8.6, -4, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a4a';
      ctx.beginPath(); ctx.moveTo(5, -7); ctx.lineTo(8, -11); ctx.lineTo(10, -6); ctx.closePath(); ctx.fill();
    } else { // vlaštovka
      const flap = Math.sin(t * 0.02);
      ctx.fillStyle = '#2e4a6e';
      ell(ctx, 0, 0, 12, 4.5); ctx.fill();
      ctx.fillStyle = '#f5f0e0';
      ell(ctx, 3, 1.6, 6, 2.6); ctx.fill();
      // vidlicový ocásek
      ctx.fillStyle = '#2e4a6e';
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-20, -4); ctx.lineTo(-13, 0); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill();
      ell(ctx, -1, -3 - flap * 6, 10, 3.2, -0.45 - flap * 0.5); ctx.fill();
      // rezavá bradka
      ctx.fillStyle = '#b5502e';
      ctx.beginPath(); ctx.arc(10, -1, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* =========================================================
     SBĚRATELNÉ VĚCI
     ========================================================= */
  function drawCarrot(ctx, x, y, t, golden) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.005 + x * 0.01) * 4);
    ctx.rotate(0.5);
    if (golden) { // levná pulzující svatozář místo shadowBlur
      const pulse = 1 + 0.12 * Math.sin(t * 0.008);
      ctx.fillStyle = 'rgba(255,210,74,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,225,120,0.3)';
      ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = golden ? '#ffce3a' : '#f28c28';
    ctx.beginPath();
    ctx.moveTo(-8, -10); ctx.quadraticCurveTo(0, -16, 8, -10);
    ctx.quadraticCurveTo(4, 6, 0, 14);
    ctx.quadraticCurveTo(-4, 6, -8, -10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = golden ? '#e0a920' : '#d97a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(3, -4);
    ctx.moveTo(-3, 0); ctx.lineTo(3, 2);
    ctx.stroke();
    ctx.fillStyle = '#5f9e4a';
    ell(ctx, -4, -14, 3, 7, -0.5); ctx.fill();
    ell(ctx, 1, -15, 3, 8, 0); ctx.fill();
    ell(ctx, 6, -13, 3, 7, 0.5); ctx.fill();
    ctx.restore();
  }

  // Duhový květ Louky – vznešený sběratelný předmět s duhovou svatozáří
  function drawMajestic(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.004) * 5);
    const pulse = 1 + 0.14 * Math.sin(t * 0.006);
    // vícevrstvá duhová svatozář
    const halo = [['rgba(255,180,220,0.30)', 34], ['rgba(180,220,255,0.28)', 26], ['rgba(255,240,170,0.32)', 18]];
    for (const h of halo) { ctx.fillStyle = h[0]; ctx.beginPath(); ctx.arc(0, 0, h[1] * pulse, 0, Math.PI * 2); ctx.fill(); }
    // třpytky kolem
    for (let i = 0; i < 6; i++) {
      const a = t * 0.002 + i * Math.PI / 3;
      const rr2 = 30 + Math.sin(t * 0.005 + i) * 4;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.006 + i));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr2, Math.sin(a) * rr2, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.rotate(Math.sin(t * 0.002) * 0.15);
    // duhové okvětní lístky
    const petalCols = ['#ff6b9d', '#ff9f45', '#ffe14a', '#7ad06b', '#5bc6e8', '#9d7ae8'];
    for (let i = 0; i < petalCols.length; i++) {
      ctx.save();
      ctx.rotate(i * 2 * Math.PI / petalCols.length + t * 0.0006);
      ctx.fillStyle = petalCols[i];
      ell(ctx, 0, -15, 6.5, 12, 0); ctx.fill();
      ctx.restore();
    }
    // střed
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffca3a';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // kouzelný schod – jednosměrná světelná plošina s travnatým, přírodním vrškem
  function drawStep(ctx, x, yTop, w, t) {
    ctx.save();
    ctx.translate(x, yTop);
    const glow = 0.5 + 0.5 * Math.sin(t * 0.005 + x * 0.01);
    const h = 16;
    // měkká záře pod plošinou
    ctx.fillStyle = 'rgba(150,210,255,' + (0.16 + 0.12 * glow) + ')';
    rr(ctx, -w / 2 - 6, -8, w + 12, h + 16, 12); ctx.fill();
    // tělo plošiny (světelný kámen)
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#eafaff'); g.addColorStop(1, '#bfe3f2');
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h / 2, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,220,0.7)'; ctx.lineWidth = 2;
    rr(ctx, -w / 2, -h / 2, w, h, 8); ctx.stroke();
    // travnatý vršek s kytičkami, ať to působí přírodně
    ctx.fillStyle = '#7ac95e';
    rr(ctx, -w / 2, -h / 2 - 5, w, 8, 4); ctx.fill();
    const cols = ['#ff6b9d', '#ffe14a', '#9d7ae8'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.arc(-w / 2 + (i + 1) * w / 4, -h / 2 - 7, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawClover(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.005 + x * 0.01) * 4);
    // pulzující svatozář jako u zlaté mrkve, jen do zelena
    const pulse = 1 + 0.12 * Math.sin(t * 0.008);
    ctx.fillStyle = 'rgba(140,230,120,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,245,150,0.3)';
    ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(Math.sin(t * 0.003 + x * 0.02) * 0.25);
    // stonek
    ctx.strokeStyle = '#3f8a34';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 2); ctx.quadraticCurveTo(3, 10, 1, 16);
    ctx.stroke();
    // čtyři srdíčkové lístky
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2 + Math.PI / 4);
      ctx.fillStyle = '#57b545';
      ell(ctx, -3.2, -7.5, 4.4, 6, -0.35); ctx.fill();
      ell(ctx, 3.2, -7.5, 4.4, 6, 0.35); ctx.fill();
      ctx.fillStyle = '#6fce58';
      ell(ctx, 0, -7, 3, 5.4, 0); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCoin(ctx, x, y, t) {
    const wob = Math.sin(t * 0.006 + x * 0.02);
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.005 + x * 0.015) * 3);
    ctx.scale(Math.abs(Math.cos(t * 0.004 + x * 0.05)) * 0.5 + 0.5, 1);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0b428';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    // tlapka na minci
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(0, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return wob;
  }

  /* =========================================================
     POSTAVY – parametrický čtyřnožec
     pose: { runPhase, jumpT, sliding, stumble, squash }
     ========================================================= */
  const bodyGradCache = new Map(); // gradienty těl postav (pár kusů, viz níže)

  function drawCharacter(ctx, ch, x, y, scale, pose, t) {
    const c = ch.colors;
    const p = pose || {};
    const run = p.runPhase || 0;
    const sliding = !!p.sliding;
    const airborne = !!p.airborne;
    const stumble = p.stumble || 0;
    /* Druhotný pohyb: uši, ocas a vlna nejsou přibité k tělu – zaostávají
       za ním. sway (−1 … 1) přichází z rozdílu mezi skutečnou svislou
       rychlostí a jejím zpožděným sledovačem, takže při odrazu ucho
       zůstane dole, při pádu vlaje nahoru a v klidu je nula. */
    const sway = Math.max(-1, Math.min(1, p.sway || 0));

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (stumble > 0) ctx.rotate(Math.sin(stumble * 20) * 0.12 * stumble);
    if (p.squash) ctx.scale(1 + p.squash * 0.15, 1 - p.squash * 0.2);
    if (sliding) { ctx.translate(0, 12); ctx.scale(1.15, 0.62); }

    const species = ch.species;
    const bob = airborne ? 0 : Math.abs(Math.sin(run)) * 3;
    ctx.translate(0, -bob);

    // tělesná stavba – osel (Karel) je podle skutečné předlohy štíhlejší,
    // s užším trupem a delšíma nohama; kopýtka končí vždy na stejné zemi
    const slim = species === 'osel';
    const bodyRX = slim ? 38 : 42;
    const bodyRY = slim ? 20 : 26;
    const bodyY = slim ? -44 : -40;

    // --- nohy (za tělem) ---
    const legLen = slim ? 33 : 26;
    const legY = slim ? -25 : -18;
    function leg(offX, phase, back) {
      const a = airborne
        ? (back ? 0.6 : -0.5)
        : Math.sin(run + phase) * 0.9;
      ctx.save();
      ctx.translate(offX, legY);
      ctx.rotate(a * (sliding ? 0.2 : 1));
      const legCol = c.legs || c.body;
      ctx.fillStyle = back ? shade(legCol, -0.08) : legCol;
      rr(ctx, slim ? -4.5 : -5, 0, slim ? 9 : 10, legLen, slim ? 4.5 : 5);
      ctx.fill();
      // kopýtko
      ctx.fillStyle = c.hoof || shade(c.mane, -0.1);
      rr(ctx, -5.5, legLen - 7, 11, 8, 3);
      ctx.fill();
      ctx.restore();
    }
    leg(-20, Math.PI, true);
    leg(16, Math.PI * 0.5 + Math.PI, true);

    // --- ocas ---
    ctx.save();
    ctx.translate(slim ? -35 : -38, slim ? -42 : -36);
    const wag = Math.sin(t * 0.01) * 0.25;
    ctx.rotate(0.5 + wag + sway * 0.55); // ocas se opozdí za skokem i dopadem
    if (species === 'prase') {
      ctx.strokeStyle = c.body; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, Math.PI * 1.5);
      ctx.arc(4, -10, 4, Math.PI, Math.PI * 2.6);
      ctx.stroke();
    } else if (species === 'ovce') {
      ctx.fillStyle = c.mane;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = c.body; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-10, 8, -6, 22); ctx.stroke();
      ctx.fillStyle = c.mane;
      ell(ctx, -6, 24, 6, 9, -0.2); ctx.fill();
    }
    ctx.restore();

    // --- tělo (s jemným stínováním pro objem) ---
    // gradient je pro danou postavu pořád stejný – cachuje se, ať se
    // nevytváří každý snímek (v intru běhá celé stádo najednou)
    const gradKey = c.body + '|' + bodyY + '|' + bodyRY;
    let bodyGrad = bodyGradCache.get(gradKey);
    if (!bodyGrad) {
      bodyGrad = ctx.createLinearGradient(0, bodyY - bodyRY - 2, 0, bodyY + bodyRY + 2);
      bodyGrad.addColorStop(0, shade(c.body, 0.07));
      bodyGrad.addColorStop(1, shade(c.body, -0.07));
      bodyGradCache.set(gradKey, bodyGrad);
    }
    if (species === 'ovce') { // vlněné obláčky po obvodu
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        ctx.fillStyle = i % 2 ? shade(c.body, 0.04) : shade(c.body, -0.03);
        ctx.beginPath();
        // vlna se při skoku a dopadu rozvlní – každý chomáč se opozdí trochu jinak
        const lag = sway * 3.2 * Math.sin(a + run * 0.5);
        ctx.arc(Math.cos(a) * 36, -40 + Math.sin(a) * 19 + lag, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = bodyGrad;
    ell(ctx, 0, bodyY, bodyRX, bodyRY); ctx.fill();
    // bříško
    ctx.fillStyle = c.belly;
    if (slim) { ell(ctx, 2, -37, 21, 9); ctx.fill(); }
    else { ell(ctx, 2, -30, 26, 13); ctx.fill(); }
    // vzory srsti – oříznuté na tělo, ať nikam nepřečuhují
    if (c.pattern && c.spots) {
      ctx.save();
      ell(ctx, 0, bodyY, bodyRX, bodyRY);
      ctx.clip();
      ctx.fillStyle = c.spots;
      if (c.pattern === 'holstein') {        // velké černé fleky na bílé
        ell(ctx, -24, -46, 16, 13, 0.35); ctx.fill();
        ell(ctx, -8, -32, 10, 8, -0.3); ctx.fill();
        ell(ctx, 18, -51, 14, 10, -0.4); ctx.fill();
        ell(ctx, 28, -30, 9, 8, 0.5); ctx.fill();
      } else if (c.pattern === 'patches') {  // bílé fleky na hnědo-oranžové (Avala a Květa)
        ell(ctx, -20, -32, 16, 11, 0.3); ctx.fill();
        ell(ctx, 12, -52, 15, 9, -0.35); ctx.fill();
        ell(ctx, 30, -34, 10, 9, 0.4); ctx.fill();
        ell(ctx, -30, -50, 9, 7, -0.2); ctx.fill();
      } else if (c.pattern === 'blotch') {   // šedočerné fleky (Flíček)
        ell(ctx, -20, -44, 11, 8, 0.4); ctx.fill();
        ell(ctx, 2, -53, 8, 6, -0.2); ctx.fill();
        ell(ctx, 20, -37, 10, 7, 0.5); ctx.fill();
        ell(ctx, -6, -28, 7, 5, 0.1); ctx.fill();
      } else if (c.pattern === 'saddle') {   // světlé sedlo muflona
        ell(ctx, -2, -47, 17, 11, 0.05); ctx.fill();
      }
      ctx.restore();
    }
    // oslí hříva podél hřbetu
    if (species === 'osel') {
      ctx.fillStyle = c.mane;
      ell(ctx, 6, bodyY - bodyRY + 3, 26, 5.5, -0.05); ctx.fill();
    }

    // --- přední nohy ---
    leg(-14, Math.PI * 0.5, false);
    leg(24, 0, false);

    // --- krk + hlava ---
    ctx.save();
    const headBob = airborne ? -4 : Math.sin(run * 2) * 1.5;
    ctx.translate(slim ? 38 : 40, (slim ? -63 : -58) + headBob);
    if (sliding) ctx.rotate(0.25);

    // krk
    ctx.fillStyle = c.body;
    if (species === 'osel') {
      ell(ctx, -8, 10, 12, 21, 0.5); ctx.fill();
    } else if (species === 'kráva' || species === 'muflon') {
      ell(ctx, -8, 8, 16, 20, 0.5); ctx.fill();
    }
    // hříva osla
    if (species === 'osel') {
      ctx.fillStyle = c.mane;
      ell(ctx, -14, 0, 8, 18, 0.5); ctx.fill();
    }

    // hlava
    ctx.fillStyle = c.body;
    if (species === 'ovce') { ctx.fillStyle = c.muzzle; }
    ell(ctx, 6, -6, 18, 15, 0.15); ctx.fill();

    if (species === 'ovce') { // vlna na čele
      ctx.fillStyle = c.body;
      ctx.beginPath(); ctx.arc(-4, -16, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -19, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -15, 7, 0, Math.PI * 2); ctx.fill();
    }

    // čumák / rypáček
    if (species === 'prase') {
      if (c.spots) { ctx.fillStyle = c.spots; ell(ctx, -3, -13, 6, 5, 0.3); ctx.fill(); }
      ctx.fillStyle = c.muzzle;
      ell(ctx, 22, -4, 8, 7); ctx.fill();
      ctx.fillStyle = shade(c.muzzle, -0.15);
      ell(ctx, 24, -4, 2.2, 3); ctx.fill();
      ell(ctx, 19, -4, 2.2, 3); ctx.fill();
    } else {
      ctx.fillStyle = c.muzzle;
      ell(ctx, 16, -1, 11, 9, 0.15); ctx.fill();
      ctx.fillStyle = shade(c.muzzle, -0.25);
      ell(ctx, 20, -4, 2, 2.6, 0.3); ctx.fill();
      if (species === 'kráva') { ell(ctx, 14, -3, 2, 2.6, 0.1); ctx.fill(); }
    }

    // pusa – úsměv
    ctx.strokeStyle = shade(c.muzzle, -0.35);
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(16, 1, 5, 0.2, Math.PI * 0.7);
    ctx.stroke();

    // flek přes oko jako maska (typický pro Květu)
    if (c.eyePatch) {
      ctx.fillStyle = c.eyePatch;
      ell(ctx, 6, -10, 7.5, 9, 0.1); ctx.fill();
    }
    // světlý kroužek kolem oka (typický pro osla)
    if (c.eyeRing) {
      ctx.fillStyle = c.eyeRing;
      ell(ctx, 6, -10, 6.5, 7.5); ctx.fill();
    }

    // oko
    ctx.fillStyle = '#2d2620';
    ell(ctx, 6, -10, 3.2, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(7, -11.5, 1.3, 0, Math.PI * 2); ctx.fill();
    if (p.blink) { // mrknutí
      ctx.fillStyle = c.eyePatch || c.body;
      if (species === 'ovce') ctx.fillStyle = c.muzzle;
      ell(ctx, 6, -11, 4.5, 4); ctx.fill();
      ctx.strokeStyle = '#2d2620'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -9); ctx.quadraticCurveTo(6, -6.5, 10, -9); ctx.stroke();
    }

    // uši / rohy
    const earFlap = Math.sin(t * 0.008) * 0.12 + sway * 0.42;
    if (species === 'osel') {
      [-0.35, 0.25].forEach((rot, i) => {
        ctx.save();
        ctx.translate(-2 + i * 8, -16);
        ctx.rotate(rot + earFlap);
        ctx.fillStyle = c.ear;
        ell(ctx, 0, -16, 6, 17); ctx.fill();
        ctx.fillStyle = c.earIn;
        ell(ctx, 0, -14, 3, 11); ctx.fill();
        ctx.restore();
      });
    } else if (species === 'muflon') {
      // rohy – spirála
      ctx.save();
      ctx.translate(-2, -13);
      ctx.strokeStyle = c.horns; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-4, -2, 12, -0.4, Math.PI * 1.25);
      ctx.stroke();
      ctx.strokeStyle = shade(c.horns, -0.12); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-4, -2, 12, -0.2, Math.PI * 1.1);
      ctx.stroke();
      ctx.restore();
      // ouško
      ctx.fillStyle = c.ear;
      ell(ctx, -8, -10, 6, 4, -0.4); ctx.fill();
    } else if (species === 'kráva') {
      // růžky – jen když je kravka má (Květa je bez rohů)
      if (!c.noHorns) {
        ctx.save();
        ctx.translate(0, -16);
        ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-9, -8, -6, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -1); ctx.quadraticCurveTo(13, -9, 10, -13); ctx.stroke();
        ctx.restore();
      }
      // chomáček na čele – Květa má místo něj bílou ofinku
      ctx.fillStyle = c.forelock || shade(c.body, 0.04);
      ell(ctx, 2, -16, 8, 5, 0); ctx.fill();
      if (c.forelock) { // pramínky ofinky do čela
        ell(ctx, -3, -13, 3, 4.5, -0.3); ctx.fill();
        ell(ctx, 3, -12.5, 3, 5, 0.1); ctx.fill();
        ell(ctx, 8, -13, 2.6, 4, 0.4); ctx.fill();
      }
      // uši do stran
      ctx.fillStyle = c.ear;
      ell(ctx, -10, -12, 8, 5, -0.5); ctx.fill();
      ctx.fillStyle = c.earIn;
      ell(ctx, -11, -12, 4, 2.6, -0.5); ctx.fill();
    } else if (species === 'ovce') {
      ctx.fillStyle = c.ear;
      ell(ctx, -8, -10, 7, 4, -0.6); ctx.fill();
      ell(ctx, 14, -13, 6, 3.6, 0.5); ctx.fill();
    } else if (species === 'prase') {
      [-0.5, 0.3].forEach((rot, i) => {
        ctx.save();
        ctx.translate(-2 + i * 12, -14);
        ctx.rotate(rot + earFlap);
        ctx.fillStyle = c.ear;
        ctx.beginPath();
        ctx.moveTo(-6, 2); ctx.lineTo(6, 2); ctx.lineTo(0, -12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.earIn;
        ctx.beginPath();
        ctx.moveTo(-3, 1); ctx.lineTo(3, 1); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    }

    // ozdoba ze šatníku – kreslí se až nad ušima a rohy, takže klobouk
    // sedí na hlavě a ne pod ní
    if (p.wear) drawWear(ctx, p.wear, c, species);

    ctx.restore(); // hlava
    ctx.restore(); // celá postava
  }

  /* ---------- ozdoby (šatník) ----------
     Drobnost, kterou má zvířátko na sobě: buď si ji vysloužilo splněním
     svých tří osobních úkolů, nebo si ji hráč koupil za mince. Kreslí se
     v souřadnicích HLAVY – střed hlavy je kolem [6, −6], oko na [6, −10],
     uši a rohy kolem y = −16, čumák míří do +x.

     POZOR na tabulku níž. Dokud každé zvířátko nosilo jen svou vlastní
     trofej, stačilo pár `species === …` ternárních operátorů rozesetých po
     těle funkce. Od zavedení šatníku je ozdoba SPOLEČNÁ – každou z nich
     může nosit každý – takže se ladí dvanáct ozdob krát šest zvířátek a
     hledat ta čísla po funkci by bylo k nevydržení. Všechna posazení proto
     bydlí na jednom místě; `_` je výchozí hodnota, jmenný klíč výjimka.
     Klíč `kráva0` je Květa: je to `kráva` bez rohů (`colors.noHorns`), a
     to samotný `species` nepozná. */
  const WEAR_AT = {
    // na hlavě, nad ušima
    hat:    { osel: [4, -26], ovce: [4, -25], muflon: [3, -27], _: [4, -20] },
    cap:    { osel: [4, -25], ovce: [4, -24], muflon: [2, -26], _: [4, -19] },
    winter: { osel: [4, -26], ovce: [4, -26], muflon: [2, -27], _: [4, -20] },
    crown:  { osel: [4, -25], ovce: [4, -26], muflon: [-4, -30], 'kráva': [4, -19], 'kráva0': [4, -18], _: [4, -20] },
    // kolem čela
    band:   { _: [4, -15] },
    wreath: { ovce: [4, -20], muflon: [5, -17], _: [4, -15] },
    // u hlavy
    flower: { ovce: [-9, -23], _: [-9, -15] },
    ribbon: { ovce: [-11, -22], _: [-13, -14] },
    shades: { ovce: [6, -9], 'kráva0': [6, -9.5], _: [6, -10.5] },
    // na krku. Ozdoba se kreslí až nakonec, takže hnědá hříva osla nebo
    // vlna ovce pod ní zmizí – u obou proto sedí blíž k hrdlu (víc do +x),
    // kde je čistá kůže. Spodek hlavy je kolem y = +9.
    scarf:  { osel: [-8, 14], ovce: [-7, 12], 'kráva': [-12, 12], 'kráva0': [-12, 12], muflon: [-11, 12], _: [-15, 13] },
    bell:   { osel: [-3, 11], ovce: [0, 9], _: [-6, 10] },
    bowtie: { osel: [-2, 10], ovce: [1, 8], _: [-5, 9] },
  };
  function wearAt(kind, c, species) {
    const row = WEAR_AT[kind];
    if (!row) return null;
    const key = species === 'kráva' && c.noHorns ? 'kráva0' : species;
    return row[key] || row._;
  }

  function drawWear(ctx, kind, c, species) {
    const at = wearAt(kind, c, species);
    if (!at) return;                 // neznámá ozdoba se prostě nekreslí
    ctx.save();
    ctx.translate(at[0], at[1]);
    if (kind === 'hat') {              // slaměný klobouk
      ctx.fillStyle = '#e8c579';
      ell(ctx, 0, 0, 21, 5.5); ctx.fill();        // krempa
      ctx.fillStyle = '#f2d694';
      ell(ctx, 0, -7, 11, 8); ctx.fill();         // dýnko
      ctx.fillStyle = '#b8703a';
      ctx.fillRect(-11, -4.5, 22, 3.5);           // stužka
      ctx.strokeStyle = '#d0a755'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-16, 0.5); ctx.lineTo(16, 0.5); ctx.stroke();
    } else if (kind === 'band') {      // sportovní čelenka
      // ovce má nad čelem vlnu (koule kolem y ≈ −17) – čelenka do ní
      // schválně zajíždí, jinak nad hlavou visí jako svatozář
      ctx.fillStyle = '#3f8fd8';
      ell(ctx, 0, 0, 14, 4.2, -0.06); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.5, -3, 7, 2);
    } else if (kind === 'flower') {    // kopretina za uchem
      // bílé plátky na bílé ovčí vlně by zmizely – proto má ovce kopretinu
      // posazenou výš, nad vlnu, a pod plátky tenký zelený stonek
      ctx.strokeStyle = '#6fae54'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(4, 9); ctx.stroke();
      ctx.fillStyle = '#fffaf0';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ell(ctx, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 3.2, 2.2, a); ctx.fill();
      }
      ctx.strokeStyle = '#d9cdb4'; ctx.lineWidth = 0.8;   // obtažení pro kontrast
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ell(ctx, Math.cos(a) * 4.6, Math.sin(a) * 4.6, 3.2, 2.2, a); ctx.stroke();
      }
      ctx.fillStyle = '#ffcf3f';
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'scarf') {     // šátek na krku
      // prase nemá kreslený krk – šátek sedí na přechodu hlavy v tělo
      ctx.fillStyle = '#d8543f';
      ell(ctx, 0, 0, 13, 6, 0.5); ctx.fill();
      ctx.beginPath();                              // cípek
      ctx.moveTo(2, 3); ctx.lineTo(9, 6); ctx.lineTo(3, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';     // puntíky
      [[-5, -1], [1, 2], [-2, 5], [5, -3]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      });
    } else if (kind === 'ribbon') {    // stužka uvázaná na rohu
      ctx.fillStyle = '#e0567f';
      ell(ctx, -4, 0, 4.6, 3.4, -0.4); ctx.fill();
      ell(ctx, 4, 0, 4.6, 3.4, 0.4); ctx.fill();
      ctx.fillStyle = '#b83c62';
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'wreath') {    // věneček z kopretin
      ctx.strokeStyle = '#6fae54'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 1, 13, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.1 + i * 0.2);
        const x = Math.cos(a) * 13, y = 1 + Math.sin(a) * 13;
        ctx.fillStyle = '#fffaf0';
        for (let k = 0; k < 5; k++) {
          const b = (k / 5) * Math.PI * 2;
          ell(ctx, x + Math.cos(b) * 2.6, y + Math.sin(b) * 2.6, 2, 1.4, b); ctx.fill();
        }
        ctx.fillStyle = '#ffcf3f';
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'cap') {       // kšiltovka, kšilt míří dopředu (+x)
      ctx.fillStyle = '#c8443a';                      // kšilt pod dýnko
      ctx.beginPath(); ctx.ellipse(6, 0.4, 10, 3.4, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e2564a';                      // dýnko
      ctx.beginPath(); ctx.ellipse(0, 0.6, 11.5, 9, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7f2e6';
      ctx.beginPath(); ctx.arc(0, -8.4, 1.7, 0, Math.PI * 2); ctx.fill();  // knoflík
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(-11.5, -0.6, 23, 1.6);             // šev nad kšiltem
    } else if (kind === 'winter') {    // zimní čepice s bambulí
      ctx.fillStyle = '#3f7fb0';
      ctx.beginPath(); ctx.ellipse(0, 1.2, 11, 10.5, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7f4ea';                      // bambule
      ctx.beginPath(); ctx.arc(0, -12.8, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3ede0';                      // ohrnutý lem
      ell(ctx, 0, 1, 12.5, 3.4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ell(ctx, 0, 2.4, 12.5, 2); ctx.fill();
    } else if (kind === 'crown') {     // korunka
      ctx.fillStyle = '#f0c33c';
      ctx.beginPath();
      ctx.moveTo(-10, 2.4); ctx.lineTo(-10, -6); ctx.lineTo(-5, -1.4);
      ctx.lineTo(0, -8.4); ctx.lineTo(5, -1.4); ctx.lineTo(10, -6);
      ctx.lineTo(10, 2.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9a521';
      ctx.fillRect(-10, 0.2, 20, 2.6);                // obroučka
      [['#e0567f', 0, -6.4], ['#5aa9e6', -7.4, -4.2], ['#7ac95e', 7.4, -4.2]]
        .forEach(([col, x, y]) => {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        });
    } else if (kind === 'shades') {    // brýle – postava je z profilu, čočka je jedna
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(5.2, -1.9, 5.6, 1.9);              // most k čumáku
      ell(ctx, 0, 0, 6.2, 4.8, 0.12); ctx.fill();     // čočka
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ell(ctx, -1.8, -1.7, 2.2, 1.3, 0.3); ctx.fill();  // odlesk
      ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      ctx.beginPath();                                 // nožička mizí pod uchem
      ctx.moveTo(-5.4, -1.2); ctx.lineTo(-13, -3.4); ctx.stroke();
    } else if (kind === 'bell') {      // obojek s rolničkou
      /* Obojek leží NAPŘÍČ krkem – ten běží od hlavy (vpravo nahoře) k tělu
         (vlevo dole), takže pásek musí být pootočený o 0.5 stejně jako
         šátek. Rolnička visí na jeho předním, nejnižším konci; kdyby padala
         od středu, vypadá to, že se vedle pásku vznáší zvlášť. */
      ctx.strokeStyle = '#8b4a2f'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, -5); ctx.lineTo(7, 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8.5, -6.2); ctx.lineTo(6.5, 2.8); ctx.stroke();
      ctx.fillStyle = '#eec24a';                       // rolnička
      ctx.beginPath(); ctx.arc(7.4, 7.8, 3.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8992c';
      ctx.fillRect(5.6, 9, 3.6, 1.7);                  // štěrbina
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(6.2, 6.3, 1.2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'bowtie') {    // motýlek uvázaný pod hrdlem
      ctx.fillStyle = '#c8443a';
      ell(ctx, -4.6, -1.2, 4.8, 3.4, -0.35); ctx.fill();
      ell(ctx, 4.6, 1.2, 4.8, 3.4, -0.35); ctx.fill();
      ctx.fillStyle = '#9e3229';
      ell(ctx, 0, 0, 2.4, 2.9, -0.35); ctx.fill();     // uzel
    }
    ctx.restore();
  }

  return {
    lerp, lerpColor, shade, hexA, hash, rr, ell,
    drawSky, drawClouds, drawHills, drawGround, drawGodRays,
    drawProp, drawObstacle, drawFlyer, drawCarrot, drawCoin, drawClover, drawMajestic, drawStep, drawCharacter,
    PROPS,
  };
})();
