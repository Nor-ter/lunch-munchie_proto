/**
 * services/coursesApi.ts — courses 읽기 (순수 함수 · React 비의존)
 *
 * 워크플로우 §2 Service layer. supabase-js 기반, RN/React 에 의존하지 않아
 * 추후 웹(Next.js)과 공유 가능. 스택: supabase-js(확정). 새 라이브러리 없음.
 */
import { supabase } from '@/lib/supabase';
import type { Course } from '@/types/db';

/** 단일 코스 조회. 없으면 null (RLS로 비공개·타인 코스는 조회 결과에서 제외됨). */
export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Course | null) ?? null;
}
