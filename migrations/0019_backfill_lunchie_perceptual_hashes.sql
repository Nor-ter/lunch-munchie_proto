-- Backfill evidence for the near-duplicate BBQ King candidate photos observed
-- in the production Lunchie deck. The 64-bit dHashes were computed from the
-- R2 image bytes; the presentation resolver suppresses hashes within distance 8.
UPDATE restaurant_photos
SET perceptual_hash = '4a7a5b0a1653c356'
WHERE r2_key = 'osm_node_12511122652/3931606eecd1.jpg';

UPDATE restaurant_photos
SET perceptual_hash = '5a5a534a1653c356'
WHERE r2_key = 'osm_node_12511122652/da0637fcac15.jpg';
