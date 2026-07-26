import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENT_ROOT = join(process.cwd(), 'client', 'src', 'components', 'munchie');
const RENDERER_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateRoomRenderer.tsx'), 'utf8');
const ROOM_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'pages', 'FoodieRoomPage.tsx'),
  'utf8',
);
const PROFILE_SOURCE = readFileSync(join(COMPONENT_ROOT, 'FoodieBuddy.tsx'), 'utf8');

describe('Lunchmate room layered renderer contract', () => {
  it('renders stage assets in FoodieRoom and profile crops in FoodieBuddy', () => {
    expect(ROOM_SOURCE).toContain('<LunchmateRoomRenderer');
    expect(ROOM_SOURCE).toContain('variant="stage"');
    expect(PROFILE_SOURCE).toContain('<LunchmateRoomRenderer');
    expect(PROFILE_SOURCE).toContain('variant="profile"');
  });

  it('keeps wallpaper, floor, furniture and props in the required order', () => {
    const wallpaper = RENDERER_SOURCE.indexOf("['wallpaper'");
    const floor = RENDERER_SOURCE.indexOf("['floor'");
    const furniture = RENDERER_SOURCE.indexOf("['furniture'");
    const props = RENDERER_SOURCE.indexOf("['props'");
    expect(wallpaper).toBeGreaterThan(-1);
    expect(wallpaper).toBeLessThan(floor);
    expect(floor).toBeLessThan(furniture);
    expect(furniture).toBeLessThan(props);
  });

  it('makes every room image full-container and unable to intercept input', () => {
    expect(RENDERER_SOURCE).toContain('className="pointer-events-none absolute inset-0"');
    expect(RENDERER_SOURCE).toContain(
      'className="pointer-events-none absolute inset-0 h-full w-full object-cover"',
    );
    expect(RENDERER_SOURCE).toContain('data-lunchmate-room-layer={layerName}');
  });

  it('mounts the background before character and status/interaction UI', () => {
    const roomBackground = ROOM_SOURCE.indexOf('<LunchmateRoomRenderer');
    const roomCharacter = ROOM_SOURCE.indexOf('<LunchmateCharacterRenderer', roomBackground);
    const roomCaption = ROOM_SOURCE.indexOf('레이어 조합을 확인하는 미리보기예요', roomCharacter);
    expect(roomBackground).toBeLessThan(roomCharacter);
    expect(roomCharacter).toBeLessThan(roomCaption);

    const profileBackground = PROFILE_SOURCE.indexOf('<LunchmateRoomRenderer');
    const profileLunchbox = PROFILE_SOURCE.indexOf('ref={lunchboxButtonRef}', profileBackground);
    const profileCharacter = PROFILE_SOURCE.indexOf('<LunchmateCharacterRenderer', profileLunchbox);
    expect(profileBackground).toBeLessThan(profileLunchbox);
    expect(profileLunchbox).toBeLessThan(profileCharacter);
  });
});
