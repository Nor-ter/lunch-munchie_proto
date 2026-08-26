import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hookSource = readFileSync(new URL("./useProfileFeed.ts", import.meta.url), "utf8");
const profileSource = readFileSync(new URL("../pages/ProfilePage.tsx", import.meta.url), "utf8");

describe("profile feed synchronization boundary", () => {
  it("queries every profile by author id with no browser cache", () => {
    expect(hookSource).toContain('authorId: userId');
    expect(hookSource).toContain('cache: "no-store"');
    expect(hookSource).toContain('credentials: "same-origin"');
    expect(hookSource).toContain('pageNumber < 4');
  });

  it("revalidates local mutations and changes from another browser", () => {
    expect(hookSource).toContain("feedSyncVersion");
    expect(hookSource).toContain('window.addEventListener("focus", revalidate)');
    expect(hookSource).toContain('document.addEventListener("visibilitychange", revalidateWhenVisible)');
    expect(hookSource).toContain("window.setInterval(revalidate, 30_000)");
  });

  it("uses the same canonical hook for the signed-in user's own profile", () => {
    expect(profileSource).toContain("useProfileFeed(authenticatedUserId)");
    expect(profileSource).not.toContain("useProfileFeed(profile.id)");
    expect(profileSource).not.toContain("feedPosts.filter(isMyPost)");
  });
});
