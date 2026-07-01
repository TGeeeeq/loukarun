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

  /* =========================================================
     OBLOHA, KOPCE, ZEMĚ
     ========================================================= */
  function drawSky(ctx, W, H, pal, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // slunce / měsíc
    const sx = W * 0.78, sy = H * 0.22;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
    glow.addColorStop(0, pal.sun);
    glow.addColorStop(1, pal.sun + '00');
    ctx.fillStyle = glow;
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
        const hop = Math.abs(Math.sin(t * 0.012)) * 6;
        ctx.translate(0, -hop);
        ctx.fillStyle = '#f5f0e0';
        ell(ctx, 0, -h * 0.45, w * 0.42, h * 0.36); ctx.fill();
        // ocásek
        ctx.fillStyle = '#e0d8c0';
        ell(ctx, w * 0.34, -h * 0.62, 10, 14, 0.6); ctx.fill();
        // hlava
        ctx.fillStyle = '#f5f0e0';
        ctx.beginPath(); ctx.arc(-w * 0.34, -h * 0.78, 11, 0, Math.PI * 2); ctx.fill();
        // hřebínek
        ctx.fillStyle = '#e5533a';
        ctx.beginPath(); ctx.arc(-w * 0.36, -h * 0.98, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-w * 0.30, -h * 1.0, 4, 0, Math.PI * 2); ctx.fill();
        // zobák a oko
        ctx.fillStyle = '#f0a03c';
        ctx.beginPath(); ctx.moveTo(-w * 0.44, -h * 0.78); ctx.lineTo(-w * 0.56, -h * 0.74); ctx.lineTo(-w * 0.44, -h * 0.70); ctx.closePath(); ctx.fill();
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
    if (golden) {
      ctx.shadowColor = '#ffd24a';
      ctx.shadowBlur = 18;
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
  function drawCharacter(ctx, ch, x, y, scale, pose, t) {
    const c = ch.colors;
    const p = pose || {};
    const run = p.runPhase || 0;
    const sliding = !!p.sliding;
    const airborne = !!p.airborne;
    const stumble = p.stumble || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (stumble > 0) ctx.rotate(Math.sin(stumble * 20) * 0.12 * stumble);
    if (p.squash) ctx.scale(1 + p.squash * 0.15, 1 - p.squash * 0.2);
    if (sliding) { ctx.translate(0, 12); ctx.scale(1.15, 0.62); }

    const species = ch.species;
    const bob = airborne ? 0 : Math.abs(Math.sin(run)) * 3;
    ctx.translate(0, -bob);

    // --- nohy (za tělem) ---
    const legLen = 26;
    const legY = -18;
    function leg(offX, phase, back) {
      const a = airborne
        ? (back ? 0.6 : -0.5)
        : Math.sin(run + phase) * 0.9;
      ctx.save();
      ctx.translate(offX, legY);
      ctx.rotate(a * (sliding ? 0.2 : 1));
      const legCol = c.legs || c.body;
      ctx.fillStyle = back ? shade(legCol, -0.08) : legCol;
      rr(ctx, -5, 0, 10, legLen, 5);
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
    ctx.translate(-38, -36);
    const wag = Math.sin(t * 0.01) * 0.25;
    ctx.rotate(0.5 + wag);
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
    const bodyGrad = ctx.createLinearGradient(0, -68, 0, -12);
    bodyGrad.addColorStop(0, shade(c.body, 0.07));
    bodyGrad.addColorStop(1, shade(c.body, -0.07));
    if (species === 'ovce') { // vlněné obláčky po obvodu
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        ctx.fillStyle = i % 2 ? shade(c.body, 0.04) : shade(c.body, -0.03);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 36, -40 + Math.sin(a) * 19, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = bodyGrad;
    ell(ctx, 0, -40, 42, 26); ctx.fill();
    // bříško
    ctx.fillStyle = c.belly;
    ell(ctx, 2, -30, 26, 13); ctx.fill();
    // vzory srsti – oříznuté na tělo, ať nikam nepřečuhují
    if (c.pattern && c.spots) {
      ctx.save();
      ell(ctx, 0, -40, 42, 26);
      ctx.clip();
      ctx.fillStyle = c.spots;
      if (c.pattern === 'holstein') {        // velké černé fleky (Květa)
        ell(ctx, -24, -46, 16, 13, 0.35); ctx.fill();
        ell(ctx, -8, -32, 10, 8, -0.3); ctx.fill();
        ell(ctx, 18, -51, 14, 10, -0.4); ctx.fill();
        ell(ctx, 28, -30, 9, 8, 0.5); ctx.fill();
      } else if (c.pattern === 'patches') {  // světlé fleky na hnědé (Avala)
        ell(ctx, -18, -31, 13, 9, 0.3); ctx.fill();
        ell(ctx, 14, -52, 12, 8, -0.4); ctx.fill();
        ell(ctx, 30, -36, 8, 7, 0.4); ctx.fill();
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
      ell(ctx, 6, -63, 28, 6, -0.05); ctx.fill();
    }

    // --- přední nohy ---
    leg(-14, Math.PI * 0.5, false);
    leg(24, 0, false);

    // --- krk + hlava ---
    ctx.save();
    const headBob = airborne ? -4 : Math.sin(run * 2) * 1.5;
    ctx.translate(40, -58 + headBob);
    if (sliding) ctx.rotate(0.25);

    // krk
    ctx.fillStyle = c.body;
    if (species === 'osel' || species === 'kráva' || species === 'muflon') {
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
      ctx.fillStyle = c.body;
      if (species === 'ovce') ctx.fillStyle = c.muzzle;
      ell(ctx, 6, -11, 4.5, 4); ctx.fill();
      ctx.strokeStyle = '#2d2620'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -9); ctx.quadraticCurveTo(6, -6.5, 10, -9); ctx.stroke();
    }

    // uši / rohy
    const earFlap = Math.sin(t * 0.008) * 0.12;
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
      // chomáček na čele
      ctx.fillStyle = shade(c.body, species === 'kráva' && c.noHorns ? -0.02 : 0.04);
      ell(ctx, 2, -16, 8, 5, 0); ctx.fill();
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

    ctx.restore(); // hlava
    ctx.restore(); // celá postava
  }

  return {
    lerp, lerpColor, shade, hash, rr, ell,
    drawSky, drawClouds, drawHills, drawGround,
    drawProp, drawObstacle, drawCarrot, drawCoin, drawCharacter,
    PROPS,
  };
})();
