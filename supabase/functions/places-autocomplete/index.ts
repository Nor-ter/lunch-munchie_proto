/**
 * POST /places-autocomplete — Autocomplete(New). 워크플로우 §4.
 * body: { input: string, sessionToken: string, bias?: { lat, lng, radiusMeters? } }
 *
 * sessionToken 은 클라이언트가 생성해 autocomplete 여러 번 호출과 뒤이은
 * place-details 1회 호출을 하나의 세션으로 묶는다(§4 "session token 사용" — 비용 절감).
 * bias 는 Phase 4(§4 add 흐름 4)의 "코스 첫 item 좌표" 전달용 — 미지정 시 Melbourne 기본
 * (places-search 와 동일 규칙, _shared/google.ts 의 resolveLocationBias 공용).
 * Google 원본을 그대로 흘리지 않고 정규화만 반환.
 */
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/errors.ts';
import { parseJsonBody, requireString } from '../_shared/validate.ts';
import { callPlacesNew, resolveLocationBias, type LocationBiasInput } from '../_shared/google.ts';

const FIELD_MASK = [
  'suggestions.placePrediction.place',
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text',
].join(',');

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const body = await parseJsonBody(req);
    const input = requireString(body, 'input', { maxLength: 200 });
    const sessionToken = requireString(body, 'sessionToken', { maxLength: 100 });
    const locationBias = resolveLocationBias(body.bias as LocationBiasInput | undefined);

    const google = await callPlacesNew(
      'places:autocomplete',
      { input, sessionToken, locationBias },
      FIELD_MASK,
    );

    const raw = (google.suggestions as Record<string, unknown>[] | undefined) ?? [];
    const suggestions = raw
      .map((s) => s.placePrediction as Record<string, unknown> | undefined)
      .filter((p): p is Record<string, unknown> => !!p)
      .map((p) => {
        const text = p.text as { text?: string } | undefined;
        return {
          placeId: String(p.placeId ?? ''),
          text: text?.text ?? '',
        };
      });

    return new Response(JSON.stringify({ suggestions, sessionToken }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse(err, CORS_HEADERS);
  }
});
