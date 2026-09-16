/** English-only error copy at the display boundary; never transforms user data. */
export function uiErrorMessage(value: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = value instanceof Error ? value.message : value;
  return typeof message === 'string' && message.trim() && !/[가-힣]/.test(message)
    ? message
    : fallback;
}
