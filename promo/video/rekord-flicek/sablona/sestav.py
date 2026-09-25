"""REEL „Rekord 16 957 m" – zvuk a export do MP4.

Vezme snímky z render.js, podloží je herní skladbou louky, přidá
Flíčkovo chrochtnutí v okamžiku, kdy se svalí do seníku, ztiší hudbu
při zamrznutí metr před rekordem a vyexportuje H.264 pro Reels.

    pip install imageio-ffmpeg
    python3 promo/video/rekord-flicek/sablona/sestav.py <pracovní-složka>
"""
import os, subprocess, sys
import imageio_ffmpeg

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
WORK = sys.argv[1]
OUT = os.path.join(ROOT, 'promo', 'video', 'rekord-flicek', 'loukarun-reel-rekord-16957-9x16.mp4')
FF = imageio_ffmpeg.get_ffmpeg_exe()

FPS = 30
SNIMKU = len([f for f in os.listdir(os.path.join(WORK, 'snimky')) if f.endswith('.jpg')])
DELKA = SNIMKU / FPS
HUDBA = os.path.join(ROOT, 'assets', 'music', 'louka.mp3')
CHRO = os.path.join(ROOT, 'assets', 'sfx', 'voice-flicek.mp3')

# časy v sekundách – musí sedět se SCENY a časováním ve strih.js
FLOP = (216 + 146) / FPS           # Flíček se svalí do seníku
ZAMRZ = (462 + 147) / FPS          # zamrznutí metr před rekordem
MNAM = (216 + 96) / FPS            # žere z misky

filtr = (
    f"[1:a]atrim=0:{DELKA:.3f},asetpts=PTS-STARTPTS,"
    f"volume='if(between(t,{ZAMRZ:.2f},{ZAMRZ + 1.6:.2f}),0.45,1)':eval=frame,"
    f"afade=t=in:st=0:d=0.15,afade=t=out:st={DELKA - 1.4:.2f}:d=1.4[hudba];"
    f"[2:a]asplit=2[c1][c2];"
    f"[c1]adelay={int(MNAM * 1000)}|{int(MNAM * 1000)},volume=1.1[mnam];"
    f"[c2]adelay={int(FLOP * 1000)}|{int(FLOP * 1000)},volume=1.6[flop];"
    f"[hudba][mnam][flop]amix=inputs=3:normalize=0:duration=first,"
    f"loudnorm=I=-14:TP=-1.5:LRA=11[a]"
)

cmd = [
    FF, '-y', '-loglevel', 'error',
    '-framerate', str(FPS), '-i', os.path.join(WORK, 'snimky', '%04d.jpg'),
    '-i', HUDBA, '-i', CHRO,
    '-filter_complex', filtr,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', str(FPS * 2),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-t', f'{DELKA:.3f}',
    OUT,
]
subprocess.run(cmd, check=True)
print(f'→ {os.path.relpath(OUT, ROOT)}  ({DELKA:.1f} s, {os.path.getsize(OUT) / 1e6:.1f} MB)')
