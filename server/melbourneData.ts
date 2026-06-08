// ─────────────────────────────────────────────────────────────────────────────
// Melbourne sample data
// 실제 멜버른에 존재하는 12개 장소 (CBD/레인웨이 6곳 + 피츠로이·콜링우드 6곳).
// 좌표는 실제 위치 기준 근사값이며, 코스맵 오버레이/Leaflet 마커가 좌표로 자동
// 센터링되므로 별도 지도 설정 변경 없이 그대로 동작한다.
//
// 이 모듈은 seed.ts(DB 시드)와 routes.ts(DB 연결 실패 시 폴백)에서 함께 쓴다.
// seed.ts는 import 시점에 자동으로 seed를 실행하므로 routes.ts에서 직접 import하면
// 안 된다 — 그래서 순수 데이터만 이 파일로 분리한다.
// ─────────────────────────────────────────────────────────────────────────────

export interface MockRestaurant {
  id: string;
  name: string;
  category: string;
  tags: string[];
  rating: number;
  review_count: number;
  address: string;
  photos: string[];
  latitude: number;
  longitude: number;
  price_level: number;
  business_hours: string;
  dietary_options: string[];
  short_description: string;
  menu_items: { name: string; price: number }[];
  phone_number: string;
}

export interface MockCourseStop {
  placeId: string;
  order: number;
  startTime: string;
  endTime: string;
  isBookmarked: boolean;
}

export interface MockCourse {
  id: string;
  title: string;
  description: string;
  hero_image: string;
  tags: string[];
  hashtags: string[];
  region: string;
  total_distance: number;
  total_duration: number;
  author_id: string;
  category: string;
  created_at: Date;
  stops: MockCourseStop[];
}

export const MOCK_RESTAURANTS: MockRestaurant[] = [
  // ── 멜버른 CBD & 레인웨이 ──────────────────────────────────────────────
  {
    id: 'r1', name: 'Brother Baba Budan', category: '카페',
    tags: ['카페', '혼자 여행'], rating: 4.6, review_count: 3120,
    address: '359 Little Bourke St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80'],
    latitude: -37.8118, longitude: 144.9606, price_level: 2, business_hours: '07:00–17:00',
    dietary_options: ['비건 옵션'], short_description: '천장에 의자가 매달린 명물 인테리어로 유명한 멜버른 CBD 스페셜티 커피 바.',
    menu_items: [{ name: 'Flat White', price: 5 }, { name: 'Filter Coffee', price: 6 }],
    phone_number: '+61 3 9606 0449',
  },
  {
    id: 'r2', name: 'The Hardware Société', category: '브런치',
    tags: ['맛집', '카페'], rating: 4.5, review_count: 4210,
    address: '123 Hardware St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80'],
    latitude: -37.8112, longitude: 144.9601, price_level: 3, business_hours: '07:30–14:30',
    dietary_options: ['글루텐프리 옵션'], short_description: '프렌치 스타일 브런치 맛집. 바스크 핫초콜릿과 베이크드 에그가 시그니처.',
    menu_items: [{ name: 'Baked Eggs', price: 24 }, { name: 'Churros', price: 14 }],
    phone_number: '+61 3 9078 5992',
  },
  {
    id: 'r3', name: 'Degraves Espresso', category: '카페',
    tags: ['카페', '가성비'], rating: 4.3, review_count: 2890,
    address: '23-25 Degraves St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80'],
    latitude: -37.8166, longitude: 144.9659, price_level: 2, business_hours: '07:00–22:00',
    dietary_options: [], short_description: '멜버른 레인웨이 카페 문화를 대표하는 디그레이브스 거리의 캐주얼 에스프레소 바.',
    menu_items: [{ name: 'Cappuccino', price: 5 }, { name: 'Croissant', price: 6 }],
    phone_number: '+61 3 9654 1245',
  },
  {
    id: 'r4', name: 'MoVida', category: '스페인 타파스',
    tags: ['맛집', '데이트 코스'], rating: 4.6, review_count: 5340,
    address: '1 Hosier Ln, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'],
    latitude: -37.8170, longitude: 144.9690, price_level: 3, business_hours: '12:00–22:00',
    dietary_options: ['글루텐프리 옵션'], short_description: '그래피티로 유명한 호지어 레인에 자리한 정통 스페인 타파스 바.',
    menu_items: [{ name: 'Anchoa', price: 6 }, { name: 'Paella', price: 38 }],
    phone_number: '+61 3 9663 3038',
  },
  {
    id: 'r5', name: 'Chin Chin', category: '모던 타이',
    tags: ['맛집', '데이트 코스'], rating: 4.5, review_count: 8910,
    address: '125 Flinders Ln, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80'],
    latitude: -37.8156, longitude: 144.9700, price_level: 3, business_hours: '11:00–23:00',
    dietary_options: ['비건 옵션'], short_description: '플린더스 레인의 활기 넘치는 모던 타이 레스토랑. 항상 웨이팅이 있는 핫플.',
    menu_items: [{ name: 'Son in Law Eggs', price: 16 }, { name: 'Kingfish Sashimi', price: 26 }],
    phone_number: '+61 3 8663 2000',
  },
  {
    id: 'r6', name: "Pellegrini's Espresso Bar", category: '이탈리안',
    tags: ['맛집', '가성비'], rating: 4.4, review_count: 3670,
    address: '66 Bourke St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80'],
    latitude: -37.8112, longitude: 144.9714, price_level: 2, business_hours: '08:00–22:00',
    dietary_options: [], short_description: '1954년 문을 연 멜버른의 살아있는 역사, 클래식 이탈리안 에스프레소 바.',
    menu_items: [{ name: 'Spaghetti Bolognese', price: 22 }, { name: 'Granita', price: 6 }],
    phone_number: '+61 3 9662 1885',
  },

  // ── 피츠로이 & 콜링우드 ────────────────────────────────────────────────
  {
    id: 'r7', name: 'Industry Beans', category: '카페',
    tags: ['카페', '맛집'], rating: 4.5, review_count: 2540,
    address: '3/62 Rose St, Fitzroy VIC 3065',
    photos: ['https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80'],
    latitude: -37.7979, longitude: 144.9809, price_level: 3, business_hours: '07:00–16:00',
    dietary_options: ['비건 옵션', '글루텐프리 옵션'], short_description: '자체 로스팅으로 유명한 피츠로이의 대형 창고형 스페셜티 커피 카페.',
    menu_items: [{ name: 'Batch Brew', price: 5 }, { name: 'Smashed Avo', price: 22 }],
    phone_number: '+61 3 9417 1294',
  },
  {
    id: 'r8', name: 'Lune Croissanterie', category: '베이커리',
    tags: ['카페', '맛집'], rating: 4.7, review_count: 6120,
    address: '119 Rose St, Fitzroy VIC 3065',
    photos: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'],
    latitude: -37.7977, longitude: 144.9803, price_level: 2, business_hours: '07:30–15:00',
    dietary_options: [], short_description: '세계 최고라 불리는 크루아상 전문점. 오픈 전부터 줄을 서는 피츠로이 성지.',
    menu_items: [{ name: 'Plain Croissant', price: 7 }, { name: 'Kouign-Amann', price: 9 }],
    phone_number: '+61 3 9419 2320',
  },
  {
    id: 'r9', name: 'Gelato Messina', category: '디저트',
    tags: ['맛집', '데이트 코스'], rating: 4.7, review_count: 7340,
    address: '237 Smith St, Fitzroy VIC 3065',
    photos: ['https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&q=80'],
    latitude: -37.7996, longitude: 144.9846, price_level: 1, business_hours: '12:00–23:00',
    dietary_options: ['비건 옵션'], short_description: '호주에서 가장 유명한 젤라또 가게. 매주 바뀌는 스페셜 플레이버가 인기.',
    menu_items: [{ name: 'Two Scoops', price: 9 }, { name: 'Sandwich', price: 12 }],
    phone_number: '+61 3 9417 6328',
  },
  {
    id: 'r10', name: 'Cutler & Co', category: '파인다이닝',
    tags: ['맛집', '데이트 코스'], rating: 4.7, review_count: 1980,
    address: '55-57 Gertrude St, Fitzroy VIC 3065',
    photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'],
    latitude: -37.8077, longitude: 144.9784, price_level: 4, business_hours: '18:00–23:00',
    dietary_options: ['글루텐프리 옵션'], short_description: '거트루드 스트리트의 모던 호주식 파인다이닝. 특별한 날을 위한 테이스팅 메뉴.',
    menu_items: [{ name: 'Tasting Menu', price: 195 }, { name: 'Oysters', price: 8 }],
    phone_number: '+61 3 9419 4888',
  },
  {
    id: 'r11', name: 'Proud Mary', category: '카페',
    tags: ['카페', '맛집'], rating: 4.5, review_count: 4480,
    address: '172 Oxford St, Collingwood VIC 3066',
    photos: ['https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80'],
    latitude: -37.8025, longitude: 144.9869, price_level: 3, business_hours: '07:00–16:00',
    dietary_options: ['비건 옵션'], short_description: '콜링우드의 명물 올데이 브런치 & 스페셜티 커피 로스터리.',
    menu_items: [{ name: 'Single Origin', price: 6 }, { name: 'Ricotta Hotcakes', price: 24 }],
    phone_number: '+61 3 9417 5930',
  },
  {
    id: 'r12', name: 'Smith & Daughters', category: '비건',
    tags: ['맛집', '혼자 여행'], rating: 4.6, review_count: 2210,
    address: '175 Brunswick St, Fitzroy VIC 3065',
    photos: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80'],
    latitude: -37.8047, longitude: 144.9786, price_level: 3, business_hours: '17:00–22:00',
    dietary_options: ['비건 옵션', '글루텐프리 옵션'], short_description: '브런즈윅 스트리트의 100% 식물성 레스토랑. 비건도 만족하는 풍성한 한 끼.',
    menu_items: [{ name: 'Mushroom Parma', price: 28 }, { name: 'Tiramisu', price: 14 }],
    phone_number: '+61 3 9939 3293',
  },

  // ── 한식 ──────────────────────────────────────────────────────────────
  {
    id: 'r13', name: 'Guhng Korean BBQ', category: '한식',
    tags: ['맛집', '맛집 투어'], rating: 4.5, review_count: 1870,
    address: 'Healeys Ln, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'],
    latitude: -37.8096, longitude: 144.9663, price_level: 3, business_hours: '11:30–22:30',
    dietary_options: [], short_description: '멜버른 CBD 한인타운의 인기 한국식 숯불 바비큐. 삼겹살과 갈비가 시그니처.',
    menu_items: [{ name: 'Pork Belly', price: 28 }, { name: 'Galbi', price: 34 }],
    phone_number: '+61 3 9663 6420',
  },
  {
    id: 'r14', name: 'Gami Chicken', category: '치킨',
    tags: ['맛집', '가성비'], rating: 4.4, review_count: 3260,
    address: '396 Little Bourke St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80'],
    latitude: -37.8120, longitude: 144.9612, price_level: 2, business_hours: '11:30–22:00',
    dietary_options: [], short_description: '바삭한 한국식 양념치킨과 생맥주로 유명한 멜버른 인기 체인.',
    menu_items: [{ name: 'Yangnyeom Chicken', price: 24 }, { name: 'Soy Garlic', price: 24 }],
    phone_number: '+61 3 9077 8189',
  },
  {
    id: 'r15', name: 'Kong BBQ', category: '한식',
    tags: ['맛집', '데이트 코스'], rating: 4.5, review_count: 2440,
    address: '599 Church St, Richmond VIC 3121',
    photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'],
    latitude: -37.8243, longitude: 145.0008, price_level: 3, business_hours: '17:30–22:00',
    dietary_options: [], short_description: '코리안 바비큐에 일식·멕시칸을 더한 리치먼드의 퓨전 BBQ 핫플.',
    menu_items: [{ name: 'Wagyu Bulgogi', price: 38 }, { name: 'Kimchi Fried Rice', price: 16 }],
    phone_number: '+61 3 9428 3187',
  },

  // ── 중식 ──────────────────────────────────────────────────────────────
  {
    id: 'r16', name: 'HuTong Dumpling Bar', category: '중식',
    tags: ['맛집', '맛집 투어'], rating: 4.5, review_count: 5120,
    address: '14-16 Market Ln, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80'],
    latitude: -37.8119, longitude: 144.9684, price_level: 2, business_hours: '11:30–22:00',
    dietary_options: [], short_description: '멜버른 차이나타운의 샤오롱바오 성지. 육즙 가득한 수제 만두가 일품.',
    menu_items: [{ name: 'Xiao Long Bao', price: 13 }, { name: 'Pan-fried Dumplings', price: 13 }],
    phone_number: '+61 3 9650 8128',
  },
  {
    id: 'r17', name: 'Tim Ho Wan', category: '중식',
    tags: ['맛집', '가성비'], rating: 4.3, review_count: 4380,
    address: '206 Bourke St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80'],
    latitude: -37.8112, longitude: 144.9672, price_level: 2, business_hours: '10:00–21:30',
    dietary_options: [], short_description: '미슐랭 딤섬으로 유명한 홍콩 브랜드. 바비큐 포크 번이 시그니처.',
    menu_items: [{ name: 'BBQ Pork Bun', price: 9 }, { name: 'Har Gow', price: 10 }],
    phone_number: '+61 3 9650 6388',
  },
  {
    id: 'r18', name: 'Supper Inn', category: '중식',
    tags: ['맛집', '혼자 여행'], rating: 4.4, review_count: 1760,
    address: '15 Celestial Ave, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80'],
    latitude: -37.8116, longitude: 144.9689, price_level: 2, business_hours: '17:30–02:30',
    dietary_options: [], short_description: '새벽까지 여는 차이나타운 광둥식 노포. 야식으로 사랑받는 숨은 명소.',
    menu_items: [{ name: 'Congee', price: 12 }, { name: 'Roast Duck', price: 22 }],
    phone_number: '+61 3 9663 4759',
  },

  // ── 일식 ──────────────────────────────────────────────────────────────
  {
    id: 'r19', name: 'Supernormal', category: '일식',
    tags: ['맛집', '데이트 코스'], rating: 4.6, review_count: 3910,
    address: '180 Flinders Ln, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80'],
    latitude: -37.8159, longitude: 144.9694, price_level: 3, business_hours: '11:00–23:00',
    dietary_options: ['비건 옵션'], short_description: '플린더스 레인의 모던 아시안. 시그니처 랍스터 롤이 유명한 핫플.',
    menu_items: [{ name: 'Lobster Roll', price: 18 }, { name: 'Dumplings', price: 16 }],
    phone_number: '+61 3 9650 8688',
  },
  {
    id: 'r20', name: 'Izakaya Den', category: '일식',
    tags: ['맛집', '데이트 코스'], rating: 4.5, review_count: 2130,
    address: '114 Russell St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'],
    latitude: -37.8136, longitude: 144.9676, price_level: 3, business_hours: '17:00–23:00',
    dietary_options: [], short_description: '러셀 스트리트 지하의 분위기 좋은 정통 이자카야. 사케와 안주가 훌륭.',
    menu_items: [{ name: 'Sashimi Plate', price: 26 }, { name: 'Karaage', price: 14 }],
    phone_number: '+61 3 9654 2977',
  },
  {
    id: 'r21', name: 'Minamishima', category: '일식',
    tags: ['맛집', '데이트 코스'], rating: 4.8, review_count: 980,
    address: '4 Lord St, Richmond VIC 3121',
    photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'],
    latitude: -37.8189, longitude: 144.9987, price_level: 4, business_hours: '18:00–22:00',
    dietary_options: [], short_description: '멜버른 최고의 스시 오마카세. 예약 필수의 프리미엄 에도마에 스시.',
    menu_items: [{ name: 'Omakase', price: 225 }, { name: 'Sake Pairing', price: 95 }],
    phone_number: '+61 3 9429 5180',
  },

  // ── 이탈리안 ──────────────────────────────────────────────────────────
  {
    id: 'r22', name: 'Tipo 00', category: '이탈리안',
    tags: ['맛집', '데이트 코스'], rating: 4.6, review_count: 4070,
    address: '361 Little Bourke St, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80'],
    latitude: -37.8119, longitude: 144.9609, price_level: 3, business_hours: '12:00–22:00',
    dietary_options: ['비건 옵션'], short_description: '멜버른을 대표하는 수제 파스타 바. 늘 붐비는 CBD 이탈리안 맛집.',
    menu_items: [{ name: 'Squid Ink Spaghetti', price: 30 }, { name: 'Tagliatelle', price: 28 }],
    phone_number: '+61 3 9942 3946',
  },
  {
    id: 'r23', name: 'DOC Pizza & Mozzarella Bar', category: '이탈리안',
    tags: ['맛집', '가성비'], rating: 4.4, review_count: 3550,
    address: '295 Drummond St, Carlton VIC 3053',
    photos: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80'],
    latitude: -37.7996, longitude: 144.9671, price_level: 2, business_hours: '12:00–22:00',
    dietary_options: ['비건 옵션'], short_description: '칼튼 라이곤 스트리트 인근의 나폴리 피자 & 모짜렐라 바.',
    menu_items: [{ name: 'Margherita', price: 22 }, { name: 'Burrata', price: 16 }],
    phone_number: '+61 3 9347 8482',
  },

  // ── 고기/그릴 ─────────────────────────────────────────────────────────
  {
    id: 'r24', name: 'San Telmo', category: '스테이크',
    tags: ['맛집', '데이트 코스'], rating: 4.5, review_count: 2280,
    address: '14 Meyers Pl, Melbourne VIC 3000',
    photos: ['https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80'],
    latitude: -37.8118, longitude: 144.9708, price_level: 4, business_hours: '12:00–23:00',
    dietary_options: [], short_description: '아르헨티나식 숯불 그릴(아사도) 전문점. 두툼한 스테이크가 명물.',
    menu_items: [{ name: 'Ribeye 400g', price: 62 }, { name: 'Provoleta', price: 18 }],
    phone_number: '+61 3 9650 5525',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 코스 여러 버전:
//  - c1: 3개 장소 (CBD 커피 산책)
//  - c2: 4개 장소 (플린더스 레인 미식)
//  - c3: 5개 장소 (피츠로이 하루 종일)
//  - c4: 3개 장소 (피츠로이 디저트 & 비건)
//  - c5: 4개 장소 (CBD→피츠로이 크로스 데이트)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_COURSES: MockCourse[] = [
  {
    id: 'c1',
    title: '멜버른 CBD 커피 & 레인웨이',
    description: '멜버른 커피 문화의 정수를 맛보는 도심 레인웨이 산책 코스.',
    hero_image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    tags: ['카페', '혼자 여행'],
    hashtags: ['#멜버른커피', '#레인웨이', '#CBD', '#카페투어'],
    region: '멜버른 CBD',
    total_distance: 0.9,
    total_duration: 180,
    author_id: 'user1',
    category: '카페',
    created_at: new Date('2026-05-28'),
    stops: [
      { placeId: 'r1', order: 1, startTime: '09:00', endTime: '09:50', isBookmarked: false },
      { placeId: 'r3', order: 2, startTime: '10:10', endTime: '11:00', isBookmarked: true },
      { placeId: 'r6', order: 3, startTime: '11:20', endTime: '12:30', isBookmarked: false },
    ],
  },
  {
    id: 'c2',
    title: '플린더스 레인 미식 투어',
    description: '브런치부터 타파스, 모던 타이까지 플린더스 레인을 따라가는 맛집 코스.',
    hero_image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80',
    tags: ['맛집', '데이트 코스'],
    hashtags: ['#플린더스레인', '#멜버른맛집', '#브런치', '#타파스'],
    region: '플린더스 레인',
    total_distance: 1.3,
    total_duration: 300,
    author_id: 'user2',
    category: '맛집',
    created_at: new Date('2026-05-25'),
    stops: [
      { placeId: 'r2', order: 1, startTime: '09:30', endTime: '10:50', isBookmarked: false },
      { placeId: 'r3', order: 2, startTime: '11:10', endTime: '11:50', isBookmarked: false },
      { placeId: 'r4', order: 3, startTime: '12:30', endTime: '14:00', isBookmarked: true },
      { placeId: 'r5', order: 4, startTime: '18:00', endTime: '19:30', isBookmarked: false },
    ],
  },
  {
    id: 'c3',
    title: '피츠로이 하루 종일 코스',
    description: '커피, 크루아상, 젤라또, 그리고 파인다이닝까지 — 피츠로이를 온전히 즐기는 풀데이 코스.',
    hero_image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    tags: ['맛집', '데이트 코스'],
    hashtags: ['#피츠로이', '#멜버른', '#카페', '#파인다이닝', '#하루코스'],
    region: '피츠로이',
    total_distance: 2.6,
    total_duration: 420,
    author_id: 'user3',
    category: '데이트',
    created_at: new Date('2026-05-22'),
    stops: [
      { placeId: 'r7', order: 1, startTime: '08:30', endTime: '09:30', isBookmarked: false },
      { placeId: 'r8', order: 2, startTime: '09:50', endTime: '10:40', isBookmarked: true },
      { placeId: 'r9', order: 3, startTime: '14:00', endTime: '14:40', isBookmarked: false },
      { placeId: 'r12', order: 4, startTime: '17:30', endTime: '18:40', isBookmarked: false },
      { placeId: 'r10', order: 5, startTime: '19:00', endTime: '21:30', isBookmarked: true },
    ],
  },
  {
    id: 'c4',
    title: '피츠로이 디저트 & 비건',
    description: '달콤한 크루아상과 젤라또, 식물성 디너로 마무리하는 가벼운 저녁 코스.',
    hero_image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=800&q=80',
    tags: ['카페', '혼자 여행'],
    hashtags: ['#디저트', '#비건', '#피츠로이', '#젤라또'],
    region: '피츠로이',
    total_distance: 0.7,
    total_duration: 150,
    author_id: 'user2',
    category: '카페',
    created_at: new Date('2026-05-20'),
    stops: [
      { placeId: 'r8', order: 1, startTime: '11:00', endTime: '11:40', isBookmarked: false },
      { placeId: 'r9', order: 2, startTime: '15:00', endTime: '15:40', isBookmarked: false },
      { placeId: 'r12', order: 3, startTime: '18:00', endTime: '19:30', isBookmarked: true },
    ],
  },
  {
    id: 'c5',
    title: 'CBD → 피츠로이 크로스 데이트',
    description: '도심 커피로 시작해 모던 타이 점심, 콜링우드 카페, 거트루드 파인다이닝으로 이어지는 하루 데이트.',
    hero_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    tags: ['데이트 코스', '맛집'],
    hashtags: ['#데이트', '#멜버른', '#CBD', '#콜링우드', '#피츠로이'],
    region: '멜버른',
    total_distance: 4.5,
    total_duration: 360,
    author_id: 'user1',
    category: '데이트',
    created_at: new Date('2026-05-18'),
    stops: [
      { placeId: 'r1', order: 1, startTime: '09:00', endTime: '09:50', isBookmarked: false },
      { placeId: 'r5', order: 2, startTime: '12:00', endTime: '13:30', isBookmarked: true },
      { placeId: 'r11', order: 3, startTime: '15:00', endTime: '16:00', isBookmarked: false },
      { placeId: 'r10', order: 4, startTime: '19:00', endTime: '21:30', isBookmarked: false },
    ],
  },

  // ── 요리별 테마 코스 ────────────────────────────────────────────────────
  {
    id: 'c6',
    title: '서울 in 멜버른: 한식 코스',
    description: '숯불 바비큐부터 양념치킨까지, 멜버른에서 즐기는 진짜 한식 투어.',
    hero_image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    tags: ['맛집', '맛집 투어'],
    hashtags: ['#한식', '#코리안BBQ', '#멜버른맛집', '#치킨'],
    region: '멜버른 CBD',
    total_distance: 5.2,
    total_duration: 300,
    author_id: 'user2',
    category: '한식',
    created_at: new Date('2026-06-02'),
    stops: [
      { placeId: 'r13', order: 1, startTime: '12:00', endTime: '13:30', isBookmarked: false },
      { placeId: 'r14', order: 2, startTime: '17:00', endTime: '18:00', isBookmarked: true },
      { placeId: 'r15', order: 3, startTime: '18:30', endTime: '20:30', isBookmarked: false },
    ],
  },
  {
    id: 'c7',
    title: '차이나타운 딤섬 & 광둥 코스',
    description: '멜버른 차이나타운에서 샤오롱바오, 미슐랭 딤섬, 심야 광둥식까지.',
    hero_image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80',
    tags: ['맛집', '맛집 투어'],
    hashtags: ['#중식', '#차이나타운', '#딤섬', '#만두'],
    region: '차이나타운',
    total_distance: 0.5,
    total_duration: 240,
    author_id: 'user3',
    category: '중식',
    created_at: new Date('2026-06-03'),
    stops: [
      { placeId: 'r16', order: 1, startTime: '12:00', endTime: '13:20', isBookmarked: true },
      { placeId: 'r17', order: 2, startTime: '13:40', endTime: '14:40', isBookmarked: false },
      { placeId: 'r18', order: 3, startTime: '18:00', endTime: '19:30', isBookmarked: false },
    ],
  },
  {
    id: 'c8',
    title: '멜버른 이자카야 & 오마카세',
    description: '모던 아시안 다이닝으로 시작해 이자카야, 그리고 프리미엄 스시 오마카세로.',
    hero_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    tags: ['맛집', '데이트 코스'],
    hashtags: ['#일식', '#이자카야', '#오마카세', '#스시'],
    region: '멜버른',
    total_distance: 4.8,
    total_duration: 330,
    author_id: 'user1',
    category: '일식',
    created_at: new Date('2026-06-04'),
    stops: [
      { placeId: 'r19', order: 1, startTime: '12:00', endTime: '13:30', isBookmarked: false },
      { placeId: 'r20', order: 2, startTime: '17:30', endTime: '19:00', isBookmarked: false },
      { placeId: 'r21', order: 3, startTime: '19:30', endTime: '21:30', isBookmarked: true },
    ],
  },
  {
    id: 'c9',
    title: '파스타·피자 이탈리안 코스',
    description: '수제 파스타, 클래식 에스프레소 바, 나폴리 피자로 이어지는 이탈리안 미식.',
    hero_image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
    tags: ['맛집', '데이트 코스'],
    hashtags: ['#이탈리안', '#파스타', '#피자', '#멜버른'],
    region: '멜버른 CBD',
    total_distance: 2.4,
    total_duration: 270,
    author_id: 'user2',
    category: '이탈리안',
    created_at: new Date('2026-06-05'),
    stops: [
      { placeId: 'r22', order: 1, startTime: '12:00', endTime: '13:30', isBookmarked: true },
      { placeId: 'r6', order: 2, startTime: '15:00', endTime: '16:00', isBookmarked: false },
      { placeId: 'r23', order: 3, startTime: '18:30', endTime: '20:00', isBookmarked: false },
    ],
  },

  // ── 위트 있는 이름의 코스 ──────────────────────────────────────────────
  {
    id: 'c10',
    title: '저기압일 땐 고기 앞으로',
    description: '기분이 가라앉는 날엔 역시 고기. 숯불 한우, 아르헨티나 아사도, 코리안 BBQ에 파인다이닝 고기까지 — 고기로 시작해 고기로 끝나는 날.',
    hero_image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80',
    tags: ['맛집', '맛집 투어'],
    hashtags: ['#고기맛집', '#육식주의', '#저기압엔고기', '#멜버른'],
    region: '멜버른',
    total_distance: 7.6,
    total_duration: 420,
    author_id: 'user1',
    category: '고기',
    created_at: new Date('2026-06-06'),
    stops: [
      { placeId: 'r13', order: 1, startTime: '12:00', endTime: '13:30', isBookmarked: false },
      { placeId: 'r24', order: 2, startTime: '15:00', endTime: '16:30', isBookmarked: true },
      { placeId: 'r15', order: 3, startTime: '18:00', endTime: '19:30', isBookmarked: false },
      { placeId: 'r10', order: 4, startTime: '20:00', endTime: '22:00', isBookmarked: true },
    ],
  },
  {
    id: 'c11',
    title: '탄수화물은 죄가 없다',
    description: '크루아상으로 시작해 파스타, 피자로 달리는 무한 탄수화물 코스. 다이어트는 내일부터.',
    hero_image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    tags: ['카페', '맛집'],
    hashtags: ['#탄수화물', '#빵순이', '#파스타', '#피자', '#치팅데이'],
    region: '멜버른',
    total_distance: 3.0,
    total_duration: 240,
    author_id: 'user3',
    category: '디저트',
    created_at: new Date('2026-06-07'),
    stops: [
      { placeId: 'r8', order: 1, startTime: '09:00', endTime: '10:00', isBookmarked: true },
      { placeId: 'r22', order: 2, startTime: '12:30', endTime: '14:00', isBookmarked: false },
      { placeId: 'r23', order: 3, startTime: '18:00', endTime: '19:30', isBookmarked: false },
    ],
  },
];
