import { describe, expect, it, vi } from "vitest";
import { app, type EnvBindings } from "./[[path]]";

function createEnv(): EnvBindings {
  const existingPhoto = "/photos/drv_0f86e92497c5/37299089e163.jpg";
  const db = {
    prepare: vi.fn((query: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        all: vi.fn(async () => {
          if (query.startsWith("PRAGMA table_info(users)")) {
            return {
              results: [
                { name: "id" },
                { name: "username" },
                { name: "profile_image_url" },
              ],
            };
          }
          if (query.includes("FROM courses c")) {
            return {
              results: [{
                id: "course-catalogue",
                author_id: "team",
                author_name: "도윤",
                author_image: null,
                title: "CATALOGUE",
                description: "CATALOGUE 다녀왔어요.",
                hero_image: existingPhoto,
                feed_photos: JSON.stringify([
                  existingPhoto,
                  "/photos/drv_0f86e92497c5/cd023fe7cdca.jpg",
                  "/photos/drv_0f86e92497c5/80a83cdcf278.jpg",
                ]),
                feed_decor: JSON.stringify([
                  { id: "ok", src: existingPhoto, x: 0, y: 0, w: 1, h: 1, rotate: 0 },
                  { id: "missing", src: "/photos/drv_0f86e92497c5/cd023fe7cdca.jpg", x: 0, y: 0, w: 1, h: 1, rotate: 0 },
                ]),
                template_id: "pink-picnic",
                tags: JSON.stringify(["카페"]),
                likes_count: 0,
                saves_count: 0,
                comments_count: 0,
                created_at: 0,
              }],
            };
          }
          if (query.includes("FROM course_items")) {
            return {
              results: [{
                restaurant_id: "drv_0f86e92497c5",
                name: "CATALOGUE",
                category: "카페",
                photos: JSON.stringify([
                  existingPhoto,
                  "/photos/drv_0f86e92497c5/80a83cdcf278.jpg",
                ]),
                rating: 0,
              }],
            };
          }
          if (query.includes("FROM course_media") || query.includes("FROM feed_comments")) {
            return { results: [] };
          }
          return { results: [] };
        }),
      };
      return statement;
    }),
  };

  return {
    DB: db,
    PHOTOS_R2: {
      get: vi.fn(async (key: string) =>
        key === "photos/drv_0f86e92497c5/37299089e163.jpg" ? {} : null,
      ),
    },
    USER_DO: {},
    SESSION_DO: {},
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    AUTH_SESSION_SECRET: "test-session-secret",
  };
}

describe("feed media", () => {
  it("omits missing local photo URLs from feed photos, decor, and stops", async () => {
    const response = await app.request("http://localhost/api/feed", {}, createEnv());
    const feed = await response.json<any[]>();

    expect(response.status).toBe(200);
    expect(feed[0].photos).toEqual(["/photos/drv_0f86e92497c5/37299089e163.jpg"]);
    expect(feed[0].decor).toEqual([
      expect.objectContaining({ src: "/photos/drv_0f86e92497c5/37299089e163.jpg" }),
    ]);
    expect(feed[0].stops[0].restaurant.photos).toEqual([
      "/photos/drv_0f86e92497c5/37299089e163.jpg",
    ]);
  });
});
