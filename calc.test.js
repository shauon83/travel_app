// 실행: node calc.test.js
const assert = require('assert');
require('./calc.js');

// CLAUDE.md 스키마 예시: 5980 + 1500*2 = 8980엔, 환율 9.0 → 80,820원
assert.deepStrictEqual(
  receiptTotals([{ qty: 1, price: 5980 }, { qty: 2, price: 1500 }], 9.0),
  { totalLocal: 8980, totalKRW: 80820 }
);
assert.deepStrictEqual(receiptTotals([{ qty: 3, price: 0.1 }], 1350), { totalLocal: 0.3, totalKRW: 405 });
assert.deepStrictEqual(receiptTotals([{ qty: '', price: 'x' }], 9), { totalLocal: 0, totalKRW: 0 });
assert.deepStrictEqual(receiptTotals([], 9), { totalLocal: 0, totalKRW: 0 });
// 적도 경도 1도 ≈ 111.19km, 도쿄역→아키하바라 ≈ 1.9km
assert.ok(Math.abs(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111.19) < 0.01);
assert.strictEqual(distanceKm({ lat: 35.68, lng: 139.76 }, { lat: 35.68, lng: 139.76 }), 0);
const d = distanceKm({ lat: 35.6812, lng: 139.7671 }, { lat: 35.6984, lng: 139.7731 });
assert.ok(d > 1.8 && d < 2.1, d);
// 영수증 인식 결과 정규화: 잘못된 값/누락/할인 음수
assert.deepStrictEqual(parseReceiptScan({
  store: ' 돈키호테 ', date: '2026-03-25', total: 2970,
  items: [{ name: '과자', qty: 2, price: 1000 }, { name: '할인', qty: 1, price: -100 }, { name: 'x', qty: 'abc', price: '1070' }, { name: '', price: 0 }],
}), {
  store: '돈키호테', date: '2026-03-25', total: 2970,
  items: [{ name: '과자', qty: 2, price: 1000 }, { name: '할인', qty: 1, price: -100 }, { name: 'x', qty: 1, price: 1070 }],
});
assert.deepStrictEqual(parseReceiptScan(null), { store: '', date: '', items: [], total: 0 });
assert.strictEqual(parseReceiptScan({ date: '3/25' }).date, '');
assert.strictEqual(parseReceiptScan({ items: 'nope' }).items.length, 0);
console.log('calc ok');
