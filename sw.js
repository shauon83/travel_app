const CACHE = 'travel-v3';
const TILES = 'travel-tiles';
const SHELL = ['./', './index.html', './app.js', './calc.js', './manifest.json', './icon.svg'];
const CDN = [
  'https://cdn.tailwindcss.com/3.4.16',
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (e) => e.waitUntil(
  caches.open(CACHE).then((c) => Promise.all([
    c.addAll(SHELL),
    // CDN 실패가 설치 전체를 막지 않도록 개별 캐싱 (첫 방문 시 런타임 캐시로 다시 채워짐)
    // tailwind CDN은 CORS 헤더가 없어 no-cors(opaque)로 받아 저장
    ...CDN.map((u) => fetch(u, { mode: 'no-cors' }).then((r) => c.put(u, r)).catch(() => {})),
  ])).then(() => self.skipWaiting())
));

self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== TILES).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 지도 타일: 한 번 본 영역은 오프라인에서도 표시 (cache-first)
  // shortcut: 타일 캐시 무제한 누적, 용량 문제가 생기면 LRU 개수 제한 추가
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) c.put(req, r.clone());
      return r;
    }))));
    return;
  }

  // 앱 셸 & CDN: stale-while-revalidate
  e.respondWith(caches.open(CACHE).then((c) =>
    c.match(req, { ignoreSearch: url.origin === location.origin }).then((hit) => {
      const net = fetch(req).then((r) => {
        if (r.ok || r.type === 'opaque') c.put(req, r.clone());
        return r;
      }).catch(() => hit || Response.error());
      return hit || net;
    })
  ));
});
