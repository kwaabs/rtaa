-- +goose Up
-- OH Conductor 33kV — solid blue line
UPDATE meta.layer_configs SET
  layer_type = 'line',
  paint_spec  = '{"line-color":"#1565C0","line-width":2.5,"line-opacity":1}'::jsonb,
  layout_spec = '{}'::jsonb
WHERE name = 'oh_conductor_33kv';

-- UG Cable 33kV — dashed blue line
UPDATE meta.layer_configs SET
  layer_type = 'line',
  paint_spec  = '{"line-color":"#1565C0","line-width":2.5,"line-opacity":1,"line-dasharray":[5,3]}'::jsonb,
  layout_spec = '{}'::jsonb
WHERE name = 'ug_cable_33kv';

-- Distribution Transformer — red triangle icon with black border
UPDATE meta.layer_configs SET
  layer_type  = 'symbol',
  paint_spec  = '{}'::jsonb,
  layout_spec = '{"icon-image":"triangle-red","icon-size":0.8,"icon-allow-overlap":true,"icon-ignore-placement":true}'::jsonb
WHERE name = 'distribution_transformer_dss';

-- Power Transformer — blue triangle icon with black border
UPDATE meta.layer_configs SET
  layer_type  = 'symbol',
  paint_spec  = '{}'::jsonb,
  layout_spec = '{"icon-image":"triangle-blue","icon-size":1.0,"icon-allow-overlap":true,"icon-ignore-placement":true}'::jsonb
WHERE name = 'power_transformer';

-- +goose Down
UPDATE meta.layer_configs SET
  layer_type = 'line',
  paint_spec  = '{"line-color":"#888888","line-width":1.5,"line-opacity":0.9}'::jsonb,
  layout_spec = '{}'::jsonb
WHERE name IN ('oh_conductor_33kv','ug_cable_33kv');

UPDATE meta.layer_configs SET
  layer_type  = 'circle',
  paint_spec  = '{"circle-color":"#888888","circle-radius":5,"circle-opacity":0.9}'::jsonb,
  layout_spec = '{}'::jsonb
WHERE name IN ('distribution_transformer_dss','power_transformer');
