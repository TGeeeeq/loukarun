#!/usr/bin/env python3
"""=========================================================
LOUKA RUN – sestavení promo videa

Z natočených herních klipů (natoc-zabery.js) a karet
(natoc-karty.js) složí hotové promo ve dvou formátech:

    loukarun-promo-16x9.mp4   – YouTube, Google Play, web
    loukarun-promo-9x16.mp4   – Reels, Stories, TikTok, Shorts

Hudba je herní znělka assets/music/menu.mp3.

Spuštění (z kořene repa):
    python3 promo/video/sablona/sestav-video.py [pracovní-složka]

Potřebuje ffmpeg s libx264 (stačí `pip install imageio-ffmpeg`).
========================================================="""
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '.promo-work')
KLIPY = os.path.join(WORK, 'klipy')
KARTY = os.path.join(WORK, 'karty')
DILY = os.path.join(WORK, 'dily')
OUT = os.path.join(ROOT, 'promo', 'video')
HUDBA = os.path.join(ROOT, 'assets', 'music', 'menu.mp3')
FPS = 30


def ffmpeg_bin():
    for kand in (os.environ.get('FFMPEG'), shutil.which('ffmpeg')):
        if kand and os.path.exists(kand):
            return kand
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    sys.exit('Nenašel jsem ffmpeg. Nainstaluj `pip install imageio-ffmpeg`.')


FF = ffmpeg_bin()


def run(args):
    p = subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error'] + args)
    if p.returncode:
        sys.exit('ffmpeg selhal: ' + ' '.join(args[:8]) + ' …')


# =========================================================
#  SCÉNÁŘ
#  zdroj  = klip ze hry (bez přípony) nebo karta 'karta:jméno'
#  od/dél = odkud a jak dlouho (s)
#  popisek= číslo popisku, nebo None
# =========================================================
SCENAR = [
    # znělka autora – tmavá, video se z ní rozsvítí do louky
    dict(zdroj='intro',   od=0.6,  delka=3.6, popisek=None, nazev='znelka'),
    # intro hry: zvířátka pobíhají po louce a kreslí se logo azylu
    dict(zdroj='intro',   od=5.2,  delka=6.0, popisek=None, nazev='logo-azylu'),
    # titulní karta s logem hry
    dict(zdroj='karta:titul', od=0, delka=2.6, popisek=None, nazev='titul'),
    # gameplay – šest prostředí, každé se svým popiskem
    dict(zdroj='louka',   od=5.0,  delka=5.0, popisek=1, nazev='louka'),
    dict(zdroj='sad',     od=5.5,  delka=4.5, popisek=2, nazev='sad'),
    dict(zdroj='les',     od=5.5,  delka=4.5, popisek=3, nazev='les'),
    dict(zdroj='vesnice', od=5.5,  delka=4.5, popisek=4, nazev='vesnice'),
    dict(zdroj='zapad',   od=5.5,  delka=4.5, popisek=5, nazev='zapad'),
    dict(zdroj='noc',     od=5.0,  delka=5.0, popisek=6, nazev='noc'),
    # nabídka postav
    dict(zdroj='menu',    od=4.2,  delka=3.2, popisek=None, nazev='menu'),
    # závěrečná karta s CTA
    dict(zdroj='karta:konec', od=0, delka=5.0, popisek=None, nazev='konec'),
]

# jemné prolnutí popisku dovnitř a ven
POP_IN, POP_OUT = 0.45, 0.5


def zdroj_vstup(s):
    """Vstupní argumenty ffmpeg pro jeden díl scénáře."""
    if s['zdroj'].startswith('karta:'):
        karta = os.path.join(KARTY, s['zdroj'].split(':', 1)[1] + '.png')
        return ['-loop', '1', '-t', str(s['delka']), '-i', karta], True
    klip = os.path.join(KLIPY, s['zdroj'] + '.webm')
    return ['-ss', str(s['od']), '-t', str(s['delka']), '-i', klip], False


def popisek_filtr(idx_vstupu, delka, cil):
    """Prolnutí popisku (PNG s průhledností) přes obraz."""
    o = delka - POP_OUT
    return (f'[{idx_vstupu}:v]format=rgba,'
            f'fade=t=in:st=0:d={POP_IN}:alpha=1,'
            f'fade=t=out:st={o:.2f}:d={POP_OUT}:alpha=1[pop];'
            f'{cil}[pop]overlay=0:0')


def dil_16x9(s, i):
    vstup, je_karta = zdroj_vstup(s)
    cesta = os.path.join(DILY, f'16x9-{i:02d}-{s["nazev"]}.mp4')
    args = list(vstup)
    fc = f'[0:v]fps={FPS},scale=1920:1080:flags=lanczos,setsar=1[v];'
    posl = '[v]'
    if s['popisek']:
        args += ['-loop', '1', '-t', str(s['delka']),
                 '-i', os.path.join(KARTY, f'popisek-{s["popisek"]}.png')]
        fc += popisek_filtr(1, s['delka'], posl) + '[v2];'
        posl = '[v2]'
    # karta se jemně rozsvítí a zhasne, ať sedí do střihu
    if je_karta:
        fc += f'{posl}fade=t=in:st=0:d=0.35,fade=t=out:st={s["delka"] - 0.4:.2f}:d=0.4[vf];'
        posl = '[vf]'
    fc = fc.rstrip(';')
    args += ['-filter_complex', fc, '-map', posl, '-an',
             '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
             '-pix_fmt', 'yuv420p', '-r', str(FPS), cesta]
    run(args)
    return cesta


def dil_9x16(s, i):
    """Svisle: záběr 16:9 v okně uprostřed, kolem značkový rámeček."""
    vstup, je_karta = zdroj_vstup(s)
    cesta = os.path.join(DILY, f'9x16-{i:02d}-{s["nazev"]}.mp4')

    if je_karta:  # karty mají vlastní svislou verzi
        karta = os.path.join(KARTY, s['zdroj'].split(':', 1)[1] + '-9x16.png')
        args = ['-loop', '1', '-t', str(s['delka']), '-i', karta]
        fc = (f'[0:v]fps={FPS},scale=1080:1920,setsar=1,'
              f'fade=t=in:st=0:d=0.35,fade=t=out:st={s["delka"] - 0.4:.2f}:d=0.4[v]')
        args += ['-filter_complex', fc, '-map', '[v]', '-an',
                 '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
                 '-pix_fmt', 'yuv420p', '-r', str(FPS), cesta]
        run(args)
        return cesta

    # okno rámečku – hodnoty musí sedět s OKNO v natoc-karty.js.
    # Záběr do něj vejde přiblížený na 1,2× a oříznutý po stranách,
    # ať je zvířátko na svislém formátu pořádně vidět.
    okno_y, okno_h = 400, 729
    args = ['-f', 'lavfi', '-t', str(s['delka']), '-i', f'color=c=0x8ed4f7:s=1080x1920:r={FPS}']
    args += vstup
    args += ['-loop', '1', '-t', str(s['delka']), '-i', os.path.join(KARTY, 'ramecek-9x16.png')]
    fc = (f'[1:v]fps={FPS},scale=1296:{okno_h}:flags=lanczos,'
          f'crop=1080:{okno_h}:108:0,setsar=1[g];'
          f'[0:v][g]overlay=0:{okno_y}[b];'
          f'[b][2:v]overlay=0:0[r]')
    posl = '[r]'
    if s['popisek']:
        args += ['-loop', '1', '-t', str(s['delka']),
                 '-i', os.path.join(KARTY, f'popisek-9x16-{s["popisek"]}.png')]
        fc += ';' + popisek_filtr(3, s['delka'], posl) + '[v2]'
        posl = '[v2]'
    args += ['-filter_complex', fc, '-map', posl, '-an',
             '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
             '-pix_fmt', 'yuv420p', '-r', str(FPS), cesta]
    run(args)
    return cesta


def slep(dily, delka, cil):
    """Slepí díly a podloží je herní hudbou."""
    seznam = os.path.join(DILY, 'seznam-' + os.path.basename(cil) + '.txt')
    with open(seznam, 'w', encoding='utf-8') as f:
        for d in dily:
            f.write(f"file '{d}'\n")
    audio = (f'[1:a]atrim=0:{delka:.2f},asetpts=N/SR/TB,'
             f'afade=t=in:st=0:d=1.6,afade=t=out:st={delka - 2.2:.2f}:d=2.2,'
             f'volume=0.85[a]')
    run(['-f', 'concat', '-safe', '0', '-i', seznam, '-i', HUDBA,
         '-filter_complex', audio, '-map', '0:v', '-map', '[a]',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
         '-movflags', '+faststart', '-shortest', cil])


def main():
    for p in (DILY, OUT):
        os.makedirs(p, exist_ok=True)
    delka = sum(s['delka'] for s in SCENAR)
    print(f'· scénář: {len(SCENAR)} dílů, {delka:.1f} s')

    for jmeno, stavitel in (('16x9', dil_16x9), ('9x16', dil_9x16)):
        dily = []
        for i, s in enumerate(SCENAR):
            dily.append(stavitel(s, i))
            print(f'  {jmeno}  {i + 1:2d}/{len(SCENAR)}  {s["nazev"]}')
        cil = os.path.join(OUT, f'loukarun-promo-{jmeno}.mp4')
        slep(dily, delka, cil)
        mb = os.path.getsize(cil) / 1e6
        print(f'→ {os.path.relpath(cil, ROOT)}  ({mb:.1f} MB, {delka:.1f} s)')


if __name__ == '__main__':
    main()
