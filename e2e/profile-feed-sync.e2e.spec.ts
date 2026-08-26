import { expect, test, type Page } from "playwright/test";

const VIEWER_ID = "profile-sync-viewer";
const AUTHOR_ID = "profile-sync-author";

function apiPost(
  courseId: string,
  creatorId = AUTHOR_ID,
  authorName = creatorId === VIEWER_ID ? "뷰어" : "동기화 작성자",
) {
  return {
    id: `post_${courseId}`,
    courseId,
    creatorId,
    authorName,
    authorImage: null,
    description: `${courseId} 기록`,
    photos: [],
    decor: [],
    tags: ["맛집"],
    stops: [],
    likesCount: 0,
    savesCount: 0,
    comments: [],
    createdAt: "2026-08-25T00:00:00.000Z",
  };
}

async function mockProfileFeed(page: Page) {
  let authorPosts = [apiPost("course-before")];
  const authorRequests: string[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/auth/session") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        user: { sub: VIEWER_ID, name: "뷰어", email: "viewer@example.com" },
        profile: { id: VIEWER_ID, username: "뷰어", handle: "viewer", profile_image_url: null },
      }) });
      return;
    }
    if (url.pathname === `/api/users/${AUTHOR_ID}`) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        id: AUTHOR_ID,
        username: "동기화 작성자",
        handle: "sync_author",
        profile_image_url: null,
        bio: null,
        location: null,
        created_at: 0,
        public_post_count: authorPosts.length,
      }) });
      return;
    }
    if (url.pathname === `/api/users/${AUTHOR_ID}/follows`) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ followers: 0, following: 0 }) });
      return;
    }
    if (url.pathname === `/api/users/${AUTHOR_ID}/follow`) {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ following: false }) });
      return;
    }
    if (url.pathname === "/api/feed") {
      if (url.searchParams.get("authorId") === AUTHOR_ID) {
        authorRequests.push(url.search);
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({
          items: authorPosts,
          nextCursor: null,
          hasMore: false,
          policyVersion: "feed-author-chronological-v1",
        }) });
      } else {
        // The viewer's personalised first page intentionally does not contain
        // this author. A profile must still show the canonical author timeline.
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [], nextCursor: null, hasMore: false }) });
      }
      return;
    }
    if (url.pathname === "/api/restaurants" || url.pathname === "/api/courses") {
      await route.fulfill({ contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: "{}" });
  });

  return {
    setPosts(posts: ReturnType<typeof apiPost>[]) { authorPosts = posts; },
    authorRequests,
  };
}

test("another user's profile stays in sync with canonical create/delete state", async ({ page }) => {
  const api = await mockProfileFeed(page);
  await page.goto(`/profile/${AUTHOR_ID}`);

  await expect(page.getByTestId("unified-munchie-card-post_course-before")).toBeVisible();
  expect(api.authorRequests.some(search => search.includes(`authorId=${AUTHOR_ID}`))).toBe(true);

  api.setPosts([]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("unified-munchie-card-post_course-before")).toHaveCount(0);
  await expect(page.getByText("아직 올린 피드가 없어요")).toBeVisible();

  api.setPosts([apiPost("course-after")]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("unified-munchie-card-post_course-after")).toBeVisible();
});

test("my profile uses the signed-in subject and permanently deletes only my post", async ({ page }) => {
  const ownPost = apiPost("course-mine", VIEWER_ID);
  const foreignPost = apiPost("course-foreign", AUTHOR_ID);
  let ownPosts = [ownPost];
  let deleteRequests = 0;

  await page.addInitScript(({ staleProfileId }) => {
    // Reproduce an account switch where browser presentation state still
    // belongs to another user. It must never drive ownership or profile data.
    localStorage.setItem("lm_profile", JSON.stringify({
      id: staleProfileId,
      name: "이전 사용자",
      handle: "stale_user",
      emoji: "👤",
      dietary: [],
      categoryPrefs: [],
      totalSwipes: 0,
      totalLikes: 0,
      joinedAt: new Date().toISOString(),
    }));
  }, { staleProfileId: AUTHOR_ID });

  await page.route("**/api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/auth/session") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        user: { sub: VIEWER_ID, name: "뷰어", email: "viewer@example.com" },
        profile: { id: VIEWER_ID, username: "뷰어", handle: "viewer", profile_image_url: null },
      }) });
      return;
    }
    if (url.pathname === "/api/feed-post" && request.method() === "DELETE") {
      expect(url.searchParams.get("courseId")).toBe("course-mine");
      deleteRequests += 1;
      ownPosts = [];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    if (url.pathname === "/api/feed") {
      const items = url.searchParams.get("authorId") === VIEWER_ID
        ? ownPosts
        : [foreignPost];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        items,
        nextCursor: null,
        hasMore: false,
        policyVersion: url.searchParams.has("authorId")
          ? "feed-author-chronological-v1"
          : "feed-personal-v1",
      }) });
      return;
    }
    if (url.pathname === "/api/courses" || url.pathname === "/api/restaurants") {
      await route.fulfill({ contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: "{}" });
  });

  await page.goto("/profile");
  const ownCard = page.getByTestId(`unified-munchie-card-${ownPost.id}`);
  await expect(ownCard).toBeVisible();
  await expect(page.getByTestId(`unified-munchie-card-${foreignPost.id}`)).toHaveCount(0);

  await ownCard.getByRole("button", { name: "게시물 메뉴" }).click();
  await ownCard.getByRole("button", { name: "게시물 삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "확인" }).click();

  await expect(ownCard).toHaveCount(0);
  expect(deleteRequests).toBe(1);
  await page.reload();
  await expect(page.getByTestId(`unified-munchie-card-${ownPost.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`unified-munchie-card-${foreignPost.id}`)).toHaveCount(0);
});
