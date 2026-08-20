# 🎵 Louka Run – prompty pro AI generování hudby

> **Poznámka:** Hudba hry jsou přímo tyto MP3 soubory v `assets/music/` –
> bez nich hraje jen ticho a zvukové efekty. Skladby vytvořené podle promptů
> níže stačí nahrát pod uvedeným názvem a hra si je sama načte.

Prompty jsou připravené pro **Suno** (doporučeno, verze 3.5+), fungují ale i v jiných
nástrojích (Udio, Google MusicFX / Gemini…). Prompty jsou v angličtině, protože s ní
tyto nástroje pracují nejlépe. U každé skladby je uvedeno, **kam soubor uložit** –
hra si ho pak sama načte a přehrává podle prostředí, ve kterém zrovna běžíš.

**Každé prostředí má víc skladeb.** Kromě `menu.mp3` je u každého prostředí seznam
souborů (`louka.mp3`, `louka2.mp3`, `louka3.mp3` …) a hra je hraje za sebou
v zamíchaném pořadí. Přechod mezi nimi je stejné prolnutí jako u smyčky, takže
hudba nikde neutne ani nenechá pauzu – jen se po půlminutě nepozorovaně změní
melodie. Přidat další skladbu = uložit soubor a dopsat ho do seznamu
`MUSIC_TRACKS` v `js/audio.js`. Menu má schválně jedinou dlouhou skladbu.

**Formát:** MP3, ideálně 128–192 kbps (kvůli velikosti aplikace).
**Důležité:** Všechny skladby musí být **instrumentální** (bez zpěvu) a **smyčkovatelné** –
v Sunu přidej do stylu „seamless loop" a případně ustřihni konec tak, aby navazoval na začátek.

---

## 1. Hlavní menu — `assets/music/menu.mp3`

> **Styl (Style of Music):**
> Cheerful whimsical orchestral game menu theme, playful ukulele, glockenspiel,
> pizzicato strings, light whistling melody, warm and welcoming, family-friendly,
> medium tempo 100 bpm, instrumental, seamless loop

> **Zadání (Prompt):**
> A happy title-screen theme for a cute animal running game set on a sunny meadow.
> Feels like the start of a small adventure with farm animal friends. No vocals.

---

## 2. Rozkvetlá louka + Ovocný sad — `assets/music/louka.mp3`

> **Styl:**
> Upbeat happy folk-pop instrumental runner theme, acoustic guitar, banjo, claps,
> flute, bouncy rhythm, sunny countryside feeling, 128 bpm, energetic but friendly,
> instrumental, seamless loop

> **Zadání:**
> Energetic running music for a donkey happily galloping across a blooming meadow,
> collecting carrots. Light, funny, full of joy. No vocals.

---

## 3. Pohádkový les — `assets/music/les.mp3`

> **Styl:**
> Playful woodland adventure instrumental, marimba, pizzicato strings, clarinet,
> celesta sparkles, curious and mischievous mood, 120 bpm, fairytale forest,
> instrumental, seamless loop

> **Zadání:**
> Running through a magical forest with mushrooms, garden gnomes and fireflies.
> Slightly mysterious but always cheerful and cute. No vocals.

---

## 4. Veselá vesnice — `assets/music/vesnice.mp3`

> **Styl:**
> Cheerful polka-inspired game music, accordion, tuba, clarinet, hand claps,
> comedic village fair atmosphere, oom-pah rhythm, 126 bpm, funny and lively,
> instrumental, seamless loop

> **Zadání:**
> A funny farm village scene: chickens running around, laundry drying, a tractor
> parked by a cottage. Czech village fair vibes, comedic and warm. No vocals.

---

## 5. Zlatá hodinka (západ slunce) — `assets/music/zapad.mp3`

> **Styl:**
> Warm uplifting acoustic instrumental, slide guitar, soft piano, strings, gentle
> percussion, golden hour sunset feeling, hopeful and heartwarming, 110 bpm,
> instrumental, seamless loop

> **Zadání:**
> Running into a golden sunset over fields with haystacks and a windmill.
> Emotional but still light and positive – the happy ending of a long day. No vocals.

---

## 6. Hvězdná noc — `assets/music/noc.mp3`

> **Styl:**
> Dreamy calm night-time game music, music box, soft synth pads, gentle acoustic
> guitar, crickets ambience feel, starry sky, cozy campfire mood, 96 bpm,
> instrumental, seamless loop

> **Zadání:**
> A peaceful night run under the stars, past a campfire and a tent. Calm, magical,
> a little sleepy, but the adventure continues. No vocals.

---

## 7. (Volitelné) Fanfára do cíle — krátký jingle

Hra má vestavěnou syntetizovanou fanfáru, ale pokud chceš vlastní:

> **Styl:**
> Short victory jingle, 5 seconds, orchestral tutti hit, glockenspiel run,
> triumphant but cute, family game reward sound, instrumental

> **Zadání:**
> A tiny celebratory fanfare for a farm animal finishing its daily run. No vocals.

*(Tuhle stopu by bylo potřeba zapojit ručně – dej vědět, přidám ji do kódu.)*

---

## Tipy pro Suno

1. Zapni **Custom Mode**, styl vlož do pole *Style of Music*, zadání do *Prompt*
   a nech **Instrumental**.
2. Vygeneruj 2–3 varianty a vyber tu, která nejlépe smyčkuje.
3. Před exportem zkontroluj hlasitost – všechny skladby by měly znít podobně nahlas
   (hra je přehrává na 50 % hlasitosti).
4. Skladby jednoho prostředí by měly mít **stejnou náladu, tempo i hlasitost** –
   hrají za sebou v jednom běhu a přechod nesmí být slyšet jako střih.
5. Po uložení souboru do `assets/music/` ho dopiš do seznamu `MUSIC_TRACKS`
   v `js/audio.js` (u prostředí, kam patří) a zvyš číslo cache v `sw.js`.
   Nové skladby se schválně **nepředkešují** – stahují se teprve, až na ně
   v běhu přijde řada, ať se hra spouští rychle a nesbírá data zbytečně.
