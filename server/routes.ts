import { Router } from "express";
import { db } from "./db.js";
import { users, sessions, restaurants, swipes, courses, courseItems, sessionMembers } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MOCK_RESTAURANTS, MOCK_COURSES } from "./melbourneData.js";

const router = Router();

// DB 연결이 불가능할 때(예: Supabase 일시정지/포트 차단) 코스맵 프로토타입이
// 그대로 동작하도록, 멜버른 샘플 데이터를 API 응답 형태로 변환하는 폴백 헬퍼.
function mockRestaurantsResponse() {
  return MOCK_RESTAURANTS.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    tags: r.tags || [],
    rating: r.rating,
    reviewCount: r.review_count,
    distance: "500m",
    address: r.address,
    image: (r.photos && r.photos.length > 0) ? r.photos[0] : "",
    lat: r.latitude,
    lng: r.longitude,
    priceRange: r.price_level,
    openHours: r.business_hours,
    dietary: r.dietary_options || [],
    description: r.short_description,
  }));
}

function mockCoursesResponse() {
  return MOCK_COURSES.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    heroImage: c.hero_image,
    tags: c.tags || [],
    hashtags: c.hashtags || [],
    region: c.region,
    metadata: {
      distance: c.total_distance,
      duration: c.total_duration,
      placeCount: c.stops.length,
    },
    stops: [...c.stops]
      .sort((a, b) => a.order - b.order)
      .map(s => ({
        placeId: s.placeId,
        order: s.order,
        startTime: s.startTime,
        endTime: s.endTime,
        isBookmarked: s.isBookmarked,
      })),
    createdAt: new Date(c.created_at).toISOString().split('T')[0],
    isPublic: true,
    creatorId: c.author_id,
    savedCount: 0,
  }));
}

// Users
router.get("/users", async (req: any, res: any) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req: any, res: any) => {
  try {
    const newUser = req.body;
    await db.insert(users).values(newUser);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Sessions
router.post("/sessions/create", async (req: any, res: any) => {
  try {
    const { hostId, hostName, emoji, name, groupSize, filterDistance, filterBudget, filterCategories, filterDietary, deadlineMinutes } = req.body;
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionId = `session_${Date.now()}`;
    
    const minutes = Number(deadlineMinutes) || 10;
    const deadlineAt = new Date(Date.now() + 1000 * 60 * minutes);
    
    const newSession = {
      id: sessionId,
      host_user_id: hostId || "unknown",
      share_token: token,
      status: "WAITING",
      deadline_at: deadlineAt,
      group_size: groupSize || 4,
      filter_distance: filterDistance || 1000,
      filter_budget: filterBudget || 2,
      filter_min_rating: 0,
      filter_dietary: filterDietary || [],
      filter_vibe: filterCategories || [],
      swipe_limit: 10,
      created_at: new Date()
    };
    
    await db.insert(sessions).values(newSession as any);
    
    const newMember = {
      id: nanoid(),
      session_id: sessionId,
      user_id: hostId || "unknown",
      user_name: hostName || "Guest",
      emoji: emoji || "👤",
      is_ready: false,
      created_at: new Date()
    };
    
    await db.insert(sessionMembers).values(newMember);
    
    res.status(201).json({ session: newSession, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:token", async (req: any, res: any) => {
  try {
    const token = req.params.token;
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    res.json({ session, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

router.post("/sessions/:token/join", async (req: any, res: any) => {
  try {
    const token = req.params.token;
    const { userId, userName, emoji } = req.body;
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const existing = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    const isAlreadyJoined = existing.find(m => m.user_id === userId);
    
    if (!isAlreadyJoined) {
      await db.insert(sessionMembers).values({
        id: nanoid(),
        session_id: session.id,
        user_id: userId,
        user_name: userName,
        emoji: emoji,
        is_ready: false,
        created_at: new Date()
      });
    } else {
      await db.update(sessionMembers)
        .set({ user_name: userName, emoji: emoji })
        .where(and(eq(sessionMembers.user_id, userId), eq(sessionMembers.session_id, session.id)));
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join session" });
  }
});

router.post("/sessions/:token/ready", async (req: any, res: any) => {
  try {
    const token = req.params.token;
    const { userId, isReady } = req.body;
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    await db.update(sessionMembers)
      .set({ is_ready: isReady })
      .where(and(eq(sessionMembers.user_id, userId), eq(sessionMembers.session_id, session.id)));
      
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ready status" });
  }
});

router.post("/sessions/:token/status", async (req: any, res: any) => {
  try {
    const token = req.params.token;
    const { status } = req.body;
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    await db.update(sessions)
      .set({ status: status.toUpperCase() })
      .where(eq(sessions.share_token, token));
      
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update session status" });
  }
});

router.get("/sessions/:token/results", async (req: any, res: any) => {
  try {
    const token = req.params.token;
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    const sessionSwipes = await db.select().from(swipes).where(eq(swipes.session_id, session.id));
    
    // Calculate completion targetCount based on filtered restaurants in the session
    const allRestaurants = await db.select().from(restaurants);
    const filterVibe: string[] = session.filter_vibe || [];
    const filteredRestaurants = allRestaurants.filter(r => 
      filterVibe.length === 0 || filterVibe.includes(r.category)
    );
    
    const targetCount = Math.min(filteredRestaurants.length, 10);
    
    const completionMap: Record<string, number> = {};
    sessionSwipes.forEach(s => {
      completionMap[s.user_id] = (completionMap[s.user_id] || 0) + 1;
    });
    
    const completedMembers = members.filter(m => (completionMap[m.user_id] || 0) >= targetCount);
    
    const scoresMap: Record<string, { score: number, likeCount: number, dislikeCount: number }> = {};
    sessionSwipes.forEach(s => {
      if (!scoresMap[s.restaurant_id]) {
        scoresMap[s.restaurant_id] = { score: 0, likeCount: 0, dislikeCount: 0 };
      }
      if (s.swipe_action === 'LIKE') {
        scoresMap[s.restaurant_id].score += 14;
        scoresMap[s.restaurant_id].likeCount += 1;
      } else {
        scoresMap[s.restaurant_id].dislikeCount += 1;
      }
    });
    
    const results = Object.entries(scoresMap).map(([restaurantId, data]) => ({
      restaurantId,
      score: data.score,
      likeCount: data.likeCount,
      dislikeCount: data.dislikeCount
    })).sort((a, b) => b.score - a.score);
    
    const memberCompletion = members.map(m => ({
      id: m.user_id,
      name: m.user_name,
      emoji: m.emoji,
      completed: (completionMap[m.user_id] || 0) >= targetCount,
      swipeCount: Math.min(completionMap[m.user_id] || 0, targetCount),
      targetCount
    }));

    const isExpired = Date.now() > new Date(session.deadline_at).getTime();
    if (isExpired && session.status !== 'COMPLETED') {
      await db.update(sessions)
        .set({ status: 'COMPLETED' })
        .where(eq(sessions.id, session.id));
    }

    res.json({
      completedCount: completedMembers.length,
      totalMembers: members.length,
      memberCompletion,
      isExpired,
      deadlineAt: session.deadline_at,
      results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch session results" });
  }
});

// Restaurants
router.get("/restaurants", async (req: any, res: any) => {
  try {
    const allRestaurants = await db.select().from(restaurants);
    const formatted = allRestaurants.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      tags: r.tags || [],
      rating: r.rating,
      reviewCount: r.review_count,
      distance: "500m", // Mock distance
      address: r.address,
      image: (r.photos && r.photos.length > 0) ? r.photos[0] : "",
      lat: r.latitude,
      lng: r.longitude,
      priceRange: r.price_level,
      openHours: r.business_hours,
      dietary: r.dietary_options || [],
      description: r.short_description
    }));
    // DB가 비어 있으면(시드 전) 멜버른 샘플 데이터로 폴백.
    res.json(formatted.length > 0 ? formatted : mockRestaurantsResponse());
  } catch (err) {
    console.error("Falling back to mock restaurants:", (err as Error)?.message);
    res.json(mockRestaurantsResponse());
  }
});

// Courses
router.get("/courses", async (req: any, res: any) => {
  try {
    const allCourses = await db.select().from(courses);
    const allCourseItems = await db.select().from(courseItems);
    
    const formattedCourses = allCourses.map(c => {
      const stops = allCourseItems.filter(ci => ci.course_id === c.id).map(ci => ({
        placeId: ci.restaurant_id,
        order: ci.order_index,
        startTime: ci.start_time,
        endTime: ci.end_time,
        isBookmarked: ci.is_bookmarked
      }));

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        heroImage: c.hero_image,
        tags: c.tags || [],
        hashtags: c.hashtags || [],
        region: c.region,
        metadata: {
          distance: c.total_distance,
          duration: c.total_duration,
          placeCount: stops.length
        },
        stops: stops.sort((a, b) => a.order - b.order),
        createdAt: new Date(c.created_at).toISOString().split('T')[0],
        isPublic: c.is_public,
        creatorId: c.author_id,
        savedCount: c.saves_count
      };
    });
    res.json(formattedCourses.length > 0 ? formattedCourses : mockCoursesResponse());
  } catch (err) {
    console.error("Falling back to mock courses:", (err as Error)?.message);
    res.json(mockCoursesResponse());
  }
});

// Swipes
router.post("/swipes", async (req: any, res: any) => {
  try {
    const { id, session_id, user_id, restaurant_id, round, swipe_action, created_at } = req.body;
    await db.insert(swipes).values({
      id,
      session_id,
      user_id,
      restaurant_id,
      round: Number(round),
      swipe_action,
      created_at: created_at ? new Date(created_at) : new Date()
    });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Failed to insert swipe:", err);
    res.status(500).json({ error: "Failed to insert swipe" });
  }
});

export default router;
