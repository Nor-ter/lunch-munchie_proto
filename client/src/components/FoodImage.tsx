// 식당 사진 — 없거나 로드 실패 시 카테고리 이모지 + 인텐트별 그라디언트 placeholder.
// OSM 데이터엔 사진이 없어서, 외부 이미지 라이선스 없이 채운다.
import { useState } from "react";
import { intentForCategory } from "@shared/intent";

const EMOJI: [RegExp, string][] = [
  [/카페|찻집|cafe|coffee/i, "☕"],
  [/베이커리|bakery|pastry|patisserie/i, "🥐"],
  [/디저트|dessert|ice.?cream|gelato|아이스크림/i, "🍰"],
  [/pizza|피자/i, "🍕"],
  [/일식|japanese|sushi|ramen|스시|라멘/i, "🍣"],
  [/중식|chinese|중국/i, "🥡"],
  [/이탈리안|italian|pasta/i, "🍝"],
  [/인도|indian/i, "🍛"],
  [/타이|thai|태국/i, "🍜"],
  [/한식|korean|korea/i, "🍚"],
  [/베트남|vietnamese|pho/i, "🍲"],
  [/버거|burger/i, "🍔"],
  [/멕시칸|mexican|taco/i, "🌮"],
  [/치킨|chicken/i, "🍗"],
  [/fast.?food/i, "🍟"],
  [/샐러드|salad|비건|vegan|vegetarian/i, "🥗"],
];

function foodEmoji(category?: string): string {
  if (!category) return "🍴";
  for (const [re, e] of EMOJI) if (re.test(category)) return e;
  return "🍴";
}

function gradientFor(category?: string): string {
  const intent = intentForCategory(category);
  if (intent === "cafe") return "linear-gradient(135deg,#6F4E37,#B08968)";
  if (intent === "dessert") return "linear-gradient(135deg,#EC6F9E,#F4A9C7)";
  return "linear-gradient(135deg,#EB5053,#F09D09)"; // meal
}

export default function FoodImage({
  src, name, category, className, emojiClass = "text-[64px]",
}: {
  src?: string; name?: string; category?: string; className?: string; emojiClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center`} style={{ background: gradientFor(category) }}>
        <span className={emojiClass} role="img" aria-label={category || "food"}>{foodEmoji(category)}</span>
      </div>
    );
  }
  return <img src={src} alt={name ?? ""} className={className} draggable={false} onError={() => setFailed(true)} />;
}
