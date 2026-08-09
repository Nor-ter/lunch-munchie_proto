import { describe, expect, it } from 'vitest';
import { localityForCoordinate } from './melbourneLocality';

describe('localityForCoordinate', () => {
  it('resolves Lunchie service-area coordinates without a network request', () => {
    expect(localityForCoordinate(-37.8007, 144.9634)).toBe('Carlton');
    expect(localityForCoordinate(-37.798, 144.991)).toBe('Fitzroy');
    expect(localityForCoordinate(-37.842, 144.96)).toBe('South Melbourne');
  });

  it('uses a privacy-safe broad label outside a mapped locality', () => {
    expect(localityForCoordinate(-37.9, 145.1)).toBe('Melbourne 주변');
    expect(localityForCoordinate(0, 0)).toBe('현재 위치 주변');
  });
});
