# Lunchmate Room Themes v1

Six full-room theme presets that replace the old border/pattern skins.

## Themes

1. 핑크 피크닉
2. 옐로우 런치트레이
3. 빈티지 프레임
4. 블루 노트
5. 플라워 가든
6. 모던 미니멀

## Asset folders

- `source/`: 1536×1024 source art
- `stages/1x/`: 720×480 FoodieRoom stage backgrounds
- `stages/2x/`: 1440×960 retina stage backgrounds
- `profile/1x/`: 720×260 simplified center crops for the Profile banner
- `profile/2x/`: 1440×520 retina Profile crops
- `thumbnails/1x/`: 360×240 room selector cards
- `thumbnails/2x/`: 720×480 retina selector cards
- `previews/`: collection QA sheets

## Runtime rules

- Every file is background-only. Keep `LunchmateCharacterRenderer` above it.
- Keep status chips, Lunchbox, tap, drag, feeding, expressions and costume layers above the background.
- Remove the old checkered-frame treatment and dotted baseline.
- Preserve the current `foodieSkin` values/IDs. Map the existing IDs to the new `assetKey` filenames instead of migrating saved profiles.
- Use `stages` in `/profile/foodie-room`, `profile` in the compact Profile banner and `thumbnails` in the selector.
- Do not stretch one asset between the full stage and compact banner; use the supplied crop.

## Scope

This package implements theme presets only. It does not add drag-and-drop furniture or a room-layout schema. Wallpaper, floor, furniture and prop mixing can be added as a separate second phase without changing the saved theme IDs.
