import { describe, expect, it, vi } from "vitest";
import {
  SavedCoursesApiError,
  fetchCourseById,
  fetchFeedDetailById,
  fetchSavedCourses,
  persistSavedCourse,
  removeSavedCourse,
} from "./savedCoursesApi";

describe("saved courses API client", () => {
  it("uses the authenticated server collection as the canonical saved list", async () => {
    const request = vi.fn(async () =>
      Response.json({ items: [], courseIds: [] }),
    );

    await expect(fetchSavedCourses(request)).resolves.toEqual({
      items: [],
      courseIds: [],
    });
    expect(request).toHaveBeenCalledWith("/api/saved-courses", {
      credentials: "same-origin",
    });
  });

  it("sends idempotent PUT and DELETE mutations with one course id", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ courseId: "course/a", saved: true }),
      )
      .mockResolvedValueOnce(
        Response.json({ courseId: "course/a", saved: false }),
      );

    await expect(persistSavedCourse(" course/a ", request)).resolves.toEqual({
      courseId: "course/a",
      saved: true,
    });
    await expect(removeSavedCourse("course/a", request)).resolves.toEqual({
      courseId: "course/a",
      saved: false,
    });
    expect(request.mock.calls[0]).toEqual([
      "/api/saved-courses",
      expect.objectContaining({
        method: "PUT",
        credentials: "same-origin",
        body: JSON.stringify({ courseId: "course/a" }),
      }),
    ]);
    expect(request.mock.calls[1]).toEqual([
      "/api/saved-courses?courseId=course%2Fa",
      { method: "DELETE", credentials: "same-origin" },
    ]);
  });

  it("returns null for the intentionally indistinguishable course 404", async () => {
    const request = vi.fn(async () =>
      Response.json(
        { error: "코스를 찾을 수 없습니다.", code: "COURSE_NOT_FOUND" },
        { status: 404 },
      ),
    );

    await expect(
      fetchCourseById("private-course", request),
    ).resolves.toBeNull();
  });

  it("loads one canonical feed detail directly with its paired course", async () => {
    const payload = {
      course: { id: "course-123" },
      post: { id: "post_course-123", courseId: "course-123" },
    };
    const request = vi.fn(async () => Response.json(payload));

    await expect(
      fetchFeedDetailById(" post_course-123 ", request),
    ).resolves.toEqual(payload);
    expect(request).toHaveBeenCalledWith("/api/feed/post_course-123", {
      credentials: "same-origin",
    });
  });

  it("returns null when a direct feed detail is missing or inaccessible", async () => {
    const request = vi.fn(async () =>
      Response.json(
        { error: "피드를 찾을 수 없습니다.", code: "FEED_NOT_FOUND" },
        { status: 404 },
      ),
    );

    await expect(
      fetchFeedDetailById("post_private-course", request),
    ).resolves.toBeNull();
  });

  it("rejects malformed feed ids before making a request", async () => {
    const request = vi.fn();

    const error = await fetchFeedDetailById("course-123", request).catch(
      (reason) => reason,
    );
    expect(error).toBeInstanceOf(SavedCoursesApiError);
    expect(error).toMatchObject({ status: 400, code: "INVALID_FEED_ID" });
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves authentication error status and code for the caller", async () => {
    const request = vi.fn(async () =>
      Response.json(
        { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
        { status: 401 },
      ),
    );

    const error = await fetchSavedCourses(request).catch((reason) => reason);
    expect(error).toBeInstanceOf(SavedCoursesApiError);
    expect(error).toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
  });
});
