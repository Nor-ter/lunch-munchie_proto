/**
 * _shared/validate.ts — 요청 body 필드 화이트리스트 검증 (워크플로우 §4 공통 규칙).
 *
 * 각 함수는 자신이 아는 필드만 꺼내 쓰므로 화이트리스트가 자동으로 걸리지만,
 * 여기서는 "필수 필드 존재 + 타입 + 길이" 를 명시적으로 검증해 잘못된 요청을
 * Google 에 보내기 전에 400 으로 끊는다(불필요한 Google 호출 = 과금 방지).
 */
import { ApiError } from './errors.ts';

export function requireString(
  body: Record<string, unknown>,
  key: string,
  opts: { maxLength?: number; minLength?: number } = {},
): string {
  const v = body[key];
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ApiError('invalid_request', `${key} 는 필수 문자열입니다.`, 400);
  }
  const trimmed = v.trim();
  if (opts.minLength && trimmed.length < opts.minLength) {
    throw new ApiError('invalid_request', `${key} 가 너무 짧습니다.`, 400);
  }
  if (opts.maxLength && trimmed.length > opts.maxLength) {
    throw new ApiError('invalid_request', `${key} 가 너무 깁니다(최대 ${opts.maxLength}자).`, 400);
  }
  return trimmed;
}

export function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') {
    throw new ApiError('invalid_request', `${key} 는 문자열이어야 합니다.`, 400);
  }
  return v;
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const json = await req.json();
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      throw new Error('not an object');
    }
    return json as Record<string, unknown>;
  } catch {
    throw new ApiError('invalid_request', '요청 본문은 JSON 객체여야 합니다.', 400);
  }
}
