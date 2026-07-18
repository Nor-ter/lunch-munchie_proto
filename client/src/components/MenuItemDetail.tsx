// 메뉴 항목 상세 화면 — 메뉴리스트에서 탭하면 뜨는 다음 화면(카드 형식).
// 대표(큰) 이미지 + 이름 + 가격 + dietary + 상세 설명(재료 등, 소스에 있을 때만).
// 이미지 좌/우 탭으로 예전 사진 캐러셀처럼 다음/이전 메뉴로 넘어감(순환).
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import FoodImage from "@/components/FoodImage";
import type { MenuItem } from "@/contexts/AppContext";

const DIETARY_LABEL: Record<string, string> = {
  vegan: "비건", vegetarian: "베지테리언", "gluten-free": "글루텐프리",
  "dairy-free": "유제품프리", halal: "할랄", kosher: "코셔", "nut-free": "넛프리",
};

export default function MenuItemDetail({
  items, index, fallbackImage, restaurantCategory, onClose, onIndexChange,
}: {
  items: MenuItem[];
  index: number | null;
  fallbackImage?: string;
  restaurantCategory?: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const item = index != null ? items[index] : null;
  const go = (delta: number) => {
    if (index == null || items.length === 0) return;
    onIndexChange((index + delta + items.length) % items.length);
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: "#14100E" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
        >
          <div className="relative w-full" style={{ height: "46vh", minHeight: 260 }}>
            <FoodImage
              src={item.image || fallbackImage}
              name={item.name}
              category={item.category || restaurantCategory}
              className="w-full h-full object-cover"
              emojiClass="text-[88px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14100E] via-transparent to-black/30" />

            {items.length > 1 && (
              <>
                <button
                  className="absolute inset-y-0 left-0 w-1/2"
                  onClick={() => go(-1)}
                  aria-label="이전 메뉴"
                />
                <button
                  className="absolute inset-y-0 right-0 w-1/2"
                  onClick={() => go(1)}
                  aria-label="다음 메뉴"
                />
                <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none max-w-[70%] overflow-hidden">
                  {items.map((_, j) => (
                    <div key={j} className="h-1 rounded-full flex-shrink-0"
                      style={{ width: j === index ? 16 : 5, background: j === index ? "white" : "rgba(255,255,255,0.4)" }} />
                  ))}
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center active:scale-90 z-10"
            >
              <X size={18} color="white" />
            </button>
            {item.category && (
              <span className="absolute bottom-5 left-5 text-[11px] font-bold text-white/90 bg-black/40 px-3 py-1 rounded-full pointer-events-none">
                {item.category}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-white font-black text-[24px] leading-tight">{item.name}</h1>
              {item.price != null && (
                <span className="text-white font-black text-[20px] tabular-nums flex-shrink-0">${item.price}</span>
              )}
            </div>

            {item.dietary && item.dietary.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {item.dietary.map((d) => (
                  <span key={d} className="text-[11px] font-bold bg-[#3CBA44]/20 text-[#7ee08a] px-2.5 py-1 rounded-full">
                    {DIETARY_LABEL[d] ?? d}
                  </span>
                ))}
              </div>
            )}

            {item.description ? (
              <p className="text-white/70 text-[14px] leading-relaxed mt-5">{item.description}</p>
            ) : (
              <p className="text-white/40 text-[13px] mt-5">상세 설명은 준비 중이에요</p>
            )}

            {items.length > 1 && (
              <p className="text-white/30 text-[11px] text-center mt-6">← 이전 / 다음 메뉴 → · {index! + 1}/{items.length}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
