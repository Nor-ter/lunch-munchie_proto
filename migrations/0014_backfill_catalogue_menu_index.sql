-- Expand the evidence-backed menu JSON already stored on catalogue restaurants
-- into the queryable menu index.  The JSON remains the source snapshot for
-- backwards compatibility; this table is the operational index used by
-- analytics and future menu-aware recommendation features.
--
-- Do not infer dietary suitability or signature status here.  Only values
-- already present in the catalogue payload are carried over.
INSERT OR IGNORE INTO restaurant_menu_items (
  id,
  restaurant_id,
  name,
  normalized_name,
  price,
  currency,
  category,
  description,
  dietary,
  source,
  confidence,
  is_signature,
  extracted_at
)
SELECT
  r.id || ':catalogue:' || CAST(menu_item.key AS TEXT),
  r.id,
  trim(CAST(json_extract(menu_item.value, '$.name') AS TEXT)),
  lower(trim(COALESCE(
    NULLIF(CAST(json_extract(menu_item.value, '$.normalized_name') AS TEXT), ''),
    CAST(json_extract(menu_item.value, '$.name') AS TEXT)
  ))),
  CASE
    WHEN json_type(menu_item.value, '$.price') IN ('integer', 'real')
      THEN CAST(json_extract(menu_item.value, '$.price') AS REAL)
    ELSE NULL
  END,
  COALESCE(NULLIF(trim(CAST(json_extract(menu_item.value, '$.currency') AS TEXT)), ''), 'AUD'),
  NULLIF(trim(CAST(json_extract(menu_item.value, '$.category') AS TEXT)), ''),
  NULLIF(trim(CAST(json_extract(menu_item.value, '$.description') AS TEXT)), ''),
  CASE
    WHEN json_valid(json_extract(menu_item.value, '$.dietary'))
      THEN json_extract(menu_item.value, '$.dietary')
    ELSE '[]'
  END,
  COALESCE(NULLIF(trim(CAST(json_extract(menu_item.value, '$.source') AS TEXT)), ''), 'catalogue-backfill'),
  CASE
    WHEN json_type(menu_item.value, '$.confidence') IN ('integer', 'real')
      THEN CAST(json_extract(menu_item.value, '$.confidence') AS REAL)
    ELSE NULL
  END,
  0,
  0
FROM restaurants AS r,
     json_each(CASE WHEN json_valid(r.menus) THEN r.menus ELSE '[]' END) AS menu_item
WHERE json_type(menu_item.value) = 'object'
  AND trim(COALESCE(CAST(json_extract(menu_item.value, '$.name') AS TEXT), '')) != ''
  AND trim(COALESCE(
    CAST(json_extract(menu_item.value, '$.normalized_name') AS TEXT),
    CAST(json_extract(menu_item.value, '$.name') AS TEXT),
    ''
  )) != '';
