# Saf Hobi Atölye — e-ticaret vitrini (portfolyo demosu)

Saf Hobi Atölye'nin [Trendyol mağazasının](https://www.trendyol.com/magaza/saf-hobi-atolye-design-hand-made-m-1161687)
pastel-pembe, animasyonlu bir vitrini. Ürünler Trendyol'dan otomatik çekilir;
tüm satış / ödeme / kargo Trendyol üzerinden yapılır (site "Trendyol'da Satın Al"
butonuyla ürün sayfasına yönlendirir).

## Yapı

| Dosya | İş |
|---|---|
| `index.html` / `style.css` / `app.js` | Statik vitrin (framework yok) |
| `products.json` | Çekilen katalog — sitenin okuduğu tek veri kaynağı + fallback |
| `assets/products/` | İndirilmiş ürün görselleri (`<id>-<n>.jpg`) |
| `assets/mandala-hero.svg` | Hero arka planı için placeholder (gerçek foto/video gelene kadar) |
| `scripts/scrape-trendyol.mjs` | Trendyol scraper (playwright-core + Chrome) |
| `.github/workflows/sync-products.yml` | Günlük cron → katalog güncelle → commit |

## Kataloğu elle güncelleme

```bash
cd saf-hobi-shop
npm install
node scripts/scrape-trendyol.mjs      # Chrome penceresi açılır, ~1-2 dk
```

Scraper 10'dan az ürün bulursa veya Cloudflare'e takılırsa **mevcut
`products.json`'a dokunmaz** — site son iyi kataloğu göstermeye devam eder.

Ortam değişkenleri:
- `PLAYWRIGHT_CHANNEL=chromium` — sistemde Google Chrome yoksa (CI)
- `PLAYWRIGHT_HEADLESS=1` — pencere açma (Cloudflare'i tetikleyebilir)

## Hero videosu

`index.html` hero'da `assets/hero-loop.mp4` / `.webm` arar; yoksa
`assets/mandala-hero.jpg` → `.svg` poster'ına düşer. Video promptu için
[`VIDEO-PROMPT.md`](VIDEO-PROMPT.md).

## Instagram

`app.js > buildInstagram()` içindeki liste elle güncelleniyor
(resmi IG API'si pratik değil). Gerçek gönderi görsellerini
`assets/ig/` altına koyup listeyi değiştir.

## Deploy

Kendi Vercel projesi. Kök `vercel.json` `cleanUrls` + asset cache header'ları
ayarlar. Ana portfolyodan `data-live` ile proje kartına bağlanır.

## Not — Trendyol ToS

Scraping düşük hacimli ve her ürün Trendyol'a geri link veriyor. Bu vitrin
ticari kullanıma geçerse **Trendyol Partner (affiliate)** programına geçilmeli:
yasal ürün feed'i + komisyonlu linkler.
