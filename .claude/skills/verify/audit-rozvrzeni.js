/* Audit viditelnosti Louka Run.
   Pro každé rozlišení a každou obrazovku hledá:
     A) prvek (částečně) mimo viditelnou plochu, ke kterému nejde odrolovat
     B) prvek useknutý předkem, který se v té ose nedá odrolovat
     C) text přetékající ze schránky, která má pozadí nebo rámeček
     D) dva texty přes sebe
*/
const path = require('path');
const PW = process.env.PW_DIR || '/tmp/claude-1000/-home-tonyfg-Desktop-projekty-loukarun/657e5525-0662-42de-a5c1-961d908d80d9/scratchpad/node_modules/playwright-core';
const { chromium } = require(PW);
const BASE = process.env.BASE || 'http://127.0.0.1:8125';
const SHOT_DIR = process.env.SHOT_DIR || path.join(__dirname, 'shots');
const SHOOT = process.env.SHOOT === '1';

const DEVICES = [
  { n: 'iPhoneSE-portrait',     w: 320,  h: 568,  mobile: true },
  { n: 'phone360x640-portrait', w: 360,  h: 640,  mobile: true },
  { n: 'phone360x800-portrait', w: 360,  h: 800,  mobile: true },
  { n: 'iPhone12-portrait',     w: 390,  h: 844,  mobile: true },
  { n: 'Pixel7-portrait',       w: 412,  h: 915,  mobile: true },
  { n: 'iPhone14Max-portrait',  w: 430,  h: 932,  mobile: true },
  { n: 'foldCover-portrait',    w: 344,  h: 882,  mobile: true },
  { n: 'phone640x360-land',     w: 640,  h: 360,  mobile: true },
  { n: 'phone800x360-land',     w: 800,  h: 360,  mobile: true },
  { n: 'phone844x390-land',     w: 844,  h: 390,  mobile: true },
  { n: 'phone915x412-land',     w: 915,  h: 412,  mobile: true },
  { n: 'phone932x430-land',     w: 932,  h: 430,  mobile: true },
  { n: 'tablet1024x768-land',   w: 1024, h: 768,  mobile: true },
  { n: 'tablet768x1024-port',   w: 768,  h: 1024, mobile: true },
  { n: 'desktop1280x800',       w: 1280, h: 800,  mobile: false },
  { n: 'desktop1920x1080',      w: 1920, h: 1080, mobile: false },
];

const SCREENS = (process.env.SCREENS || 'menu,shop,ach,settings,over,pause,diary').split(',');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
// Systémové zvětšení písma na Androidu (Nastavení → Displej → Velikost písma)
// zvětší i text ve WebView. Přesně tohle rozhodilo rozvržení u uživatele.
const SCALES = (process.env.SCALES || '100,130').split(',').map(Number);

const CHECK = (screenId) => {
  const R = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  const root = document.getElementById('screen-' + screenId);
  if (!root || !root.classList.contains('visible')) return [{ kind: 'obrazovka není vidět', sel: screenId }];

  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (c.length) s += '.' + c.join('.');
    return s;
  };
  const txt = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 55);

  // skryté větve (popovery, zamčené panely) do auditu nepatří
  const hiddenBranch = (el) => {
    let p = el;
    while (p && p !== root.parentElement) {
      if (p.hasAttribute && p.hasAttribute('hidden')) return true;
      p = p.parentElement;
    }
    return false;
  };

  const D = new Map();
  const meta = (el) => {
    let m = D.get(el);
    if (!m) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      m = {
        cs, r,
        vis: r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' &&
             cs.display !== 'none' && parseFloat(cs.opacity) > 0.05 && !hiddenBranch(el),
      };
      D.set(el, m);
    }
    return m;
  };

  const canScroll = (el, axis) => {
    const m = meta(el);
    const ov = axis === 'y' ? m.cs.overflowY : m.cs.overflowX;
    if (!/(auto|scroll)/.test(ov)) return false;
    return axis === 'y' ? el.scrollHeight > el.clientHeight + 2 : el.scrollWidth > el.clientWidth + 2;
  };
  /* Hra na telefonu na výšku je otočená o 90°: getBoundingClientRect vrací
     fyzické souřadnice, ale scrollHeight/overflow-y patří k herním osám.
     Bez tohohle přemapování se ptáme na rolování ve špatné ose a všechno,
     k čemu se DÁ dorolovat, se hlásí jako nedostupné. */
  const ROT = document.documentElement.classList.contains('force-landscape');
  const gameAxis = (physAxis) => (ROT ? (physAxis === 'y' ? 'x' : 'y') : physAxis);
  const scrollableAncestor = (el, axis) => {
    let p = el.parentElement;
    while (p && p !== document.body) { if (canScroll(p, axis)) return true; p = p.parentElement; }
    return false;
  };

  // Skutečně viditelný obdélník prvku = průnik jeho rámečku se všemi
  // ořezávajícími předky. Bez tohohle se hlásí „překryv" i tam, kde je
  // přesahující text schovaný za okrajem stránky deníčku.
  const visibleRect = (el) => {
    const r = meta(el).r;
    let out = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pm = meta(p);
      if (/(hidden|clip|auto|scroll)/.test(pm.cs.overflowY) || /(hidden|clip|auto|scroll)/.test(pm.cs.overflowX)) {
        const pr = pm.r;
        out.top = Math.max(out.top, pr.top); out.bottom = Math.min(out.bottom, pr.bottom);
        out.left = Math.max(out.left, pr.left); out.right = Math.min(out.right, pr.right);
      }
      p = p.parentElement;
    }
    return out;
  };
  const clippedAway = (el) => {
    const v = visibleRect(el);
    return v.bottom - v.top < 3 || v.right - v.left < 3;
  };

  const IMPORTANT = '.btn, h1, h2, h3, .stat, .perk, .tagline, .story, .hud-chip, .diary-title, .diary-entry,' +
    ' .ach-card, .set-row, .daily-row, .stat-rows, .card-badge, .book-page, .charname, .char-card, .task-prize,' +
    ' .page-body, .page-title, li, label, .over-buttons, .over-stats, .subtitle';
  const important = Array.from(root.querySelectorAll(IMPORTANT)).filter((el) => meta(el).vis);

  // A) mimo viditelnou plochu
  for (const el of important) {
    const r = meta(el).r;
    const outY = Math.max(-r.top, r.bottom - vh);
    const outX = Math.max(-r.left, r.right - vw);
    if (outY > 2 && !scrollableAncestor(el, gameAxis('y'))) {
      R.push({ kind: 'mimo obrazovku svisle', sel: sel(el), px: Math.round(outY), text: txt(el) });
    }
    if (outX > 2 && !scrollableAncestor(el, gameAxis('x'))) {
      R.push({ kind: 'mimo obrazovku vodorovně', sel: sel(el), px: Math.round(outX), text: txt(el) });
    }
  }

  // B) useknuto předkem, který se v té ose nedá odrolovat
  for (const el of important) {
    const r = meta(el).r;
    let p = el.parentElement, hit = null;
    while (p && p !== document.body && !hit) {
      const pm = meta(p);
      for (const axis of ['y', 'x']) {          // osa fyzická (rect)
        const ga = gameAxis(axis);                // osa herní (overflow, scroll*)
        if (scrollableAncestor(el, ga)) continue; // dá se k němu dorolovat
        const ov = ga === 'y' ? pm.cs.overflowY : pm.cs.overflowX;
        if (!/(hidden|clip|auto|scroll)/.test(ov) || canScroll(p, ga)) continue;
        const pr = pm.r;
        const out = axis === 'y' ? Math.max(pr.top - r.top, r.bottom - pr.bottom)
                                 : Math.max(pr.left - r.left, r.right - pr.right);
        if (out > 2) hit = { axis, out: Math.round(out), by: sel(p), ov };
      }
      p = p.parentElement;
    }
    if (hit) {
      R.push({
        kind: hit.axis === 'y' ? 'useknuto předkem svisle' : 'useknuto předkem vodorovně',
        sel: sel(el), px: hit.out, by: hit.by, text: txt(el),
      });
    }
  }

  // C) text přetéká ze schránky, která má pozadí nebo rámeček
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const m = meta(el);
    if (!m.vis || el.tagName === 'CANVAS') continue;
    const boxed = !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(m.cs.backgroundColor) ||
      parseFloat(m.cs.borderTopWidth) > 0 || parseFloat(m.cs.borderBottomWidth) > 0;
    if (!boxed) continue;
    // přetečení kvůli absolutně umístěnému potomkovi není chyba schránky
    const absKid = Array.from(el.children).some((c) => /absolute|fixed/.test(getComputedStyle(c).position));
    if (absKid) continue;
    const overY = el.scrollHeight - el.clientHeight;
    if (overY > 2 && !/(auto|scroll)/.test(m.cs.overflowY) && el.clientHeight > 0) {
      R.push({ kind: 'text přetéká ze schránky', sel: sel(el), px: overY, text: txt(el) });
    }
  }

  // D) dva texty přes sebe
  const leaves = Array.from(root.querySelectorAll('*')).filter((el) => {
    if (!meta(el).vis) return false;
    if (!el.textContent || !el.textContent.trim()) return false;
    return !Array.from(el.children).some((c) => c.textContent && c.textContent.trim());
  });
  for (let a = 0; a < leaves.length; a++) {
    for (let b = a + 1; b < leaves.length; b++) {
      const A = leaves[a], B = leaves[b];
      if (A.contains(B) || B.contains(A)) continue;
      if (/absolute|fixed/.test(meta(A).cs.position) || /absolute|fixed/.test(meta(B).cs.position)) continue;
      const ra = visibleRect(A), rb = visibleRect(B);
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 6 && iy > 6) {
        if (A.parentElement === B.parentElement && getComputedStyle(A.parentElement).display === 'grid') continue;
        // co je schované za ořezem předka, se vizuálně nepřekrývá
        if (clippedAway(A) || clippedAway(B)) continue;
        R.push({ kind: 'texty se překrývají', sel: sel(A) + ' × ' + sel(B), px: Math.round(Math.min(ix, iy)), text: txt(A) + ' | ' + txt(B) });
      }
    }
  }
  return R;
};

const click = (page, id) => page.evaluate((i) => {
  const el = document.getElementById(i);
  if (!el) throw new Error('chybí #' + i);
  el.click();
}, id);

const toMenu = (page) => page.evaluate(() => {
  document.querySelectorAll('.screen').forEach((x) => x.classList.remove('visible'));
  document.getElementById('screen-menu').classList.add('visible');
});

const GOTO = async (page, id) => {
  if (id === 'menu') { await toMenu(page); return true; }
  if (id === 'shop') { await click(page, 'btn-shop'); await page.waitForTimeout(350); return true; }
  if (id === 'ach') { await click(page, 'btn-ach'); await page.waitForTimeout(350); return true; }
  if (id === 'settings') { await click(page, 'btn-settings'); await page.waitForTimeout(350); return true; }
  if (id === 'diary') {
    await click(page, 'btn-shop');
    await page.waitForTimeout(300);
    const opened = await page.evaluate(() => {
      const b = document.querySelector('#shop-grid .diary');
      if (!b) return false;
      b.click();
      return true;
    });
    await page.waitForTimeout(450);
    return opened;
  }
  if (id === 'pause') {
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('visible'));
      document.getElementById('screen-pause').classList.add('visible');
    });
    await page.waitForTimeout(250);
    return true;
  }
  if (id === 'over') {
    await page.evaluate((which) => {
      const stories = (typeof DATA !== 'undefined' ? DATA.CHARACTERS : []).flatMap((c) => c.stories || []);
      const longest = stories.map((s) => (typeof s === 'string' ? s : (s.cs || s.en || '')))
        .sort((a, b) => b.length - a.length)[0] || 'Karel doběhl až k ceduli a okousal ji.';
      const card = document.querySelector('#screen-over .over-card');
      card.classList.remove('anim');
      document.getElementById('over-title').textContent = 'NOVÝ REKORD!';
      const st = document.getElementById('over-story');
      st.querySelector('.story-ghost').textContent = longest;
      st.querySelector('.story-text').textContent = longest;
      st.classList.add('done');
      const vals = { 'over-dist': '14417 m', 'over-carrots': '1520', 'over-coins': '+3168', 'over-best': '14417 m', 'over-combo': '76' };
      for (const k in vals) document.getElementById(k).textContent = vals[k];
      card.classList.add('record');
      card.classList.remove('small');
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('visible'));
      document.getElementById('screen-over').classList.add('visible');
    });
    await page.waitForTimeout(300);
    return true;
  }
  return false;
};

const fs = require('fs');
(async () => {
  const report = [];
  const OUT = process.env.OUT || path.join(__dirname, 'base.json');
  for (const dev of DEVICES.filter((x) => !ONLY || ONLY.includes(x.n))) {
   for (const scale of SCALES) {
    const d = { ...dev, n: dev.n + (scale === 100 ? '' : '@' + scale + '%') };
    // vlastní prohlížeč na každé zařízení – jeden pád nezruší celý audit
    const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h },
      isMobile: d.mobile, hasTouch: d.mobile, deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    try {
      if (scale !== 100) {
        await page.addInitScript((sc) => {
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.style.fontSize = sc + '%';
          });
        }, scale);
      }
      await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown'))).catch(() => {});
      await page.mouse.click(5, 5).catch(() => {});
      await page.waitForSelector('#screen-menu.visible', { timeout: 30000 });
      await page.evaluate(() => {
        if (typeof KAREL !== 'undefined' && KAREL.isOpen && KAREL.isOpen()) KAREL.close();
      }).catch(() => {});
      await page.waitForTimeout(700);
      for (const s of SCREENS) {
        let ok = false;
        try { ok = await GOTO(page, s); } catch (e) { ok = false; }
        if (!ok) { report.push({ device: d.n, screen: s, findings: [{ kind: 'nepodařilo se otevřít' }] }); await toMenu(page); continue; }
        await page.waitForTimeout(220);
        const f = await page.evaluate(CHECK, s);
        if (SHOOT && f.length) await page.screenshot({ path: path.join(SHOT_DIR, `${d.n}--${s}.png`) }).catch(() => {});
        report.push({ device: d.n, screen: s, findings: f });
        await toMenu(page);
      }
    } catch (e) {
      report.push({ device: d.n, screen: '-', findings: [{ kind: 'pád testu', text: String(e.message).slice(0, 160) }] });
    }
    if (errors.length) report.push({ device: d.n, screen: '(konzole)', findings: errors.map((t) => ({ kind: 'chyba v konzoli', text: t })) });
    try { await ctx.close(); } catch (e) { /* kontext už je pryč */ }
    try { await browser.close(); } catch (e) { /* prohlížeč už je pryč */ }
    fs.writeFileSync(OUT, JSON.stringify(report)); // průběžně, ať se nic neztratí
    process.stderr.write('hotovo: ' + d.n + '\n');
   }
  }
  fs.writeFileSync(OUT, JSON.stringify(report));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
