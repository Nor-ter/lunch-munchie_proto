import { db } from "./db.js";
import { restaurants, courses, courseItems } from "../shared/schema.js";
import { MOCK_RESTAURANTS, MOCK_COURSES } from "./melbourneData.js";

// 멜버른 샘플 데이터는 ./melbourneData.ts 에 정의되어 있으며,
// routes.ts(DB 연결 실패 시 폴백)와 공유한다.
export { MOCK_RESTAURANTS, MOCK_COURSES };

export async function seedDatabase() {
  console.log("Seeding database with Melbourne sample data...");
  try {
    // 코스맵 데모 데이터(레스토랑/코스)를 멜버른 데이터로 교체한다.
    // 의존 순서상 course_items → courses → restaurants 순으로 비운다.
    // (sessions/users/swipes 등 다른 테이블은 건드리지 않는다.)
    await db.delete(courseItems);
    await db.delete(courses);
    await db.delete(restaurants);

    await db.insert(restaurants).values(MOCK_RESTAURANTS);
    console.log(`Inserted ${MOCK_RESTAURANTS.length} restaurants.`);

    for (const c of MOCK_COURSES) {
      const { stops, ...courseData } = c;
      await db.insert(courses).values(courseData);

      const items = stops.map(s => ({
        id: `ci_${c.id}_${s.order}`,
        course_id: c.id,
        restaurant_id: s.placeId,
        order_index: s.order,
        start_time: s.startTime,
        end_time: s.endTime,
        is_bookmarked: s.isBookmarked,
        created_at: new Date()
      }));
      await db.insert(courseItems).values(items);
    }
    console.log(`Inserted ${MOCK_COURSES.length} courses.`);
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}

seedDatabase().then(() => {
  console.log("Seeding check complete.");
  process.exit(0);
}).catch((error) => {
  console.error("Seeding check error:", error);
  process.exit(1);
});
