-- +goose Up
INSERT INTO meta.basemap_configs (name, display_name, style_url, attribution, is_default, is_active, sort_order)
VALUES
  ('google-maps',      'Google Maps',      '_google_maps_',      '© Google', false, true, 10),
  ('google-satellite', 'Google Satellite', '_google_satellite_', '© Google', false, true, 11),
  ('google-hybrid',    'Google Hybrid',    '_google_hybrid_',    '© Google', false, true, 12)
ON CONFLICT (name) DO NOTHING;

-- +goose Down
DELETE FROM meta.basemap_configs WHERE name IN ('google-maps', 'google-satellite', 'google-hybrid');
