import { describe, expect, it } from 'vitest';
import { uiErrorMessage } from './uiErrorMessage';

describe('English UI errors', () => {
  it('uses English fallback for Korean server errors without modifying the error', () => {
    const error = new Error('저장하지 못했습니다.');
    expect(uiErrorMessage(error, "Couldn't save. Try again.")).toBe("Couldn't save. Try again.");
    expect(error.message).toBe('저장하지 못했습니다.');
  });
  it('keeps English errors and handles empty responses', () => {
    expect(uiErrorMessage(new Error('Session expired.'))).toBe('Session expired.');
    expect(uiErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });
});
