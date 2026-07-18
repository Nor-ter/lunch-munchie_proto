import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ChevronLeft, Eye, ImageIcon } from 'lucide-react';
import { SHARE_TEMPLATES, type ShareTemplateDesign } from '@/constants/shareTemplates';
import ShareTemplateInfoSheet from '@/components/munchie/ShareTemplateInfoSheet';

export default function TemplatesBrowsePage() {
  const [, navigate] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<ShareTemplateDesign | null>(null);

  return (
    <motion.main
      className="mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE] pb-10"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className="px-5 pb-5 pt-5">
        <button
          onClick={() => navigate('/feed?tab=template')}
          aria-label="템플릿 피드로 돌아가기"
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D06A6C]">Template library</p>
        <h1 className="mt-1 text-[28px] font-black leading-tight text-[#2D211C]">템플릿 둘러보기</h1>
        <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-[#8C776B]">
          코스 생성 화면과 동일한 {SHARE_TEMPLATES.length}개 디자인을 미리 둘러보세요.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-3 gap-y-6 px-4">
        {SHARE_TEMPLATES.map((template, index) => (
          <motion.button
            key={template.id}
            type="button"
            onClick={() => setSelectedTemplate(template)}
            aria-label={`${template.name} 기본 양식 보기`}
            className="text-left"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative overflow-hidden rounded-[20px] bg-white p-1.5 shadow-[0_10px_26px_rgba(91,57,42,0.12)]">
              <img
                src={template.background}
                alt={`${template.name} 기본 디자인`}
                className="aspect-[9/16] w-full rounded-[15px] object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
              />
              <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#D94447] shadow-sm backdrop-blur">
                <Eye size={15} />
              </span>
            </div>
            <div className="px-1 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[15px] font-black text-[#3B2A22]">{template.name}</p>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#AD9284]">
                  <ImageIcon size={10} /> {template.aspect}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#9D887C]">{template.desc}</p>
            </div>
          </motion.button>
        ))}
      </section>

      <ShareTemplateInfoSheet template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
    </motion.main>
  );
}
