import { getCourseSequenceColor } from '@/constants/courseTheme';

export default function CourseSequenceMarker({
  index,
  selected = false,
}: {
  index: number;
  selected?: boolean;
}) {
  const color = getCourseSequenceColor(index).base;

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-black leading-none text-white transition-[box-shadow,transform]"
      style={{
        backgroundColor: color,
        boxShadow: selected
          ? `0 0 0 3px #FFFFFF, 0 0 0 5px ${color}, 0 5px 12px rgba(62, 41, 34, 0.2)`
          : '0 3px 8px rgba(62, 41, 34, 0.14)',
      }}
    >
      {index + 1}
    </span>
  );
}
