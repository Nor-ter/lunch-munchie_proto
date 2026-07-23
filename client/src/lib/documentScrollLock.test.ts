import { describe, expect, it } from 'vitest';
import {
  acquireDocumentScrollLock,
  clearStaleDocumentScrollLock,
} from './documentScrollLock';

function createFakeDocument(initialOverflow = '') {
  const attributes = new Set<string>();
  const appShell = {
    hasAttribute: (name: string) => attributes.has(name),
    setAttribute: (name: string) => attributes.add(name),
    removeAttribute: (name: string) => attributes.delete(name),
  } as HTMLElement;
  const doc = {
    body: { style: { overflow: initialOverflow } },
    querySelector: (selector: string) => selector === '.app-shell' ? appShell : null,
  } as unknown as Document;
  return { appShell, doc };
}

describe('documentScrollLock', () => {
  it('keeps scrolling locked until all overlays have closed', () => {
    const { appShell, doc } = createFakeDocument();
    const releaseFirst = acquireDocumentScrollLock({ doc, inertSelector: '.app-shell' });
    const releaseSecond = acquireDocumentScrollLock({ doc, inertSelector: '.app-shell' });

    expect(doc.body.style.overflow).toBe('hidden');
    expect(appShell.hasAttribute('inert')).toBe(true);
    releaseFirst();
    expect(doc.body.style.overflow).toBe('hidden');
    expect(appShell.hasAttribute('inert')).toBe(true);

    releaseSecond();
    expect(doc.body.style.overflow).toBe('');
    expect(appShell.hasAttribute('inert')).toBe(false);
  });

  it('recovers from a stale hidden body lock', () => {
    const { appShell, doc } = createFakeDocument('hidden');
    const release = acquireDocumentScrollLock({ doc });
    release();
    expect(doc.body.style.overflow).toBe('');

    doc.body.style.overflow = 'hidden';
    appShell.setAttribute('inert', '');
    clearStaleDocumentScrollLock(doc);
    expect(doc.body.style.overflow).toBe('');
    expect(appShell.hasAttribute('inert')).toBe(false);
  });

  it('makes release idempotent', () => {
    const { doc } = createFakeDocument('auto');
    const release = acquireDocumentScrollLock({ doc });
    release();
    release();
    expect(doc.body.style.overflow).toBe('auto');
  });
});
