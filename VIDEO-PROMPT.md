# Hero videosu

Hero, **scroll ile frame frame ilerleyen** bir video (ugurcihancekic.com hero'su gibi).
Bölüm pinlenir, scroll ilerledikçe `video.currentTime` scroll ilerlemesine bağlanır;
hero biterken son kare kalıcı arka plana (`#ambientBg`) devredilir ve mağaza onun
üstünde akar. Mantık `app.js > initHeroScrub()`.

## Şu anki asset

- `assets/hero.mp4` — 900px, ~2 MB, **all-intra H.264** (`-g 1 -keyint_min 1`).
  All-intra şart: scroll seek'i anında olur, kare atlamaz.
- `assets/hero-poster.webp` — video yüklenene kadar ilk kare.
- `assets/hero-bg.webp` — son karenin koyulaştırılmış hali; `#ambientBg` bunu kullanır.

Kaynak: `bunu_canlandır_o_kadar_bunu_202609031640.mp4` (mandala lambaya yavaş zoom).

## Videoyu değiştirmek istersen

```bash
# all-intra, scroll-scrub için:
ffmpeg -i yeni.mp4 -an -vf "scale=900:-2" -c:v libx264 -crf 27 \
  -g 1 -keyint_min 1 -preset slow -pix_fmt yuv420p -movflags +faststart \
  assets/hero.mp4

# poster + arka plan:
ffmpeg -sseof -0.1 -i yeni.mp4 -vframes 1 -vf "scale=1600:-2" last.jpg
magick last.jpg -resize 1600x                         -quality 82 assets/hero-poster.jpg
magick last.jpg -resize 1600x -fill '#17100b' -colorize 20% -quality 82 assets/hero-bg.jpg
cwebp -q 80 assets/hero-poster.jpg -o assets/hero-poster.webp
cwebp -q 78 assets/hero-bg.jpg -o assets/hero-bg.webp
```

`.hero { height: 320vh }` scrub uzunluğunu belirler — daha uzun video için artır.
`prefers-reduced-motion` açık kullanıcılarda video hiç seek edilmez, poster + arka plan gösterilir.

## Sıfırdan üretmek istersen (generative video promptu)

```
Cinematic macro shot slowly pushing in on a circular hand-carved wooden mandala
LED wall lamp on a warm plaster wall in a dark cozy room at night. Warm 2700K
back-glow, intricate fretwork, soft amber bokeh, dust motes in the light, an
out-of-focus houseplant and rattan basket in the foreground. The move is one
continuous slow dolly-in from a wide shot (mandala small in frame) to a tight
shot (mandala fills the frame, glowing). No people, no text, no logos.
Style: moody A24 interior, warm tungsten, 35mm, fine grain. 6 seconds, 16:9,
constant slow forward motion (no cuts).
```
Negatif: `cool light, daylight, text, watermark, people, fast motion, cuts, strobing`
