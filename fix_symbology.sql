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

SELECT name, layer_type, layout_spec FROM meta.layer_configs WHERE name IN ('distribution_transformer_dss','power_transformer');
