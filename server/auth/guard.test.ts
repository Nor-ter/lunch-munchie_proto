import { describe, it, expect } from "vitest";
import {
  authorizeCourseEdit,
  authorizeCourseRead,
  authorizeFollowAction,
} from "./guard.js";

describe("D1 Auth Guard Module Unit Tests", () => {
  it("코스 작성자 본인만 코스를 수정/삭제할 수 있다", () => {
    const course = { id: "c100", author_id: "user_alice", is_public: true };

    const okRes = authorizeCourseEdit(course, "user_alice");
    expect(okRes.authorized).toBe(true);

    const failRes = authorizeCourseEdit(course, "user_bob");
    expect(failRes.authorized).toBe(false);
    expect(failRes.reason).toContain("본인이 작성한 코스만");

    const anonRes = authorizeCourseEdit(course, null);
    expect(anonRes.authorized).toBe(false);
  });

  it("비공개 코스는 작성자만 읽을 수 있다", () => {
    const publicCourse = { id: "c101", author_id: "user_alice", is_public: true };
    const privateCourse = { id: "c102", author_id: "user_alice", is_public: false };

    // 공개 코스는 누구나 읽을 수 있음
    expect(authorizeCourseRead(publicCourse, "user_bob").authorized).toBe(true);
    expect(authorizeCourseRead(publicCourse, null).authorized).toBe(true);

    // 비공개 코스는 작성자만 읽을 수 있음
    expect(authorizeCourseRead(privateCourse, "user_alice").authorized).toBe(true);
    expect(authorizeCourseRead(privateCourse, "user_bob").authorized).toBe(false);
    expect(authorizeCourseRead(privateCourse, null).authorized).toBe(false);
  });

  it("본인의 팔로우 취소만 수행할 수 있다", () => {
    const followRecord = { id: "f1", follower_id: "user_alice" };

    expect(authorizeFollowAction(followRecord, "user_alice").authorized).toBe(true);
    expect(authorizeFollowAction(followRecord, "user_bob").authorized).toBe(false);
  });
});
