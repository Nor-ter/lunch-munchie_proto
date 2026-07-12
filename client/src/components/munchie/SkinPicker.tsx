import { Check } from 'lucide-react';
import { MUNCHIE_SKINS, type MunchieSkin } from '@/constants/skins';

function SkinCell({
  skin,
  selected,
  previewPhoto,
  onSelect,
}: {
  skin: MunchieSkin;
  selected: boolean;
  previewPhoto?: string;
  onSelect: () => void;
}) {
  return (
    <button onClick={onSelect} className="text-left active:scale-95 transition-transform">
      <div
        className="relative rounded-2xl p-[7px]"
        style={{
          background: skin.frame,
          boxShadow: skin.frameShadow,
          outline: selected ? '2.5px solid #E85053' : '2.5px solid transparent',
          outlineOffset: 2,
        }}
      >
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: skin.paper, height: 84 }}
        >
          {previewPhoto ? (
            <img src={previewPhoto} alt="" className="w-full h-full object-cover opacity-90" />
          ) : (
            <span className="text-[26px]">{skin.emoji}</span>
          )}
        </div>
        {selected && (
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E85053] text-white flex items-center justify-center shadow">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-center text-[12px] ${selected ? 'font-bold text-[#E85053]' : 'font-medium text-[#4A4A4A]'}`}>
        {skin.name}
      </p>
    </button>
  );
}

/** 템플릿 스킨 선택 그리드 (피드 작성 3단계 / 코스 상세 스킨 바꾸기 공용) */
export default function SkinPicker({
  value,
  onChange,
  previewPhoto,
  columns = 3,
}: {
  value: string | null;
  onChange: (skinId: string) => void;
  previewPhoto?: string;
  columns?: 2 | 3;
}) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {MUNCHIE_SKINS.map((skin) => (
        <SkinCell
          key={skin.id}
          skin={skin}
          selected={value === skin.id}
          previewPhoto={previewPhoto}
          onSelect={() => onChange(skin.id)}
        />
      ))}
    </div>
  );
}
