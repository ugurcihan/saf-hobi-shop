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
| `assets/products/` | İndirilmiş ürün görselleri (`<id>-<n>.webp`) |
| `assets/hero.mp4` | Scroll-scrub hero videosu (all-intra); `hero-poster/hero-bg.webp` eşlik eder |
| `assets/logo.webp` | Saf Hobi Atölye logosu (nav + footer) |
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

ugurcihancekic.com gibi **scroll-scrub**: pinlenmiş hero'da scroll ilerledikçe
`assets/hero.mp4` frame frame ilerler, biterken son kare kalıcı arka plana
(`#ambientBg` = `assets/hero-bg.webp`) devredilir. Değiştirme/regenerate için
[`VIDEO-PROMPT.md`](VIDEO-PROMPT.md).

## Instagram

`app.js > buildInstagram()` içindeki liste elle güncelleniyor
(resmi IG API'si pratik değil). Gerçek gönderi görsellerini
`assets/ig/` altına koyup listeyi değiştir.

## Otomatik katalog senkronu

Trendyol'un Cloudflare koruması GitHub Actions'ın veri merkezi IP'lerini
engelliyor. Bu yüzden günlük senkron **yerel makinede** çalışır:

- `scripts/sync-and-push.sh` — scrape + değişiklik varsa commit + push
- `~/Library/LaunchAgents/com.safhobi.catalog-sync.plist` — her gün 06:00
- push → Vercel Git entegrasyonu otomatik production deploy

Elle: `bash scripts/sync-and-push.sh`  ·  log: `scripts/sync.log`
launchd: `launchctl unload/load ~/Library/LaunchAgents/com.safhobi.catalog-sync.plist`

`.github/workflows/sync-products.yml` yalnızca manuel tetik (CF bulutu engelliyor).

## Deploy

GitHub repo'ya bağlı Vercel projesi — `main`'e her push production'a çıkar.
Kök `vercel.json` `cleanUrls` + asset cache header'ları ayarlar.

## Not — Trendyol ToS

Scraping düşük hacimli ve her ürün Trendyol'a geri link veriyor. Bu vitrin
ticari kullanıma geçerse **Trendyol Partner (affiliate)** programına geçilmeli:
yasal ürün feed'i + komisyonlu linkler.
