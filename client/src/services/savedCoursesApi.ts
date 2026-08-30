type RequestLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SavedCourseRestaurant = {
  id: string;
  name: string;
  category: string;
  photos: string[];
  rating: number | null;
  reviewCount: number;
  priceLevel: number;
  address: string;
  description: string;
  tags: string[];
  dietary: string[];
  menuItems: unknown[];
  phone: string | null;
  openHours: string;
  latitude: number | null;
  longitude: number | null;
};

export type SavedCourseStop = {
  placeId: string;
  order: number;
  startTime: string;
  endTime: string;
  isBookmarked: boolean;
  restaurant: SavedCourseRestaurant;
};

export type CourseApiRecord = {
  id: string;
  title: string;
  description: string;
  heroImage: string;
  tags: string[];
  hashtags: string[];
  region: string | null;
  metadata: {
    distance: number;
    duration: number;
    placeCount: number;
  };
  creatorId: string;
  sourceCourseId?: string | null;
  sourceStopsSnapshot?: Array<{
    placeId: string;
    order: number;
    name: string;
    category: string;
    address: string;
  }>;
  savedCount: number;
  isPublic: boolean;
  createdAt: string;
  stops: SavedCourseStop[];
};

export type CanonicalFeedApiRecord = {
  id: string;
  courseId: string;
  creatorId: string;
  authorName: string | null;
  authorImage: string | null;
  title: string;
  description: string;
  heroImage: string;
  photos: string[];
  decor: Array<Record<string, unknown>>;
  templateId: string | null;
  tags: string[];
  stops: SavedCourseStop[];
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  comments: Array<Record<string, unknown>>;
  createdAt: number | string;
};

export type SavedCourseItem = {
  courseId: string;
  savedAt: string;
  course: CourseApiRecord;
  post: CanonicalFeedApiRecord;
};

export type SavedCoursesResponse = {
  items: SavedCourseItem[];
  courseIds: string[];
};

export type FeedDetailResponse = {
  course: CourseApiRecord;
  post: CanonicalFeedApiRecord;
};

export type SavedCourseMutation = {
  courseId: string;
  saved: boolean;
};

export class SavedCoursesApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SavedCoursesApiError";
    this.status = status;
    this.code = code;
  }
}

function normalizedCourseId(value: string) {
  const courseId = value.trim();
  if (!courseId || courseId.length > 128) {
    throw new SavedCoursesApiError(
      "코스 정보가 올바르지 않습니다.",
      400,
      "INVALID_COURSE_ID",
    );
  }
  return courseId;
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | ({ error?: unknown; code?: unknown } & T)
    | null;
  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "저장한 코스를 불러오지 못했습니다.";
    const code = typeof payload?.code === "string" ? payload.code : undefined;
    throw new SavedCoursesApiError(message, response.status, code);
  }
  return payload as T;
}

export async function fetchSavedCourses(
  request: RequestLike = fetch,
): Promise<SavedCoursesResponse> {
  const response = await request("/api/saved-courses", {
    credentials: "same-origin",
  });
  return responseJson<SavedCoursesResponse>(response);
}

export async function persistSavedCourse(
  courseId: string,
  request: RequestLike = fetch,
): Promise<SavedCourseMutation> {
  const response = await request("/api/saved-courses", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId: normalizedCourseId(courseId) }),
  });
  return responseJson<SavedCourseMutation>(response);
}

export async function removeSavedCourse(
  courseId: string,
  request: RequestLike = fetch,
): Promise<SavedCourseMutation> {
  const response = await request(
    `/api/saved-courses?courseId=${encodeURIComponent(normalizedCourseId(courseId))}`,
    {
      method: "DELETE",
      credentials: "same-origin",
    },
  );
  return responseJson<SavedCourseMutation>(response);
}

export async function fetchCourseById(
  courseId: string,
  request: RequestLike = fetch,
): Promise<CourseApiRecord | null> {
  const response = await request(
    `/api/courses/${encodeURIComponent(normalizedCourseId(courseId))}`,
    { credentials: "same-origin" },
  );
  if (response.status === 404) return null;
  return responseJson<CourseApiRecord>(response);
}

export async function fetchFeedDetailById(
  feedId: string,
  request: RequestLike = fetch,
): Promise<FeedDetailResponse | null> {
  const normalizedFeedId = feedId.trim();
  if (!normalizedFeedId.startsWith("post_") || normalizedFeedId.length > 133) {
    throw new SavedCoursesApiError(
      "피드 정보가 올바르지 않습니다.",
      400,
      "INVALID_FEED_ID",
    );
  }
  const response = await request(
    `/api/feed/${encodeURIComponent(normalizedFeedId)}`,
    { credentials: "same-origin" },
  );
  if (response.status === 404) return null;
  return responseJson<FeedDetailResponse>(response);
}
