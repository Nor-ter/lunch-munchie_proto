export interface ShareTemplateDesign {
  id: string;
  name: string;
  desc: string;
  aspect: '4:3' | '9:16';
  background: string;
}

const TEMPLATE_NAMES = [
  "Photo strip classic", "Photo strip colour", "Photo strip mood",
  "Cherry roadmap", "Photo roadmap", "Picnic roadmap", "Vintage roadmap", "Colour roadmap",
  "Red lunch tray", "Blue lunch tray", "Picnic lunch tray",
  "Pink CD", "Colour CD", "Scrapbook CD",
  "Mono receipt", "Vintage receipt", "Colour receipt",
  "Classic ticket", "Romantic ticket",
] as const;

/** 코스 생성 후 템플릿 에디터와 둘러보기 화면이 함께 사용하는 전체 디자인 목록. */
export const SHARE_TEMPLATES: ShareTemplateDesign[] = TEMPLATE_NAMES.map((name, index) => ({
  id: `share-${String(index + 1).padStart(2, '0')}`,
  name,
  desc: "Move photos to make it yours",
  aspect: '9:16',
  background: `/templates/munchie-share/template-${String(index + 1).padStart(2, '0')}.jpg`,
}));
