import type { ShareTemplateDesign } from '@/constants/shareTemplates';

const PHOTO_POSITIONS = [
  { left: 11.7, top: 21.7, rotate: -5 },
  { left: 57.2, top: 22.9, rotate: 5 },
  { left: 15.2, top: 48.4, rotate: 3 },
  { left: 56.6, top: 50, rotate: -4 },
  { left: 34.5, top: 71.7, rotate: 2 },
];

/** 공유 에디터의 기본 사진 배치를 읽기 전용 카드로 축소 렌더링한다. */
export default function CourseShareTemplatePreview({
  template,
  title,
  photos,
  className = '',
}: {
  template: ShareTemplateDesign;
  title: string;
  photos: string[];
  className?: string;
}) {
  return (
    <div className={`relative aspect-[9/16] w-full overflow-hidden bg-[#F4EEE9] ${className}`}>
      <img src={template.background} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {photos.slice(0, 5).map((photo, index) => {
        const position = PHOTO_POSITIONS[index]!;
        return (
          <div
            key={`${photo}-${index}`}
            className="absolute overflow-hidden rounded-[2px] border-[3px] border-white bg-white shadow-md"
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: '26.9%',
              height: '17.8%',
              transform: `rotate(${position.rotate}deg)`,
            }}
          >
            <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        );
      })}
      <p className="absolute bottom-[3%] left-1/2 max-w-[82%] -translate-x-1/2 truncate rounded-full bg-white/85 px-2.5 py-1 text-[8px] font-black text-[#3B2A22] backdrop-blur-sm">
        {title}
      </p>
    </div>
  );
}
