import { describe, expect, it } from 'vitest';
import { COURSEMAP_TEMPLATES, STORY_FEED_TEMPLATES } from '@/constants/coursemapTemplates';
import { SHARE_TEMPLATES } from '@/constants/shareTemplates';

describe('converted story templates in the Munchie feed catalog', () => {
  it('adds every former story template as a 4:3 feed option', () => {
    expect(STORY_FEED_TEMPLATES).toHaveLength(SHARE_TEMPLATES.length);
    expect(COURSEMAP_TEMPLATES).toHaveLength(10 + SHARE_TEMPLATES.length);
  });

  it('uses unique feed ids, converted assets, and usable photo slots', () => {
    expect(new Set(COURSEMAP_TEMPLATES.map(template => template.id)).size).toBe(COURSEMAP_TEMPLATES.length);

    STORY_FEED_TEMPLATES.forEach((template, index) => {
      expect(template.id).toBe(`story-feed-${String(index + 1).padStart(2, '0')}`);
      expect(template.image).toBe(`/templates4_3/story-converted/template-${String(index + 1).padStart(2, '0')}.jpg`);
      expect(template.slots).toHaveLength(3);
    });
  });
});
