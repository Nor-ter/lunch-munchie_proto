import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const feedDetailSource = readFileSync(join(import.meta.dirname, 'FeedDetailPage.tsx'), 'utf8');
const courseFeedsSource = readFileSync(join(import.meta.dirname, 'course/CourseFeedsPage.tsx'), 'utf8');

describe('Munchie feed viewing page layout', () => {
  it('keeps feed detail mobile-width while the course feed list uses the app shell width', () => {
    expect(feedDetailSource).toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
    expect(feedDetailSource).toContain('pt-[max(12px,env(safe-area-inset-top))]');
    expect(feedDetailSource).toContain("import BackButton from '@/components/ui/BackButton'");
    expect(courseFeedsSource).not.toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
  });
});
