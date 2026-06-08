import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

function Logo() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl border-2 border-coral bg-white">
        <Text className="text-lg">◡̈</Text>
      </View>
      <Text className="text-xl font-extrabold text-coral">Lunchie Munchie</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10 pt-12">
        <Logo />
        <View className="mt-10">
          <Text className="text-4xl font-black leading-tight text-ink">오늘 어떻게{`\n`}먹을까요?</Text>
          <Text className="mt-3 text-base text-gray-500">모드를 선택해주세요.</Text>
        </View>

        <View className="mt-10">
          <Text className="mb-4 text-2xl font-black text-ink">Lunchie Mode</Text>
          <Link href="/lunchie" className="overflow-hidden rounded-[28px] bg-coral px-6 py-8 shadow-lg">
            <View>
              <Text className="text-2xl font-black text-white">Quick Match</Text>
              <Text className="mt-3 text-base leading-6 text-white/90">그룹 멤버들과 함께 음식 카드를 스와이프하고 예선전·결승전으로 점심을 결정해요.</Text>
              <View className="mt-5 flex-row gap-3">
                <Text className="rounded-full bg-white/20 px-3 py-2 text-white">× 싫어요</Text>
                <Text className="rounded-full bg-white/20 px-3 py-2 text-white">○ 좋아요</Text>
              </View>
            </View>
          </Link>
        </View>

        <View className="mt-12 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-ink">Munchie Mode</Text>
            <Text className="mt-2 text-sm text-gray-500">이반주 사람들이 많이 저장한 코스</Text>
          </View>
          <Link href="/munchie" className="text-lg font-bold text-ink">더보기 →</Link>
        </View>

        {['HOT', 'MZ', 'HOT'].map((label, index) => (
          <Link key={`${label}-${index}`} href="/munchie" className="mt-6 overflow-hidden rounded-[24px] bg-yellow px-5 py-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-black text-ink">{label}</Text>
                <Text className="mt-2 text-xl font-black text-ink">ㅇㅇㅇ 코스</Text>
                <Text className="mt-1 text-gray-500">#ㅇㅇ #ㅇㅇㅇ</Text>
                <Text className="mt-8 text-gray-500">♡ 1323</Text>
              </View>
              <View className="h-36 w-36 rounded-3xl bg-white/80 p-5">
                <Text className="text-6xl text-gray-700">〰</Text>
              </View>
            </View>
          </Link>
        ))}

        <Link href="/munchie" className="mt-8 rounded-3xl bg-yellow px-6 py-5 text-center text-lg font-black text-ink">코스 더보기 →</Link>
      </ScrollView>
    </SafeAreaView>
  );
}
