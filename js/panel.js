/* Panel ogłoszeń – edycja w przeglądarce i eksport pliku dane/ogloszenia.js */
(function () {
  'use strict';
  const { C, fmt, esc, plural, toNum } = window.Nier;
  const KEY = 'nieruchomosci-panel-szkic';

  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const published = clone(window.OGLOSZENIA || []);

  // ---------- Stan (szkic trzymany w przeglądarce) ----------
  let data = clone(published);
  let downloaded = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.data)) {
      if (JSON.stringify(saved.data) === JSON.stringify(published)) localStorage.removeItem(KEY); // plik już podmieniony
      else { data = saved.data; downloaded = !!saved.downloaded; }
    }
  } catch (e) { /* brak dostępu do pamięci – pracujemy bez szkicu */ }

  const isDirty = () => JSON.stringify(data) !== JSON.stringify(published);

  function persist() {
    try {
      if (isDirty()) localStorage.setItem(KEY, JSON.stringify({ data, downloaded }));
      else localStorage.removeItem(KEY);
    } catch (e) { /* ignoruj */ }
    renderStatus();
  }

  // ---------- Status i eksport ----------
  function renderStatus() {
    const box = $('status');
    if (!isDirty()) { box.innerHTML = ''; return; }
    box.innerHTML = `
      <div class="flash ${downloaded ? 'flash-success' : 'flash-warning'} status-bar">
        <div>${downloaded
          ? '<strong>Plik pobrany.</strong> Podmień nim <code>dane/ogloszenia.js</code> i odśwież stronę – wtedy ten komunikat zniknie.'
          : '<strong>Masz niezapisane zmiany.</strong> Strona pokaże je dopiero po podmianie pliku <code>dane/ogloszenia.js</code>.'}</div>
        <div class="status-actions">
          <button type="button" class="btn btn-primary btn-sm" id="btn-export">Pobierz ogloszenia.js</button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-discard">Odrzuć zmiany</button>
        </div>
      </div>`;
    $('btn-export').onclick = exportFile;
    $('btn-discard').onclick = () => {
      if (!confirm('Odrzucić wszystkie niezapisane zmiany i wrócić do obecnego pliku?')) return;
      data = clone(published);
      downloaded = false;
      persist();
      renderList();
    };
  }

  function exportFile() {
    const text =
      '// Plik z ogłoszeniami – wygenerowany w panel.html (' + new Date().toLocaleString('pl-PL') + ').\n' +
      '// Zdjęcia: nazwy plików z folderu "zdjecia/".\n' +
      'window.OGLOSZENIA = ' + JSON.stringify(data, null, 2) + ';\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'ogloszenia.js' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloaded = true;
    persist();
  }

  $('import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      try {
        const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
        if (!Array.isArray(arr)) throw new Error();
        if (!confirm(`Wczytać ${arr.length} ogłoszeń z pliku "${file.name}"? Obecne zmiany zostaną zastąpione.`)) return;
        data = arr;
        downloaded = false;
        persist();
        renderList();
      } catch (err) {
        alert('Nie udało się odczytać pliku. Wybierz plik ogloszenia.js wygenerowany przez ten panel.');
      }
    });
  });

  // ---------- Lista ----------
  function renderList() {
    const items = data.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id);
    const active = items.filter((l) => l.active !== false).length;
    $('list-count').textContent = `${items.length} ${plural(items.length, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń')} · aktywne: ${active}`;

    $('list').innerHTML = items.length ? items.map((l) => `
      <div class="admin-row ${l.active === false ? 'is-hidden' : ''}">
        <span class="admin-thumb"><img src="${fmt.cover(l)}" alt="" onerror="this.src='img/placeholder.svg'"></span>
        <div class="admin-info">
          <span class="admin-title">${esc(l.title)}</span>
          <div class="muted small">
            <span class="pill pill-${esc(l.transaction_type)}">${esc(C.TRANSACTIONS[l.transaction_type])}</span>
            ${esc(C.PROPERTY_TYPES[l.property_type])} · ${esc(l.city)} · ${fmt.area(l.area)}
          </div>
          <div class="small">
            <strong>${fmt.price(l)}</strong>
            <span class="muted"> · nr ${esc(l.id)} · ${(l.photos || []).length} zdjęć</span>
            ${l.active === false ? '<span class="pill pill-hidden">Ukryte</span>' : ''}
          </div>
        </div>
        <div class="admin-actions">
          <button class="btn btn-outline btn-sm" data-edit="${l.id}">Edytuj</button>
          <button class="btn btn-outline btn-sm" data-toggle="${l.id}">${l.active === false ? 'Pokaż' : 'Ukryj'}</button>
          <button class="btn btn-danger btn-sm" data-delete="${l.id}">Usuń</button>
        </div>
      </div>`).join('')
      : '<div class="empty"><p>Brak ogłoszeń.</p></div>';
  }

  $('list').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const find = (id) => data.find((l) => String(l.id) === id);
    if (btn.dataset.edit) openForm(find(btn.dataset.edit));
    if (btn.dataset.toggle) {
      const l = find(btn.dataset.toggle);
      l.active = l.active === false;
      persist();
      renderList();
    }
    if (btn.dataset.delete) {
      const l = find(btn.dataset.delete);
      if (!confirm(`Usunąć ogłoszenie „${l.title}”?`)) return;
      data = data.filter((x) => x !== l);
      persist();
      renderList();
    }
  });

  // ---------- Formularz ----------
  const form = $('form');
  let editing = null;      // edytowane ogłoszenie lub null dla nowego
  let photos = [];         // nazwy plików
  const previews = {};     // nazwa pliku -> podgląd z dysku

  $('features').innerHTML = Object.entries(C.FEATURES)
    .map(([k, v]) => `<label class="check"><input type="checkbox" name="features" value="${k}"> ${esc(v)}</label>`)
    .join('');

  function showView(name) {
    $('view-list').hidden = name !== 'list';
    $('view-form').hidden = name !== 'form';
    window.scrollTo(0, 0);
  }

  function openForm(l) {
    editing = l || null;
    const v = l || { transaction_type: 'sprzedaz', property_type: 'mieszkanie', active: true, features: [], photos: [] };
    form.reset();
    $('form-errors').innerHTML = '';
    $('form-title').textContent = l ? 'Edycja ogłoszenia' : 'Nowe ogłoszenie';

    for (const name of ['title', 'property_type', 'market', 'city', 'district', 'street', 'price', 'area', 'rooms',
      'floor', 'floors_total', 'year_built', 'description', 'contact_name', 'contact_phone', 'contact_email']) {
      form.elements[name].value = v[name] == null ? '' : v[name];
    }
    form.querySelectorAll('[name=transaction_type]').forEach((r) => (r.checked = r.value === v.transaction_type));
    form.querySelectorAll('[name=features]').forEach((c) => (c.checked = (v.features || []).includes(c.value)));
    form.elements.active.checked = v.active !== false;

    // przy nowym ogłoszeniu podpowiedz dane kontaktowe z ostatniego
    if (!l && data.length) {
      const last = data[data.length - 1];
      for (const k of ['contact_name', 'contact_phone', 'contact_email']) form.elements[k].value = last[k] || '';
    }

    photos = (v.photos || []).slice();
    renderPhotos();
    showView('form');
  }

  function renderPhotos() {
    $('photos').innerHTML = photos.map((name, i) => `
      <div class="photo-item">
        <img src="${previews[name] || fmt.photo(name)}" alt="" onerror="this.src='img/placeholder.svg'">
        ${i === 0 ? '<span class="photo-main-badge">Główne</span>' : ''}
        <div class="photo-name" title="${esc(name)}">${esc(name)}</div>
        <div class="photo-item-actions">
          ${i !== 0 ? `<button type="button" class="btn btn-outline btn-xs" data-main="${i}">Ustaw jako główne</button>` : ''}
          <button type="button" class="btn btn-danger btn-xs" data-remove="${i}">Usuń</button>
        </div>
      </div>`).join('');
  }

  $('photos').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.main) photos.unshift(photos.splice(Number(btn.dataset.main), 1)[0]);
    if (btn.dataset.remove) photos.splice(Number(btn.dataset.remove), 1);
    renderPhotos();
  });

  const photoInput = $('photo-input');
  photoInput.addEventListener('change', () => {
    for (const file of photoInput.files) {
      if (!file.type.startsWith('image/')) continue;
      previews[file.name] = URL.createObjectURL(file);
      if (!photos.includes(file.name)) photos.push(file.name);
    }
    photoInput.value = '';
    renderPhotos();
  });
  const zone = photoInput.closest('.dropzone');
  ['dragenter', 'dragover'].forEach((ev) => photoInput.addEventListener(ev, () => zone.classList.add('drag')));
  ['dragleave', 'drop'].forEach((ev) => photoInput.addEventListener(ev, () => zone.classList.remove('drag')));

  document.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => showView('list')));
  $('btn-new').addEventListener('click', () => openForm(null));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const str = (name) => f[name].value.trim();
    const int = (name) => { const n = parseInt(f[name].value, 10); return Number.isFinite(n) ? n : null; };
    const tt = form.querySelector('[name=transaction_type]:checked');

    const l = {
      id: editing ? editing.id : data.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1,
      title: str('title'),
      transaction_type: tt ? tt.value : '',
      property_type: f.property_type.value,
      market: f.market.value,
      city: str('city'),
      district: str('district'),
      street: str('street'),
      price: toNum(f.price.value),
      area: toNum(f.area.value),
      rooms: int('rooms'),
      floor: int('floor'),
      floors_total: int('floors_total'),
      year_built: int('year_built'),
      features: Array.from(form.querySelectorAll('[name=features]:checked')).map((c) => c.value),
      description: f.description.value.trim(),
      contact_name: str('contact_name'),
      contact_phone: str('contact_phone'),
      contact_email: str('contact_email'),
      photos: photos.slice(),
      active: f.active.checked,
      created_at: editing ? editing.created_at : new Date().toISOString(),
    };

    const errors = [];
    if (!l.title) errors.push('Podaj tytuł ogłoszenia.');
    if (!C.TRANSACTIONS[l.transaction_type]) errors.push('Wybierz rodzaj transakcji.');
    if (!l.city) errors.push('Podaj miejscowość.');
    if (!(l.price > 0)) errors.push('Podaj poprawną cenę.');
    if (!(l.area > 0)) errors.push('Podaj poprawną powierzchnię.');
    if (!l.description) errors.push('Dodaj opis ogłoszenia.');
    if (l.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.contact_email)) errors.push('Adres e-mail jest niepoprawny.');
    if (!l.contact_phone && !l.contact_email) errors.push('Podaj telefon lub e-mail do kontaktu.');

    if (errors.length) {
      $('form-errors').innerHTML = `<div class="flash flash-error"><strong>Popraw błędy w formularzu:</strong><ul>${errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
      window.scrollTo(0, 0);
      return;
    }

    if (editing) data[data.indexOf(editing)] = l;
    else data.push(l);
    downloaded = false;
    persist();
    renderList();
    showView('list');
  });

  renderStatus();
  renderList();
})();
