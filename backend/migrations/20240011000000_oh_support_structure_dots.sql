-- +goose Up
UPDATE meta.layer_configs
SET layer_type = 'circle',
    paint_spec  = '{"circle-color":"#111111","circle-radius":4,"circle-opacity":0.9,"circle-stroke-width":0}'
WHERE name IN (
    'oh_support_structure_11kv',
    'oh_support_structure_33kv',
    'oh_support_structure_lvle'
);

-- +goose Down
UPDATE meta.layer_configs
SET layer_type = 'circle',
    paint_spec  = '{"circle-color":"#888888","circle-radius":5,"circle-opacity":0.9}'
WHERE name IN (
    'oh_support_structure_11kv',
    'oh_support_structure_33kv',
    'oh_support_structure_lvle'
);
