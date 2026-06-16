-- +goose Up
-- +goose StatementBegin

SET search_path TO meta, public;

-- ─── Layer configuration ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta.layer_configs (
    id           BIGSERIAL    PRIMARY KEY,
    name         TEXT         NOT NULL UNIQUE,
    display_name TEXT         NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    source_table TEXT         NOT NULL,
    geom_column  TEXT         NOT NULL DEFAULT 'the_geom',
    geom_type    TEXT         NOT NULL,
    layer_type   TEXT         NOT NULL DEFAULT 'fill',
    paint_spec   JSONB        NOT NULL DEFAULT '{}',
    layout_spec  JSONB        NOT NULL DEFAULT '{}',
    filter_spec  JSONB        NOT NULL DEFAULT '{}',
    popup_spec   JSONB        NOT NULL DEFAULT '{}',
    min_zoom     NUMERIC(4,1) NOT NULL DEFAULT 0,
    max_zoom     NUMERIC(4,1) NOT NULL DEFAULT 22,
    is_visible   BOOLEAN      NOT NULL DEFAULT true,
    is_public    BOOLEAN      NOT NULL DEFAULT false,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE meta.layer_configs IS
    'Drives every map layer in the frontend. No layer config is hardcoded.';

-- ─── Basemap configuration ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta.basemap_configs (
    id            BIGSERIAL   PRIMARY KEY,
    name          TEXT        NOT NULL UNIQUE,
    display_name  TEXT        NOT NULL,
    style_url     TEXT        NOT NULL,
    attribution   TEXT        NOT NULL DEFAULT '',
    is_default    BOOLEAN     NOT NULL DEFAULT false,
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    thumbnail_url TEXT        NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default basemaps
INSERT INTO meta.basemap_configs (name, display_name, style_url, attribution, is_default, sort_order)
VALUES
    ('osm-bright',
     'OpenStreetMap (Bright)',
     'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
     '© OpenStreetMap contributors © CARTO',
     true, 1),
    ('positron',
     'Positron (Light)',
     'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
     '© OpenStreetMap contributors © CARTO',
     false, 2),
    ('dark-matter',
     'Dark Matter',
     'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
     '© OpenStreetMap contributors © CARTO',
     false, 3)
ON CONFLICT (name) DO NOTHING;

-- ─── Application config key-value store ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta.app_configs (
    key        TEXT        PRIMARY KEY,
    value      TEXT        NOT NULL,
    value_type TEXT        NOT NULL DEFAULT 'text', -- text | number | bool | json
    category   TEXT        NOT NULL DEFAULT 'general',
    label      TEXT        NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE meta.app_configs IS
    'Runtime application settings. Frontend reads this on startup.';

-- Seed default map settings
INSERT INTO meta.app_configs (key, value, value_type, category, label)
VALUES
    ('map.default_center_lng', '0',    'number', 'map', 'Default centre longitude'),
    ('map.default_center_lat', '0',    'number', 'map', 'Default centre latitude'),
    ('map.default_zoom',       '4',    'number', 'map', 'Default zoom level'),
    ('map.min_zoom',           '2',    'number', 'map', 'Minimum zoom'),
    ('map.max_zoom',           '20',   'number', 'map', 'Maximum zoom'),
    ('app.title',              'rTAA Map', 'text', 'app', 'Application title'),
    ('app.logo_url',           '',     'text',   'app', 'Logo URL')
ON CONFLICT (key) DO NOTHING;

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION meta.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_layer_configs_updated_at
    BEFORE UPDATE ON meta.layer_configs
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

CREATE TRIGGER trg_app_configs_updated_at
    BEFORE UPDATE ON meta.app_configs
    FOR EACH ROW EXECUTE FUNCTION meta.set_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS meta.layer_configs;
DROP TABLE IF EXISTS meta.basemap_configs;
DROP TABLE IF EXISTS meta.app_configs;
DROP FUNCTION IF EXISTS meta.set_updated_at();
-- +goose StatementEnd
