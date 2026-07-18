-- Phase 5 · 코스 편집 커밋 RPC (트랜잭션 원자성)
--
-- 설계 결정: PostgREST의 일반 REST 호출(.from(...).delete()/.upsert()/.insert())은
-- 요청을 여러 번 나눠 보내므로 "삭제는 됐는데 upsert가 실패" 같은 부분 실패가 가능하다
-- (원자성 없음). Supabase 스택에서 여러 테이블 조작을 하나의 DB 트랜잭션으로 묶는
-- 유일한 방법은 Postgres 함수(RPC) 안에 전부 넣는 것 — 함수 호출 1번 = 트랜잭션 1개이므로,
-- 함수 안에서 예외가 나면 그 함수가 한 모든 변경이 자동 롤백된다. 새 라이브러리가 아니라
-- 확정 스택(Supabase Postgres)의 기능이라 그대로 사용한다.
--
-- SECURITY INVOKER(기본값, 명시)로 만들어 **호출자의 RLS 그대로 적용**시킨다 — 함수 안의
-- delete/insert 도 course_items_modify 정책(courses.author_id = auth.uid()::text)을 그대로
-- 통과해야 하므로, 남의 코스는 이 함수로도 편집할 수 없다(권한 우회 없음).
--
-- p_items 는 "커밋 후 최종 상태"(유지될 항목 + 신규 항목, order_index 는 0..n-1 로 이미
-- 정규화된 값)를 그대로 넘긴다. 이 배열에 없는 기존 id는 삭제 대상으로 간주한다
-- (client-side diff 계산을 따로 하지 않고, SQL이 "현재 DB에 있는데 배열에 없으면 삭제"로
-- diff를 자연스럽게 흡수한다 — JS/SQL 두 곳에서 diff 로직이 따로 놀 위험을 없앤다).

create or replace function commit_course_items(p_course_id text, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  keep_ids text[];
begin
  select coalesce(array_agg(elem->>'id'), array[]::text[])
    into keep_ids
  from jsonb_array_elements(p_items) as elem;

  -- 1) 배열에 없는 기존 항목 삭제 (FK 없음 §3.4 — 앱이 직접 정리)
  delete from course_items
  where course_id = p_course_id
    and id <> all(keep_ids);

  -- 2) 남은 항목 + 신규 항목 upsert (order_index 재정규화 값 반영, unique 제약 없음 §3.3)
  insert into course_items (
    id, course_id, restaurant_id, order_index,
    start_time, end_time, is_bookmarked, memo, created_at
  )
  select
    elem->>'id',
    p_course_id,
    elem->>'restaurant_id',
    (elem->>'order_index')::int,
    elem->>'start_time',
    elem->>'end_time',
    coalesce((elem->>'is_bookmarked')::boolean, false),
    elem->>'memo',
    -- course_items.created_at 은 timestamp(타임존 없음) — timestamptz 로 캐스팅하면
    -- 세션 타임존에 따라 값이 미묘하게 밀릴 수 있어 컬럼 타입에 맞춰 그대로 timestamp 로 캐스팅.
    coalesce((elem->>'created_at')::timestamp, now())
  from jsonb_array_elements(p_items) as elem
  on conflict (id) do update set
    course_id     = excluded.course_id,
    restaurant_id = excluded.restaurant_id,
    order_index   = excluded.order_index,
    start_time    = excluded.start_time,
    end_time      = excluded.end_time,
    is_bookmarked = excluded.is_bookmarked,
    memo          = excluded.memo;
end;
$$;

-- anon(익명 로그인 세션도 role='authenticated'로 JWT 발급됨)/authenticated 가 호출 가능하도록.
-- RLS는 여전히 course_items_modify 정책이 강제하므로, 실행 권한 부여 자체가 우회를 뜻하지 않는다.
grant execute on function commit_course_items(text, jsonb) to anon, authenticated;
