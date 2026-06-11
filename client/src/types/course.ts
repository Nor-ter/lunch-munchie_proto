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
