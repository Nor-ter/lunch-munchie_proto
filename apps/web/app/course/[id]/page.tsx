import { notFound } from 'next/navigation';
import { getCourseById } from '@lunchie-munchie/shared';

export function generateMetadata({ params }: { params: { id: string } }) {
  const course = getCourseById(params.id);
  return {
    title: course ? `${course.title} | Lunchie Munchie` : 'Lunchie Munchie',
    description: course?.description ?? '공유된 코스맵 미리보기',
    openGraph: {
      title: course?.title,
      description: course?.description,
      type: 'website',
    },
  };
}

export default function CourseShareLanding({ params }: { params: { id: string } }) {
  const course = getCourseById(params.id);
  if (!course) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#FFF7F1] px-6 py-8">
      <header className="rounded-[28px] bg-[#FF6B6B] p-6 text-white">
        <p className="font-bold text-white/80">Lunchie Munchie 공유 코스</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">{course.title}</h1>
        <p className="mt-3 leading-6 text-white/90">{course.description}</p>
      </header>
      <section className="mt-6 rounded-[28px] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-neutral-500">{course.region} · {course.category}</p>
            <p className="mt-2 text-lg font-black">{course.totalDistance}km · {course.totalDuration}분</p>
          </div>
          <div className="rounded-full bg-[#FFE89A] px-4 py-2 text-sm font-black">♡ {course.likesCount}</div>
        </div>
        <ol className="mt-6 space-y-4">
          {course.places.map((place, index) => (
            <li key={place.id} className="flex gap-4 rounded-2xl bg-[#FFF7F1] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6B6B] font-black text-white">{index + 1}</div>
              <div>
                <h2 className="font-black">{place.name}</h2>
                <p className="mt-1 text-sm text-neutral-600">{place.address}</p>
                {place.memo ? <p className="mt-1 text-sm text-neutral-500">{place.memo}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-6 grid gap-3">
        <a href={`lunchie://course/${course.id}`} className="rounded-2xl bg-[#FF6B6B] px-5 py-4 text-center font-black text-white">앱에서 열기</a>
        <a href="/" className="rounded-2xl bg-[#FFE89A] px-5 py-4 text-center font-black text-[#1A1A1A]">다른 코스 보기</a>
      </section>
    </main>
  );
}
