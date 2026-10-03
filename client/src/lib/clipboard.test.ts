import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

afterEach(() => vi.unstubAllGlobals());

function mockLegacyClipboard(result = true) {
  const field = {
    value: '', readOnly: false, style: {},
    focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn(), remove: vi.fn(),
  };
  class Element { focus = vi.fn(); }
  const previousFocus = new Element();
  const execCommand = vi.fn(() => result);
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('document', {
    activeElement: previousFocus,
    getSelection: () => null,
    createElement: () => field,
    body: { appendChild: vi.fn() },
    execCommand,
  });
  return { field, execCommand, previousFocus };
}

describe('copyTextToClipboard', () => {
  const link = 'http://192.168.1.10:8788/join/47228A';

  it('copies using the browser clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyTextToClipboard(link)).toBe(true);
    expect(writeText).toHaveBeenCalledWith(link);
  });

  it('copies without the clipboard API on HTTP LAN origins', async () => {
    vi.stubGlobal('navigator', {});
    const { field, execCommand, previousFocus } = mockLegacyClipboard();
    expect(await copyTextToClipboard(link)).toBe(true);
    expect(field.value).toBe(link);
    expect(field.setSelectionRange).toHaveBeenCalledWith(0, link.length);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(field.remove).toHaveBeenCalledOnce();
    expect(previousFocus.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('falls back when the browser rejects clipboard permission', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) } });
    const { execCommand } = mockLegacyClipboard();
    expect(await copyTextToClipboard(link)).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('reports failure and cleans up when fallback copying fails', async () => {
    vi.stubGlobal('navigator', {});
    const { field } = mockLegacyClipboard(false);
    expect(await copyTextToClipboard(link)).toBe(false);
    expect(field.remove).toHaveBeenCalledOnce();
  });
});
