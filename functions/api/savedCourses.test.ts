import { describe, expect, it, vi } from "vitest";
import { app, type EnvBindings } from "./[[path]]";

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const raw = typeof value === "string" ? value : String.fromCharCode(...value);
  return btoa(raw)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

async function sessionCookie(secret: string, sub: string) {
  const payload = base64Url(
    JSON.stringify({
      sub,
      email: `${sub}@example.test`,
      exp: Date.now() + 60_000,
    }),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = base64Url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
    ),
  );
  return `lm_session=${payload}.${signature}`;
}

type CourseRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  hero_image: string;
  region: string;
  tags: string;
  hashtags: string;
  total_distance: number;
  total_duration: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  is_public: number;
  feed_photos: string;
  feed_decor: string;
  template_id: string | null;
  created_at: number;
};

const course = (
  id: string,
  authorId: string,
  isPublic: boolean,
): CourseRow => ({
  id,
  author_id: authorId,
  title: `${id} title`,
  description: `${id} caption`,
  hero_image:
    id === "public-course" ? "/photos/uploads/author-one/meal.jpg" : "",
  region: "Melbourne",
  tags: '["맛집"]',
  hashtags: '["점심"]',
  total_distance: 1.2,
  total_duration: 90,
  likes_count: 2,
  saves_count: 3,
  comments_count: 1,
  is_public: isPublic ? 1 : 0,
  feed_photos:
    id === "public-course"
      ? '["/photos/uploads/author-one/legacy.jpg"]'
      : "[]",
  feed_decor: "[]",
  template_id: id === "public-course" ? "green-note" : null,
  created_at: 1_788_000_000_000,
});

function database(
  initialSaved: Array<{
    user_id: string;
    course_id: string;
    created_at: number;
  }> = [],
  publicMediaOwnerId = "author-one",
  legacyFeedPhoto = "/photos/uploads/author-one/legacy.jpg",
) {
  const courses = [
    course("public-course", "author-one", true),
    course("own-private", "viewer", false),
    course("other-private", "author-two", false),
  ];
  courses[0]!.feed_photos = JSON.stringify([legacyFeedPhoto]);
  const saved = initialSaved.map((row) => ({ ...row }));
  const users = new Map([
    [
      "author-one",
      { username: "Author One", profile_image_url: "/avatar-one.jpg" },
    ],
    ["viewer", { username: "Viewer", profile_image_url: "/avatar-viewer.jpg" }],
    ["author-two", { username: "Author Two", profile_image_url: null }],
  ]);

  return {
    state: { courses, saved },
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values: unknown[] = [];
      const statement = {
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async first<T>() {
          if (normalized === "SELECT * FROM courses WHERE id = ? LIMIT 1") {
            return (courses.find((item) => item.id === values[0]) ??
              null) as T | null;
          }
          if (normalized.startsWith("SELECT username, profile_image_url FROM users")) {
            return (users.get(String(values[0])) ?? null) as T | null;
          }
          return null;
        },
        async all<T>() {
          if (normalized === "PRAGMA table_info(users)") {
            return {
              results: [
                { name: "id" },
                { name: "username" },
                { name: "profile_image_url" },
              ] as T[],
            };
          }
          if (normalized.includes("FROM saved_courses sc JOIN courses c")) {
            const [viewerId] = values as [string, string];
            const results = saved
              .filter((entry) => entry.user_id === viewerId)
              .flatMap((entry) => {
                const found = courses.find(
                  (item) => item.id === entry.course_id,
                );
                if (
                  !found ||
                  (!found.is_public && found.author_id !== viewerId)
                )
                  return [];
                const author = users.get(found.author_id);
                return [
                  {
                    ...found,
                    saved_course_id: entry.course_id,
                    saved_at: entry.created_at,
                    author_name: author?.username ?? null,
                    author_image: author?.profile_image_url ?? null,
                  },
                ];
              })
              .sort(
                (left, right) =>
                  right.saved_at - left.saved_at ||
                  left.saved_course_id.localeCompare(right.saved_course_id),
              );
            return { results: results as T[] };
          }
          if (normalized.includes("FROM course_items ci JOIN restaurants r")) {
            const courseId = String(values[0]);
            return {
              results:
                courseId === "public-course"
                  ? ([
                      {
                        restaurant_id: "restaurant-one",
                        order_index: 1,
                        start_time: "12:00",
                        end_time: "13:00",
                        is_bookmarked: 0,
                        name: "Lunch Place",
                        category: "Korean",
                        photos: "[]",
                        rating: 4.6,
                        latitude: -37.81,
                        longitude: 144.96,
                      },
                    ] as T[])
                  : [],
            };
          }
          if (normalized.startsWith("SELECT r2_path")) {
            return {
              results:
                values[0] === "public-course"
                  ? ([
                      {
                        r2_path: "/photos/uploads/author-one/meal.jpg",
                        owner_id: publicMediaOwnerId,
                        media_source: "author_upload",
                        placement_index: 0,
                        x: 50,
                        y: 45,
                        width: 40,
                        height: 40,
                        rotation: -3,
                      },
                    ] as T[])
                  : [],
            };
          }
          if (normalized.startsWith("SELECT id, author_id, author_name")) {
            return {
              results:
                values[0] === "public-course"
                  ? ([
                      {
                        id: "comment-one",
                        author_id: "viewer",
                        author_name: "Viewer",
                        author_emoji: "🐳",
                        parent_id: null,
                        body: "좋아요",
                        created_at: 1_788_000_001_000,
                      },
                    ] as T[])
                  : [],
            };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (normalized.startsWith("INSERT OR IGNORE INTO saved_courses")) {
            const [userId, courseId, createdAt] = values as [
              string,
              string,
              number,
            ];
            if (
              !saved.some(
                (entry) =>
                  entry.user_id === userId && entry.course_id === courseId,
              )
            ) {
              saved.push({
                user_id: userId,
                course_id: courseId,
                created_at: createdAt,
              });
            }
          }
          if (normalized.startsWith("DELETE FROM saved_courses")) {
            const [userId, courseId] = values as [string, string];
            for (let index = saved.length - 1; index >= 0; index -= 1) {
              if (
                saved[index].user_id === userId &&
                saved[index].course_id === courseId
              ) {
                saved.splice(index, 1);
              }
            }
          }
          if (normalized.startsWith("UPDATE courses SET saves_count")) {
            const [courseId, targetCourseId] = values as [string, string];
            const target = courses.find((item) => item.id === targetCourseId);
            if (target) {
              target.saves_count = saved.filter(
                (entry) => entry.course_id === courseId,
              ).length;
            }
          }
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements: Array<{ run(): Promise<unknown> }>) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };
}

function env(db = database()) {
  return {
    DB: db,
    PHOTOS_R2: {
      head: vi.fn(async (key: string) =>
        key === "photos/uploads/author-one/meal.jpg" ? { key } : null,
      ),
    },
    USER_DO: {},
    SESSION_DO: {},
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    AUTH_SESSION_SECRET: "saved-course-test-secret",
  } satisfies EnvBindings;
}

async function authHeaders(userId = "viewer") {
  return {
    cookie: await sessionCookie("saved-course-test-secret", userId),
  };
}

describe("server-backed saved courses", () => {
  it.each([
    ["GET", undefined],
    ["PUT", JSON.stringify({ courseId: "public-course" })],
    ["DELETE", undefined],
  ])("requires authentication for %s", async (method, body) => {
    const response = await app.request(
      `http://localhost/api/saved-courses${method === "DELETE" ? "?courseId=public-course" : ""}`,
      {
        method,
        body,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      },
      env(),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTH_REQUIRED",
    });
  });

  it("returns only the current viewer's visible saves with canonical post media", async () => {
    const db = database([
      { user_id: "viewer", course_id: "own-private", created_at: 100 },
      { user_id: "viewer", course_id: "public-course", created_at: 300 },
      { user_id: "viewer", course_id: "other-private", created_at: 400 },
      { user_id: "someone-else", course_id: "public-course", created_at: 500 },
    ]);
    const response = await app.request(
      "http://localhost/api/saved-courses",
      { headers: await authHeaders() },
      env(db),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const payload = await response.json<{
      courseIds: string[];
      items: Array<Record<string, unknown>>;
    }>();
    expect(payload.courseIds).toEqual(["public-course", "own-private"]);
    expect(payload.items[0]).toMatchObject({
      courseId: "public-course",
      savedAt: new Date(300).toISOString(),
      course: {
        id: "public-course",
        creatorId: "author-one",
        metadata: { placeCount: 1 },
      },
      post: {
        id: "post_public-course",
        authorName: "Author One",
        authorImage: "/avatar-one.jpg",
        description: "public-course caption",
        photos: ["/photos/uploads/author-one/meal.jpg"],
        templateId: "green-note",
        comments: [{ id: "comment-one", text: "좋아요" }],
      },
    });
  });

  it("saves a visible course idempotently and hides missing/private existence", async () => {
    const db = database();
    const headers = {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    };
    const save = () =>
      app.request(
        "http://localhost/api/saved-courses",
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ courseId: "public-course" }),
        },
        env(db),
      );

    expect((await save()).status).toBe(200);
    await expect((await save()).json()).resolves.toEqual({
      courseId: "public-course",
      saved: true,
    });
    expect(db.state.saved).toHaveLength(1);
    expect(
      db.state.courses.find((item) => item.id === "public-course")?.saves_count,
    ).toBe(1);

    const inaccessible = await app.request(
      "http://localhost/api/saved-courses",
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ courseId: "other-private" }),
      },
      env(db),
    );
    const missing = await app.request(
      "http://localhost/api/saved-courses",
      { method: "PUT", headers, body: JSON.stringify({ courseId: "missing" }) },
      env(db),
    );
    expect(inaccessible.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await inaccessible.json()).toEqual(await missing.json());
  });

  it("unsaves only the current viewer and remains successful when repeated", async () => {
    const db = database([
      { user_id: "viewer", course_id: "public-course", created_at: 100 },
      { user_id: "someone-else", course_id: "public-course", created_at: 200 },
    ]);
    const headers = await authHeaders();
    const remove = () =>
      app.request(
        "http://localhost/api/saved-courses?courseId=public-course",
        { method: "DELETE", headers },
        env(db),
      );

    await expect((await remove()).json()).resolves.toEqual({
      courseId: "public-course",
      saved: false,
    });
    expect((await remove()).status).toBe(200);
    expect(db.state.saved).toEqual([
      { user_id: "someone-else", course_id: "public-course", created_at: 200 },
    ]);
    expect(
      db.state.courses.find((item) => item.id === "public-course")?.saves_count,
    ).toBe(1);
  });
});

describe("GET /api/courses/:id", () => {
  it("allows anonymous public lookup and the author to read a private course", async () => {
    const db = database();
    const publicResponse = await app.request(
      "http://localhost/api/courses/public-course",
      undefined,
      env(db),
    );
    const privateResponse = await app.request(
      "http://localhost/api/courses/own-private",
      { headers: await authHeaders() },
      env(db),
    );

    expect(publicResponse.status).toBe(200);
    await expect(publicResponse.json()).resolves.toMatchObject({
      id: "public-course",
      creatorId: "author-one",
      stops: [{ placeId: "restaurant-one" }],
    });
    expect(privateResponse.status).toBe(200);
    expect(privateResponse.headers.get("Cache-Control")).toBe(
      "private, no-store",
    );
  });

  it("uses the same 404 contract for an inaccessible private course and a missing id", async () => {
    const db = database();
    const hidden = await app.request(
      "http://localhost/api/courses/other-private",
      { headers: await authHeaders() },
      env(db),
    );
    const missing = await app.request(
      "http://localhost/api/courses/missing",
      { headers: await authHeaders() },
      env(db),
    );

    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    const hiddenBody = await hidden.json();
    const missingBody = await missing.json();
    expect(hiddenBody).toEqual({
      error: "코스를 찾을 수 없습니다.",
      code: "COURSE_NOT_FOUND",
    });
    expect(missingBody).toEqual(hiddenBody);
  });
});

describe("GET /api/feed/:id", () => {
  it("loads a canonical post independently of the paginated feed window", async () => {
    const response = await app.request(
      "http://localhost/api/feed/post_public-course",
      undefined,
      env(database()),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      course: { id: "public-course", stops: [{ placeId: "restaurant-one" }] },
      post: {
        id: "post_public-course",
        creatorId: "author-one",
        authorName: "Author One",
        photos: ["/photos/uploads/author-one/meal.jpg"],
      },
    });
  });

  it("does not reveal an inaccessible private feed", async () => {
    const response = await app.request(
      "http://localhost/api/feed/post_other-private",
      { headers: await authHeaders() },
      env(database()),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "FEED_NOT_FOUND" });
  });

  it("excludes existing course media when its recorded owner does not match the course author", async () => {
    const response = await app.request(
      "http://localhost/api/feed/post_public-course",
      undefined,
      env(database([], "author-two")),
    );

    expect(response.status).toBe(200);
    const payload = await response.json<{
      post: { heroImage: string; photos: string[]; decor: Array<{ src?: string }> };
    }>();
    expect(payload.post.heroImage).toBe("");
    expect(payload.post.photos).toEqual([]);
    expect(payload.post.decor).toEqual([]);
  });

  it("does not resurrect rejected canonical media from the legacy JSON fallback", async () => {
    const rejectedPath = "/photos/uploads/author-one/meal.jpg";
    const response = await app.request(
      "http://localhost/api/feed/post_public-course",
      undefined,
      env(database([], "author-two", rejectedPath)),
    );

    expect(response.status).toBe(200);
    const payload = await response.json<{
      post: { heroImage: string; photos: string[]; decor: Array<{ src?: string }> };
    }>();
    expect(payload.post.heroImage).toBe("");
    expect(payload.post.photos).toEqual([]);
    expect(payload.post.decor).toEqual([]);
  });

  it("rejects an id that is not a canonical post id", async () => {
    const response = await app.request(
      "http://localhost/api/feed/public-course",
      undefined,
      env(database()),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "피드 정보가 올바르지 않습니다.",
      code: "INVALID_FEED_ID",
    });
  });
});
