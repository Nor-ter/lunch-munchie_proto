import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const appSource = readFileSync(join(ROOT, 'client', 'src', 'App.tsx'), 'utf8');
const profileSource = readFileSync(join(ROOT, 'client', 'src', 'pages', 'ProfilePage.tsx'), 'utf8');
const foodieBuddySource = readFileSync(
  join(ROOT, 'client', 'src', 'components', 'munchie', 'FoodieBuddy.tsx'),
  'utf8',
);
const tankSource = readFileSync(
  join(ROOT, 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
  'utf8',
);

describe('Munchie Tank product entry', () => {
  it('maps the product and prototype paths to the same Tank implementation', () => {
    expect(appSource).toContain(
      '<Route path="/profile/munchie-tank" component={MunchieCapturePrototypePage} />',
    );
    expect(appSource).toContain(
      '<Route path="/prototype/munchie-capture" component={MunchieCapturePrototypePage} />',
    );
    expect(appSource.indexOf('path="/profile/munchie-tank"'))
      .toBeLessThan(appSource.indexOf('path="/profile/:id"'));
  });

  it('adds a separate Profile entry without replacing the active Lunchbox flow', () => {
    expect(profileSource).toContain("navigate('/profile/munchie-tank'");
    expect(profileSource).toContain('onMunchieTankOpen={openMunchieTank}');
    expect(foodieBuddySource).toContain('aria-label="Munchie Tank 열기"');

    expect(profileSource).toContain("setActiveSheet('lunchbox')");
    expect(profileSource).toContain("open={activeSheet === 'lunchbox'}");
    expect(profileSource).toContain('onLunchboxOpen={openLunchbox}');
    expect(foodieBuddySource).toContain('onLunchboxOpen?.()');
  });

  it('keeps one profile-backed inventory and XP implementation for the product route', () => {
    expect(tankSource).toContain('useCapturedMunchieCollection(profile.id)');
    expect(tankSource).toContain('initialTotalXp: lunchmateTotalXpFromProfile(profile)');
    expect(tankSource).toContain('onTotalXpChange: persistLunchmateTotalXp');
    expect(tankSource).toContain("location === '/profile/munchie-tank'");
    expect(tankSource).toContain("navigate('/profile', { replace: true })");
  });

  it('uses inventory language and preserves a visible processing state before CPU work', () => {
    expect(tankSource).toContain('내가 모은 Munchie들');
    expect(tankSource).toContain('Munchie {collection.items.length}');
    expect(tankSource).toContain('+ Munchie 찍기');
    expect(tankSource).toContain('새 Munchie가 도착했어요 ✨');
    expect(tankSource).not.toContain('오늘의 맛있는 순간들');
    expect(tankSource).not.toContain('맛기억 {collection.items.length}');
    expect(tankSource).not.toContain('+ 하나 더 담기');

    const fileHandlerStart = tankSource.indexOf('const handleFileChange');
    const manualHandlerStart = tankSource.indexOf('const retrySegmentationAtPoint');
    const captureFlow = tankSource.slice(fileHandlerStart, manualHandlerStart);
    expect(captureFlow.indexOf('await waitForNextPaint()'))
      .toBeLessThan(captureFlow.indexOf('segmentCapturedMunchie('));
    expect(tankSource).toContain('mode="wait"');
    expect(tankSource).toContain('exit={{ opacity: 0, y: -8, transition: { duration: 0 } }}');
    expect(tankSource).toContain('exit={{ opacity: 0, scale: 0.96, transition: { duration: 0 } }}');
    expect(tankSource).toContain('phaseRef.current = phase;');
    expect(tankSource).toContain("if (phaseRef.current !== 'processing') releaseProcessingPreview();");
    expect(tankSource).toContain('processingPreviewObjectUrlRef.current = previewUrl;');
    expect(tankSource).not.toContain('URL.revokeObjectURL(previewUrl);');
    const processingSectionStart = tankSource.indexOf('key="processing"');
    const processingSectionEnd = tankSource.indexOf('aria-live="polite"', processingSectionStart);
    const processingSection = tankSource.slice(processingSectionStart, processingSectionEnd);
    expect(processingSection).toContain('initial={false}');
    expect(processingSection).not.toContain('initial={{ opacity: 0 }}');
    expect(tankSource).toContain('const PROCESSING_PAINT_SETTLE_MS = 75;');
    expect(tankSource).toContain('window.setTimeout(resolve, PROCESSING_PAINT_SETTLE_MS);');
    expect(tankSource).toContain('data-testid="munchie-processing"');
    expect(tankSource).toContain('Munchie를 만들고 있어요 ✨');
    expect(tankSource).toContain('음식에서 Munchie를 쏙 꺼내는 중이에요');
    expect(tankSource).toContain('조금만 기다려주세요 🍽️');
    expect(tankSource).toContain('Munchie를 예쁘게 다듬고 있어요');
    expect(tankSource).toContain('setProcessingIsTakingLong(true), 5000');
    expect(tankSource).toContain('!shouldReduceMotion && [');
  });
});
