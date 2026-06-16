-- +goose Up
UPDATE meta.layer_configs
SET layer_type = 'circle',
    paint_spec  = '{"circle-color":"#111111","circle-radius":4,"circle-opacity":0.9,"circle-stroke-width":0}'
WHERE name IN ('oh_support_33kv', 'oh_support_11kv', 'oh_support_lvle');

-- +goose Down
UPDATE meta.layer_configs
SET paint_spec = '{"circle-radius":4,"circle-color":"#ef4444","circle-stroke-color":"#fff","circle-stroke-width":1,"circle-opacity":0.9}'
WHERE name = 'oh_support_33kv';

UPDATE meta.layer_configs
SET paint_spec = '{"circle-radius":4,"circle-color":"#f97316","circle-stroke-color":"#fff","circle-stroke-width":1,"circle-opacity":0.9}'
WHERE name = 'oh_support_11kv';

UPDATE meta.layer_configs
SET paint_spec = '{"circle-radius":3,"circle-color":"#f59e0b","circle-stroke-color":"#fff","circle-stroke-width":1,"circle-opacity":0.85}'
WHERE name = 'oh_support_lvle';
