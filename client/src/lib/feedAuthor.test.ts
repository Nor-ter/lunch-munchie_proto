import { describe, expect, it } from 'vitest';
import { feedAuthorEmoji } from './feedAuthor';

describe('feedAuthorEmoji', () => {
  it('uses the viewer profile emoji for the signed-in author', () => {
    expect(feedAuthorEmoji('me-1', 'Alex', { id: 'me-1', emoji: '🍜' })).toBe('🍜');
  });

  it('does not fall back to the legacy whale emoji for unknown authors', () => {
    expect(feedAuthorEmoji('remote-user-99', 'Jenny', { id: 'me-1', emoji: '🍜' })).toBe('J');
  });
});
