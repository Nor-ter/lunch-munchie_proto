import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { ChevronLeft, MessageCircle, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

type SortMode = 'latest' | 'likes';

export default function CourseFeedsPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { getCourseById, feedPosts } = useApp();
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const course = id ? getCourseById(id) : undefined;
  const templateFrom = new URLSearchParams(search).get('templateFrom');
  const detailOrigin = templateFrom === 'profile' || templateFrom === 'saved' ? templateFrom : 'feed';
  const backPath = `/course/${id}${search ? `?${search}` : ''}`;
  const posts = useMemo(() => feedPosts
    .filter(post => post.courseId === id)
    .sort((a, b) => sortMode === 'likes'
      ? b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [feedPosts, id, sortMode]);

  if (!course && posts.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <p className="text-[17px] font-bold text-[#2D211C]">코스를 찾을 수 없어요</p>
          <button onClick={() => navigate('/feed?tab=feed')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">
            피드로 돌아가기
          </button>
        </div>
      </main>
    );
  }
  const courseTitle = course?.title || posts[0]?.caption || 'Munchie 코스';

  return (
    <motion.main
      className="mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE] pb-10"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="px-5 pb-5 pt-5">
        <button
          onClick={() => navigate(backPath)}
          aria-label="코스 상세로 돌아가기"
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 text-[#D94447]">
          <MessageCircle size={16} />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Munchie feed</p>
        </div>
        <h1 className="mt-2 text-[25px] font-black leading-tight text-[#2D211C]">이 코스로 만든 피드</h1>
        <p className="mt-1 line-clamp-2 text-[14px] font-bold text-[#6C574C]">{courseTitle}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#9D887C]">
          같은 코스를 다녀온 사람들이 남긴 사진과 한줄평을 모았어요.
        </p>
      </header>

      {posts.length > 0 ? (
        <>
          <div className="mb-4 flex justify-end gap-2 px-4" aria-label="피드 정렬">
            <button
              type="button"
              aria-pressed={sortMode === 'latest'}
              onClick={() => setSortMode('latest')}
              className="rounded-full px-4 py-2 text-[12px] font-bold transition-colors"
              style={{ background: sortMode === 'latest' ? '#E85053' : '#FFFFFF', color: sortMode === 'latest' ? '#FFFFFF' : '#9D887C' }}
            >
              최신순
            </button>
            <button
              type="button"
              aria-pressed={sortMode === 'likes'}
              onClick={() => setSortMode('likes')}
              className="rounded-full px-4 py-2 text-[12px] font-bold transition-colors"
              style={{ background: sortMode === 'likes' ? '#E85053' : '#FFFFFF', color: sortMode === 'likes' ? '#FFFFFF' : '#9D887C' }}
            >
              좋아요순
            </button>
          </div>
          <section className="space-y-5 px-4">
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.28) }}
              >
                <UnifiedMunchieCard post={post} detailOrigin={detailOrigin} />
              </motion.article>
            ))}
          </section>
        </>
      ) : (
        <section className="mx-4 rounded-3xl border-2 border-dashed border-[#E8D7CD] bg-white/60 px-6 py-14 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 text-[16px] font-black text-[#3B2A22]">아직 이 코스의 피드가 없어요</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#9D887C]">첫 사진과 한줄평을 남겨보세요.</p>
          <button
            onClick={() => navigate('/coursemap/new')}
            className="mx-auto mt-5 flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#E85053] px-5 text-[13px] font-bold text-white"
          >
            <Plus size={15} /> 피드 만들기
          </button>
        </section>
      )}
    </motion.main>
  );
}
