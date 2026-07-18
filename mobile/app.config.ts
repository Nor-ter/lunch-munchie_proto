/**
 * app.config.ts — 동적 Expo 설정.
 *
 * app.json을 기반(config)으로 받아, 지도(Google Maps) 네이티브 API 키와 로그인(Google Sign-In)
 * 네이티브 설정을 주입한다. 값을 소스에 커밋하지 않도록 .env의 EXPO_PUBLIC_* 에서 읽는다.
 *
 * ⚠️ 이 값들은 "네이티브 빌드"(dev client / EAS Build / expo run:*)에서만 반영된다.
 *    Expo Go에서는 지도는 iOS=Apple Maps/Android=기본 Google Maps로 뜨고, Google 로그인
 *    네이티브 모듈 자체가 동작하지 않는다(login-workflow.md §1.2).
 *    → app.config 변경은 hot reload로 안 잡히므로, 값을 넣은 뒤엔 `expo prebuild --clean` 필요.
 *
 * react-native-maps 1.20.x(현재 SDK 54 호환 버전)는 클래식 필드를 사용한다:
 *    iOS      → ios.config.googleMapsApiKey
 *    Android  → android.config.googleMaps.apiKey
 *
 * Google Sign-In(login-workflow.md §5.1~5.2): Firebase 설정 파일(GoogleService-Info.plist 등)
 * 없이 순수 OAuth 클라이언트 ID만으로 동작하는 모드라, 플러그인에 iosUrlScheme(=reversed iOS
 * client ID)을 명시로 넘겨야 한다("without Firebase" 모드 — plugin/build/withGoogleSignIn.js
 * validateOptions 참고, com.googleusercontent.apps. 접두사 필수). webClientId/iosClientId는
 * GoogleSignin.configure() 호출 시점(런타임)에 넘기므로 여기선 URL scheme만 네이티브에 반영한다.
 * 이 값들은 OAuth 표준상 클라이언트에 노출되는 공개 식별자 — 시크릿 아님(Google Web client
 * secret과는 다른 값이며, 그건 Supabase 대시보드에만 존재).
 */
import type { ExpoConfig, ConfigContext } from 'expo/config';

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// "958850974719-xxx.apps.googleusercontent.com" → "com.googleusercontent.apps.958850974719-xxx"
const iosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'lunchie-munchie',
  slug: config.slug ?? 'lunchie-munchie',
  plugins: [
    ...(config.plugins ?? []),
    // AppCheckCore 11.3+ pulls RecaptchaInterop and breaks static CocoaPods
    // (google-signin#1517). Pin until upstream ships a fix.
    [
      'expo-build-properties',
      {
        ios: {
          extraPods: [{ name: 'AppCheckCore', version: '11.2.0' }],
        },
      },
    ],
    ...(iosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, object]]
      : []),
  ],
  ios: {
    bundleIdentifier: "com.pupfish.lunchmunchie",
    config: {
      ...config.ios?.config,
      ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
    },
  },
  android: {
    package: "com.pupfish.lunchmunchie",
    config: {
      ...config.android?.config,
      ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
    },
  },
});
