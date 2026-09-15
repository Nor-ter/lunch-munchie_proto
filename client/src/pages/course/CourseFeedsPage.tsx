import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { MessageCircle, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import BackButton from '@/components/ui/BackButton';

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
          <p className="text-[17px] font-bold text-[#2D211C]">Course not found</p>
          <button onClick={() => navigate('/feed?tab=feed')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">
            Back to feed
          </button>
        </div>
      </main>
    );
  }
  const courseTitle = course?.title || posts[0]?.caption || 'Munchie course';

  return (
    <motion.main
      className="min-h-dvh bg-[#FCF4EE] pb-10"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="px-5 pb-5 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton onClick={() => navigate(backPath)} aria-label="Back to course" />
        <div className="flex items-center gap-2 text-[#D94447]">
          <MessageCircle size={16} />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Munchie Feed</p>
        </div>
        <h1 className="mt-2 text-[25px] font-black leading-tight text-[#2D211C]">Posts from this course</h1>
        <p className="mt-1 line-clamp-2 text-[14px] font-bold text-[#6C574C]">{courseTitle}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#9D887C]">
          See how others made this course their own.
        </p>
      </header>

      {posts.length > 0 ? (
        <>
          <div className="mb-4 flex justify-end gap-2 px-4" aria-label="Sort posts">
            <button
              type="button"
              aria-pressed={sortMode === 'latest'}
              onClick={() => setSortMode('latest')}
              className="rounded-full px-4 py-2 text-[12px] font-bold transition-colors"
              style={{ background: sortMode === 'latest' ? '#E85053' : '#FFFFFF', color: sortMode === 'latest' ? '#FFFFFF' : '#9D887C' }}
            >
              Newest
            </button>
            <button
              type="button"
              aria-pressed={sortMode === 'likes'}
              onClick={() => setSortMode('likes')}
              className="rounded-full px-4 py-2 text-[12px] font-bold transition-colors"
              style={{ background: sortMode === 'likes' ? '#E85053' : '#FFFFFF', color: sortMode === 'likes' ? '#FFFFFF' : '#9D887C' }}
            >
              Most liked
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
          <p className="mt-3 text-[16px] font-black text-[#3B2A22]">No posts for this course yet</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#9D887C]">Share the first photo and quick review.</p>
          <button
            onClick={() => navigate('/coursemap/new')}
            className="mx-auto mt-5 flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#E85053] px-5 text-[13px] font-bold text-white"
          >
            <Plus size={15} /> Create post
          </button>
        </section>
      )}
    </motion.main>
  );
}
