/**
 * Lunchie Munchie — Session Create Page
 * Design: Soft Coral (Option 8)
 * Features: Party size, dietary, budget, radius, categories
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, ChevronRight, Users, DollarSign, MapPin, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

const CATEGORIES = ['한식', '일식', '중식', '이탈리안', '브런치', '카페', '베이커리', '전통찻집'];
const DIETARY_OPTIONS = ['비건', '채식', '글루텐프리', '할랄', '유제품 제외', '견과류 알러지'];
const RADIUS_OPTIONS = [{ v: 500, l: '500m' }, { v: 1000, l: '1km' }, { v: 2000, l: '2km' }, { v: 3000, l: '3km' }, { v: 5000, l: '5km' }];

export default function SessionCreatePage() {
  const [, navigate] = useLocation();
  const { createSession, profile, updateProfile } = useApp();
  const [step, setStep] = useState(1);
  const [hostName, setHostName] = useState(profile.name === '사용자' ? '' : profile.name);
  const [hostEmoji, setHostEmoji] = useState(profile.emoji || '🙂');
  const [sessionName, setSessionName] = useState(`${profile.name === '사용자' ? '호스트' : profile.name}의 점심 세션`);
  const [partySize, setPartySize] = useState(4);
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState<1 | 2 | 3 | 4>(2);
  const [radius, setRadius] = useState(1000);
  const [categories, setCategories] = useState<string[]>([]);
  const [deadlineMinutes, setDeadlineMinutes] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  const toggleDiet = (d: string) => setDietary(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const toggleCat = (c: string) => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleCreate = async () => {
    if (!hostName.trim()) {
      toast.error('내 닉네임을 입력해주세요!');
      setStep(1);
      return;
    }
    setIsCreating(true);
    try {
      updateProfile({ name: hostName.trim(), emoji: hostEmoji });
      const session = await createSession(sessionName, { partySize, dietary, budget, radius, categories }, hostName.trim(), hostEmoji, deadlineMinutes);
      toast.success(`"${session.name}" 세션이 생성되었습니다! 🎉`);
      navigate('/session/lobby');
    } catch (e) {
      toast.error('세션 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] px-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-12 pb-5">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
        <div>
          <h1 className="font-bold text-[20px] text-[#1A1A1A]">그룹 세션 만들기</h1>
          <p className="text-[12px] text-[#9B9B9B]">단계 {step}/3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500"
            style={{ background: s <= step ? '#EB5053' : '#E5E5E5' }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            {/* Host Profile Configuration */}
            <div className="bg-[#FFF5F5] rounded-2xl p-4">
              <p className="font-bold text-[13px] text-[#EB5053] mb-3">내 프로필 설정 👤</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-black/5 flex-shrink-0">
                  {hostEmoji}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={hostName}
                    onChange={e => {
                      setHostName(e.target.value);
                      if (sessionName.endsWith('의 점심 세션')) {
                        setSessionName(`${e.target.value || '호스트'}의 점심 세션`);
                      }
                    }}
                    placeholder="내 닉네임 입력"
                    maxLength={15}
                    className="w-full h-10 bg-white rounded-lg px-3 text-[13px] font-semibold text-[#1A1A1A] outline-none border border-[#E5E5E5] focus:border-[#EB5053] focus:ring-1 focus:ring-[#EB5053]/30"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-8 gap-1.5 mt-3 justify-center">
                {['😊', '🍱', '🍜', '🍣', '🥩', '🍕', '🌮', '🍔', '🥗', '☕', '🦊', '🐱', '🐼', '🐨', '🍺', '🍰'].map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setHostEmoji(e)}
                    className={`text-base p-0.5 rounded-lg transition-all ${
                      hostEmoji === e 
                        ? 'bg-white ring-2 ring-[#EB5053] scale-110' 
                        : 'hover:bg-white/50'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-2">세션 이름</label>
              <input
                type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
                className="w-full h-12 bg-[#F5F5F5] rounded-xl px-4 text-[14px] text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#EB5053]/30"
              />
            </div>
            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-3">
                <Users size={14} className="inline mr-1" />인원수
              </label>
              <div className="flex items-center gap-4">
                <button onClick={() => setPartySize(p => Math.max(1, p - 1))}
                  className="w-10 h-10 rounded-full border border-[#E5E5E5] flex items-center justify-center font-bold text-[18px] active:scale-95">−</button>
                <span className="font-black text-[28px] text-[#EB5053] w-12 text-center">{partySize}</span>
                <button onClick={() => setPartySize(p => Math.min(20, p + 1))}
                  className="w-10 h-10 rounded-full border border-[#E5E5E5] flex items-center justify-center font-bold text-[18px] active:scale-95">+</button>
                <span className="text-[14px] text-[#9B9B9B]">명</span>
              </div>
            </div>
            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-3">
                <MapPin size={14} className="inline mr-1" />검색 반경
              </label>
              <div className="flex gap-2">
                {RADIUS_OPTIONS.map(opt => (
                  <button key={opt.v} onClick={() => setRadius(opt.v)}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${radius === opt.v ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'}`}
                    style={radius === opt.v ? { background: '#EB5053' } : {}}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-3">
                <DollarSign size={14} className="inline mr-1" />예산 범위
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(b => (
                  <button key={b} onClick={() => setBudget(b as 1 | 2 | 3 | 4)}
                    className={`py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${budget === b ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'}`}
                    style={budget === b ? { background: '#EB5053' } : {}}>
                    {'₩'.repeat(b)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-1">음식 카테고리</label>
              <p className="text-[12px] text-[#9B9B9B] mb-3">선택 안 하면 전체 포함</p>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => toggleCat(cat)}
                    className={`py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${categories.includes(cat) ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'}`}
                    style={categories.includes(cat) ? { background: '#EB5053' } : {}}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div>
              <label className="font-semibold text-[14px] text-[#1A1A1A] block mb-1">⏱️ 투표 시간 제한</label>
              <p className="text-[12px] text-[#9B9B9B] mb-3">제한시간 종료 시 그 시점의 득표수로 결과가 결정됩니다.</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { v: 5, l: '5분' },
                  { v: 10, l: '10분' },
                  { v: 15, l: '15분' },
                  { v: 1440, l: '1일' },
                  { v: 7200, l: '5일' },
                ].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setDeadlineMinutes(opt.v)}
                    className={`py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${deadlineMinutes === opt.v ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'}`}
                    style={deadlineMinutes === opt.v ? { background: '#EB5053' } : {}}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} color="#EB5053" />
                <label className="font-semibold text-[14px] text-[#1A1A1A]">식단 제한 사항</label>
              </div>
              <p className="text-[12px] text-[#9B9B9B] mb-3">팀원 중 해당하는 식단 제한을 선택하세요</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(d => (
                  <button key={d} onClick={() => toggleDiet(d)}
                    className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${dietary.includes(d) ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'}`}
                    style={dietary.includes(d) ? { background: '#EB5053' } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#FFF5F5] rounded-2xl p-4 space-y-2">
              <p className="font-bold text-[14px] text-[#1A1A1A] mb-2">세션 설정 요약</p>
              {[
                ['세션 이름', sessionName],
                ['인원수', `${partySize}명`],
                ['검색 반경', radius >= 1000 ? `${radius / 1000}km` : `${radius}m`],
                ['예산', '₩'.repeat(budget)],
                ['카테고리', categories.length === 0 ? '전체' : categories.join(', ')],
                ['식단 제한', dietary.length === 0 ? '없음' : dietary.join(', ')],
                ['투표 시간 제한', deadlineMinutes === 1440 ? '1일' : deadlineMinutes === 7200 ? '5일' : `${deadlineMinutes}분`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[12px] text-[#9B9B9B]">{k}</span>
                  <span className="text-[12px] font-semibold text-[#1A1A1A]">{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="lm-btn-outline flex-1 flex items-center justify-center">이전</button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)} className="lm-btn-primary flex-1 flex items-center justify-center gap-2">
            다음 <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={isCreating} className="lm-btn-primary flex-1 flex items-center justify-center">
            {isCreating ? '생성 중...' : '🎉 세션 만들기'}
          </button>
        )}
      </div>
    </div>
  );
}
