import * as Clipboard from 'expo-clipboard';
import { Linking, SafeAreaView, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { restaurants, rankLunchieResults } from '@/lib/shared';
import { useLunchieStore } from '@/store/useLunchieStore';

export default function LunchieSwipeScreen() {
  const { inviteCode, participants, candidates, finalCandidates, swipeRecords, phase, addSwipe, advanceRound, reset } = useLunchieStore();
  const activeCandidates = phase === 'preliminary' ? candidates : finalCandidates;
  const ranked = rankLunchieResults(swipeRecords, activeCandidates);
  const winner = restaurants.find((restaurant) => restaurant.id === ranked[0]?.restaurantId) ?? activeCandidates[0];

  const copyInvite = async () => Clipboard.setStringAsync(`lunchie://join/${inviteCode}`);
  const openMap = () => {
    if (!winner) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${winner.name} ${winner.address}`)}`);
  };
  const shareResult = () => {
    if (!winner) return;
    Share.share({
      title: 'Lunchie Munchie 점심 결과',
      message: `오늘의 점심은 ${winner.name}! ${winner.address} · lunchie://course/${winner.id}`,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-5 pb-12 pt-6">
        <Text className="text-3xl font-black text-ink">Lunchie Quick Match</Text>
        <Text className="mt-2 text-gray-500">sj-branch의 예선전·결승전 스와이핑과 hi-branch의 초대·결과 공유·구글맵 이동을 통합했습니다.</Text>

        <View className="mt-6 rounded-3xl bg-white p-5">
          <Text className="font-black text-ink">친구 초대 코드</Text>
          <Text className="mt-2 text-3xl font-black text-coral">{inviteCode}</Text>
          <Text className="mt-2 text-gray-500">참여자: {participants.join(', ')}</Text>
          <TouchableOpacity onPress={copyInvite} className="mt-4 rounded-2xl bg-yellow px-4 py-3">
            <Text className="text-center font-black text-ink">초대 링크 복사하기</Text>
          </TouchableOpacity>
        </View>

        {phase !== 'result' ? (
          <View className="mt-6">
            <Text className="text-xl font-black text-ink">{phase === 'preliminary' ? '예선전' : '결승전'} · {activeCandidates.length}개 후보</Text>
            {activeCandidates.map((restaurant) => (
              <View key={restaurant.id} className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">
                <Text className="text-2xl font-black text-ink">{restaurant.name}</Text>
                <Text className="mt-2 text-gray-500">{restaurant.shortDescription}</Text>
                <Text className="mt-2 text-gray-500">★ {restaurant.rating} · {restaurant.address}</Text>
                <View className="mt-5 flex-row gap-3">
                  <TouchableOpacity onPress={() => addSwipe(restaurant.id, 'DISLIKE')} className="flex-1 rounded-2xl bg-gray-100 px-4 py-4">
                    <Text className="text-center text-lg font-black text-ink">× 싫어요</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => addSwipe(restaurant.id, 'LIKE')} className="flex-1 rounded-2xl bg-coral px-4 py-4">
                    <Text className="text-center text-lg font-black text-white">○ 좋아요</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={advanceRound} className="mt-6 rounded-3xl bg-ink px-4 py-4">
              <Text className="text-center text-lg font-black text-white">{phase === 'preliminary' ? '결승전으로 이동' : '결과 보기'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-6 rounded-[32px] bg-coral p-6">
            <Text className="text-base font-bold text-white/80">오늘의 점심 결과</Text>
            <Text className="mt-2 text-3xl font-black text-white">{winner?.name}</Text>
            <Text className="mt-3 text-white/90">{winner?.address}</Text>
            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity onPress={openMap} className="flex-1 rounded-2xl bg-white px-4 py-4">
                <Text className="text-center font-black text-coral">구글맵으로 이동</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={shareResult} className="flex-1 rounded-2xl bg-white/20 px-4 py-4">
                <Text className="text-center font-black text-white">결과 공유</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={reset} className="mt-3 rounded-2xl bg-white/20 px-4 py-4">
              <Text className="text-center font-black text-white">다시 하기</Text>
            </TouchableOpacity>
            <View className="hidden">
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
