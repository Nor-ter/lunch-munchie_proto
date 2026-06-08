import Link from 'next/link';
import { courses } from '@lunchie-munchie/shared';

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#FFF7F1] px-8 py-12">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#FF6B6B] bg-white text-lg">◡̈</div>
        <strong className="text-xl font-black text-[#FF6B6B]">Lunchie Munchie</strong>
      </header>
      <section className="mt-12">
        <h1 className="whitespace-pre-line text-4xl font-black leading-tight">오늘 어떻게{`\n`}먹을까요?</h1>
        <p className="mt-3 text-sm text-neutral-500">모드를 선택해주세요.</p>
      </section>
      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-black">Lunchie Mode</h2>
        <div className="rounded-[28px] bg-[#FF6B6B] p-7 text-white shadow-xl">
          <h3 className="text-2xl font-black">Quick Match</h3>
          <p className="mt-3 leading-6 text-white/90">그룹 멤버들과 함께 음식 카드를 스와이프하고 예선전·결승전으로 점심을 결정해요.</p>
        </div>
      </section>
      <section className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black">Munchie Mode</h2>
            <p className="mt-2 text-sm text-neutral-500">사람들이 많이 저장한 코스</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          {courses.map((course) => (
            <Link key={course.id} href={`/course/${course.id}`} className="block rounded-[24px] bg-[#FFE89A] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-sm font-black">{course.category}</p>
                  <h3 className="mt-2 text-xl font-black">{course.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{course.hashtags.map((tag) => `#${tag}`).join(' ')}</p>
                  <p className="mt-6 text-sm text-neutral-500">♡ {course.likesCount}</p>
                </div>
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/80 text-5xl">〰</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
