export interface CoursePlace {
  id: string;
  name: string;
  rating: number;
  distance: string;
  category: string;
  priceLevel: number;
  imageUrl?: string;
  coords: { x: number; y: number };
}

export interface Course {
  id: string;
  authorHandle: string;
  authorBadge?: string;
  followerCount: string;
  title: string;
  hashtags: string[];
  distanceKm: number;
  durationHours: number;
  saveCount: number;
  places: CoursePlace[];
}
