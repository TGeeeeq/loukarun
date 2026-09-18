#!/usr/bin/env python3
"""=========================================================
LOUKA RUN – sestavení krátkého reelu (9:16)

Z klipů natočených natoc-zabery.js a karet z natoc-karty-reel.js
složí ~22s svislé video pro Instagram Reels, Stories a TikTok:

    loukarun-reel-skutecna-zvirata-9x16.mp4

Proti promo videu (sestav-video.py) se liší třemi věcmi, a všechny
jsou kvůli tomu, že tohle míří na lidi, kteří hru neznají:

  1) Začíná rovnou hrou, ne znělkou ani logem. Na Reels rozhodují
     první dvě vteřiny; logo v nich je promarněné místo.
  2) Herní záběr vyplňuje celou plochu – pozadí je tentýž záběr
     zvětšený a rozostřený, ne prázdný rámeček. Letterbox působí
     na svislém formátu jako přeposlaná reklama.
  3) Je zhruba o polovinu kratší. Dokoukání je to, podle čeho
     Instagram video dál ukazuje.

Spuštění (z kořene repa):
    python3 promo/video/sablona/sestav-reel.py [pracovní-složka]

Potřebuje ffmpeg s libx264 (`pip install imageio-ffmpeg`, nebo
nastav FFMPEG na cestu k binárce).
========================================================="""
import os
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
WORK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '.promo-work')
KLIPY = os.path.join(WORK, 'klipy')
KARTY = os.path.join(WORK, 'karty')
DILY = os.path.join(WORK, 'dily-reel')
OUT = os.path.join(ROOT, 'promo', 'video')
HUDBA = os.path.join(ROOT, 'assets', 'music', 'menu.mp3')
FPS = 30
W, H = 1080, 1920

# okno s herním záběrem – musí sedět s OKNO v natoc-karty-reel.js
OKNO_Y, OKNO_H = 430, 880

# =========================================================
#  SCÉNÁŘ  (zdroj, odkud, jak dlouho, který popisek)
#  První dva díly jsou jeden plynulý záběr rozdělený jen
#  textem – hook nesmí přerušit střih dřív, než se dočte.
# =========================================================
SCENAR = [
    dict(zdroj='louka',    od=5.0,  delka=3.0, popisek=1, nazev='hook'),
    dict(zdroj='louka',    od=8.0,  delka=2.8, popisek=2, nazev='kdo-to-je'),
    dict(zdroj='sad',      od=5.5,  delka=2.8, popisek=3, nazev='proc'),
    dict(zdroj='les',      od=5.5,  delka=2.8, popisek=5, nazev='svety'),
    # věta o šesti zvířatech patří k jedinému záběru, kde jsou vidět všechna
    # zoom=1.0: karty zvířátek jdou až ke krajům, přiblížení by je uřízlo
    dict(zdroj='zviratka', od=5.2,  delka=3.4, popisek=4, nazev='zvirata', zoom=1.0),
    dict(zdroj='noc',      od=6.8,  delka=2.8, popisek=6, nazev='nova-verze'),
    dict(zdroj='karta:reel-konec', od=0, delka=4.0, popisek=None, nazev='konec'),
]

POP_IN, POP_OUT = 0.35, 0.4


def ffmpeg_bin():
    for kand in (os.environ.get('FFMPEG'), shutil.which('ffmpeg')):
        if kand and os.path.exists(kand):
            return kand
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    sys.exit('Nenašel jsem ffmpeg. Nainstaluj `pip install imageio-ffmpeg` nebo nastav FFMPEG.')


FF = ffmpeg_bin()


def run(args):
    p = subprocess.run([FF, '-y', '-hide_banner', '-loglevel', 'error'] + args)
    if p.returncode:
        sys.exit('ffmpeg selhal: ' + ' '.join(args[:8]) + ' …')


def popisek_filtr(idx, delka, cil):
    o = delka - POP_OUT
    return (f'[{idx}:v]format=rgba,'
            f'fade=t=in:st=0:d={POP_IN}:alpha=1,'
            f'fade=t=out:st={o:.2f}:d={POP_OUT}:alpha=1[pop];'
            f'{cil}[pop]overlay=0:0')


def dil(s, i):
    cesta = os.path.join(DILY, f'{i:02d}-{s["nazev"]}.mp4')

    if s['zdroj'].startswith('karta:'):
        karta = os.path.join(KARTY, s['zdroj'].split(':', 1)[1] + '.png')
        args = ['-loop', '1', '-t', str(s['delka']), '-i', karta]
        fc = (f'[0:v]fps={FPS},scale={W}:{H},setsar=1,'
              f'fade=t=in:st=0:d=0.35,fade=t=out:st={s["delka"] - 0.4:.2f}:d=0.4[v]')
        args += ['-filter_complex', fc, '-map', '[v]', '-an',
                 '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
                 '-pix_fmt', 'yuv420p', '-r', str(FPS), cesta]
        run(args)
        return cesta

    # přiblížení záběru; 1,45× udělá zvířátko na svislém formátu pořádně
    # vidět, ale u obrazovek s obsahem až u krajů se musí vypnout
    zoom = s.get('zoom', 1.45)
    klip = os.path.join(KLIPY, s['zdroj'] + '.webm')
    args = ['-ss', str(s['od']), '-t', str(s['delka']), '-i', klip,
            '-loop', '1', '-t', str(s['delka']), '-i', os.path.join(KARTY, 'reel-ramecek.png')]

    # pozadí: tentýž záběr roztažený přes celou výšku, rozostřený a ztmavený.
    # Nese barvu prostředí (louka zelená, noc modrá), takže reel nevypadá
    # v každém záběru stejně – a nic se přitom neořízne z herní akce.
    fc = (
        f'[0:v]fps={FPS},split=2[poz][hra];'
        f'[poz]scale={W}:{H}:force_original_aspect_ratio=increase,'
        f'crop={W}:{H},boxblur=28:2,eq=brightness=-0.10:saturation=1.05,setsar=1[bg];'
        f'[hra]scale={int(W * zoom)}:{OKNO_H}:flags=lanczos,'
        f'crop={W}:{OKNO_H}:{int(W * (zoom - 1) / 2)}:0,setsar=1[fg];'
        f'[bg][fg]overlay=0:{OKNO_Y}[b];'
        f'[b][1:v]overlay=0:0[r]'
    )
    posl = '[r]'
    if s['popisek']:
        args += ['-loop', '1', '-t', str(s['delka']),
                 '-i', os.path.join(KARTY, f'reel-popisek-{s["popisek"]}.png')]
        fc += ';' + popisek_filtr(2, s['delka'], posl) + '[v2]'
        posl = '[v2]'
    args += ['-filter_complex', fc, '-map', posl, '-an',
             '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
             '-pix_fmt', 'yuv420p', '-r', str(FPS), cesta]
    run(args)
    return cesta


def slep(dily, delka, cil):
    seznam = os.path.join(DILY, 'seznam.txt')
    with open(seznam, 'w', encoding='utf-8') as f:
        for d in dily:
            f.write(f"file '{d}'\n")
    # hudba se bere od 8. vteřiny – začátek znělky je tichý nádech,
    # a reel potřebuje zvuk hned, ne až u druhého záběru
    audio = (f'[1:a]atrim=8:{8 + delka:.2f},asetpts=N/SR/TB,'
             f'afade=t=in:st=0:d=0.8,afade=t=out:st={delka - 1.6:.2f}:d=1.6,'
             f'volume=0.9[a]')
    run(['-f', 'concat', '-safe', '0', '-i', seznam, '-i', HUDBA,
         '-filter_complex', audio, '-map', '0:v', '-map', '[a]',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
         '-movflags', '+faststart', '-shortest', cil])


def main():
    for p in (DILY, OUT):
        os.makedirs(p, exist_ok=True)
    delka = sum(s['delka'] for s in SCENAR)
    print(f'· scénář: {len(SCENAR)} dílů, {delka:.1f} s')
    dily = []
    for i, s in enumerate(SCENAR):
        dily.append(dil(s, i))
        print(f'  {i + 1:2d}/{len(SCENAR)}  {s["nazev"]}')
    cil = os.path.join(OUT, 'loukarun-reel-skutecna-zvirata-9x16.mp4')
    slep(dily, delka, cil)
    mb = os.path.getsize(cil) / 1e6
    print(f'→ {os.path.relpath(cil, ROOT)}  ({mb:.1f} MB, {delka:.1f} s)')


if __name__ == '__main__':
    main()
