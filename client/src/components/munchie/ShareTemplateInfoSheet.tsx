import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageIcon, X } from 'lucide-react';
import type { ShareTemplateDesign } from '@/constants/shareTemplates';

export default function ShareTemplateInfoSheet({
  template,
  onClose,
}: {
  template: ShareTemplateDesign | null;
  onClose: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      {template && (
        <>
          <motion.button
            type="button"
            aria-label="템플릿 미리보기 닫기"
            className="fixed inset-0 z-[70] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-template-title"
            className="fixed bottom-0 left-1/2 z-[71] max-h-[90dvh] w-full max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-t-[30px] bg-[#FFF9F5] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#DDCEC5]" />
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B09A8C]">Editor template</p>
                <h2 id="share-template-title" className="mt-0.5 text-[22px] font-black text-[#2D211C]">{template.name}</h2>
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
            <div className={`mx-auto flex items-center justify-center rounded-[24px] bg-white p-2 shadow-[0_14px_35px_rgba(91,57,42,0.15)] ${template.aspect === '9:16' ? 'h-[62dvh] max-h-[560px] w-full max-w-[250px]' : 'w-full max-w-[285px]'}`}>
              <img
                src={template.background}
                alt={`${template.name} 기본 디자인`}
                className={template.aspect === '9:16'
                  ? 'max-h-full max-w-full rounded-[18px] object-contain'
                  : 'aspect-[3/4] w-full rounded-[18px] object-contain'}
              />
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#D94447]">
                <ImageIcon size={13} /> 사진 위치 편집 가능
              </span>
              <span className="text-[12px] font-semibold text-[#8C776B]">{template.aspect}</span>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
