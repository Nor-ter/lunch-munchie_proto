/**
 * services/itemsApi.ts — course_items ⨝ restaurants 읽기 (순수 함수 · React 비의존)
 *
 * ⚠️ 조인 방식(§3.4): course_items 에 외래키가 하나도 없어 PostgREST 임베딩
 *    (select('*, restaurants(*)'))이 관계를 못 찾아 실패한다. 그래서 **2쿼리
 *    클라이언트 조인**으로 처리한다:
 *      1) course_items 를 order_index 오름차순으로 조회
 *      2) 나온 restaurant_id 들을 in(...) 으로 restaurants 한 번에 조회
 *      3) order_index 순서를 유지하며 stitch. 식당이 없는 orphan item 은 제외.
 *
 * 스택: supabase-js(확정). 새 라이브러리 없음.
 */
import { supabase } from '@/lib/supabase';
import type { CourseItem, Restaurant, CourseItemWithRestaurant } from '@/types/db';

/**
 * Phase 5 · commit(courseId, items) — draft(최종 상태)를 서버에 원자적으로 반영.
 *
 * 설계 결정: PostgREST 의 일반 REST 호출을 여러 번(delete → upsert → insert) 나눠
 * 보내면 트랜잭션 원자성이 없다(중간 실패 시 부분 반영). Supabase 스택에서 여러 테이블
 * 조작을 하나의 DB 트랜잭션으로 묶는 방법은 Postgres 함수(RPC) — 함수 호출 1번이
 * 곧 트랜잭션 1개라, 함수 내부에서 예외가 나면 전부 자동 롤백된다. 그래서 client에서
 * "diff"를 따로 계산하지 않고, draft의 최종 배열을 그대로 RPC에 넘긴다: RPC가
 * "DB에는 있는데 배열에 없는 항목=삭제, 배열에 있는 항목=upsert"로 diff를 자연히
 * 흡수한다(마이그레이션 20260707000000_commit_course_items_rpc.sql).
 * RPC는 SECURITY INVOKER라 호출자의 RLS(course_items_modify)가 그대로 적용된다 —
 * 남의 코스는 이 경로로도 편집할 수 없다.
 */
export async function commit(
  courseId: string,
  items: CourseItemWithRestaurant[],
): Promise<void> {
  // course_items 테이블 컬럼만 추려서 보낸다(조인된 restaurant 필드는 제외).
  const rows = items.map((it) => ({
    id: it.id,
    restaurant_id: it.restaurant_id,
    order_index: it.order_index,
    start_time: it.start_time,
    end_time: it.end_time,
    is_bookmarked: it.is_bookmarked,
    memo: it.memo,
    created_at: it.created_at,
  }));

  const { error } = await supabase.rpc('commit_course_items', {
    p_course_id: courseId,
    p_items: rows,
  });
  if (error) throw error;
}

export async function getItems(courseId: string): Promise<CourseItemWithRestaurant[]> {
  // 1) stop 목록 (정렬 순서대로)
  const { data: items, error } = await supabase
    .from('course_items')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) throw error;

  const rows = (items as CourseItem[] | null) ?? [];
  if (rows.length === 0) return [];

  // 2) 참조된 식당들 일괄 조회 (중복 id 제거)
  const restaurantIds = Array.from(new Set(rows.map((r) => r.restaurant_id)));
  const { data: restaurants, error: rErr } = await supabase
    .from('restaurants')
    .select('*')
    .in('id', restaurantIds);
  if (rErr) throw rErr;

  const byId = new Map<string, Restaurant>(
    ((restaurants as Restaurant[] | null) ?? []).map((r) => [r.id, r]),
  );

  // 3) order_index 순서 유지 + orphan(식당 없음) 제외 (§3.4 무결성은 앱 책임)
  return rows
    .map((it) => {
      const restaurant = byId.get(it.restaurant_id);
      return restaurant ? { ...it, restaurant } : null;
    })
    .filter((x): x is CourseItemWithRestaurant => x !== null);
}
