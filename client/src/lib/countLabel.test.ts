import { expect, it } from 'vitest';
import { countLabel } from './countLabel';

it('handles zero, singular and irregular plural UI counts', () => {
  expect(countLabel(0, 'person', 'people')).toBe('0 people');
  expect(countLabel(1, 'person', 'people')).toBe('1 person');
  expect(countLabel(2, 'person', 'people')).toBe('2 people');
  expect(countLabel(1, 'stop')).toBe('1 stop');
  expect(countLabel(3, 'photo')).toBe('3 photos');
});
