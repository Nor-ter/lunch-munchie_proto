/**
 * components/map/MapProvider.tsx — Google Maps JS 로더 (web-maps-places-workflow.md Phase 0).
 *
 * `@vis.gl/react-google-maps`의 APIProvider로 앱을 감싸 Maps JS 스크립트를 1회 로드한다.
 * 이 키는 지도 타일 렌더 전용 — Places/Directions는 이 키를 쓰지 않고 Edge Function(서버
 * 키) 경유로만 호출한다(§2 불변 원칙). 브라우저 키라 번들에 노출되는 게 정상(HTTP referrer
 * 제한이 실제 보안 경계 — Google Cloud 콘솔에서 설정, 코드로는 강제 불가).
 *
 * 원본 없음(웹 전용 신규 — 모바일은 react-native-maps라 별도 Provider 불필요).
 * 스택: @vis.gl/react-google-maps(Phase 0 승인·설치됨). 새 라이브러리 없음.
 */
import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function MapProvider({ children }: { children: ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) {
    // 키 없이도 앱 전체가 죽지 않게 — 지도 관련 화면만 빈 상태로 보임(콘솔에 에러 로그).
    console.error('[MapProvider] VITE_GOOGLE_MAPS_API_KEY 가 .env 에 설정되지 않았습니다.');
    return <>{children}</>;
  }
  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{children}</APIProvider>;
}
