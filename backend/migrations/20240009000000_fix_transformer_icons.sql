-- +goose Up
-- Switch transformers from text-symbol (▲ glyph, unreliable) to canvas icon-image
-- The icons 'triangle-red' and 'triangle-blue' are registered by MapView on load.

UPDATE meta.layer_configs
SET layer_type = 'symbol',
    paint_spec  = '{}',
    layout_spec = '{"icon-image":"triangle-red","icon-size":0.8,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'distribution_transformer_dss';

UPDATE meta.layer_configs
SET layer_type = 'symbol',
    paint_spec  = '{}',
    layout_spec = '{"icon-image":"triangle-blue","icon-size":1.0,"icon-allow-overlap":true,"icon-ignore-placement":true}'
WHERE name = 'power_transformer';

-- +goose Down
UPDATE meta.layer_configs
SET layer_type = 'circle',
    paint_spec  = '{"circle-color":"#888888","circle-radius":5,"circle-opacity":0.9}',
    layout_spec = '{}'
WHERE name IN ('distribution_transformer_dss', 'power_transformer');
