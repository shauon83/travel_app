# 📱 Smart Travel Companion Web App (PWA)

## 📌 Project Overview
모바일 환경에 최적화된 **오프라인 연동형 여행 대시보드 웹 애플리케이션(PWA)** 개발 프로젝트입니다.
해외여행 중 인터넷 연결이 불안정하더라도 일정 확인, 경로 파악, 쇼핑 위시리스트 관리, 면세 쿠폰 확인, 영수증 세부 정산이 가능하도록 구현합니다.

---

## 🛠️ Tech Stack & Architecture
- **Frontend Framework**: HTML5, Vanilla JavaScript (ES6+) 또는 Light React/Vite
- **Styling**: Tailwind CSS (CDN 또는 PostCSS)
- **Map Library**: Leaflet.js (OpenStreetMap) + Polyline (경로 연결)
- **Data Persistence**: `localStorage` 또는 `IndexedDB` (로컬 데이터 완전 저장)
- **Deployment**: GitHub Pages 또는 Cloudflare Pages (무료 티어)
- **PWA**: Service Worker 및 `manifest.json` 지원 (홈 화면 추가 및 오프라인 캐싱)

---

## 🎯 Key Feature Requirements

### 1. 일정 및 경로 타임라인 (`#timeline`)
- **지도 시각화**:
  - 등록된 장소들의 위도/경도를 기반으로 Leaflet 지도에 순서대로 Marker 표시
  - 장소 간 이동 경로를 선(`Polyline`, 점선 스타일)으로 자동 연동
- **장소 세부 정보**:
  - 방문 시각(HH:mm), 장소명, 좌표(Lat/Lng), 구글맵(Google Maps) 외부 이동 URL
- **인터랙션**:
  - 일정 추가/삭제/순서 변경 시 지도 위 핀과 경로선 자동 갱신 및 줌 피팅(`fitBounds`)

### 2. 구매 위시리스트 (`#wishlist`)
- **항목 구성**:
  - 상품명, 이미지(URL 또는 카메라/갤러리 로컬 이미지), 특징(색상/사이즈 등), 수량, 메모(구매 매장, 할인가 등)
  - 구매 완료 체크박스 (토글 시 취소선 및 투명도 처리)
- **필터링**: 전체 / 미구매 / 구매 완료 탭 필터링

### 3. 면세 및 택스프리 정보 (`#dutyfree`)
- **항목 구성**:
  - 면세점/업체명 (예: 돈키호테, 빅카메라 등)
  - 쿠폰/안내 웹사이트 URL (원클릭 브라우저 이동)
  - 면세 조건 메모 (예: "5,000엔 이상 구매 시 10% 면세 + 5% 할인")

### 4. 영수증 등록 및 상세 정산 (`#receipts`)
- **1:N 동적 영수증 구조**:
  - 하나의 영수증 하위에 여러 개 세부 품목(품목명, 수량, 현지 단가)을 동적으로 추가/삭제 가능
- **자동 환율 계산**:
  - 설정한 환율(예: 100엔 = 900원 $\rightarrow$ 9.0)을 적용해 현지 통화 총액 및 원화(KRW) 환산 총액 자동 산출

---

## 📊 Data Schema Specification

```json
{
  "schedules": [
    {
      "id": "sched_1710000000",
      "time": "10:00",
      "place": "도쿄역",
      "lat": 35.6812,
      "lng": 139.7671,
      "mapUrl": "https://maps.app.goo.gl/..."
    }
  ],
  "wishlist": [
    {
      "id": "wish_1710000000",
      "name": "에어리즘 코튼 T",
      "feature": "L / Black",
      "qty": 2,
      "imageUrl": "https://...",
      "memo": "긴자 매장 한정 세일",
      "checked": false
    }
  ],
  "dutyfree": [
    {
      "id": "df_1710000000",
      "name": "돈키호테 할인 쿠폰",
      "url": "https://www.djjapan.net/coupon",
      "note": "5,000엔 이상 10% 면세 + 5% 쿠폰"
    }
  ],
  "receipts": [
    {
      "id": "rcpt_1710000000",
      "store": "빅카메라 아키하바라",
      "rate": 9.0,
      "date": "2026-03-25",
      "items": [
        { "name": "닌텐도 스위치 게임", "qty": 1, "price": 5980 },
        { "name": "SD 카드 128G", "qty": 2, "price": 1500 }
      ],
      "totalLocal": 8980,
      "totalKRW": 80820
    }
  ]
}
```

---

## 🚀 Guidelines for Claude Code CLI Execution

1. **단일 파일 또는 뷰 기반 컴포넌트화**:
   - 단일 `index.html` 파일로 작성하거나, Vite 기반 PWA 구조로 모듈화하여 빌드 환경 설정.
2. **UI/UX 반응형 모바일 프리퍼런스**:
   - 스마트폰 화면(Max-width 440px) 기준 네이티브 앱 느낌의 하단 고정 탭바(Bottom Navigation Bar) 적용.
   - iOS Safe Area 및 터치 영역 고려(`-webkit-tap-highlight-color: transparent`).
3. **CORS 및 외부 API 회피**:
   - 지도는 타일 서버 문제 완화를 위해 OpenStreetMap Free Tile server 활용.
   - 데이터 저장은 100% Client-side 로컬 스토리지 기반으로 구축하여 별도 백엔드 없이 작동하도록 완성.