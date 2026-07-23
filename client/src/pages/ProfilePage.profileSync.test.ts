import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const profileSource = readFileSync(join(import.meta.dirname, 'ProfilePage.tsx'), 'utf8');
const contextSource = readFileSync(join(import.meta.dirname, '..', 'contexts', 'AppContext.tsx'), 'utf8');
const buddySource = readFileSync(join(import.meta.dirname, '..', 'components', 'munchie', 'FoodieBuddy.tsx'), 'utf8');
const progressSource = readFileSync(join(import.meta.dirname, '..', 'components', 'munchie', 'LunchmateProgressSheet.tsx'), 'utf8');

describe('Profile information and level synchronization', () => {
  it('saves and renders the editable profile bio', () => {
    expect(profileSource).toContain('value={editBio}');
    expect(profileSource).toContain('bio: editBio.trim()');
    expect(profileSource).toContain("profile.bio?.trim() || '오늘도 맛있는 하루를 위해'");
  });

  it('persists lunchmate XP and replaces the badge with a clickable level label', () => {
    expect(profileSource).toContain('initialXp: profile.lunchmateXp ?? 0');
    expect(profileSource).toContain('updateProfile({ lunchmateXp: totalXp })');
    expect(profileSource).toContain('레벨 정보 보기, Lv.');
    expect(profileSource).not.toContain('🏅 배지');
    expect(buddySource).toContain('aria-label={`김밥 EXP ${progressLabel}`}');
    expect(buddySource).toContain('Array.from({ length: filledKimbapCount }');
  });

  it('keeps existing feed author identity aligned with profile edits', () => {
    expect(contextSource).toContain('post.authorId === profile.id');
    expect(contextSource).toContain('authorName: updates.name ?? post.authorName');
    expect(contextSource).toContain('authorEmoji: updates.emoji ?? post.authorEmoji');
  });

  it('shows every level stage with its configured icon', () => {
    expect(progressSource).toContain('LUNCHMATE_LEVELS.map(level =>');
    expect(progressSource).toContain('getLunchmateLevelIcon(level.level)');
    expect(progressSource).toContain('아이콘별 레벨 단계');
  });
});
