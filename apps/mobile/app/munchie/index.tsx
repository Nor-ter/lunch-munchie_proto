import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { filterCourses, type CourseFilter } from '@/lib/shared';

const filters: Array<{ label: string; value: CourseFilter['sortBy'] }> = [
  { label: 'HOT', value: 'hot' },
  { label: 'MZ', value: 'mz' },
  { label: '가까운 코스', value: 'nearby' },
  { label: '최근', value: 'recent' },
];

export default function MunchieExploreScreen() {
  const [sortBy, setSortBy] = useState<CourseFilter['sortBy']>('hot');
  const courses = useMemo(() => filterCourses({ sortBy }), [sortBy]);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-6">
        <Text className="text-3xl font-black text-ink">Munchie Mode</Text>
        <Text className="mt-2 text-gray-500">data-jp 브랜치의 데이터 구조와 필터링 로직을 공유 패키지 기준으로 통합했습니다.</Text>
        <View className="mt-6 flex-row flex-wrap gap-2">
          {filters.map((filter) => (
            <TouchableOpacity key={filter.value} onPress={() => setSortBy(filter.value)} className={`rounded-full px-4 py-2 ${sortBy === filter.value ? 'bg-coral' : 'bg-white'}`}>
              <Text className={sortBy === filter.value ? 'font-bold text-white' : 'font-bold text-ink'}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {courses.map((course) => (
          <View key={course.id} className="mt-5 rounded-[28px] bg-yellow p-5">
            <View className="flex-row justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-black text-ink">{course.category}</Text>
                <Text className="mt-2 text-2xl font-black text-ink">{course.title}</Text>
                <Text className="mt-2 text-sm leading-5 text-gray-600">{course.description}</Text>
                <Text className="mt-3 text-gray-500">{course.hashtags.map((tag) => `#${tag}`).join(' ')}</Text>
                <Text className="mt-5 text-gray-500">♡ {course.likesCount} · {course.totalDistance}km · {course.totalDuration}분</Text>
              </View>
              <View className="h-28 w-28 items-center justify-center rounded-3xl bg-white/80">
                <Text className="text-5xl text-gray-700">〰</Text>
              </View>
            </View>
            <View className="mt-5 flex-row gap-3">
              <Link href={`/course/${course.id}/edit`} className="flex-1 rounded-2xl bg-white px-4 py-3 text-center font-black text-ink">코스맵 편집</Link>
              <Link href={`/course/${course.id}/share`} className="flex-1 rounded-2xl bg-coral px-4 py-3 text-center font-black text-white">인스타 공유</Link>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
