// 영수증 합계 계산. 브라우저(전역)와 node 테스트 양쪽에서 쓰는 클래식 스크립트.
globalThis.receiptTotals = (items, rate) => {
  const sum = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const totalLocal = Math.round(sum * 100) / 100; // 소수 통화(USD 등) 부동소수 오차 제거
  return { totalLocal, totalKRW: Math.round(totalLocal * (Number(rate) || 0)) };
};

// Gemini 영수증 인식 결과(외부 입력) → 앱 데이터 형태로 검증·정규화
globalThis.parseReceiptScan = (r) => ({
  store: String(r?.store ?? '').trim().slice(0, 100),
  date: /^\d{4}-\d{2}-\d{2}$/.test(r?.date) ? r.date : '',
  items: (Array.isArray(r?.items) ? r.items : [])
    .map((i) => ({
      name: String(i?.name ?? '').trim().slice(0, 100),
      qty: Math.max(1, Math.round(Number(i?.qty)) || 1),
      price: Number(i?.price) || 0, // 할인 줄은 음수 허용
    }))
    .filter((i) => i.name || i.price),
  total: Number(r?.total) || 0,
});

// 두 좌표 사이 직선거리(km, haversine). 오프라인에서도 구간 거리 표시용
globalThis.distanceKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
