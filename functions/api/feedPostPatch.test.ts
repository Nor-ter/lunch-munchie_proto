import { describe, expect, it } from "vitest";
import { onRequest } from "./[[path]]";

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const raw = typeof value === "string" ? value : String.fromCharCode(...value);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

async function sessionCookie(secret: string, sub: string) {
  const payload = base64Url(JSON.stringify({
    sub,
    email: `${sub}@example.test`,
    exp: Date.now() + 60_000,
  }));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = base64Url(new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  ));
  return `lm_session=${payload}.${signature}`;
}

function patchDatabase(sharedReferenceCount = 0, hasCanonicalMedia = true) {
  const oldPhoto = "/photos/uploads/author/old.jpg";
  const oldStory = JSON.stringify([{
    id: "old-slide",
    photo: oldPhoto,
    overlays: [],
  }]);
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const queued = new Map<string, string>();
  const deletedR2Keys: string[] = [];

  return {
    batches,
    queued,
    deletedR2Keys,
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values: unknown[] = [];
      const statement = {
        sql: normalized,
        get values() {
          return values;
        },
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async first() {
          if (normalized.startsWith("SELECT id, author_id, hero_image, feed_photos")) {
            return {
              id: "course-one",
              author_id: "author",
              hero_image: oldPhoto,
              feed_photos: JSON.stringify([oldPhoto]),
              feed_decor: JSON.stringify([{
                id: "old-photo",
                src: oldPhoto,
                x: 50,
                y: 50,
                w: 80,
                h: 80,
                rotate: 0,
              }]),
              feed_story: oldStory,
              template_id: "old-template",
            };
          }
          if (normalized.includes("SELECT COUNT(*) AS count FROM r2_media_deletions"))
            return { count: queued.size };
          if (normalized.includes("AS count")) return { count: sharedReferenceCount };
          return null;
        },
        async all() {
          if (normalized.includes("SELECT r2_path, owner_id FROM r2_media_deletions")) {
            const entries = Array.from(queued, ([r2_path, owner_id]) => ({
              r2_path,
              owner_id,
            }));
            return {
              results: normalized.includes("WHERE r2_path IN")
                ? entries.filter((entry) => values.includes(entry.r2_path))
                : entries,
            };
          }
          if (normalized.includes("FROM course_media")) {
            return { results: hasCanonicalMedia ? [{
              r2_path: oldPhoto,
              owner_id: "author",
              media_source: "author_upload",
              placement_index: 0,
              x: 50,
              y: 50,
              width: 80,
              height: 80,
              rotation: 0,
            }] : [] };
          }
          if (normalized.includes("FROM course_items"))
            return { results: [{ restaurant_id: "restaurant-one" }] };
          if (normalized.includes("FROM course_photo_attributions")) {
            return { results: [{
              r2_path: oldPhoto,
              restaurant_id: "restaurant-one",
              classification: "restaurant",
              attribution_source: "user_selected",
            }] };
          }
          return { results: [] };
        },
        async run() {
          if (normalized.startsWith("INSERT OR IGNORE INTO r2_media_deletions"))
            queued.set(String(values[0]), String(values[1]));
          if (normalized.startsWith("DELETE FROM r2_media_deletions"))
            queued.delete(String(values[0]));
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements: Array<{ sql: string; values: unknown[]; run(): Promise<unknown> }>) {
      batches.push(statements.map(statement => ({
        sql: statement.sql,
        values: statement.values.slice(),
      })));
      return Promise.all(statements.map(statement => statement.run()));
    },
  };
}

async function patchFeed(
  db: ReturnType<typeof patchDatabase>,
  body: Record<string, unknown>,
  photosExist = true,
) {
  const secret = "feed-patch-secret";
  return onRequest({
    request: new Request("https://example.test/api/feed-post", {
      method: "PATCH",
      headers: {
        cookie: await sessionCookie(secret, "author"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courseId: "course-one", caption: "Updated", ...body }),
    }),
    env: {
      DB: db,
      AUTH_SESSION_SECRET: secret,
      PHOTOS_R2: {
        head: async () => photosExist ? ({ etag: 'present' }) : null,
        delete: async (key: string) => {
          db.deletedR2Keys.push(key);
        },
      },
    },
  } as any);
}

describe("feed post patch", () => {
  it("atomically replaces canonical media, caption, template, and sanitized story", async () => {
    const db = patchDatabase();
    const photo = "/photos/uploads/author/new.jpg";
    const response = await patchFeed(db, {
      heroImage: photo,
      feedPhotos: [photo],
      feedDecor: [{
        id: "new-photo",
        src: photo,
        x: -10,
        y: 120,
        w: 90,
        h: 110,
        rotate: 400,
      }],
      templateId: "story-template",
      storySlides: [{
        id: "new-slide",
        photo,
        overlays: [{
          id: "valid-review",
          kind: "review",
          text: "Perfect lunch",
          restaurantId: "restaurant-one",
          x: 40,
          y: 85,
          width: 88,
          tone: "dark",
          size: "md",
          align: "center",
        }, {
          id: "forged-stop",
          kind: "restaurant_name",
          restaurantId: "restaurant-two",
        }],
      }, {
        id: "foreign-slide",
        photo: "/photos/uploads/someone-else/foreign.jpg",
        overlays: [],
      }],
      photoAttributions: [{
        r2Path: photo,
        classification: "restaurant",
        restaurantId: "restaurant-one",
        source: "user_selected",
      }],
    });
    const payload = await response.json<any>();

    expect(response.status).toBe(200);
    expect(payload.storySlides).toEqual([{
      id: "new-slide",
      photo,
      overlays: [expect.objectContaining({
        id: "valid-review",
        kind: "review",
        restaurantId: "restaurant-one",
      })],
    }]);
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toHaveLength(6);
    const update = db.batches[0]![0]!;
    expect(update.sql).toContain("UPDATE courses SET description");
    expect(update.values[0]).toBe("Updated");
    expect(update.values[1]).toBe(photo);
    expect(JSON.parse(String(update.values[2]))).toEqual([photo]);
    expect(JSON.parse(String(update.values[3]))).toEqual([expect.objectContaining({
      src: photo,
      x: 0,
      y: 100,
      h: 100,
      rotate: 180,
    })]);
    expect(JSON.parse(String(update.values[4]))).toEqual(payload.storySlides);
    expect(update.values[5]).toBe("story-template");
    expect(db.batches[0]![1]!.sql).toContain("DELETE FROM course_media");
    expect(db.batches[0]![2]!.sql).toContain("INSERT INTO course_media");
    expect(db.batches[0]![3]!.sql).toContain("DELETE FROM course_photo_attributions");
    expect(db.batches[0]![4]!.sql).toContain("INSERT INTO course_photo_attributions");
    expect(db.batches[0]![4]!.values.slice(2, 6)).toEqual([
      photo,
      "restaurant-one",
      "restaurant",
      "user_selected",
    ]);
    expect(db.batches[0]![5]!.sql).toContain("INSERT OR IGNORE INTO r2_media_deletions");
    expect(db.batches[0]![5]!.values[0]).toBe("/photos/uploads/author/old.jpg");
    expect(db.deletedR2Keys).toEqual(["photos/uploads/author/old.jpg"]);
    expect(db.queued.size).toBe(0);
    expect(payload.mediaCleanupPending).toBe(0);
  });

  it("keeps the existing server media for caption-only edits", async () => {
    const db = patchDatabase();
    const response = await patchFeed(db, {});
    const payload = await response.json<any>();

    expect(response.status).toBe(200);
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toHaveLength(1);
    const update = db.batches[0]![0]!;
    expect(JSON.parse(String(update.values[2]))).toEqual([
      "/photos/uploads/author/old.jpg",
    ]);
    expect(payload.storySlides).toEqual([{
      id: "old-slide",
      photo: "/photos/uploads/author/old.jpg",
      overlays: [],
    }]);
    expect(payload.photoAttributions).toEqual([{
      r2Path: "/photos/uploads/author/old.jpg",
      restaurantId: "restaurant-one",
      classification: "restaurant",
      source: "user_selected",
    }]);
  });

  it("preserves JSON-only legacy media and story during a caption-only edit", async () => {
    const db = patchDatabase(0, false);
    const response = await patchFeed(db, {});
    const payload = await response.json<any>();

    expect(response.status).toBe(200);
    expect(payload.feedPhotos).toEqual(["/photos/uploads/author/old.jpg"]);
    expect(payload.storySlides).toEqual([{
      id: "old-slide",
      photo: "/photos/uploads/author/old.jpg",
      overlays: [],
    }]);
  });

  it("rejects an owner-shaped photo path when the R2 object does not exist", async () => {
    const db = patchDatabase();
    const photo = "/photos/uploads/author/missing.jpg";
    const response = await patchFeed(db, {
      feedPhotos: [photo],
      feedDecor: [{ id: "missing", src: photo, x: 50, y: 50, w: 80, h: 80, rotate: 0 }],
    }, false);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "업로드가 완료된 사진만 저장할 수 있습니다.",
    });
    expect(db.batches).toHaveLength(0);
  });

  it("rejects a partial media replacement before writing", async () => {
    const db = patchDatabase();
    const response = await patchFeed(db, {
      feedPhotos: ["/photos/uploads/author/new.jpg"],
    });

    expect(response.status).toBe(400);
    expect(db.batches).toHaveLength(0);
  });

  it("rejects attribution to a restaurant outside the course", async () => {
    const db = patchDatabase();
    const response = await patchFeed(db, {
      photoAttributions: [{
        r2Path: "/photos/uploads/author/old.jpg",
        classification: "restaurant",
        restaurantId: "restaurant-two",
        source: "user_selected",
      }],
    });

    expect(response.status).toBe(400);
    expect(db.batches).toHaveLength(0);
  });

  it("preserves attribution through an edited derivative and defaults a new photo to other", async () => {
    const db = patchDatabase();
    const editedPhoto = "/photos/uploads/author/edited.jpg";
    const newPhoto = "/photos/uploads/author/new-extra.jpg";
    const response = await patchFeed(db, {
      feedPhotos: [editedPhoto, newPhoto],
      feedDecor: [{
        id: "edited-photo",
        src: editedPhoto,
        originalSrc: "/photos/uploads/author/old.jpg",
        x: 30,
        y: 40,
        w: 50,
        h: 50,
        rotate: 0,
      }, {
        id: "new-photo",
        src: newPhoto,
        x: 70,
        y: 60,
        w: 50,
        h: 50,
        rotate: 0,
      }],
    });
    const payload = await response.json<any>();

    expect(response.status).toBe(200);
    expect(payload.photoAttributions).toEqual([{
      r2Path: editedPhoto,
      restaurantId: "restaurant-one",
      classification: "restaurant",
      source: "user_selected",
    }, {
      r2Path: newPhoto,
      restaurantId: null,
      classification: "other",
      source: "other",
    }]);
    const attributionInserts = db.batches[0]!.filter(statement =>
      statement.sql.includes("INSERT INTO course_photo_attributions")
    );
    expect(attributionInserts).toHaveLength(2);
    expect(attributionInserts.map(statement => statement.values.slice(2, 6))).toEqual([
      [editedPhoto, "restaurant-one", "restaurant", "user_selected"],
      [newPhoto, null, "other", "other"],
    ]);
    expect(db.deletedR2Keys).toEqual(["photos/uploads/author/old.jpg"]);
  });

  it("keeps the deletion tombstone when another canonical reference still exists", async () => {
    const db = patchDatabase(1);
    const photo = "/photos/uploads/author/replacement.jpg";
    const response = await patchFeed(db, {
      feedPhotos: [photo],
      feedDecor: [{
        id: "replacement",
        src: photo,
        x: 50,
        y: 50,
        w: 80,
        h: 80,
        rotate: 0,
      }],
    });
    const payload = await response.json<any>();

    expect(response.status).toBe(200);
    expect(db.deletedR2Keys).toEqual([]);
    expect(db.queued).toEqual(new Map([
      ["/photos/uploads/author/old.jpg", "author"],
    ]));
    expect(payload.mediaCleanupPending).toBe(1);
  });
});
