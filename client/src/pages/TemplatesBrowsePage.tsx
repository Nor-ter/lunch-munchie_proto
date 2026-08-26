import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ChevronRight, ImageOff } from 'lucide-react';
import { COURSEMAP_TEMPLATES } from '@/constants/coursemapTemplates';
import { type ShareTemplateDesign } from '@/constants/shareTemplates';
import ShareTemplateInfoSheet from '@/components/munchie/ShareTemplateInfoSheet';
import BackButton from '@/components/ui/BackButton';

const FEED_TEMPLATES: ShareTemplateDesign[] = COURSEMAP_TEMPLATES.map(template => ({
  id: template.id,
  name: template.name,
  desc: template.description,
  aspect: '4:3',
  background: template.image,
}));

function TemplateSection({
  eyebrow,
  title,
  description,
  templates,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  description: string;
  templates: ShareTemplateDesign[];
  onSelect: (template: ShareTemplateDesign) => void;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4 px-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#E66F70]">{eyebrow}</p>
          <h2 className="mt-1 text-[19px] font-black text-[#30231E]">{title}</h2>
          <p className="mt-1 text-[11px] font-semibold text-[#927D72]">{description}</p>
        </div>
        <span className="mb-0.5 flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#B1988C]">
          밀어서 보기 <ChevronRight size={13} />
        </span>
      </div>

      <div
        aria-label={`${title} 슬라이드`}
        className="mt-3 grid grid-flow-col grid-rows-2 auto-cols-[calc((100%_-_2.75rem)/2)] gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {templates.map((template, index) => (
          <motion.button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            aria-label={`${template.name} 빈 템플릿 보기`}
            className="snap-start rounded-[20px] border border-[#EBD9D0] bg-[#FFFDFC] p-2 text-left shadow-[0_8px_20px_rgba(91,57,42,0.08)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 3) * 0.04 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex h-[192px] w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#F8F1EB]">
              <img
                src={template.background}
                alt={`${template.name} 사진 없는 기본 템플릿`}
                className="h-full w-full object-contain"
                loading={index < 4 ? 'eager' : 'lazy'}
              />
            </div>
            <div className="px-1 pb-0.5 pt-2">
              <div className="flex items-center justify-between gap-1.5">
                <p className="min-w-0 truncate text-[12px] font-black text-[#3B2A22]">{template.name}</p>
                <span className="shrink-0 rounded-full bg-[#FFF0EB] px-1.5 py-0.5 text-[8px] font-black text-[#D96B69]">{template.aspect}</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-[#A28C81]"><ImageOff size={10} /> 사진 없는 기본형</p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

export default function TemplatesBrowsePage() {
  const [, navigate] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplateDesign | null>(null);

  return (
    <motion.main
      className="mx-auto min-h-dvh max-w-[430px] bg-[#FFF8F3] pb-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="border-b border-[#EEDFD6] bg-[#FFFDFC] px-5 pb-5 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton onClick={() => navigate('/feed')} aria-label="먼치피드로 돌아가기" />
        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-[#E66F70]">Munchie templates</p>
        <h1 className="mt-1 text-[26px] font-black tracking-[-0.03em] text-[#2D211C]">템플릿 한눈에 보기</h1>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#8C776B]">
          모든 Munchie 피드 디자인을 한곳에서 확인해보세요.
        </p>
      </header>

      <TemplateSection
        eyebrow="Munchie feed"
        title="맛집 피드 템플릿"
        description={`4:3 피드 카드 · 전체 ${FEED_TEMPLATES.length}개`}
        templates={FEED_TEMPLATES}
        onSelect={setSelectedTemplate}
      />

      <ShareTemplateInfoSheet template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
    </motion.main>
  );
}
