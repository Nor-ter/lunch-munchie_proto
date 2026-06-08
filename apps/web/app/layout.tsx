import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lunchie Munchie',
  description: '점심과 맛집 코스를 탐색·편집·공유하는 모바일 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
