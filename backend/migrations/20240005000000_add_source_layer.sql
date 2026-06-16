-- +goose Up
-- +goose StatementBegin

-- Martin uses {schema}.{table} as both the source ID and the MVT layer name.
-- source_layer stores what MapLibre's source-layer property should be set to.
-- Defaults to the table name portion of source_table (strip schema prefix).
ALTER TABLE meta.layer_configs
    ADD COLUMN IF NOT EXISTS source_layer TEXT NOT NULL DEFAULT '';

-- Populate: strip the "dbo." prefix → "dbo_oh_conductor_33kv_evw" etc.
-- This is the layer name Martin embeds in the MVT tile.
UPDATE meta.layer_configs
SET source_layer = CASE
    WHEN source_table LIKE '%.%'
        THEN split_part(source_table, '.', 2)
    ELSE source_table
END
WHERE source_layer = '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE meta.layer_configs DROP COLUMN IF EXISTS source_layer;
-- +goose StatementEnd
