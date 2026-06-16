-- +goose Up
UPDATE meta.layer_configs
SET layout_spec = '{"icon-image":"triangle-red","icon-size":0.7,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'distribution_transformer_dss';

UPDATE meta.layer_configs
SET layout_spec = '{"icon-image":"triangle-blue","icon-size":0.8,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'power_transformer';

-- +goose Down
UPDATE meta.layer_configs
SET layout_spec = '{"icon-image":"triangle-red","icon-size":0.8,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'distribution_transformer_dss';

UPDATE meta.layer_configs
SET layout_spec = '{"icon-image":"triangle-blue","icon-size":1.0,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'power_transformer';
