-- +goose Up
-- +goose StatementBegin

-- The API no longer filters by is_visible — all layers appear in the panel.
-- is_visible now only controls whether the layer is ON by default when the
-- app first loads (handled by initFromConfig on the frontend).
-- No schema change needed; the existing column keeps its per-layer default values.

-- Ensure the two boundary/coverage layers are visible in the panel but off by default.
UPDATE meta.layer_configs
SET is_visible = false
WHERE name IN ('ecg', 'ecg_regions_districts')
  AND is_visible = true;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- No-op: reversing which layers are default-on is not meaningful.
-- +goose StatementEnd
