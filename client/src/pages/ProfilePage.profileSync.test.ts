import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const profileSource = readFileSync(join(import.meta.dirname, 'ProfilePage.tsx'), 'utf8');
const contextSource = readFileSync(join(import.meta.dirname, '..', 'contexts', 'AppContext.tsx'), 'utf8');
const buddySource = readFileSync(join(import.meta.dirname, '..', 'components', 'munchie', 'FoodieBuddy.tsx'), 'utf8');
const progressSource = readFileSync(join(import.meta.dirname, '..', 'components', 'munchie', 'LunchmateProgressSheet.tsx'), 'utf8');

describe('Profile information and level synchronization', () => {
  it('keeps the sk profile copy and compact badge presentation', () => {
    expect(profileSource).not.toContain('value={editBio}');
    expect(profileSource).toContain("body: JSON.stringify({ username, handle })");
    expect(profileSource).toContain("updateProfile({ name: saved.profile.username, handle: saved.profile.handle })");
    expect(profileSource).toContain('오늘도 맛있는 하루를 위해');
    expect(profileSource).toContain('🏅 배지');
  });

  it('persists canonical lunchmate XP while keeping the clickable kimbap level UI', () => {
    expect(profileSource).toContain('initialTotalXp: lunchmateTotalXp');
    expect(profileSource).toContain('updateProfile({ lunchmateTotalXp: nextTotalXp })');
    expect(profileSource).toContain('progressButtonRef={progressButtonRef}');
    expect(buddySource).toContain('aria-label={`김밥 EXP ${progressLabel}`}');
    expect(buddySource).toContain('Array.from({ length: filledKimbapCount }');
  });

  it('keeps existing feed author identity aligned with profile edits', () => {
    expect(contextSource).toContain('isAuthenticatedContentOwner(post.authorId, initialAuthUserId)');
    expect(contextSource).not.toContain('post.authorId === profile.id');
    expect(contextSource).toContain('const ownershipId = initialAuthUserId ?? profile.id');
    expect(contextSource).not.toContain('new Set([initialAuthUserId, profile.id]');
    expect(contextSource).toContain('authorName: updates.name ?? post.authorName');
    expect(contextSource).toContain('authorEmoji: updates.emoji ?? post.authorEmoji');
  });

  it('loads Google-backed profile avatars without leaking referrers and falls back cleanly', () => {
    expect(profileSource).toContain('referrerPolicy="no-referrer"');
    expect(profileSource).toContain('onError={() => setImageFailed(true)}');
  });

  it('retains the current production guest profile preview', () => {
    expect(profileSource).toContain('function ProfileGuestPreview()');
    expect(profileSource).toContain('return <ProfileGuestPreview />;');
  });

  it('shows every level stage with its configured icon', () => {
    expect(progressSource).toContain('LUNCHMATE_LEVELS.map(level =>');
    expect(progressSource).toContain('getLunchmateLevelIcon(level.level)');
    expect(progressSource).toContain('아이콘별 레벨 단계');
  });
});
