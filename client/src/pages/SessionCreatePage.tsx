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
  const { createSession, profile } = useApp();
  const [step, setStep] = useState(1);
  const [sessionName, setSessionName] = useState(`${profile.name}의 점심 세션`);
  const [partySize, setPartySize] = useState(4);
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState<1 | 2 | 3 | 4>(2);
  const [radius, setRadius] = useState(1000);
  const [categories, setCategories] = useState<string[]>([]);

  const toggleDiet = (d: string) => setDietary(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const toggleCat = (c: string) => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleCreate = async () => {
    const session = await createSession(sessionName, { partySize, dietary, budget, radius, categories });
    toast.success(`"${session.name}" 세션이 생성되었습니다! 🎉`);
    navigate('/session/lobby');
  };

  return (
    <div className="min-h-dvh bg-white px-5">
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
          <button onClick={handleCreate} className="lm-btn-primary flex-1 flex items-center justify-center">
            🎉 세션 만들기
          </button>
        )}
      </div>
    </div>
  );
}
