/**
 * hooks/usePlacesSearch.ts — 검색/자동완성 (TanStack Query) + debounce + session token 관리.
 * 원본: mobile/hooks/usePlacesSearch.ts (web-maps-places-workflow.md Phase 1 이식, 변경 없음).
 *
 * · 타이핑 → 400ms debounce 후 autocomplete 호출(Text Search 대비 저렴 · 세션 토큰으로 묶임).
 * · debounce 는 별도 라이브러리 없이 useEffect + setTimeout 으로 직접 구현(제약: 새 라이브러리 금지).
 * · sessionToken 은 훅이 소유 — 검색 세션 시작(마운트/초기화) 시 1개 발급하고, 후보를
 *   "선택"해 place-details 를 부른 뒤에는 반드시 endSession() 으로 폐기 + 새로 발급해야
 *   다음 검색이 별도 세션으로 과금된다(Google 세션 토큰 규약).
 *
 * queryKey: ['placesAutocomplete', debouncedInput, sessionToken]
 * 스택: TanStack Query(확정). 새 라이브러리 없음.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  autocompletePlaces,
  generateSessionToken,
  type PlaceSuggestion,
  type Bias,
} from '@/services/placesApi';

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

/** bias: 코스 첫 item 좌표(있으면). 없으면 서버가 Melbourne 기본. */
export function usePlacesSearch(bias?: Bias) {
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [sessionToken, setSessionToken] = useState(() => generateSessionToken());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedInput(input), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input]);

  const trimmed = debouncedInput.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  const query = useQuery<PlaceSuggestion[]>({
    queryKey: ['placesAutocomplete', trimmed, sessionToken, bias?.lat, bias?.lng],
    queryFn: () => autocompletePlaces(trimmed, sessionToken, bias),
    enabled,
  });

  /** place-details 호출(선택) 직후 반드시 호출 — 세션 종료 + 다음 검색을 위한 새 토큰 발급. */
  const endSession = useCallback(() => {
    setSessionToken(generateSessionToken());
  }, []);

  /** 시트를 닫거나 초기화할 때 입력/결과/세션을 전부 리셋. */
  const reset = useCallback(() => {
    setInput('');
    setDebouncedInput('');
    setSessionToken(generateSessionToken());
  }, []);

  return {
    input,
    setInput,
    sessionToken,
    suggestions: query.data ?? [],
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    error: query.error,
    endSession,
    reset,
  };
}
