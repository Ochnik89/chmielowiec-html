/* Wspólny skrypt strony – wyświetla ogłoszenia z pliku dane/ogloszenia.js */
(function () {
  'use strict';

  // ---------- Słowniki (możesz tu zmieniać nazwy i dodawać udogodnienia) ----------
  const C = {
    TRANSACTIONS: { sprzedaz: 'Sprzedaż', wynajem: 'Wynajem' },
    PROPERTY_TYPES: { mieszkanie: 'Mieszkanie', dom: 'Dom', dzialka: 'Działka', lokal: 'Lokal użytkowy', garaz: 'Garaż' },
    PLURALS: { mieszkanie: 'Mieszkania', dom: 'Domy', dzialka: 'Działki', lokal: 'Lokale użytkowe', garaz: 'Garaże' },
    MARKETS: { pierwotny: 'Pierwotny', wtorny: 'Wtórny' },
    FEATURES: {
      balkon: 'Balkon / taras', ogrod: 'Ogród', parking: 'Miejsce parkingowe / garaż', piwnica: 'Piwnica / komórka',
      winda: 'Winda', umeblowane: 'Umeblowane', klimatyzacja: 'Klimatyzacja', zwierzeta: 'Zwierzęta akceptowane',
    },
    SORTS: {
      najnowsze: 'Najnowsze', 'cena-rosnaco': 'Cena: od najniższej', 'cena-malejaco': 'Cena: od najwyższej',
      'metraz-rosnaco': 'Powierzchnia: od najmniejszej', 'metraz-malejaco': 'Powierzchnia: od największej',
    },
    PER_PAGE: 12,
    PHOTO_DIR: 'zdjecia/',
  };

  // ---------- Pomocnicze ----------
  const nf0 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function plural(n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, dd = n % 100;
    return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? few : many;
  }
  function toNum(v) {
    if (v == null || v === '') return null;
    const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const lower = (s) => String(s || '').toLocaleLowerCase('pl');

  const fmt = {
    price: (l) => nf0.format(l.price) + ' zł' + (l.transaction_type === 'wynajem' ? ' / mies.' : ''),
    pricePerM2: (l) => (l.transaction_type === 'sprzedaz' && l.area ? nf0.format(Math.round(l.price / l.area)) + ' zł/m²' : ''),
    area: (a) => nf2.format(a) + ' m²',
    rooms: (n) => (n ? `${n} ${plural(n, 'pokój', 'pokoje', 'pokoi')}` : ''),
    floor(l) {
      if (l.floor == null || l.floor === '') return '';
      const f = l.floor === 0 ? 'parter' : l.floor < 0 ? 'suterena' : `${l.floor} piętro`;
      return l.floors_total ? `${f} (z ${l.floors_total})` : f;
    },
    location: (l) => [l.street, l.district, l.city].filter(Boolean).join(', '),
    date: (iso) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
    photo: (name) => C.PHOTO_DIR + encodeURIComponent(name),
    cover: (l) => (l.photos && l.photos.length ? fmt.photo(l.photos[0]) : 'img/placeholder.svg'),
    url: (l) => 'ogloszenie.html?id=' + encodeURIComponent(l.id),
  };

  const ICON_PIN = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5"/></svg>';
  const ICON_CAM = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>';

  function card(l) {
    const n = (l.photos || []).length;
    return `
      <a class="card" href="${fmt.url(l)}">
        <div class="card-img">
          <img src="${fmt.cover(l)}" alt="${esc(l.title)}" loading="lazy">
          <span class="badge badge-${esc(l.transaction_type)}">${esc(C.TRANSACTIONS[l.transaction_type])}</span>
          ${n > 1 ? `<span class="photo-count">${ICON_CAM} ${n}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-price">${fmt.price(l)}</div>
          ${fmt.pricePerM2(l) ? `<div class="card-ppm">${fmt.pricePerM2(l)}</div>` : ''}
          <h3 class="card-title">${esc(l.title)}</h3>
          <p class="card-loc">${ICON_PIN} ${esc(fmt.location(l))}</p>
          <ul class="card-params">
            <li>${esc(C.PROPERTY_TYPES[l.property_type])}</li>
            ${l.rooms ? `<li>${fmt.rooms(l.rooms)}</li>` : ''}
            <li>${fmt.area(l.area)}</li>
          </ul>
        </div>
      </a>`;
  }

  // ---------- Dane ----------
  const ALL = (window.OGLOSZENIA || []).filter((l) => l && l.active !== false && l.active !== 0);
  const byNewest = (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id;

  function search(f) {
    const loc = lower(f.lokalizacja).trim();
    const cenaOd = toNum(f.cenaOd), cenaDo = toNum(f.cenaDo);
    const mOd = toNum(f.metrazOd), mDo = toNum(f.metrazDo);
    const rooms = parseInt(f.pokoje, 10);

    const items = ALL.filter((l) => {
      if (C.TRANSACTIONS[f.transakcja] && l.transaction_type !== f.transakcja) return false;
      if (C.PROPERTY_TYPES[f.typ] && l.property_type !== f.typ) return false;
      if (C.MARKETS[f.rynek] && l.market !== f.rynek) return false;
      if (loc && ![l.city, l.district, l.street].some((x) => lower(x).includes(loc))) return false;
      if (cenaOd != null && l.price < cenaOd) return false;
      if (cenaDo != null && l.price > cenaDo) return false;
      if (mOd != null && l.area < mOd) return false;
      if (mDo != null && l.area > mDo) return false;
      if (rooms >= 1 && rooms <= 3 && l.rooms !== rooms) return false;
      if (rooms >= 4 && !(l.rooms >= 4)) return false;
      return true;
    });

    const sorters = {
      'cena-rosnaco': (a, b) => a.price - b.price,
      'cena-malejaco': (a, b) => b.price - a.price,
      'metraz-rosnaco': (a, b) => a.area - b.area,
      'metraz-malejaco': (a, b) => b.area - a.area,
    };
    return items.sort(sorters[f.sort] || byNewest);
  }

  // ---------- Wspólne elementy strony ----------
  function initCommon(params) {
    document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const page = document.body.dataset.page;
      const t = a.dataset.nav;
      if (page === 'wyniki' && (params.get('transakcja') || '') === t) a.classList.add('active');
    });
    document.querySelectorAll('[data-autosubmit]').forEach((el) => el.addEventListener('change', () => el.form && el.form.submit()));
  }

  // ---------- Strona główna ----------
  function pageHome() {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const [t, p] = el.dataset.count.split(':');
      const n = ALL.filter((l) => l.transaction_type === t && l.property_type === p).length;
      el.textContent = `${n} ${plural(n, 'oferta', 'oferty', 'ofert')}`;
    });
    const box = document.getElementById('latest');
    const latest = ALL.slice().sort(byNewest).slice(0, 8);
    box.innerHTML = latest.length
      ? `<div class="grid">${latest.map(card).join('')}</div>`
      : '<div class="empty"><p>Nie ma jeszcze żadnych ogłoszeń.</p></div>';
  }

  // ---------- Lista wyników ----------
  function pageResults(params) {
    const f = Object.fromEntries(params.entries());
    const form = document.getElementById('filters');

    // uzupełnij formularz wartościami z adresu
    for (const [k, v] of Object.entries(f)) {
      const el = form.elements[k] || document.querySelector(`[name="${k}"][form="filters"]`);
      if (el && 'value' in el) el.value = v;
    }

    const items = search(f);
    const heading = [C.PLURALS[f.typ] || 'Nieruchomości', { sprzedaz: 'na sprzedaż', wynajem: 'na wynajem' }[f.transakcja]]
      .filter(Boolean).join(' ');
    document.getElementById('heading').textContent = heading;
    document.title = heading + ' – Nieruchomości';
    document.getElementById('total').textContent = `${items.length} ${plural(items.length, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')}`;

    const pages = Math.max(1, Math.ceil(items.length / C.PER_PAGE));
    const page = Math.min(Math.max(1, parseInt(f.strona, 10) || 1), pages);
    const slice = items.slice((page - 1) * C.PER_PAGE, page * C.PER_PAGE);

    const out = document.getElementById('results');
    if (!slice.length) {
      out.innerHTML = '<div class="empty"><p>Brak ogłoszeń spełniających kryteria.</p><a href="ogloszenia.html" class="btn btn-outline">Pokaż wszystkie ogłoszenia</a></div>';
      return;
    }

    const link = (n) => {
      const p = new URLSearchParams(params);
      p.set('strona', n);
      return 'ogloszenia.html?' + p.toString();
    };
    let pag = '';
    if (pages > 1) {
      pag += '<nav class="pagination" aria-label="Strony wyników">';
      if (page > 1) pag += `<a href="${link(page - 1)}">‹ Poprzednia</a>`;
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 2) pag += `<a href="${link(i)}" class="${i === page ? 'current' : ''}">${i}</a>`;
        else if (Math.abs(i - page) === 3) pag += '<span>…</span>';
      }
      if (page < pages) pag += `<a href="${link(page + 1)}">Następna ›</a>`;
      pag += '</nav>';
    }
    out.innerHTML = `<div class="grid">${slice.map(card).join('')}</div>${pag}`;
  }

  // ---------- Strona ogłoszenia ----------
  function pageListing(params) {
    const id = Number(params.get('id'));
    const l = ALL.find((x) => Number(x.id) === id);
    const root = document.getElementById('listing');

    if (!l) {
      root.innerHTML = '<div class="empty"><h1>Nie znaleziono ogłoszenia</h1><p>Ogłoszenie mogło zostać usunięte lub adres jest niepoprawny.</p><a href="ogloszenia.html" class="btn btn-primary">Przeglądaj ogłoszenia</a></div>';
      return;
    }
    document.title = l.title + ' – Nieruchomości';

    const photos = l.photos || [];
    const T = C.TRANSACTIONS[l.transaction_type];
    const P = C.PROPERTY_TYPES[l.property_type];
    const feats = (l.features || []).filter((k) => C.FEATURES[k]).map((k) => C.FEATURES[k]);
    const base = `ogloszenia.html?transakcja=${encodeURIComponent(l.transaction_type)}`;
    const param = (label, val) => (val || val === 0 ? `<div><dt>${label}</dt><dd>${esc(val)}</dd></div>` : '');

    const gallery = photos.length
      ? `<img src="${fmt.photo(photos[0])}" alt="${esc(l.title)}" data-gallery-main>
         ${photos.length > 1 ? `
           <button class="gallery-nav prev" type="button" aria-label="Poprzednie zdjęcie" data-gallery-prev>‹</button>
           <button class="gallery-nav next" type="button" aria-label="Następne zdjęcie" data-gallery-next>›</button>
           <span class="gallery-counter" data-gallery-counter>1 / ${photos.length}</span>` : ''}`
      : '<img src="img/placeholder.svg" alt="Brak zdjęć">';

    const thumbs = photos.length > 1
      ? `<div class="gallery-thumbs">${photos.map((p, i) => `
          <button type="button" class="${i === 0 ? 'active' : ''}" data-gallery-thumb="${fmt.photo(p)}" aria-label="Zdjęcie ${i + 1}">
            <img src="${fmt.photo(p)}" alt="" loading="lazy">
          </button>`).join('')}</div>`
      : '';

    const similar = ALL
      .filter((x) => x.id !== l.id && x.transaction_type === l.transaction_type && (lower(x.city) === lower(l.city) || x.property_type === l.property_type))
      .sort((a, b) => (lower(b.city) === lower(l.city)) - (lower(a.city) === lower(l.city)) || (b.property_type === l.property_type) - (a.property_type === l.property_type) || byNewest(a, b))
      .slice(0, 4);

    const mail = l.contact_email
      ? `mailto:${esc(l.contact_email)}?subject=${encodeURIComponent('Zapytanie o ogłoszenie: ' + l.title)}`
      : '';

    root.innerHTML = `
      <nav class="breadcrumbs" aria-label="Ścieżka">
        <a href="index.html">Strona główna</a> ›
        <a href="${base}">${esc(T)}</a> ›
        <a href="${base}&typ=${encodeURIComponent(l.property_type)}">${esc(P)}</a> ›
        <a href="${base}&typ=${encodeURIComponent(l.property_type)}&lokalizacja=${encodeURIComponent(l.city)}">${esc(l.city)}</a>
      </nav>

      <div class="listing-layout">
        <div class="listing-main">
          <div class="gallery" data-gallery>
            <div class="gallery-main">${gallery}</div>
            ${thumbs}
          </div>

          <header class="listing-header">
            <span class="badge badge-${esc(l.transaction_type)} badge-static">${esc(T)}</span>
            <h1>${esc(l.title)}</h1>
            <p class="listing-loc">${ICON_PIN} ${esc(fmt.location(l))}</p>
            <div class="listing-price">
              <strong>${fmt.price(l)}</strong>
              ${fmt.pricePerM2(l) ? `<span>${fmt.pricePerM2(l)}</span>` : ''}
            </div>
          </header>

          <section class="box">
            <h2>Szczegóły</h2>
            <dl class="params">
              ${param('Rodzaj', P)}
              ${param('Powierzchnia', fmt.area(l.area))}
              ${param('Liczba pokoi', l.rooms)}
              ${param('Piętro', fmt.floor(l))}
              ${param('Rok budowy', l.year_built)}
              ${param('Rynek', C.MARKETS[l.market])}
              ${param('Transakcja', T)}
              ${l.created_at ? param('Dodano', fmt.date(l.created_at)) : ''}
            </dl>
          </section>

          ${feats.length ? `<section class="box"><h2>Udogodnienia</h2><ul class="features">${feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>` : ''}

          <section class="box">
            <h2>Opis</h2>
            <div class="description">${esc(l.description)}</div>
          </section>

          <section class="box">
            <h2>Lokalizacja</h2>
            <p class="muted">${esc(fmt.location(l))}</p>
            <div class="map">
              <iframe title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=${encodeURIComponent(fmt.location(l))}&z=14&output=embed"></iframe>
            </div>
          </section>
        </div>

        <aside class="listing-side">
          <div class="box contact-box">
            <div class="contact-price">${fmt.price(l)}</div>
            ${l.contact_name ? `
              <div class="contact-person">
                <span class="avatar">${esc(l.contact_name.trim().charAt(0).toUpperCase())}</span>
                <div><strong>${esc(l.contact_name)}</strong><span class="muted">Ogłoszeniodawca</span></div>
              </div>` : ''}
            ${l.contact_phone ? `<button type="button" class="btn btn-primary btn-block" data-phone="${esc(l.contact_phone)}">Pokaż numer telefonu</button>` : ''}
            ${mail ? `<a class="btn btn-outline btn-block" href="${mail}">Napisz e-mail</a>` : ''}
            <p class="muted small">Nr ogłoszenia: ${esc(l.id)}</p>
          </div>
        </aside>
      </div>

      ${similar.length ? `
        <section class="section">
          <h2 class="section-title">Podobne ogłoszenia</h2>
          <div class="grid">${similar.map(card).join('')}</div>
        </section>` : ''}`;

    initGallery();
    initPhone();
  }

  function initGallery() {
    const gallery = document.querySelector('[data-gallery]');
    if (!gallery) return;
    const main = gallery.querySelector('[data-gallery-main]');
    const thumbs = Array.from(gallery.querySelectorAll('[data-gallery-thumb]'));
    const counter = gallery.querySelector('[data-gallery-counter]');
    if (!main || thumbs.length < 2) return;
    let index = 0;

    const show = (i) => {
      index = (i + thumbs.length) % thumbs.length;
      main.src = thumbs[index].dataset.galleryThumb;
      thumbs.forEach((t, j) => t.classList.toggle('active', j === index));
      thumbs[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      if (counter) counter.textContent = `${index + 1} / ${thumbs.length}`;
    };
    thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    gallery.querySelector('[data-gallery-prev]').addEventListener('click', () => show(index - 1));
    gallery.querySelector('[data-gallery-next]').addEventListener('click', () => show(index + 1));
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    let startX = null;
    main.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
    main.addEventListener('touchend', (e) => {
      if (startX == null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  function initPhone() {
    document.querySelectorAll('[data-phone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const phone = btn.dataset.phone;
        const a = document.createElement('a');
        a.href = 'tel:' + phone.replace(/[^\d+]/g, '');
        a.className = btn.className;
        a.textContent = phone;
        btn.replaceWith(a);
      });
    });
  }

  // udostępnione dla panelu
  window.Nier = { C, fmt, esc, plural, toNum, card };

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    initCommon(params);
    const page = document.body.dataset.page;
    if (page === 'home') pageHome();
    if (page === 'wyniki') pageResults(params);
    if (page === 'ogloszenie') pageListing(params);
  });
})();
