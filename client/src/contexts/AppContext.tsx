/**
 * Lunchie Munchie — App Context
 * Design: Soft Coral (Option 8)
 * Manages: courses, restaurants, sessions, profile, swipe data
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TagType = '데이트 코스' | '맛집' | '카페' | '전시/문화' | '액티비티' | '혼자 여행' | '맛집 투어' | '가성비';

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  tags: TagType[];
  rating: number;
  reviewCount: number;
  distance: string;
  address: string;
  image: string;
  lat: number;
  lng: number;
  priceRange: 1 | 2 | 3 | 4;
  openHours: string;
  dietary: string[];
  description: string;
}

export interface CourseStop {
  placeId: string;
  order: number;
  startTime: string;
  endTime: string;
  isBookmarked: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  heroImage: string;
  tags: TagType[];
  hashtags: string[];
  region: string;
  metadata: {
    distance: number;
    duration: number;
    placeCount: number;
  };
  stops: CourseStop[];
  createdAt: string;
  isPublic: boolean;
  creatorId: string;
  savedCount: number;
}

export interface GroupSession {
  id: string;
  name: string;
  inviteCode: string;
  hostId: string;
  members: SessionMember[];
  filters: {
    partySize: number;
    dietary: string[];
    budget: 1 | 2 | 3 | 4;
    radius: number;
    categories: string[];
  };
  deadline: string | null;
  status: 'waiting' | 'voting' | 'completed';
  restaurants: Restaurant[];
  results: { restaurantId: string; score: number }[];
}

export interface SessionMember {
  id: string;
  name: string;
  emoji: string;
  hasVoted?: boolean;
  preferences?: { categoryId: string; score: number }[];
  ready?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  emoji: string;
  dietary: string[];
  categoryPrefs: { category: string; score: number; rank: number }[];
  totalSwipes: number;
  totalLikes: number;
  joinedAt: string;
  isLoggedIn?: boolean;
}

export interface SwipeRecord {
  restaurantId: string;
  action: 'like' | 'save' | 'skip';
  timestamp: string;
  sessionId?: string;
}

const THEMES = [
  { id: 'date', label: '데이트 코스', emoji: '💕', color: '#EB5053', tag: '데이트 코스' as TagType },
  { id: 'solo', label: '혼자 여유 코스', emoji: '☕', color: '#F09D09', tag: '혼자 여행' as TagType },
  { id: 'budget', label: '가성비 맛집', emoji: '💰', color: '#3CBA44', tag: '가성비' as TagType },
  { id: 'special', label: '특별한 날', emoji: '🎁', color: '#3E719B', tag: '전시/문화' as TagType },
];

export { THEMES };

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_default',
  name: '사용자',
  emoji: '🙂',
  dietary: [],
  categoryPrefs: [],
  totalSwipes: 0,
  totalLikes: 0,
  joinedAt: new Date().toISOString(),
  isLoggedIn: false,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  // Courses
  courses: Course[];
  savedCourseIds: string[];
  saveCourse: (courseId: string) => void;
  unsaveCourse: (courseId: string) => void;
  addCourse: (course: Course) => void;

  // Session
  currentSession: GroupSession | null;
  setCurrentSession: (s: GroupSession | null) => void;
  createSession: (name: string, filters: GroupSession['filters'], hostName?: string, emoji?: string, deadlineMinutes?: number) => Promise<GroupSession>;
  joinSession: (token: string, name?: string, emoji?: string) => Promise<GroupSession>;
  fetchSession: (token: string) => Promise<GroupSession>;
  toggleReady: (token: string, isReady: boolean) => Promise<GroupSession>;
  startSession: (token: string) => Promise<GroupSession>;
  swipeRecords: SwipeRecord[];
  addSwipe: (restaurantId: string, action: SwipeRecord['action']) => void;
  likedRestaurantIds: string[];

  // Profile
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Restaurants
  restaurants: Restaurant[];
  getRestaurantById: (id: string) => Restaurant | undefined;
  getCourseById: (id: string) => Course | undefined;
  
  // Loading status
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [savedCourseIds, setSavedCourseIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('lm_saved'); return s ? JSON.parse(s) : ['c1']; }
    catch { return ['c1']; }
  });

  const [currentSession, setCurrentSession] = useState<GroupSession | null>(() => {
    try { const s = localStorage.getItem('lm_session'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  const [swipeRecords, setSwipeRecords] = useState<SwipeRecord[]>(() => {
    try { const s = localStorage.getItem('lm_swipes'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const s = localStorage.getItem('lm_user_profile');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.id === 'user_default') {
          parsed.id = 'user_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('lm_user_profile', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    const newProfile = {
      ...DEFAULT_PROFILE,
      id: 'user_' + Math.random().toString(36).substring(2, 15),
    };
    try {
      localStorage.setItem('lm_user_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.error(e);
    }
    return newProfile;
  });

  // Fetch from DB
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/restaurants').then(r => r.json()),
      fetch('/api/courses').then(r => r.json())
    ]).then(([resData, courseData]) => {
      setRestaurants(resData);
      setCourses(courseData);
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem('lm_saved', JSON.stringify(savedCourseIds)); }, [savedCourseIds]);
  useEffect(() => {
    if (currentSession) localStorage.setItem('lm_session', JSON.stringify(currentSession));
    else localStorage.removeItem('lm_session');
  }, [currentSession]);
  useEffect(() => { localStorage.setItem('lm_swipes', JSON.stringify(swipeRecords)); }, [swipeRecords]);
  useEffect(() => { localStorage.setItem('lm_user_profile', JSON.stringify(profile)); }, [profile]);

  const saveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => {
      if (prev.includes(id)) return prev;
      setCourses(courses => courses.map(c => c.id === id ? { ...c, savedCount: c.savedCount + 1 } : c));
      return [...prev, id];
    });
  }, []);

  const unsaveCourse = useCallback((id: string) => {
    setSavedCourseIds(prev => {
      if (!prev.includes(id)) return prev;
      setCourses(courses => courses.map(c => c.id === id ? { ...c, savedCount: Math.max(0, c.savedCount - 1) } : c));
      return prev.filter(savedId => savedId !== id);
    });
  }, []);

  const addCourse = useCallback((course: Course) => {
    setCourses(prev => [course, ...prev]);
  }, []);

  const createSession = useCallback(async (name: string, filters: GroupSession['filters'], hostName?: string, emoji?: string, deadlineMinutes?: number) => {
    try {
      const actualHostName = hostName || profile.name;
      const actualEmoji = emoji || profile.emoji;

      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: profile.id,
          hostName: actualHostName,
          emoji: actualEmoji,
          name,
          groupSize: filters.partySize,
          filterDistance: filters.radius,
          filterBudget: filters.budget,
          filterCategories: filters.categories,
          filterDietary: filters.dietary,
          deadlineMinutes
        })
      });
      const data = await res.json();
      const session: GroupSession = {
        id: data.session.id,
        name,
        inviteCode: data.token,
        hostId: profile.id,
        members: [{ id: profile.id, name: actualHostName, emoji: actualEmoji, hasVoted: false, ready: false }],
        filters,
        deadline: data.session.deadline_at,
        status: 'waiting',
        restaurants: restaurants.filter(r => filters.categories.length === 0 || filters.categories.includes(r.category)),
        results: [],
      };
      setCurrentSession(session);
      return session;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, [profile, restaurants]);

  const fetchSession = useCallback(async (token: string) => {
    const res = await fetch(`/api/sessions/${token}`);
    if (!res.ok) throw new Error('Session not found');
    const data = await res.json();
    const session: GroupSession = {
      id: data.session.id,
      name: '점심 세션',
      inviteCode: token,
      hostId: data.session.host_user_id,
      members: data.members.map((m: any) => ({
        id: m.user_id,
        name: m.user_name,
        emoji: m.emoji,
        ready: m.is_ready
      })),
      filters: {
         partySize: data.session.group_size,
         dietary: data.session.filter_dietary || [],
         budget: data.session.filter_budget,
         radius: data.session.filter_distance,
         categories: data.session.filter_vibe || []
      },
      deadline: data.session.deadline_at,
      status: data.session.status.toLowerCase() as any,
      restaurants: restaurants.filter(r => 
        (data.session.filter_vibe || []).length === 0 || 
        (data.session.filter_vibe || []).includes(r.category)
      ),
      results: []
    };
    setCurrentSession(session);
    return session;
  }, [restaurants]);

  const joinSession = useCallback(async (token: string, name?: string, emoji?: string) => {
    await fetch(`/api/sessions/${token}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: profile.id, 
        userName: name || profile.name, 
        emoji: emoji || profile.emoji 
      })
    });
    return await fetchSession(token);
  }, [profile, fetchSession]);

  const toggleReady = useCallback(async (token: string, isReady: boolean) => {
    await fetch(`/api/sessions/${token}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, isReady })
    });
    return await fetchSession(token);
  }, [profile, fetchSession]);

  const startSession = useCallback(async (token: string) => {
    await fetch(`/api/sessions/${token}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SWIPING_1' })
    });
    return await fetchSession(token);
  }, [fetchSession]);

  const addSwipe = useCallback((restaurantId: string, action: SwipeRecord['action']) => {
    const record: SwipeRecord = { restaurantId, action, timestamp: new Date().toISOString(), sessionId: currentSession?.id };
    setSwipeRecords(prev => [...prev, record]);
    setProfile(prev => ({
      ...prev,
      totalSwipes: prev.totalSwipes + 1,
      totalLikes: action === 'like' ? prev.totalLikes + 1 : prev.totalLikes,
    }));

    if (currentSession) {
      fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'swipe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          session_id: currentSession.id,
          user_id: profile.id,
          restaurant_id: restaurantId,
          round: 1,
          swipe_action: (action === 'like' || action === 'save') ? 'LIKE' : 'DISLIKE',
          created_at: new Date()
        })
      }).catch(console.error);
    }
  }, [currentSession, profile.id]);

  const likedRestaurantIds = swipeRecords
    .filter(s => s.action === 'like' || s.action === 'save')
    .map(s => s.restaurantId);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const getRestaurantById = useCallback((id: string) => restaurants.find(r => r.id === id), [restaurants]);
  const getCourseById = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  return (
    <AppContext.Provider value={{
      courses, savedCourseIds, saveCourse, unsaveCourse, addCourse,
      currentSession, setCurrentSession, createSession, joinSession, fetchSession, toggleReady, startSession,
      swipeRecords, addSwipe, likedRestaurantIds,
      profile, updateProfile,
      restaurants,
      getRestaurantById, getCourseById,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
