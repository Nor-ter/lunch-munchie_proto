import type { ReactNode } from 'react';

export interface ProfileHeroCardProps {
  children: ReactNode;
  mode: 'owner' | 'guest' | 'visitor';
}

/** Shared outer card so owner and visitor profile composition cannot drift. */
export default function ProfileHeroCard({ children, mode }: ProfileHeroCardProps) {
  return (
    <section
      className="mx-4 mt-2 rounded-[30px] bg-[#F8DCD2] p-4 pb-5"
      data-profile-hero-card={mode}
    >
      {children}
    </section>
  );
}
