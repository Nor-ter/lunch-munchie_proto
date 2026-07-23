import type { Course, FeedPost, Restaurant } from '@/contexts/AppContext';

export interface SavedFeedMapPoint {
  id: string;
  feedId: string;
  courseId: string;
  restaurantId: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  post: FeedPost;
}

interface SavedFeedMapSource {
  posts: FeedPost[];
  getCourseById: (courseId: string) => Course | undefined;
  getRestaurantById: (restaurantId: string) => Restaurant | undefined;
}

/**
 * 저장 피드의 코스 장소를 지도 표시용 DTO로 변환한다.
 * DB 연결 시 화면 컴포넌트 대신 이 입력 소스만 실제 course_items ⨝ restaurants 조회로
 * 교체할 수 있도록 로컬 AppContext 모델과 지도 UI 사이의 경계를 고정한다.
 */
export function buildSavedFeedMapPoints({
  posts,
  getCourseById,
  getRestaurantById,
}: SavedFeedMapSource): SavedFeedMapPoint[] {
  return posts.flatMap((post) => {
    const course = getCourseById(post.courseId);
    if (!course) return [];

    return course.stops
      .slice()
      .sort((a, b) => a.order - b.order)
      .flatMap((stop) => {
        const restaurant = getRestaurantById(stop.placeId);
        if (
          !restaurant
          || !Number.isFinite(restaurant.lat)
          || !Number.isFinite(restaurant.lng)
        ) {
          return [];
        }

        return [{
          id: `${post.id}:${restaurant.id}`,
          feedId: post.id,
          courseId: course.id,
          restaurantId: restaurant.id,
          name: restaurant.name,
          category: restaurant.category,
          address: restaurant.address,
          latitude: restaurant.lat,
          longitude: restaurant.lng,
          imageUrl: restaurant.image,
          post,
        }];
      });
  });
}
