import { z } from 'zod';

export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  rating: z.number(),
  reviewCount: z.number().default(0),
  priceLevel: z.number().min(1).max(4),
  shortDescription: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dietaryOptions: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
  menuItems: z.array(z.object({ name: z.string(), price: z.number() })).default([]),
  phoneNumber: z.string().optional(),
  businessHours: z.string().optional(),
});

export const CoursePlaceSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
  coords: LatLngSchema,
  orderIndex: z.number(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  memo: z.string().optional(),
  isBookmarked: z.boolean().default(false),
});

export const CourseSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  heroImage: z.string().default(''),
  category: z.string(),
  region: z.string(),
  tags: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  places: z.array(CoursePlaceSchema),
  totalDistance: z.number(),
  totalDuration: z.number(),
  likesCount: z.number().default(0),
  savesCount: z.number().default(0),
  commentsCount: z.number().default(0),
  routePolyline: z.string().optional(),
  shareImageUrl: z.string().optional(),
  isPublic: z.boolean().default(true),
  createdAt: z.string(),
});

export const CourseFilterSchema = z.object({
  region: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  maxDistanceKm: z.number().optional(),
  maxDurationMin: z.number().optional(),
  sortBy: z.enum(['hot', 'mz', 'nearby', 'recent']).default('hot'),
});

export const LunchieSwipeActionSchema = z.enum(['LIKE', 'DISLIKE']);

export const LunchieSessionSchema = z.object({
  id: z.string(),
  hostUserId: z.string(),
  shareToken: z.string(),
  inviteCode: z.string(),
  status: z.enum(['WAITING', 'SWIPING_1', 'SWIPING_2', 'COMPLETED']),
  deadlineAt: z.string(),
  groupSize: z.number(),
  filterDistance: z.number(),
  filterBudget: z.number(),
  filterMinRating: z.number(),
  filterDietary: z.array(z.string()).default([]),
  filterVibe: z.array(z.string()).default([]),
  swipeLimit: z.number(),
  restaurantIds: z.array(z.string()).default([]),
  topRestaurantIds: z.array(z.string()).default([]),
  finalRestaurantId: z.string().optional(),
  createdAt: z.string(),
});

export const SessionMemberSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  userName: z.string(),
  emoji: z.string(),
  isReady: z.boolean().default(false),
  createdAt: z.string(),
});

export const SwipeRecordSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  restaurantId: z.string(),
  round: z.number(),
  swipeAction: LunchieSwipeActionSchema,
  createdAt: z.string(),
});

export const LunchieResultSchema = z.object({
  restaurantId: z.string(),
  likes: z.number(),
  dislikes: z.number(),
  score: z.number(),
});

export type LatLng = z.infer<typeof LatLngSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type CoursePlace = z.infer<typeof CoursePlaceSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type CourseFilter = z.infer<typeof CourseFilterSchema>;
export type LunchieSession = z.infer<typeof LunchieSessionSchema>;
export type SessionMember = z.infer<typeof SessionMemberSchema>;
export type SwipeRecord = z.infer<typeof SwipeRecordSchema>;
export type LunchieResult = z.infer<typeof LunchieResultSchema>;
export type LunchieSwipeAction = z.infer<typeof LunchieSwipeActionSchema>;
