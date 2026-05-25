/**
 * Lunchie Munchie — Profile Page
 * Design: Soft Coral (Option 8)
 * Features: Category Top 5, dietary settings, emoji picker, stats
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Save, BarChart3, Shield, Zap, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

const EMOJIS = ['😊', '🍱', '🍜', '🍣', '🥩', '🍕', '🌮', '🍔', '🥗', '☕', '🎂', '🍰'];
const DIETARY_OPTIONS = ['비건', '채식', '글루텐프리', '할랄', '유제품 제외', '견과류 알러지', '해산물 제외'];

const CATEGORY_COLORS: Record<string, string> = {
  '카페': '#EB5053',
  '브런치': '#F09D09',
  '이탈리안': '#3CBA44',
  '일식': '#3E719B',
  '중식': '#EFD0D4',
};

export default function ProfilePage() {
  const { profile, updateProfile, likedRestaurantIds, swipeRecords } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmoji, setEditEmoji] = useState(profile.emoji);
  const [showStats, setShowStats] = useState(true);
  const [showDiet, setShowDiet] = useState(false);

  const handleSave = () => {
    updateProfile({ name: editName, emoji: editEmoji });
    setIsEditing(false);
    toast.success('프로필 업데이트 완료! ✅');
  };

  const toggleDiet = (d: string) => {
    const current = profile.dietary;
    updateProfile({ dietary: current.includes(d) ? current.filter(x => x !== d) : [...current, d] });
  };

  const likeRate = profile.totalSwipes > 0
    ? Math.round((profile.totalLikes / profile.totalSwipes) * 100) : 0;

  const topCategories = profile.categoryPrefs.slice(0, 5);
  const maxScore = topCategories.length > 0 ? topCategories[0].score : 1;

  return (
    <div className="min-h-dvh bg-[#F5F5F5]">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-bold text-[22px] text-[#1A1A1A]">내 정보 👤</h1>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5F5F5] active:scale-95"
          >
            {isEditing ? <Save size={15} color="#EB5053" /> : <Edit3 size={15} color="#4A4A4A" />}
            <span className="text-[13px] font-semibold text-[#1A1A1A]">{isEditing ? '저장' : '편집'}</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div key="emoji-picker" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-wrap gap-2 max-w-[160px]">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEditEmoji(e)}
                    className={`text-xl p-1.5 rounded-xl transition-all ${editEmoji === e ? 'bg-[#FFF5F5] ring-2 ring-[#EB5053] scale-110' : 'bg-[#F5F5F5]'}`}>
                    {e}
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div key="avatar" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <div className="w-16 h-16 rounded-2xl bg-[#FFF5F5] flex items-center justify-center text-4xl">
                  {profile.emoji}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full h-10 bg-[#F5F5F5] rounded-xl px-3 text-[15px] font-bold text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#EB5053]/30"
                autoFocus
              />
            ) : (
              <>
                <p className="font-black text-[20px] text-[#1A1A1A]">{profile.name}</p>
                <p className="text-[12px] text-[#9B9B9B] mt-0.5">
                  {new Date(profile.joinedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 가입
                </p>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: '총 스와이프', value: profile.totalSwipes, icon: Zap, color: '#F09D09' },
            { label: '좋아요', value: profile.totalLikes, icon: Heart, color: '#EB5053' },
            { label: '저장한 맛집', value: likedRestaurantIds.length, icon: BarChart3, color: '#3CBA44' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#F5F5F5] rounded-xl p-3 text-center">
              <stat.icon size={16} style={{ color: stat.color }} className="mx-auto mb-1" />
              <p className="font-black text-[18px] text-[#1A1A1A]">{stat.value}</p>
              <p className="text-[10px] text-[#9B9B9B] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Food Report */}
        <div className="bg-white rounded-2xl p-4">
          <button onClick={() => setShowStats(!showStats)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={17} color="#EB5053" />
              <p className="font-semibold text-[14px] text-[#1A1A1A]">선호 카테고리 Top 5</p>
            </div>
            {showStats ? <ChevronUp size={16} color="#9B9B9B" /> : <ChevronDown size={16} color="#9B9B9B" />}
          </button>

          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {topCategories.length === 0 ? (
                  <p className="text-[13px] text-[#9B9B9B] text-center py-6">스와이프 후 취향 분석이 시작됩니다</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {/* Like rate */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] text-[#9B9B9B]">좋아요 비율</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: '#EB5053' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${likeRate}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                        <span className="font-bold text-[13px] text-[#EB5053]">{likeRate}%</span>
                      </div>
                    </div>

                    {topCategories.map((pref, i) => (
                      <div key={pref.category} className="flex items-center gap-3">
                        <span className="text-[11px] text-[#9B9B9B] w-4 text-right">{i + 1}</span>
                        <span className="text-[12px] font-semibold text-[#1A1A1A] w-14 flex-shrink-0">{pref.category}</span>
                        <div className="flex-1 h-5 bg-[#F5F5F5] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full flex items-center justify-end pr-2"
                            style={{ background: CATEGORY_COLORS[pref.category] || '#EB5053' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(pref.score / maxScore) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.08 }}
                          >
                            <span className="text-white text-[10px] font-black">{Math.round(pref.score * 100)}</span>
                          </motion.div>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 p-3 bg-[#FFF5F5] rounded-xl flex items-center gap-2">
                      <span className="text-[18px]">🏆</span>
                      <p className="text-[12px] text-[#1A1A1A]">
                        <span className="font-black text-[#EB5053]">{topCategories[0]?.category}</span>을(를) 가장 좋아하시는군요!
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dietary Settings */}
        <div className="bg-white rounded-2xl p-4">
          <button onClick={() => setShowDiet(!showDiet)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={17} color="#EB5053" />
              <p className="font-semibold text-[14px] text-[#1A1A1A]">식단 제한 설정</p>
              {profile.dietary.length > 0 && (
                <span className="bg-[#FFF5F5] text-[#EB5053] text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {profile.dietary.length}개
                </span>
              )}
            </div>
            {showDiet ? <ChevronUp size={16} color="#9B9B9B" /> : <ChevronDown size={16} color="#9B9B9B" />}
          </button>

          <AnimatePresence>
            {showDiet && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDiet(d)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                        profile.dietary.includes(d) ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'
                      }`}
                      style={profile.dietary.includes(d) ? { background: '#EB5053' } : {}}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {profile.dietary.length > 0 && (
                  <p className="text-[11px] text-[#9B9B9B] mt-3">
                    💡 그룹 세션 생성 시 자동으로 적용됩니다
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand Footer */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EB5053' }}>
              <span className="text-white text-[14px]">🍱</span>
            </div>
            <span className="font-black text-[16px]" style={{ color: '#EB5053' }}>Lunchie Munchie</span>
          </div>
          <p className="text-[11px] text-[#9B9B9B]">점심 메뉴는 더 이상 고민이 아닌, 매일의 작은 모험</p>
        </div>
      </div>
    </div>
  );
}
