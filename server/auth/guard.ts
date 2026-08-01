/**
 * Cloudflare D1 단일 인가 가드 모듈 (Authorization Guard Module)
 * Postgres RLS 상실에 대응하여 코드 레벨에서 레코드 소유권(Ownership)을 검증한다.
 */

export interface AuthUserIdentity {
  userId: string;
  isAuthenticated: boolean;
}

export interface CourseRecord {
  id: string;
  author_id: string;
  is_public: boolean;
}

export interface UserFollowRecord {
  id: string;
  follower_id: string;
}

/**
 * 코스 편집 및 삭제 소유권 검증 (author_id === userId)
 */
export function authorizeCourseEdit(
  course: CourseRecord | null | undefined,
  userId: string | null | undefined
): { authorized: boolean; reason?: string } {
  if (!userId) {
    return { authorized: false, reason: "인증되지 않은 사용자입니다." };
  }
  if (!course) {
    return { authorized: false, reason: "존재하지 않는 코스입니다." };
  }
  if (course.author_id !== userId) {
    return { authorized: false, reason: "본인이 작성한 코스만 수정/삭제할 수 있습니다." };
  }
  return { authorized: true };
}

/**
 * 비공개 코스 읽기 접근 권한 검증 (공개 코스이거나 본인 작성 코스만 허용)
 */
export function authorizeCourseRead(
  course: CourseRecord | null | undefined,
  userId: string | null | undefined
): { authorized: boolean; reason?: string } {
  if (!course) {
    return { authorized: false, reason: "존재하지 않는 코스입니다." };
  }
  if (course.is_public) {
    return { authorized: true };
  }
  if (userId && course.author_id === userId) {
    return { authorized: true };
  }
  return { authorized: false, reason: "비공개 코스는 작성자만 조회할 수 있습니다." };
}

/**
 * 언팔로우 및 팔로우 취소 권한 검증 (follower_id === userId)
 */
export function authorizeFollowAction(
  followRecord: UserFollowRecord | null | undefined,
  userId: string | null | undefined
): { authorized: boolean; reason?: string } {
  if (!userId) {
    return { authorized: false, reason: "인증되지 않은 사용자입니다." };
  }
  if (!followRecord) {
    return { authorized: false, reason: "존재하지 않는 팔로우 기록입니다." };
  }
  if (followRecord.follower_id !== userId) {
    return { authorized: false, reason: "본인의 팔로우 상태만 변경할 수 있습니다." };
  }
  return { authorized: true };
}
