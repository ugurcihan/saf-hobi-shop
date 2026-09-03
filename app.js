/* ============================================================
   Saf Hobi Atölye — vitrin etkileşimi
   products.json → grid + filtre + sıralama + hızlı bakış + konfeti
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TRY_FMT = new Intl.NumberFormat('tr-TR');

  const PAGE = 24;
  const state = { all: [], view: [], shown: PAGE, cat: 'Tümü', q: '', sort: 'feat', favs: load('sh_favs', []) };

  const grid = $('#grid');
  const chips = $('#catChips');
  const shopCount = $('#shopCount');

  /* ---------- boot ---------- */
  $('#year').textContent = new Date().getFullYear();
  initNav();
  initHeroSparkles();
  initHeroVideo();

  fetch('products.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      state.all = (data.products || []).filter((p) => p.name && p.price);
      buildChips(topCategories(state.all));
      wireControls();
      render();
      markStale(data.scrapedAt);
      buildInstagram(state.all);
    })
    .catch((err) => {
      console.error('katalog yüklenemedi', err);
      shopCount.textContent = 'Ürünler şu an yüklenemedi. Trendyol mağazasından göz atabilirsin.';
      grid.innerHTML =
        '<div class="empty"><span>🌸</span>Katalog geçici olarak kullanılamıyor.<br>' +
        '<a class="btn btn-sm" style="margin-top:1rem" href="https://www.trendyol.com/magaza/saf-hobi-atolye-design-hand-made-m-1161687" target="_blank" rel="noopener">Trendyol\'da Aç ↗</a></div>';
    });

  /* ---------- data helpers ---------- */
  function img(p, i = 0) {
    const local = p.localImages && p.localImages[i];
    const remote = p.images && p.images[i];
    return local || remote || p.images?.[0] || '';
  }
  function discountPct(p) {
    if (!p.originalPrice || p.originalPrice <= p.price) return 0;
    return Math.round((1 - p.price / p.originalPrice) * 100);
  }
  function stars(n) {
    if (!n) return '';
    const full = Math.round(n);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  /* ---------- filtering ---------- */
  function compute() {
    let v = state.all.slice();
    if (state.cat !== 'Tümü') v = v.filter((p) => p.category === state.cat);
    if (state.q) {
      const q = state.q.toLocaleLowerCase('tr');
      v = v.filter((p) => p.name.toLocaleLowerCase('tr').includes(q));
    }
    switch (state.sort) {
      case 'price-asc': v.sort((a, b) => a.price - b.price); break;
      case 'price-desc': v.sort((a, b) => b.price - a.price); break;
      case 'rating': v.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount); break;
      default:
        v.sort((a, b) =>
          discountPct(b) - discountPct(a) ||
          (b.rating || 0) * Math.log2((b.reviewCount || 0) + 2) - (a.rating || 0) * Math.log2((a.reviewCount || 0) + 2)
        );
    }
    state.view = v;
  }

  /* ---------- render ---------- */
  function render(keepShown) {
    compute();
    if (!keepShown) state.shown = PAGE;
    shopCount.textContent =
      `${TRY_FMT.format(state.view.length)} ürün` +
      (state.cat !== 'Tümü' ? ` · ${state.cat}` : '') +
      ` · toplam ${TRY_FMT.format(state.all.length)}`;

    if (!state.view.length) {
      grid.innerHTML = '<div class="empty"><span>🔍</span>Bu filtreyle ürün bulunamadı.</div>';
      $('#moreWrap')?.remove();
      return;
    }

    const slice = state.view.slice(0, state.shown);
    grid.innerHTML = slice.map(cardHTML).join('');
    wireCards();
    observeCards(keepShown ? state.shown - PAGE : 0);
    renderMore();
  }

  function renderMore() {
    let wrap = $('#moreWrap');
    const remaining = state.view.length - state.shown;
    if (remaining <= 0) { wrap?.remove(); return; }
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'moreWrap';
      grid.after(wrap);
    }
    wrap.innerHTML = `<button class="btn btn-ghost" id="moreBtn">Daha fazla göster (${TRY_FMT.format(remaining)})</button>`;
    $('#moreBtn').addEventListener('click', () => { state.shown += PAGE; render(true); });
  }

  function cardHTML(p) {
    const d = discountPct(p);
    const fav = state.favs.includes(p.id);
    const alt = img(p, 1);
    return `
      <article class="card" data-id="${p.id}">
        <div class="card-media" data-view="${p.id}">
          <img class="main" src="${img(p, 0)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
          ${alt ? `<img class="alt" src="${alt}" alt="" loading="lazy" decoding="async">` : ''}
          <div class="card-badges">
            ${d ? `<span class="tag discount">%${d} indirim</span>` : ''}
            ${(p.badges || []).slice(0, 1).map((b) => `<span class="tag">${esc(b)}</span>`).join('')}
          </div>
          <button class="card-fav" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Favorilere ekle"></button>
        </div>
        <div class="card-body">
          <span class="card-cat">${esc(p.category)}</span>
          <h3>${esc(p.name)}</h3>
          ${p.rating ? `<div class="card-rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${TRY_FMT.format(p.reviewCount)} yorum</div>` : '<div class="card-rating">Yeni ürün</div>'}
          <div class="card-price">
            <span class="now">${TRY_FMT.format(p.price)} ${esc(p.currency)}</span>
            ${p.originalPrice ? `<span class="was">${TRY_FMT.format(p.originalPrice)}</span>` : ''}
          </div>
          <a class="btn btn-sm btn-block" href="${p.url}" target="_blank" rel="noopener" data-buy data-id="${p.id}">Trendyol'da Satın Al ↗</a>
        </div>
      </article>`;
  }

  function wireCards() {
    $$('[data-view]', grid).forEach((el) =>
      el.addEventListener('click', () => openModal(byId(el.dataset.view)))
    );
    $$('[data-fav]', grid).forEach((el) =>
      el.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(el.dataset.fav, el); })
    );
    $$('[data-buy]', grid).forEach((el) =>
      el.addEventListener('click', (e) => burst(e.clientX, e.clientY))
    );
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -40px 0px' })
    : null;
  function observeCards(from = 0) {
    const cards = $$('.card', grid);
    if (!io || reduceMotion) { cards.forEach((c) => c.classList.add('in')); return; }
    cards.forEach((c, i) => {
      if (i < from) { c.classList.add('in'); return; }
      c.style.transitionDelay = Math.min(i - from, 8) * 45 + 'ms';
      io.observe(c);
    });
    // güvenlik ağı: 1.5sn sonra hâlâ gizli kalan kartları göster
    setTimeout(() => cards.forEach((c) => c.classList.add('in')), 1500);
  }

  /* ---------- chips + controls ---------- */
  function topCategories(products) {
    const count = {};
    products.forEach((p) => { count[p.category] = (count[p.category] || 0) + 1; });
    const ranked = Object.keys(count)
      .filter((c) => count[c] >= 3)
      .sort((a, b) => count[b] - count[a] || a.localeCompare(b, 'tr'))
      .slice(0, 14);
    return ['Tümü', ...ranked];
  }

  function buildChips(cats) {
    chips.innerHTML = cats
      .map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.cat}">${esc(c)}</button>`)
      .join('');
    $$('.chip', chips).forEach((btn) =>
      btn.addEventListener('click', () => {
        state.cat = btn.dataset.cat;
        $$('.chip', chips).forEach((b) => b.setAttribute('aria-pressed', b === btn));
        render();
        $('#shop').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      })
    );
  }
  function wireControls() {
    let t;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 180);
    });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  }

  /* ---------- favourites ---------- */
  function toggleFav(id, el) {
    id = Number(id);
    const i = state.favs.indexOf(id);
    if (i === -1) { state.favs.push(id); el.setAttribute('aria-pressed', 'true'); pop(el); }
    else { state.favs.splice(i, 1); el.setAttribute('aria-pressed', 'false'); }
    save('sh_favs', state.favs);
  }

  /* ---------- quick view ---------- */
  const modal = $('#modal');
  let lastFocus = null;
  function openModal(p) {
    if (!p) return;
    lastFocus = document.activeElement;
    $('#modalCat').textContent = p.category;
    $('#modalTitle').textContent = p.name;
    $('#modalRating').innerHTML = p.rating
      ? `<span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${TRY_FMT.format(p.reviewCount)} yorum`
      : 'Yeni ürün';
    const d = discountPct(p);
    $('#modalPrice').innerHTML =
      `<span class="now">${TRY_FMT.format(p.price)} ${esc(p.currency)}</span>` +
      (p.originalPrice ? `<span class="was">${TRY_FMT.format(p.originalPrice)}</span>` : '') +
      (d ? ` <span class="tag discount">%${d}</span>` : '');
    const buy = $('#modalBuy');
    buy.href = p.url;
    buy.onclick = (e) => burst(e.clientX, e.clientY);

    const imgs = (p.localImages && p.localImages.length ? p.localImages : p.images) || [];
    const main = $('#modalImg');
    main.src = imgs[0] || '';
    main.alt = p.name;
    $('#modalThumbs').innerHTML = imgs
      .map((src, i) => `<button data-i="${i}" aria-current="${i === 0}"><img src="${src}" alt=""></button>`)
      .join('');
    $$('#modalThumbs button').forEach((b) =>
      b.addEventListener('click', () => {
        main.src = imgs[b.dataset.i];
        $$('#modalThumbs button').forEach((x) => x.setAttribute('aria-current', x === b));
      })
    );

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    if (e.key === 'Tab' && !modal.hidden) trapFocus(e);
  });
  function trapFocus(e) {
    const f = $$('button, a[href]', modal).filter((el) => !el.hidden);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- confetti burst ---------- */
  function burst(x, y) {
    if (reduceMotion) return;
    const cols = ['#ff6fae', '#ec4d97', '#ffd4e6', '#f4b740', '#ffb3d1'];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'confetti-piece';
      s.style.left = (x || innerWidth / 2) + 'px';
      s.style.top = (y || innerHeight / 2) + 'px';
      s.style.background = cols[i % cols.length];
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / n + Math.random();
      const dist = 60 + Math.random() * 120;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 40;
      s.animate(
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 260}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(0.2,0.7,0.3,1)' }
      ).onfinish = () => s.remove();
    }
  }
  function pop(el) {
    if (reduceMotion) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
  }

  /* ---------- nav scroll state ---------- */
  function initNav() {
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- hero sparkles ---------- */
  function initHeroSparkles() {
    if (reduceMotion) return;
    const hero = $('#hero');
    const glyphs = ['✦', '✧', '·', '✳'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = 8 + Math.random() * 14 + 'px';
      s.style.animationDuration = 7 + Math.random() * 8 + 's';
      s.style.animationDelay = -Math.random() * 12 + 's';
      hero.appendChild(s);
    }
  }

  /* ---------- hero video ----------
     assets/hero-loop.(webm|mp4) VARSA yükle, yoksa mandala poster'ında kal.
     Böylece dosya yoksa 404 gürültüsü olmaz. (bkz. VIDEO-PROMPT.md) */
  function initHeroVideo() {
    const v = $('#heroVideo');
    if (!v || reduceMotion || !v.dataset.src) return;
    const base = v.dataset.src.replace(/\.(webm|mp4)$/, '');
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
      const s = document.createElement('source');
      s.src = `${base}.${ext}`; s.type = type;
      v.appendChild(s);
    });
    v.addEventListener('canplay', () => { v.hidden = false; v.play().catch(() => {}); }, { once: true });
    v.addEventListener('error', () => { v.hidden = true; }, true);
    v.load();
  }

  /* ---------- instagram strip ----------
     Resmi IG API'si pratik değil; en çok yorum alan ürünlerin
     görsellerini "atölyeden kareler" olarak gösteriyoruz. Gerçek
     gönderi görselleri için assets/ig/ ekleyip burayı değiştir. */
  function buildInstagram(products) {
    const picks = products
      .filter((p) => (p.localImages || []).length)
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 12)
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
    $('#igGrid').innerHTML = picks
      .map(
        (p) =>
          `<a class="ig-cell" href="https://www.instagram.com/safhobi" target="_blank" rel="noopener" aria-label="Saf Hobi Atölye Instagram"><img src="${img(p, 0)}" alt="" loading="lazy" onerror="this.closest('.ig-cell').remove()"></a>`
      )
      .join('');
  }

  /* ---------- stale note ---------- */
  function markStale(iso) {
    if (!iso) return;
    const days = (Date.now() - new Date(iso)) / 864e5;
    const note = $('#staleNote');
    const d = new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    note.hidden = false;
    note.textContent = days > 5
      ? `Fiyatlar ${d} tarihinde güncellendi — güncel fiyat için Trendyol sayfasına bakın.`
      : `Ürünler ve fiyatlar ${d} tarihinde Trendyol'dan güncellendi.`;
  }

  /* ---------- utils ---------- */
  function byId(id) { id = Number(id); return state.all.find((p) => p.id === id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function load(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
})();
