-- +goose Up
-- +goose StatementBegin

-- Schema-qualify all source_table values so queries are unambiguous
-- regardless of search_path. Tables were restored into the dbo schema.
UPDATE meta.layer_configs
SET source_table = 'dbo.' || source_table
WHERE source_table NOT LIKE '%.%';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE meta.layer_configs
SET source_table = split_part(source_table, '.', 2)
WHERE source_table LIKE 'dbo.%';
-- +goose StatementEnd
