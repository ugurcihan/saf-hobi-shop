#!/bin/bash
# Saf Hobi Atölye — yerel katalog senkronu (launchd her gün 06:00'da çağırır)
# Trendyol Cloudflare'i veri merkezi IP'lerini engellediği için bu iş
# GitHub Actions'ta değil, ev IP'li bu makinede çalışır.
set -u
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
REPO="/Users/Reksai/Desktop/portfolio/saf-hobi-shop"
LOG="$REPO/scripts/sync.log"
cd "$REPO" || exit 1

echo "===== $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"

git fetch --quiet origin main >> "$LOG" 2>&1
git merge --quiet --ff-only origin/main >> "$LOG" 2>&1 || echo "· ff-only merge atlandı (yerel değişiklik var)" >> "$LOG"

if node scripts/scrape-trendyol.mjs >> "$LOG" 2>&1; then
  if [ -n "$(git status --porcelain products.json assets/products)" ]; then
    git add products.json assets/products
    git commit --quiet -m "chore: Trendyol kataloğu güncellendi ($(date -u +%Y-%m-%d))" >> "$LOG" 2>&1
    git push --quiet origin main >> "$LOG" 2>&1
    echo "✓ katalog güncellendi ve push edildi" >> "$LOG"
  else
    echo "· katalog güncel, değişiklik yok" >> "$LOG"
  fi
else
  echo "✗ scrape başarısız — mevcut katalog korunuyor" >> "$LOG"
fi

# log dosyasını makul tut (son 500 satır)
tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
