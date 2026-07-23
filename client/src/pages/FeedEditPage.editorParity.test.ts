import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const editSource = readFileSync(join(import.meta.dirname, 'FeedEditPage.tsx'), 'utf8');
const createSource = readFileSync(join(import.meta.dirname, 'course', 'CoursemapCreatePage.tsx'), 'utf8');

describe('Munchie feed edit editor parity', () => {
  it('reuses the full create-page decorating and photo editing tools', () => {
    expect(createSource).toContain('export function DecorateStep');
    expect(createSource).toContain('export function PhotoEditorModal');
    expect(editSource).toContain('<DecorateStep');
    expect(editSource).toContain('<PhotoEditorModal');
    expect(editSource).toContain('onEditPhoto={photoId => setEditingPhotoId(photoId)}');
  });

  it('hydrates the editor from the previously published feed state', () => {
    expect(editSource).toContain('fromFeedPhotoPlacements(post.photoPlacements, post.photos)');
    expect(editSource).toContain('getCoursemapDecor(post.courseId, post.photos)');
    expect(editSource).toContain('post?.canvasStrokes ??');
    expect(editSource).toContain('getTemplateById(post?.skinId)');
    expect(editSource).toContain("useState(post?.caption ?? '')");
  });

  it('persists edited photos, placement, drawing, template, and caption together', () => {
    expect(editSource).toContain('photoPlacements: toFeedPhotoPlacements(nextPlaced)');
    expect(editSource).toContain('canvasStrokes,');
    expect(editSource).toContain('skinId: template.id');
    expect(editSource).toContain('caption: caption.trim()');
    expect(editSource).toContain('saveCoursemapDecor(post.courseId, nextPlaced, canvasStrokes)');
  });
});
