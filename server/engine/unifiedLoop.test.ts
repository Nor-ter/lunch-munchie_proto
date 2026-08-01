import { describe, it, expect } from "vitest";
import { getTaste, updateTaste, sampleTheta, posteriorMean, EVENT_WEIGHTS } from "./taste.js";
import { FEATURE_DIM } from "./features.js";
import { buildGlobalChainPrior, chainFit } from "./chain.js";
import { scoreFeedCourses, type CourseFeedItem } from "./scorer.js";
import { satiationStats } from "./satiation.js";

describe("Unified Learning Loop & RL Engine Tests", () => {
  it("n=0 (콜드스타트) 유저도 MIN_TASTE 게이트 없이 Thompson Sampling theta를 생성한다", () => {
    const userId = "newbie_user_1";
    const taste = getTaste(userId);
    expect(taste).toBeNull(); // 아직 이력 0건

    // updateTaste 1건 실행 (FEATURE_DIM = 9 차원)
    const dummyVec = new Array(FEATURE_DIM).fill(0.5);
    updateTaste(userId, dummyVec, 1, EVENT_WEIGHTS.SWIPE);

    const updatedTaste = getTaste(userId);
    expect(updatedTaste).not.toBeNull();
    expect(updatedTaste?.n).toBe(1);

    const thetaSample = sampleTheta(updatedTaste!);
    expect(thetaSample).toHaveLength(FEATURE_DIM);
    expect(thetaSample.some((v) => isNaN(v))).toBe(false);
  });

  it("Munchie 피드 코스 순서(stops.order)로부터 P0 전역 연쇄 답지가 빌드된다", () => {
    const courses = [
      { id: "c1", saves_count: 10, likes_count: 20 },
      { id: "c2", saves_count: 5, likes_count: 5 },
    ];
    const courseItems = [
      { course_id: "c1", order_index: 1, category: "한식" },
      { course_id: "c1", order_index: 2, category: "카페/디저트" },
      { course_id: "c2", order_index: 1, category: "한식" },
      { course_id: "c2", order_index: 2, category: "카페/디저트" },
    ];

    buildGlobalChainPrior(courses, courseItems);

    // 개인 이력이 0인 콜드스타트 유저 (nu = 0)
    const fitPrior = chainFit("한식", "카페/디저트", 0);
    expect(fitPrior).toBeGreaterThan(0.5); // P0 답지 덕분에 높은 전이 확률 반환
  });

  it("Munchie 피드 개인화 스코어러 scoreFeedCourses가 정상 정렬된다", () => {
    const mockCourses: CourseFeedItem[] = [
      {
        id: "c1",
        courseId: "c1",
        creatorId: "user_a",
        stops: [{ placeId: "r1", category: "한식" }],
        savedCount: 50,
      },
      {
        id: "c2",
        courseId: "c2",
        creatorId: "user_b",
        stops: [{ placeId: "r2", category: "양식" }],
        savedCount: 2,
      },
    ];

    const sampleThetaFn = () => [0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]; // 한식 선호 (9D)
    const getItemVectorFn = (id: string) =>
      id === "r1"
        ? [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
        : [0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];

    const sorted = scoreFeedCourses("u1", mockCourses, sampleThetaFn, getItemVectorFn, 0); // eps=0 deterministic
    expect(sorted[0].id).toBe("c1");
  });

  it("Model Access Isolation: 피드 좋아요 업데이트 시 포만감(Satiation) 지표는 오염되지 않는다", () => {
    const initialSat = satiationStats();
    
    // FEED_LIKE 에 대한 취향만 갱신
    const userId = "test_user_isolation";
    const vec = new Array(FEATURE_DIM).fill(0.5);
    updateTaste(userId, vec, 1, EVENT_WEIGHTS.FEED_LIKE);

    const postSat = satiationStats();
    expect(postSat).toEqual(initialSat); // 포만감 수치는 변하지 않음
  });
});
