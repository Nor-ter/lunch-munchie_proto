export interface ShareTemplateDesign {
  id: string;
  name: string;
  desc: string;
  aspect: '4:3' | '9:16';
  background: string;
}

const TEMPLATE_NAMES = [
  '네컷 베이직', '네컷 컬러', '네컷 무드',
  '로드맵 체리', '로드맵 포토', '로드맵 피크닉', '로드맵 빈티지', '로드맵 컬러',
  '런치 트레이 레드', '런치 트레이 블루', '런치 트레이 피크닉',
  'CD 핑크', 'CD 컬러', 'CD 스크랩',
  '영수증 모노', '영수증 빈티지', '영수증 컬러',
  '티켓 클래식', '티켓 로맨틱',
] as const;

/** 코스 생성 후 템플릿 에디터와 둘러보기 화면이 함께 사용하는 전체 디자인 목록. */
export const SHARE_TEMPLATES: ShareTemplateDesign[] = TEMPLATE_NAMES.map((name, index) => ({
  id: `share-${String(index + 1).padStart(2, '0')}`,
  name,
  desc: 'ZIP 디자인 · 사진 위치 편집 가능',
  aspect: '9:16',
  background: `/templates/munchie-share/template-${String(index + 1).padStart(2, '0')}.jpg`,
}));
