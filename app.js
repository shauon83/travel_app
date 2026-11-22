// ---------- 데이터 (localStorage) ----------
const KEY = 'travel_app_v1';
const SEED = {
  schedules: [
    { id: 'sched_1', time: '10:00', place: '도쿄역', lat: 35.6812, lng: 139.7671, mapUrl: '' },
    { id: 'sched_2', time: '13:00', place: '아키하바라', lat: 35.6984, lng: 139.7731, mapUrl: '' },
    { id: 'sched_3', time: '17:00', place: '긴자', lat: 35.6717, lng: 139.765, mapUrl: '' },
  ],
  wishlist: [
    { id: 'wish_1', name: '에어리즘 코튼 T', feature: 'L / Black', qty: 2, imageUrl: '', memo: '긴자 매장 한정 세일', checked: false },
  ],
  dutyfree: [
    { id: 'df_1', name: '돈키호테 할인 쿠폰', url: 'https://www.djjapan.net/coupon', note: '5,000엔 이상 10% 면세 + 5% 쿠폰' },
  ],
  receipts: [
    { id: 'rcpt_1', store: '빅카메라 아키하바라', rate: 9.0, date: '2026-03-25',
      items: [{ name: '닌텐도 스위치 게임', qty: 1, price: 5980 }, { name: 'SD 카드 128G', qty: 2, price: 1500 }],
      totalLocal: 8980, totalKRW: 80820 },
  ],
};

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return structuredClone(SEED);
  return { schedules: [], wishlist: [], dutyfree: [], receipts: [], ...JSON.parse(raw) };
}
let db = load();

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    alert('저장 공간이 부족해 저장하지 못했습니다. 이미지가 있는 항목을 정리해 주세요.');
    db = load(); // 저장 안 된 변경은 되돌려 화면과 저장소를 일치시킴
  }
  render();
}

// ---------- 유틸 ----------
const $ = (s) => document.querySelector(s);
const uid = (p) => `${p}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u, img) => (/^https?:\/\//i.test(u) || (img && /^data:image\//.test(u)) ? u : '');
const num = (v) => (String(v ?? '').trim() === '' ? null : Number(v));
const hasPos = (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng);
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
const fmtDist = (km) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);
const fmtDate = (d) => {
  const t = new Date(`${d}T00:00`);
  return isNaN(t) ? '날짜 없음' : t.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
};
const formData = (f) => Object.fromEntries(new FormData(f));
const EDIT_HINT = '<span class="text-xs font-normal faint">✎</span>';
const empty = (icon, t) => `<li class="py-14 text-center"><div class="text-4xl">${icon}</div><div class="mt-2 text-sm faint">${t}</div><div class="mt-1 text-xs faint">오른쪽 아래 ＋ 버튼으로 추가</div></li>`;
const COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500'];
const colorOf = (s) => COLORS[[...String(s)].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length];
const gmap = (s) => safeUrl(s.mapUrl) || (hasPos(s)
  ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.place)}`);

// 전체 일정을 구글맵 길찾기 하나로 (출발→경유→도착)
// shortcut: 구글맵 경유지는 최대 9개까지만 반영됨, 더 많으면 구간별 링크로 나눠야 함
function routeUrl() {
  const p = db.schedules.filter(hasPos).map((s) => `${s.lat},${s.lng}`);
  if (p.length < 2) return '';
  const via = p.slice(1, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${p[0]}&destination=${p.at(-1)}${via ? `&waypoints=${encodeURIComponent(via)}` : ''}`;
}
const legs = () => db.schedules.map((s, i) => {
  const n = db.schedules[i + 1];
  return n && hasPos(s) && hasPos(n) ? distanceKm(s, n) : null;
});

// ---------- 라우팅 (하단 탭) ----------
const TABS = { timeline: '일정', wishlist: '위시리스트', dutyfree: '면세 · 택스프리', receipts: '영수증 정산' };
const tab = () => (TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'timeline');

function subtitle() {
  const t = tab();
  if (t === 'timeline') {
    const km = legs().reduce((s, d) => s + (d || 0), 0);
    return `${db.schedules.length}곳${km ? ` · 이동 약 ${fmtDist(km)}` : ''}`;
  }
  if (t === 'wishlist') return `${db.wishlist.filter((w) => w.checked).length} / ${db.wishlist.length} 구매 완료`;
  if (t === 'dutyfree') return `쿠폰·면세 정보 ${db.dutyfree.length}개`;
  return `영수증 ${db.receipts.length}장`;
}

function route() {
  const t = tab();
  document.querySelectorAll('main > section').forEach((s) => (s.hidden = s.id !== t));
  document.querySelectorAll('.tab').forEach((a) => (a.hash === `#${t}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#title').textContent = TABS[t];
  $('#subtitle').textContent = subtitle();
  scrollTo(0, 0);
  if (t === 'timeline') setTimeout(() => { map.invalidateSize(); fit(); }, 0); // 숨김 상태에서 보일 때 지도 크기 재계산
}
addEventListener('hashchange', route);

const online = () => ($('#offline').hidden = navigator.onLine);
addEventListener('online', online);
addEventListener('offline', online);

// ---------- 공통: 하단 시트 추가/수정 (일정·위시·면세). 영수증은 품목 행 때문에 별도 ----------
const BOXES = { schedules: ['#sBox', 'sched'], wishlist: ['#wBox', 'wish'], dutyfree: ['#dBox', 'df'] };
const editing = {}; // key → 수정 중인 id
const boxOf = (key) => $(BOXES[key][0]);
let picking = false; // 일정 시트를 잠시 닫고 지도에서 좌표 고르는 중

function resetForm(key) {
  editing[key] = null;
  const b = boxOf(key);
  b.querySelector('form').reset();
  b.querySelector('[data-summary]').textContent = b.dataset.add;
  b.querySelector('[data-submit]').textContent = '추가';
  b.querySelector('[data-keepimg]')?.classList.add('hidden');
}

function startEdit(key, id) {
  const item = db[key].find((x) => x.id === id);
  if (!item) return;
  const b = boxOf(key);
  resetForm(key);
  editing[key] = id;
  // 폼 필드 name이 스키마 키와 같아서 그대로 채움
  for (const el of b.querySelector('form').elements) {
    if (el.name && el.name in item && el.type !== 'file' && el.type !== 'checkbox') el.value = item[el.name] ?? '';
  }
  if (key === 'wishlist' && item.imageUrl?.startsWith('data:')) {
    b.querySelector('form').elements.imageUrl.value = ''; // 기기 사진은 URL 칸에 넣지 않고 유지 표시만
    b.querySelector('[data-keepimg]').classList.remove('hidden');
  }
  b.querySelector('[data-summary]').textContent = b.dataset.edit;
  b.querySelector('[data-submit]').textContent = '저장';
  b.showModal();
}

function upsert(key, fields) {
  const i = db[key].findIndex((x) => x.id === editing[key]);
  if (i >= 0) db[key][i] = { ...db[key][i], ...fields }; // checked 등 폼에 없는 값 유지
  else db[key].push({ id: uid(BOXES[key][1]), ...fields });
  boxOf(key).close();
  commit();
}

// 시트를 닫으면 (✕/ESC/바깥 탭/저장) 입력 상태 초기화. 지도 좌표 선택 중일 때만 유지
Object.keys(BOXES).forEach((key) => boxOf(key).addEventListener('close', () => { if (!picking) resetForm(key); }));
document.querySelectorAll('dialog').forEach((d) => {
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // 배경 탭으로 닫기
});

$('#fab').addEventListener('click', () => {
  picking = false;
  $('#pickHint').hidden = true;
  const key = { timeline: 'schedules', wishlist: 'wishlist', dutyfree: 'dutyfree', receipts: 'receipts' }[tab()];
  if (key === 'receipts') { resetReceiptForm(); $('#rBox').showModal(); return; }
  resetForm(key);
  boxOf(key).showModal();
});

// ---------- 1. 일정 · 지도 ----------
const map = L.map('map').setView([35.68, 139.76], 12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, crossOrigin: true, attribution: '&copy; OpenStreetMap',
}).addTo(map);
const layer = L.layerGroup().addTo(map);
const points = () => db.schedules.filter(hasPos).map((s) => [s.lat, s.lng]);

function fit() {
  const p = points();
  if (p.length > 1) map.fitBounds(p, { padding: [36, 36] });
  else if (p.length === 1) map.setView(p[0], 15);
}

function drawMap() {
  layer.clearLayers();
  L.polyline(points(), { color: '#0ea5e9', weight: 4, opacity: 0.85, dashArray: '2 10', lineCap: 'round' }).addTo(layer);
  db.schedules.forEach((s, i) => {
    if (!hasPos(s)) return;
    L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: `<div class="pin">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .bindPopup(`<b>${esc(s.time)}</b> ${esc(s.place)}`).addTo(layer);
  });
  fit();
}

$('#fitAll').addEventListener('click', fit);

map.on('click', (e) => {
  if (!picking) resetForm('schedules'); // 그냥 지도를 탭하면 새 장소 추가
  picking = false;
  $('#pickHint').hidden = true;
  const f = $('#sForm').elements;
  f.lat.value = e.latlng.lat.toFixed(6);
  f.lng.value = e.latlng.lng.toFixed(6);
  $('#sBox').showModal();
});

$('#pickOnMap').addEventListener('click', () => {
  picking = true;
  $('#sBox').close();
  $('#pickHint').hidden = false;
});

$('#sForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = formData(e.target);
  upsert('schedules', { time: d.time, place: d.place.trim(), lat: num(d.lat), lng: num(d.lng), mapUrl: d.mapUrl.trim() });
});

$('#sortTime').addEventListener('click', () => {
  db.schedules.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  commit();
});

function renderTimeline() {
  const n = db.schedules.length, leg = legs(), url = routeUrl();
  const link = $('#routeLink');
  url ? link.setAttribute('href', url) : link.removeAttribute('href');
  link.classList.toggle('opacity-40', !url);
  $('#sList').innerHTML = db.schedules.map((s, i) => `
    <li class="flex gap-3">
      <div class="flex w-7 flex-col items-center pt-4">
        <span class="pin">${i + 1}</span>
        ${i < n - 1 ? '<span class="mt-1 w-0 flex-1 border-l-2 border-dashed border-sky-300 dark:border-sky-800"></span>' : ''}
      </div>
      <div class="min-w-0 flex-1 pb-1">
        <div class="card flex items-center gap-1 py-3 pr-1.5">
          <button data-act="edit" data-id="${s.id}" class="min-w-0 flex-1 text-left" aria-label="${esc(s.place)} 수정">
            <span class="num block text-sm font-bold text-sky-600 dark:text-sky-400">${esc(s.time) || '--:--'}</span>
            <span class="block truncate font-semibold">${esc(s.place)} ${EDIT_HINT}</span>
            ${hasPos(s) ? '' : '<span class="block text-xs text-amber-600">좌표 없음 · 탭해서 입력</span>'}
          </button>
          <a href="${esc(gmap(s))}" target="_blank" rel="noopener" class="btn-icon" aria-label="구글맵에서 열기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          </a>
          <div class="flex flex-col">
            <button data-act="up" data-id="${s.id}" class="grid h-6 w-8 place-items-center rounded-lg text-[10px] faint active:bg-slate-100 disabled:opacity-25 dark:active:bg-slate-800" aria-label="위로" ${i === 0 ? 'disabled' : ''}>▲</button>
            <button data-act="down" data-id="${s.id}" class="grid h-6 w-8 place-items-center rounded-lg text-[10px] faint active:bg-slate-100 disabled:opacity-25 dark:active:bg-slate-800" aria-label="아래로" ${i === n - 1 ? 'disabled' : ''}>▼</button>
          </div>
          <button data-act="del" data-id="${s.id}" class="btn-icon" aria-label="삭제">✕</button>
        </div>
        ${leg[i] != null ? `<div class="num px-2 pb-1 pt-2 text-xs faint">↓ 직선 ${fmtDist(leg[i])}</div>` : (i < n - 1 ? '<div class="h-3"></div>' : '')}
      </div>
    </li>`).join('') || empty('🗺️', '일정이 없습니다');
  drawMap();
}

// ---------- 2. 위시리스트 ----------
let wishFilter = 'all';
$('#wFilter').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  wishFilter = b.dataset.filter;
  document.querySelectorAll('#wFilter .chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
  renderWish();
});

// 로컬 사진은 localStorage 용량(약 5MB) 때문에 600px JPEG로 축소해 저장
function resizeImage(file, max = 600, quality = 0.7) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

$('#wForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = formData(e.target);
  const old = db.wishlist.find((x) => x.id === editing.wishlist);
  let imageUrl = d.imageUrl.trim();
  if (d.imageFile && d.imageFile.size) {
    try { imageUrl = await resizeImage(d.imageFile); } catch { alert('이미지를 읽지 못했습니다.'); return; }
  } else if (!imageUrl && old?.imageUrl?.startsWith('data:') && !d.removeImage) {
    imageUrl = old.imageUrl; // 수정 시 새 사진/URL 없으면 기존 기기 사진 유지
  }
  upsert('wishlist', { name: d.name.trim(), feature: d.feature.trim(), qty: Math.max(1, Number(d.qty) || 1), imageUrl, memo: d.memo.trim(), checked: old?.checked ?? false });
});

function renderWish() {
  const all = db.wishlist, done = all.filter((w) => w.checked).length;
  $('#wCount').textContent = `${done} / ${all.length}`;
  $('#wBar').style.width = `${all.length ? (done / all.length) * 100 : 0}%`;
  const counts = { all: all.length, todo: all.length - done, done };
  document.querySelectorAll('#wFilter .chip').forEach((c) => (c.querySelector('[data-n]').textContent = counts[c.dataset.filter]));

  const list = all.filter((w) => wishFilter === 'all' || (wishFilter === 'done') === w.checked);
  $('#wList').innerHTML = list.map((w) => {
    const img = safeUrl(w.imageUrl, true), strike = w.checked ? 'line-through' : '';
    return `
    <li class="card flex items-center gap-3 p-3 transition-opacity ${w.checked ? 'opacity-50' : ''}">
      ${img
        ? `<img src="${esc(img)}" alt="" loading="lazy" class="h-[72px] w-[72px] shrink-0 rounded-xl bg-slate-100 object-cover dark:bg-slate-800">`
        : `<div class="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl text-2xl font-bold text-white ${colorOf(w.name)}">${esc([...w.name][0] || '?')}</div>`}
      <button data-act="edit" data-id="${w.id}" class="min-w-0 flex-1 self-stretch text-left" aria-label="${esc(w.name)} 수정">
        <span class="block truncate font-semibold ${strike}">${esc(w.name)} ${EDIT_HINT}</span>
        <span class="mt-0.5 flex flex-wrap gap-1 text-xs">
          ${w.feature ? `<span class="rounded-md bg-slate-100 px-1.5 py-0.5 muted dark:bg-slate-800">${esc(w.feature)}</span>` : ''}
          <span class="num rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">${w.qty}개</span>
        </span>
        ${w.memo ? `<span class="mt-1 block line-clamp-2 whitespace-pre-line text-xs faint ${strike}">${esc(w.memo)}</span>` : ''}
      </button>
      <div class="flex flex-col items-center gap-1">
        <input type="checkbox" data-act="check" data-id="${w.id}" ${w.checked ? 'checked' : ''} class="check" aria-label="${esc(w.name)} 구매 완료">
        <button data-act="del" data-id="${w.id}" class="grid h-8 w-8 place-items-center rounded-lg faint active:bg-slate-100 dark:active:bg-slate-800" aria-label="삭제">✕</button>
      </div>
    </li>`;
  }).join('') || empty('🛍️', wishFilter === 'all' ? '위시리스트가 비어 있습니다' : '해당하는 항목이 없습니다');
}

// ---------- 3. 면세 ----------
$('#dForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = formData(e.target);
  upsert('dutyfree', { name: d.name.trim(), url: d.url.trim(), note: d.note.trim() });
});

function renderDF() {
  $('#dList').innerHTML = db.dutyfree.map((d) => {
    const url = safeUrl(d.url);
    let host = '';
    try { host = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch {}
    return `
    <li class="panel overflow-hidden">
      <div class="flex items-center gap-3 p-4">
        <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${colorOf(d.name)}">${esc([...d.name][0] || '?')}</div>
        <button data-act="edit" data-id="${d.id}" class="min-w-0 flex-1 text-left" aria-label="${esc(d.name)} 수정">
          <span class="block truncate font-semibold">${esc(d.name)} ${EDIT_HINT}</span>
          ${host ? `<span class="block truncate text-xs faint">${esc(host)}</span>` : ''}
        </button>
        <button data-act="del" data-id="${d.id}" class="btn-icon" aria-label="삭제">✕</button>
      </div>
      ${d.note ? `<div class="mx-4 mb-3 whitespace-pre-line rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">💡 ${esc(d.note)}</div>` : ''}
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-1 border-t border-dashed border-slate-200 py-3 text-sm font-semibold text-sky-600 active:bg-slate-50 dark:border-slate-700 dark:text-sky-400 dark:active:bg-slate-800">쿠폰 / 안내 열기 ↗</a>` : ''}
    </li>`;
  }).join('') || empty('🎟️', '면세 정보가 없습니다');
}

// ---------- 4. 영수증 ----------
let editingId = null;
const rForm = $('#rForm');

function addRow(it = { name: '', qty: 1, price: '' }) {
  const row = document.createElement('div');
  row.className = 'flex gap-1.5';
  row.innerHTML = `
    <input data-f="name" placeholder="품목명" value="${esc(it.name)}" class="cell min-w-0 flex-1" aria-label="품목명">
    <input data-f="qty" type="number" min="1" inputmode="numeric" value="${esc(it.qty)}" class="cell num w-14 shrink-0" aria-label="수량">
    <input data-f="price" type="number" step="any" inputmode="decimal" placeholder="0" value="${esc(it.price)}" class="cell num w-24 shrink-0" aria-label="현지 단가">
    <button type="button" data-rm class="btn-icon" aria-label="품목 삭제">✕</button>`;
  $('#rItems').append(row);
}

const readRows = () => [...$('#rItems').children].map((r) => ({
  name: r.querySelector('[data-f=name]').value.trim(),
  qty: Number(r.querySelector('[data-f=qty]').value) || 0,
  price: Number(r.querySelector('[data-f=price]').value) || 0,
})).filter((i) => i.name || i.price);

function updateTotals() {
  const t = receiptTotals(readRows(), rForm.elements.rate.value);
  $('#rLocal').textContent = fmt(t.totalLocal);
  $('#rKRW').textContent = `₩${fmt(t.totalKRW)}`;
}

function resetReceiptForm() {
  editingId = null;
  rForm.reset();
  rForm.elements.date.value = new Date().toLocaleDateString('sv-SE'); // 로컬 YYYY-MM-DD
  rForm.elements.rate.value = db.receipts.at(-1)?.rate ?? 9.0; // 마지막 사용 환율 재사용
  $('#rItems').innerHTML = '';
  addRow();
  $('#rSummary').textContent = '영수증 등록';
  $('#rScan').hidden = true;
  if (scanPhotoUrl) { URL.revokeObjectURL(scanPhotoUrl); scanPhotoUrl = null; }
  updateTotals();
}

$('#rAddItem').addEventListener('click', () => { addRow(); $('#rItems').lastElementChild.querySelector('input').focus(); });
$('#rItems').addEventListener('click', (e) => {
  if (!e.target.closest('[data-rm]')) return;
  e.target.closest('#rItems > div').remove();
  updateTotals();
});
rForm.addEventListener('input', updateTotals);
$('#rBox').addEventListener('close', () => { resetReceiptForm(); setTimeout(openNextScan, 150); }); // 인식 대기열이 있으면 다음 영수증 확인

rForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = formData(rForm);
  const items = readRows();
  if (!items.length) return alert('품목을 1개 이상 입력하세요.');
  const rate = Number(d.rate);
  const r = { id: editingId || uid('rcpt'), store: d.store.trim(), rate, date: d.date, items, ...receiptTotals(items, rate) };
  const i = db.receipts.findIndex((x) => x.id === editingId);
  if (i >= 0) db.receipts[i] = r; else db.receipts.push(r);
  $('#rBox').close();
  commit();
});

function editReceipt(id) {
  const r = db.receipts.find((x) => x.id === id);
  if (!r) return;
  resetReceiptForm();
  editingId = id;
  rForm.elements.store.value = r.store;
  rForm.elements.date.value = r.date;
  rForm.elements.rate.value = r.rate;
  $('#rItems').innerHTML = '';
  r.items.forEach(addRow);
  $('#rSummary').textContent = '영수증 수정';
  updateTotals();
  $('#rBox').showModal();
}

function renderReceipts() {
  const all = db.receipts;
  $('#rGrand').textContent = `₩${fmt(all.reduce((s, r) => s + r.totalKRW, 0))}`;
  $('#rMeta').textContent = `영수증 ${all.length}장 · 품목 ${all.reduce((s, r) => s + r.items.length, 0)}개`;

  // 날짜별 묶음 + 일별 소계 (최신 날짜 먼저)
  const groups = {};
  [...all].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach((r) => (groups[r.date || ''] ||= []).push(r));
  $('#rList').innerHTML = Object.entries(groups).map(([date, rs]) => `
    <li>
      <div class="num flex justify-between px-1 pb-2 pt-3 text-xs font-semibold muted">
        <span>${esc(fmtDate(date))}</span><span>₩${fmt(rs.reduce((s, r) => s + r.totalKRW, 0))}</span>
      </div>
      <ul class="space-y-2">${rs.map((r) => `
        <li><details class="panel group">
          <summary class="flex items-center gap-3 p-4">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-lg dark:bg-sky-950">🧾</div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-semibold">${esc(r.store)}</div>
              <div class="num text-xs faint">품목 ${r.items.length}개 · 현지 ${fmt(r.totalLocal)} · 환율 ${esc(r.rate)}</div>
            </div>
            <div class="text-right">
              <div class="num font-bold">₩${fmt(r.totalKRW)}</div>
              <div class="text-xs faint transition group-open:rotate-180">▾</div>
            </div>
          </summary>
          <div class="border-t border-slate-100 px-4 pb-4 pt-2 dark:border-slate-800">
            <table class="num w-full text-sm">
              ${r.items.map((it) => `<tr><td class="py-1">${esc(it.name)}</td><td class="w-12 text-right faint">×${it.qty}</td><td class="w-24 text-right">${fmt(it.qty * it.price)}</td></tr>`).join('')}
            </table>
            <div class="mt-3 flex gap-2">
              <button data-act="edit" data-id="${r.id}" class="btn-sub flex-1">수정</button>
              <button data-act="del" data-id="${r.id}" class="flex-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 active:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300">삭제</button>
            </div>
          </div>
        </details></li>`).join('')}
      </ul>
    </li>`).join('') || empty('🧾', '등록된 영수증이 없습니다');
}

// ---------- 4-1. 영수증 사진 인식 (Gemini API, 여러 장 일괄) ----------
const GEMINI_KEY = 'travel_gemini_key'; // 여행 데이터와 분리 저장
// 항상 최신 Flash 모델을 가리키는 별칭 (모델 버전 교체 시 코드 수정 불필요)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const SCAN_PROMPT = `You are reading a photo of a shopping receipt (usually Japanese). Return JSON:
- store: store/branch name as printed (keep original language).
- date: purchase date as YYYY-MM-DD, or "" if not visible. Convert Japanese era years (令和7年 = 2025).
- items: every purchased product line.
  name = short Korean translation of the product name (keep brand/model names as-is).
  qty = quantity (default 1). price = UNIT price in the receipt currency as a plain number.
  Apply a discount printed directly under an item to that item's unit price.
  If prices exclude tax (外税) and consumption tax is added separately, add one item {"name":"소비세","qty":1,"price":<tax amount>}.
  A discount for the whole receipt becomes an item {"name":"할인","qty":1,"price":<negative amount>}.
  Do NOT include subtotal, total, 内税 breakdown, payment, change, or points lines.
- total: the final amount actually paid (合計) as a number.`;
const SCAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    store: { type: 'STRING' },
    date: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, qty: { type: 'NUMBER' }, price: { type: 'NUMBER' } }, required: ['name', 'qty', 'price'] } },
    total: { type: 'NUMBER' },
  },
  required: ['store', 'date', 'items', 'total'],
};

async function scanReceipt(file, key) {
  const data = (await resizeImage(file, 1600, 0.85)).split(',')[1]; // 글자 판독용으로 크게 보냄
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType: 'image/jpeg', data } }, { text: SCAN_PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCAN_SCHEMA },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) throw new Error(`무료 사용 한도를 넘었습니다. 잠시 후 다시 시도하세요. (${msg})`);
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error(`API 키 또는 요청 오류입니다. (${msg})`);
    throw new Error(msg);
  }
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!text) throw new Error('영수증 내용을 읽지 못했습니다.');
  return parseReceiptScan(JSON.parse(text));
}

const scanQueue = [];
let scanPhotoUrl = null, scanAfterKey = false;
const scanStatus = (msg) => { $('#scanStatus').hidden = !msg; $('#scanText').textContent = msg || ''; };

function openNextScan() {
  if ($('#rBox').open || !scanQueue.length) return; // 확인 중인 영수증이 있으면 대기
  const r = scanQueue.shift();
  resetReceiptForm();
  if (r.store) rForm.elements.store.value = r.store;
  if (r.date) rForm.elements.date.value = r.date;
  $('#rItems').innerHTML = '';
  (r.items.length ? r.items : [undefined]).forEach((it) => addRow(it));
  updateTotals();
  const sum = receiptTotals(r.items, 1).totalLocal;
  const warn = r.total && Math.abs(sum - r.total) > 0.5 ? `⚠️ 품목 합계 ${fmt(sum)}가 영수증 총액 ${fmt(r.total)}와 다릅니다. 확인해 주세요.` : '';
  $('#rWarn').textContent = warn;
  $('#rWarn').hidden = !warn;
  scanPhotoUrl = URL.createObjectURL(r.file);
  $('#rPhoto').src = scanPhotoUrl;
  $('#rScan').hidden = false;
  $('#rSummary').textContent = `영수증 확인${scanQueue.length ? ` · 대기 ${scanQueue.length}장` : ''}`;
  $('#rBox').showModal();
}

$('#scanFile').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  if (!navigator.onLine) return alert('사진 인식은 인터넷 연결이 필요합니다. 온라인에서 다시 시도하세요.');
  const key = localStorage.getItem(GEMINI_KEY), errors = [];
  $('#scanBtn').disabled = true;
  for (const [i, file] of files.entries()) {
    scanStatus(`영수증 인식 중… ${i + 1} / ${files.length}`);
    try {
      scanQueue.push({ ...(await scanReceipt(file, key)), file });
      openNextScan(); // 첫 결과부터 바로 확인 시작, 나머지는 뒤에서 계속 인식
    } catch (err) {
      errors.push(`${i + 1}번째 사진: ${err.message}`);
      if (/API 키|한도/.test(err.message)) break; // 남은 사진도 같은 이유로 실패하므로 중단
    }
  }
  scanStatus('');
  $('#scanBtn').disabled = false;
  if (errors.length) alert(`인식 실패 ${errors.length}건\n\n${errors.join('\n')}`);
});

function openKeyBox(thenScan) {
  scanAfterKey = thenScan;
  $('#kForm').elements.key.value = localStorage.getItem(GEMINI_KEY) || '';
  $('#kBox').showModal();
}
$('#scanBtn').addEventListener('click', () => (localStorage.getItem(GEMINI_KEY) ? $('#scanFile').click() : openKeyBox(true)));
$('#keyBtn').addEventListener('click', () => openKeyBox(false));
$('#kForm').addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem(GEMINI_KEY, e.target.elements.key.value.trim());
  $('#kBox').close();
  if (scanAfterKey) $('#scanFile').click();
});
$('#kDelete').addEventListener('click', () => {
  localStorage.removeItem(GEMINI_KEY);
  $('#kBox').close();
});

// ---------- 공통: 목록 액션 (삭제/순서/체크/수정) ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  const key = b?.closest('[data-list]')?.dataset.list;
  if (!key) return;
  const list = db[key], id = b.dataset.id, i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  switch (b.dataset.act) {
    case 'del':
      if (!confirm('삭제할까요?')) return;
      list.splice(i, 1);
      break;
    case 'up': case 'down': {
      const j = i + (b.dataset.act === 'up' ? -1 : 1);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      break;
    }
    case 'check': list[i].checked = b.checked; break;
    case 'edit': return key === 'receipts' ? editReceipt(id) : startEdit(key, id);
    default: return;
  }
  commit();
});

function render() {
  renderTimeline(); renderWish(); renderDF(); renderReceipts();
  $('#subtitle').textContent = subtitle();
}

render();
resetReceiptForm();
route();
online();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
