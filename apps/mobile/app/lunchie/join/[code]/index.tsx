import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

export default function LunchieJoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-cream px-6">
      <View className="w-full rounded-[32px] bg-white p-6">
        <Text className="text-base font-bold text-gray-500">친구 초대</Text>
        <Text className="mt-2 text-3xl font-black text-coral">{code}</Text>
        <Text className="mt-4 leading-6 text-gray-600">초대 링크를 통해 Lunchie Quick Match 세션에 참여합니다. 실제 인증과 Realtime 동기화는 Supabase 연결 후 활성화됩니다.</Text>
        <Link href="/lunchie" className="mt-6 rounded-2xl bg-coral px-4 py-4 text-center font-black text-white">세션 입장하기</Link>
      </View>
    </SafeAreaView>
  );
}
