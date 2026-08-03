#!/usr/bin/env python3
"""=========================================================
LOUKA RUN – generátor loga (SVG)

Písmo bere přímo z herního Baloo 2 (assets/fonts/) a převádí
ho na křivky, takže výsledné SVG nepotřebuje žádný font.

Spuštění (z kořene repa):
    pip install fonttools brotli
    python3 promo/znacka/sablona/make-logo.py

Výstup: SVG do promo/znacka/
========================================================="""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'promo', 'znacka')
FONT = os.path.join(ROOT, 'assets', 'fonts', 'baloo2-latin.woff2')

# ---------- barvy značky ----------
C = {
    'sky':        '#8ed4f7',
    'sky_light':  '#cdeafd',
    'green':      '#5aa84f',
    'green_dark': '#3a682f',
    'green_deep': '#2c4f24',
    'gold':       '#ffc23c',
    'gold_light': '#ffe08a',
    'ochre':      '#b78547',   # z loga Nech mě růst
    'carrot':     '#ff9d3a',   # mrkev ze hry
    'carrot_dark':'#e8791c',
    'cream':      '#fff6e4',
    'ink':        '#4a3220',
}

# =========================================================
#  Písmo → křivky
# =========================================================
def _load(path):
    f = TTFont(path)
    if 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': 800}, inplace=False)
    return f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm


# Baloo 2 je rozdělené na latin a latin-ext (háčky a čárky jsou v ext),
# takže si držíme obě sady a znak hledáme v té, která ho má.
_SETS = [_load(FONT), _load(FONT.replace('-latin.woff2', '-latin-ext.woff2'))]
UPEM = _SETS[0][2]


def _glyph_path(ch, tr):
    """Křivka jednoho znaku, transformovaná do souřadnic výkresu."""
    for glyphs, cmap, _ in _SETS:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, tr))
        return pen.getCommands(), glyphs[name].width
    raise KeyError(f'znak {ch!r} není ani v jednom řezu Baloo 2')


def wordmark(text, size, tracking=0.0, x=0.0, y=0.0):
    """Vrátí (path_d, šířka) pro text vysázený jako křivky.

    size     = výška em v pixelech
    tracking = prostrkání v em (0.04 = 4 %)
    y        = účaří
    """
    s = size / UPEM
    cx = x
    parts = []
    for ch in text:
        if ch == ' ':
            cx += size * 0.30
            continue
        tr = Transform(s, 0, 0, -s, cx, y)
        d, adv = _glyph_path(ch, tr)
        parts.append(d)
        cx += adv * s + size * tracking
    return ' '.join(parts), cx - x - size * tracking


def caps_height(size):
    """Výška verzálek v pixelech (pro svislé centrování)."""
    name = _cmap[ord('H')]
    pen = SVGPathPen(_glyphs)
    _glyphs[name].draw(pen)
    ys = []
    from fontTools.pens.boundsPen import BoundsPen
    bp = BoundsPen(_glyphs)
    _glyphs[name].draw(bp)
    return (bp.bounds[3] - bp.bounds[1]) * size / UPEM


# =========================================================
#  Stavební dílky značky
# =========================================================
def carrot(x, y, scale=1.0, rot=-22):
    """Mrkev s trojlístkem natě – lístky citují znak Nech mě růst."""
    s = scale

    def petal(ax, ay, bx, by, cw, col):
        """Špičatý lístek: dva oblouky sbíhající se do hrotů."""
        return (f'<path d="M {ax:.1f} {ay:.1f} Q {(ax+bx)/2 - cw:.1f} {(ay+by)/2:.1f} {bx:.1f} {by:.1f} '
                f'Q {(ax+bx)/2 + cw:.1f} {(ay+by)/2:.1f} {ax:.1f} {ay:.1f} Z" fill="{col}"/>')

    return f'''<g transform="translate({x:.1f} {y:.1f}) rotate({rot}) scale({s:.4f})">
    <!-- nať: tři špičaté lístky jako ve znaku Nech mě růst -->
    {petal(0, -66, -94, -172, 30, '#4f9c46')}
    {petal(0, -66, 94, -172, 30, '#4f9c46')}
    {petal(0, -72, 0, -218, 34, '#6fbf5f')}
    <!-- kořen -->
    <path d="M -64 -68 Q 0 -110 64 -68 C 52 16 26 100 9 140 Q 0 158 -9 140 C -26 100 -52 16 -64 -68 Z" fill="{C['carrot']}"/>
    <path d="M 16 -84 Q 46 -80 64 -68 C 52 16 26 100 9 140 Q 3 150 -2 146 Z" fill="{C['carrot_dark']}" opacity=".5"/>
    <g fill="{C['carrot_dark']}" opacity=".7">
      <rect x="-46" y="-34" width="32" height="9" rx="4.5" transform="rotate(14 -30 -29)"/>
      <rect x="6" y="4" width="30" height="9" rx="4.5" transform="rotate(14 21 8)"/>
      <rect x="-32" y="44" width="26" height="8" rx="4" transform="rotate(14 -19 48)"/>
    </g>
  </g>'''


def jednobarevne(svg, col):
    """Přebarví celou skupinu na jednu barvu – pro mono verzi loga.
    Stíny a prokreslení tím splynou do jedné siluety, o což tu jde."""
    import re
    svg = re.sub(r'fill="#[0-9a-fA-F]{6}"', f'fill="{col}"', svg)
    return re.sub(r'opacity="[.\d]+"', 'opacity="1"', svg)


def speedlines(x, y, scale=1.0, col=None, opacity=1.0):
    col = col or C['cream']
    return f'''<g transform="translate({x:.1f} {y:.1f}) scale({scale:.4f})" fill="{col}" opacity="{opacity}">
    <rect x="-230" y="-52" width="200" height="26" rx="13"/>
    <rect x="-180" y="-6"  width="250" height="26" rx="13"/>
    <rect x="-236" y="40"  width="164" height="26" rx="13"/>
  </g>'''


def outlined(d, fill, stroke, w, extra=''):
    """Text s obtahem – obtah zvlášť pod výplní, ať to sedí i mimo Chromium."""
    return (f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{w}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>\n'
            f'  <path d="{d}" fill="{fill}" {extra}/>')


def defs():
    return f'''<defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{C['gold_light']}"/>
      <stop offset=".55" stop-color="{C['gold']}"/>
      <stop offset="1" stop-color="#f0a01e"/>
    </linearGradient>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="{C['cream']}"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6cc3f2"/>
      <stop offset="1" stop-color="{C['sky_light']}"/>
    </linearGradient>
    <radialGradient id="sun">
      <stop offset="0" stop-color="#fff3b0"/>
      <stop offset=".6" stop-color="{C['gold_light']}"/>
      <stop offset="1" stop-color="{C['gold_light']}" stop-opacity="0"/>
    </radialGradient>
  </defs>'''


def tagline_pill(cx, y, w=None, text='HRA AZYLU NECH MĚ RŮST', size=42, fill=None):
    d, tw = wordmark(text, size, tracking=0.14)
    pad = size * 1.35
    w = tw + pad * 2
    h = size * 2.05
    x = cx - w / 2
    fill = fill or C['green_dark']
    return f'''<g>
    <rect x="{x:.1f}" y="{y - h*0.72:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h/2:.1f}" fill="{fill}"/>
    <path d="{wordmark(text, size, tracking=0.14, x=cx - tw/2, y=y)[0]}" fill="{C['cream']}"/>
  </g>'''


# =========================================================
#  1) Hlavní logo – stohovaný lockup
# =========================================================
def primary(with_backdrop=True):
    W, H = 1400, 840
    CX = 660          # optická osa nápisu (mrkev vpravo si urve svou váhu)
    w_louka = wordmark('LOUKA', 210, tracking=0.045)[1]
    w_run = wordmark('RUN', 300, tracking=0.02)[1]
    d_louka = wordmark('LOUKA', 210, tracking=0.045, x=CX - w_louka / 2, y=300)[0]
    d_run = wordmark('RUN', 300, tracking=0.02, x=CX - w_run / 2, y=560)[0]

    back = ''
    if with_backdrop:
        back = f'''<circle cx="{CX}" cy="330" r="340" fill="url(#sun)" opacity=".5"/>
    <path d="M -60 706 Q 320 566 700 646 Q 1080 726 1460 596 L 1460 900 L -60 900 Z" fill="{C['green']}" opacity=".16"/>'''

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Louka Run">
  <title>Louka Run</title>
  {defs()}
  {back}
  {speedlines(320, 452, 0.92, '#ffffff', .95)}
  {speedlines(320, 452, 0.92, C['green_dark'], .22)}
  {carrot(1205, 452, 0.95, 22)}
  <g transform="rotate(-2 {CX} 430)">
    {outlined(d_louka, 'url(#cream)', C['green_dark'], 34)}
    {outlined(d_run, 'url(#gold)', C['green_dark'], 38)}
  </g>
  {tagline_pill(CX, 736)}
</svg>
'''


# =========================================================
#  2) Vodorovný lockup – znak + text na jednom řádku
# =========================================================
def horizontal():
    W, H = 1740, 470
    tx = 470
    # „RUN“ zlatě: vysázíme obě slova zvlášť, aby šla obarvit jinak
    d_louka, w_l = wordmark('LOUKA ', 200, tracking=0.03, x=tx, y=270)
    d_run = wordmark('RUN', 200, tracking=0.03, x=tx + w_l + 200 * 0.03, y=270)[0]
    tag = wordmark('HRA AZYLU NECH MĚ RŮST', 44, tracking=0.15, x=tx + 8, y=370)[0]

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Louka Run">
  <title>Louka Run</title>
  {defs()}
  <clipPath id="disk"><circle cx="180" cy="180" r="180"/></clipPath>
  <g transform="translate(45 30)">
    <g clip-path="url(#disk)">
      <rect width="360" height="360" fill="url(#sky)"/>
      <path d="M -10 214 Q 90 190 180 202 Q 270 214 370 190 L 370 370 L -10 370 Z" fill="{C['green']}"/>
      <path d="M -10 268 Q 90 250 180 260 Q 270 270 370 252 L 370 370 L -10 370 Z" fill="{C['green_dark']}" opacity=".35"/>
      {speedlines(122, 158, 0.40, '#ffffff', .85)}
      <ellipse cx="196" cy="288" rx="62" ry="13" fill="{C['green_deep']}" opacity=".18"/>
      {carrot(196, 176, 0.56, 18)}
    </g>
  </g>
  {outlined(d_louka, 'url(#cream)', C['green_dark'], 32)}
  {outlined(d_run, 'url(#gold)', C['green_dark'], 32)}
  <path d="{tag}" fill="{C['green_dark']}"/>
</svg>
'''


# =========================================================
#  3) Znak – čtvercový odznak pro avatary a favicony
# =========================================================
def mark():
    S = 1024
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}" role="img" aria-label="Louka Run">
  <title>Louka Run – znak</title>
  {defs()}
  <rect width="{S}" height="{S}" rx="230" fill="url(#sky)"/>
  <circle cx="822" cy="212" r="150" fill="url(#sun)" opacity=".85"/>
  <path d="M 0 690 Q 256 616 512 664 Q 768 712 1024 644 L 1024 1024 L 0 1024 Z" fill="{C['green']}"/>
  <path d="M 0 822 Q 256 766 512 806 Q 768 846 1024 788 L 1024 1024 L 0 1024 Z" fill="{C['green_dark']}" opacity=".45"/>
  {speedlines(392, 512, 0.88, "#ffffff", .92)}
  <ellipse cx="505" cy="782" rx="176" ry="34" fill="{C['green_deep']}" opacity=".2"/>
  {carrot(505, 462, 1.55, 18)}
</svg>
'''


# =========================================================
#  4) Jednobarevná verze – razítka, tisk, tmavé podklady
# =========================================================
def mono(col=None):
    col = col or C['ink']
    W, H = 1740, 470
    tx = 470
    d_all = wordmark('LOUKA RUN', 200, tracking=0.03, x=tx, y=270)[0]
    tag = wordmark('HRA AZYLU NECH MĚ RŮST', 44, tracking=0.15, x=tx + 8, y=370)[0]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Louka Run">
  <title>Louka Run – jednobarevně</title>
  <g fill="{col}">
    <g transform="translate(60 60)">
      <circle cx="180" cy="180" r="180" fill="none" stroke="{col}" stroke-width="20"/>
      {speedlines(122, 176, 0.40, col, 1)}
      {jednobarevne(carrot(202, 190, 0.58, 18), col)}
    </g>
    <path d="{d_all}"/>
    <path d="{tag}"/>
  </g>
</svg>
'''


# =========================================================
def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        'loukarun-logo.svg': primary(),
        'loukarun-logo-cisty.svg': primary(with_backdrop=False),
        'loukarun-logo-vodorovne.svg': horizontal(),
        'loukarun-znak.svg': mark(),
        'loukarun-logo-mono.svg': mono(),
        'loukarun-logo-mono-bila.svg': mono('#ffffff'),
    }
    for name, svg in files.items():
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(svg)
        print('→', os.path.relpath(os.path.join(OUT, name), ROOT))


if __name__ == '__main__':
    main()
