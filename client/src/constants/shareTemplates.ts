export interface ShareTemplateDesign {
  id: string;
  name: string;
  desc: string;
  aspect: '4:3' | '9:16';
  background: string;
}

const TEMPLATE_NAMES = [
  "Four-shot Basic", "Four-shot Color", "Four-shot Mood",
  "Roadmap Cherry", "Roadmap Photo", "Roadmap Picnic", "Roadmap Vintage", "Roadmap Color",
  "Lunch Tray Red", "Lunch Tray Blue", "Lunch Tray Picnic",
  "CD Pink", "CD Color", "CD Scrapbook",
  "Receipt Mono", "Receipt Vintage", "Receipt Color",
  "Ticket Classic", "Ticket Romantic",
] as const;

/** 코스 생성 후 템플릿 에디터와 둘러보기 화면이 함께 사용하는 전체 디자인 목록. */
export const SHARE_TEMPLATES: ShareTemplateDesign[] = TEMPLATE_NAMES.map((name, index) => ({
  id: `share-${String(index + 1).padStart(2, '0')}`,
  name,
  desc: "ZIP Design · Editable Photo Positions",
  aspect: '9:16',
  background: `/templates/munchie-share/template-${String(index + 1).padStart(2, '0')}.jpg`,
}));
