import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageIcon, Layers3, X } from 'lucide-react';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';

export default function TemplateInfoSheet({
  template,
  onClose,
}: {
  template: CoursemapTemplate | null;
  onClose: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      {template && (
        <>
          <motion.button
            type="button"
            aria-label="템플릿 정보 닫기"
            className="fixed inset-0 z-[70] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-info-title"
            className="fixed bottom-0 left-1/2 z-[71] max-h-[90dvh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[30px] bg-[#FFF9F5] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#DDCEC5]" />
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B09A8C]">Original design</p>
                <h2 id="template-info-title" className="mt-0.5 text-[22px] font-black text-[#2D211C]">{template.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6C574C] shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mx-auto w-full max-w-[285px] rounded-[24px] bg-white p-2 shadow-[0_14px_35px_rgba(91,57,42,0.15)]">
              <img
                src={template.image}
                alt={`${template.name} 사진을 넣기 전 기본 양식`}
                className="aspect-[3/4] w-full rounded-[18px] object-cover"
              />
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-[#FDE1E1] px-2.5 py-1 text-[11px] font-bold text-[#D94447]">
                  <ImageIcon size={12} /> 사진 {template.slots.length}장
                </span>
                <span className="flex items-center gap-1 rounded-full bg-[#F1E9E3] px-2.5 py-1 text-[11px] font-bold text-[#79645A]">
                  <Layers3 size={12} /> 4:3 규격
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-[#6C574C]">{template.description}</p>
              <div className="mt-3 rounded-2xl bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B09A8C]">잘 어울리는 코스</p>
                <p className="mt-1 text-[13px] font-bold text-[#3B2A22]">{template.bestFor}</p>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
