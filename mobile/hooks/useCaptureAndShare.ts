/**
 * useCaptureAndShare
 * Wraps react-native-view-shot, expo-media-library,
 * expo-sharing, expo-clipboard and Instagram deep-link sharing.
 */
import { useRef, RefObject } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

export type Platform_ = 'ig-story' | 'ig-feed' | 'message' | 'save';

const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'lunchie';

export function useCaptureAndShare(
  viewShotRef: RefObject<ViewShot | null>,
  transparent = false,
) {
  /** Capture the referenced view and return a file:// URI */
  const capture = async (): Promise<string> => {
    if (!viewShotRef.current) throw new Error('viewShotRef is null');
    const uri = await (viewShotRef.current as any).capture({
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      ...(transparent ? { backgroundColor: 'transparent' } : {}),
    });
    return uri as string;
  };

  const saveToGallery = async (): Promise<void> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 저장을 위해 사진 접근 권한이 필요합니다.');
      return;
    }
    const uri = await capture();
    await MediaLibrary.saveToLibraryAsync(uri);
  };

  const shareNative = async (): Promise<void> => {
    const uri = await capture();
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('공유 불가', '이 기기에서는 공유가 지원되지 않습니다.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
  };

  const shareToIgStory = async (): Promise<void> => {
    const uri = await capture();
    if (Platform.OS === 'ios') {
      const igUrl = 'instagram-stories://share';
      const canOpen = await Linking.canOpenURL(igUrl);
      if (canOpen) {
        // Instagram Stories URL scheme passes the file via share sheet
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
      } else {
        Alert.alert('Instagram 미설치', '이미지를 갤러리에 저장하고 Instagram에서 직접 업로드하세요.');
        await saveToGallery();
      }
    } else {
      // Android – use native share intent (Instagram picks it up)
      await shareNative();
    }
  };

  const copyLink = async (courseId: string): Promise<void> => {
    await Clipboard.setStringAsync(`${APP_SCHEME}://course/${courseId}`);
  };

  const execute = async (platform: Platform_): Promise<void> => {
    switch (platform) {
      case 'ig-story': return shareToIgStory();
      case 'ig-feed':  return shareNative();
      case 'message':  return shareNative();
      case 'save':     return saveToGallery();
    }
  };

  return { capture, saveToGallery, shareNative, shareToIgStory, copyLink, execute };
}
