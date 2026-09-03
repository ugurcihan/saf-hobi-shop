# Hero intro videosu — üretim promptu

Hedef: karanlık bir odada duran mandala LED lamba, görünmez bir elin taşıdığı
sıcak ışık topu (mouse/torch) duvarda gezindikçe mandalanın deseni ve arka
ışığı **titreyerek yanıp sönüyor**, sonunda tüm mandala sabit parlamaya geçiyor
(statik arka plana yumuşak geçiş). Kusursuz loop, 6 sn.

Çıktı: `assets/hero-loop.mp4` (H.264) + `assets/hero-loop.webm` (VP9/AV1),
~1-2 MB, sayfaya kendiliğinden bağlanır. Poster olarak `assets/mandala-hero.svg`
(veya kendi fotoğrafını `assets/mandala-hero.jpg` koyup `index.html`'de
`#heroPoster` src'sini değiştir).

---

## Ana prompt (EN — Sora / Kling / Veo 3 / Runway Gen-3)

```
Cinematic macro shot of a circular hand-carved wooden mandala LED wall lamp
mounted on a warm plaster wall in a dark, cozy room at night. A single soft
handheld warm light source (2700K, like a small torch orb) drifts slowly
across the wall from left to right, guided by an unseen hand. Wherever the
light passes, the mandala's intricate fretwork and its back-glow flicker to
life — LED filaments buzzing on and off with a gentle electrical stutter —
then fade softly back into darkness a beat later. Warm amber bokeh, floating
dust motes drifting through the light beam, out-of-focus houseplant leaves and
a rattan basket in the foreground. Very slow camera push-in, shallow depth of
field, anamorphic warmth, fine film grain, high dynamic range between deep
shadow and glowing highlights. In the final second the entire mandala settles
into a steady, even warm glow and the flicker stops. Seamless loop. No text,
no visible people, no logos.

Style: moody interior cinematography, A24, warm tungsten palette, 35mm.
Duration: 6 seconds. Aspect ratio: 16:9. Camera: slow dolly-in. Loop: yes.
```

## Negatif prompt

```
harsh blue light, daylight, cool tones, cluttered background, text, watermark,
logo, human face, hands fully visible, fast motion, jump cuts, cartoon,
oversaturated pink, distorted mandala geometry, strobing seizure-level flashing
```

## 9:16 (mobil) varyantı

Ana promptla aynı; şu iki satırı değiştir:

```
Aspect ratio: 9:16. Framing: mandala centered in the upper third, foreground
plant in the lower third, extra vertical wall space above for a text overlay.
```

## Sıkıştırma

```bash
# mp4
ffmpeg -i input.mp4 -t 6 -an -vf "scale=1600:-2" -c:v libx264 -crf 24 -preset veslow -movflags +faststart assets/hero-loop.mp4
# webm
ffmpeg -i input.mp4 -t 6 -an -vf "scale=1600:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 assets/hero-loop.webm
```

## Not

Epilepsi güvenliği: "titreme" yumuşak ve düşük frekanslı olmalı (saniyede 3
parlamadan az). Prompt'taki `gentle electrical stutter` + negatiften
`strobing seizure-level flashing` bunu sağlıyor; yine de üretilen videoyu
kontrol et. Sitede `prefers-reduced-motion` açık kullanıcılara video hiç
yüklenmez, sadece statik poster gösterilir.
```
