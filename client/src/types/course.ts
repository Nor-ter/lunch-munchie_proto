export interface CoursePlace {
  id: string;
  name: string;
  rating: number;
  distance: string;
  category: string;
  priceLevel: number;
  imageUrl?: string;
  coords: { x: number; y: number };
  /** Display label e.g. 점심, 카페 */
  label?: string;
  time?: string;
  caption?: string;
  color?: string;
  /** 연결된 Restaurant의 실 위경도/주소 — Google 지도(components/map/CourseMap) 렌더용. 없으면 추상 그리드 지도로 폴백. */
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface Course {
  id: string;
  authorHandle: string;
  authorBadge?: string;
  followerCount: string;
  title: string;
  subtitle?: string;
  note?: string;
  region?: string;
  date?: string;
  weather?: string;
  hashtags: string[];
  distanceKm: number;
  durationHours: number;
  saveCount: number;
  places: CoursePlace[];
}
