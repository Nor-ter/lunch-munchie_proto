import { describe, expect, it } from 'vitest';
import {
  fromFeedPhotoPlacements,
  toFeedPhotoPlacements,
  type PlacedPhoto,
} from './coursemapDecor';

describe('feed photo placements', () => {
  it('round-trips all visual transforms without duplicating image data', () => {
    const placed: PlacedPhoto[] = [{
      id: 'photo-1',
      src: 'data:image/jpeg;base64,large-image',
      originalSrc: 'data:image/jpeg;base64,original-image',
      x: 62,
      y: 44,
      w: 38,
      h: 71,
      zoom: 1.8,
      rotate: -12,
    }];

    const stored = toFeedPhotoPlacements(placed);

    expect(stored).toEqual([{
      id: 'photo-1',
      photoIndex: 0,
      x: 62,
      y: 44,
      w: 38,
      h: 71,
      zoom: 1.8,
      rotate: -12,
    }]);
    expect(JSON.stringify(stored)).not.toContain('base64');
    expect(fromFeedPhotoPlacements(stored, [placed[0]!.src])).toEqual([{
      id: 'photo-1',
      src: placed[0]!.src,
      x: 62,
      y: 44,
      w: 38,
      h: 71,
      zoom: 1.8,
      rotate: -12,
    }]);
  });

  it('ignores a placement whose photo no longer exists', () => {
    const stored = toFeedPhotoPlacements([{
      id: 'photo-1', src: 'photo.jpg', x: 50, y: 50, w: 40, h: 30, rotate: 0,
    }]);

    expect(fromFeedPhotoPlacements(stored, [])).toBeNull();
  });
});
