/**
 * Saf Hobi Atölye — Trendyol katalog scraper
 *
 * Trendyol mağaza sayfası Cloudflare arkasında ve Angular SSR. Bu script:
 *  1. Gerçek Chrome ile /sr?mid=<SELLER_ID> açar (CF cookie'si alır)
 *  2. window["__single-search-result__PROPS"] içinden 1. sayfayı ve
 *     api/search/products/ endpoint şablonunu okur
 *  3. Sayfa context'inden fetch ile pi=1..N gezip tüm ürünleri toplar
 *  4. İlk 3 görseli assets/products/ altına indirir (referer sorunu olmasın)
 *  5. products.json yazar
 *
 * Scrape 0 ürün döndürürse veya patlarsa: mevcut products.json'a DOKUNMAZ
 * (fallback). Böylece site her zaman son iyi kataloğu gösterir.
 *
 * Kullanım:  node scripts/scrape-trendyol.mjs      (yerelde: Google Chrome kanalı)
 *            PLAYWRIGHT_CHANNEL=chromium node ... (CI: playwright chromium)
 *            PLAYWRIGHT_HEADLESS=1 ...            (pencere açma; CF'yi tetikleyebilir)
 */
import { chromium } from 'playwright-core';
import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'products.json');
const IMG_DIR = path.join(ROOT, 'assets', 'products');

const SELLER_ID = 1161687;
const STORE = {
  name: 'Saf Hobi Atölye',
  trendyol: `https://www.trendyol.com/magaza/saf-hobi-atolye-design-hand-made-m-${SELLER_ID}`,
  instagram: 'https://www.instagram.com/safhobi',
};
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const MAX_IMAGES = 3;
const HD = (u) => (u || '').replace('/mnresize/400/-/', '/mnresize/800/-/');

// jpg buffer -> 720px webp (cwebp veya magick); ikisi de yoksa jpg bırak
async function toWebp(absJpg, absWebp) {
  for (const [bin, args] of [
    ['cwebp', ['-quiet', '-q', '72', '-resize', '720', '0', absJpg, '-o', absWebp]],
    ['magick', [absJpg, '-resize', '720x720^', '-quality', '72', absWebp]],
  ]) {
    try { await run(bin, args); await unlink(absJpg).catch(() => {}); return true; }
    catch { /* sonrakini dene */ }
  }
  return false;
}

function cleanProduct(p) {
  const price = p.price || {};
  const current = price.discountedPrice || price.current || price.originalPrice || 0;
  const original = price.originalPrice || price.current || 0;
  return {
    id: p.id ?? p.contentId,
    name: (p.name || '').trim(),
    brand: (p.brand || '').trim(),
    category: p.category?.name || 'Diğer',
    url: 'https://www.trendyol.com' + (p.url || '').split('?')[0],
    price: Math.round(current),
    originalPrice: original > current ? Math.round(original) : null,
    priceText: price.discountedPriceText || price.currentText || String(current),
    currency: price.currencySymbol || 'TL',
    rating: p.ratingScore?.averageRating
      ? Number(p.ratingScore.averageRating.toFixed(1))
      : null,
    reviewCount: p.ratingScore?.totalCount || 0,
    freeCargo: !!p.freeCargo,
    badges: (p.simplifiedBadges || []).map((b) => b.title).filter(Boolean),
    images: (p.images || []).slice(0, MAX_IMAGES).map(HD),
    localImages: [],
  };
}

async function downloadImages(page, products) {
  await mkdir(IMG_DIR, { recursive: true });
  for (const prod of products) {
    for (let i = 0; i < prod.images.length; i++) {
      const relWebp = `assets/products/${prod.id}-${i}.webp`;
      const relJpg = `assets/products/${prod.id}-${i}.jpg`;
      const absWebp = path.join(ROOT, relWebp);
      const absJpg = path.join(ROOT, relJpg);
      if (existsSync(absWebp)) { prod.localImages.push(relWebp); continue; }
      try {
        const buf = await page.evaluate(async (url) => {
          const r = await fetch(url);
          return Array.from(new Uint8Array(await r.arrayBuffer()));
        }, prod.images[i]);
        await writeFile(absJpg, Buffer.from(buf));
        const ok = await toWebp(absJpg, absWebp);
        prod.localImages.push(ok ? relWebp : relJpg);
      } catch (e) {
        console.warn(`  ! görsel indirilemedi ${prod.id}-${i}: ${e.message}`);
      }
    }
  }
}

async function main() {
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'chrome'; // CI'da 'chromium'
  const headless = process.env.PLAYWRIGHT_HEADLESS === '1';
  const ctx = await chromium.launchPersistentContext(
    path.join(process.env.HOME || '/tmp', '.cache/ty-scraper-profile'),
    {
      channel: channel === 'chromium' ? undefined : channel,
      headless,
      viewport: { width: 1440, height: 900 },
      locale: 'tr-TR',
      timezoneId: 'Europe/Istanbul',
      userAgent: UA,
      args: ['--disable-blink-features=AutomationControlled'],
    }
  );
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  );

  console.log('→ Trendyol mağaza arama sayfası açılıyor…');
  const resp = await page.goto(`https://www.trendyol.com/sr?mid=${SELLER_ID}&pi=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  if (!resp || resp.status() >= 400) throw new Error(`sr sayfası ${resp && resp.status()}`);
  await page.waitForTimeout(3500);

  const readProps = () =>
    page.evaluate(() => window['__single-search-result__PROPS'] || null);

  let props = await readProps();
  if (!props?.data?.products?.length) throw new Error('__single-search-result__PROPS boş — CF/DOM değişmiş olabilir');

  const total = props.data.total || props.data.roughTotal || 0;
  const pageSize = props.data.products.length || 36;
  const pages = Math.min(30, Math.max(1, Math.ceil(total / pageSize)));
  console.log(`  toplam ${total} ürün · ~${pages} sayfa · pageSize ${pageSize}`);

  const byId = new Map();
  for (const p of props.data.products) byId.set(p.id ?? p.contentId, p);

  // Trendyol mağaza listesi ?pi=N ile SSR sayfalanıyor
  for (let pi = 2; pi <= pages; pi++) {
    try {
      const r = await page.goto(`https://www.trendyol.com/sr?mid=${SELLER_ID}&pi=${pi}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      if (!r || r.status() >= 400) {
        console.warn(`  sayfa ${pi}: HTTP ${r && r.status()} — durduruluyor`);
        break;
      }
      await page.waitForTimeout(1600 + Math.random() * 900);
      props = await readProps();
      const list = props?.data?.products || [];
      if (!list.length) {
        console.warn(`  sayfa ${pi}: boş — durduruluyor`);
        break;
      }
      for (const p of list) byId.set(p.id ?? p.contentId, p);
      console.log(`  sayfa ${pi}: +${list.length} (toplam ${byId.size})`);
    } catch (e) {
      console.warn(`  sayfa ${pi} hata: ${e.message}`);
    }
  }

  let products = [...byId.values()].map(cleanProduct).filter((p) => p.id && p.name && p.price > 0);
  // kategoriye + isme göre stabil sıralama
  products.sort((a, b) => a.category.localeCompare(b.category, 'tr') || a.name.localeCompare(b.name, 'tr'));

  console.log(`→ ${products.length} ürün temizlendi, görseller indiriliyor…`);
  await downloadImages(page, products);

  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'tr'));
  const payload = {
    scrapedAt: new Date().toISOString(),
    store: STORE,
    total: products.length,
    categories,
    products,
  };

  await ctx.close();

  if (products.length < 10) throw new Error(`sadece ${products.length} ürün — fallback korunuyor`);
  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✓ products.json yazıldı — ${products.length} ürün, ${categories.length} kategori`);
}

main().catch(async (e) => {
  console.error('✗ Scrape başarısız:', e.message);
  if (existsSync(OUT_JSON)) {
    const prev = JSON.parse(await readFile(OUT_JSON, 'utf8'));
    console.error(`  Mevcut products.json korunuyor (${prev.total} ürün, ${prev.scrapedAt}).`);
    process.exit(0); // fallback: CI'yı kırma
  }
  process.exit(1);
});
