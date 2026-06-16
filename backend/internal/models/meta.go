package models

import (
	"time"

	"github.com/uptrace/bun"
)

// ─── Metadata / configuration tables (schema: meta) ──────────────────────────
// These drive the frontend entirely — layers, symbology, basemaps, etc. are
// all controlled here instead of being hardcoded.

// LayerConfig defines every map layer available in the application.
// The frontend reads this table on startup; no layer is hardcoded.
type LayerConfig struct {
	bun.BaseModel `bun:"meta.layer_configs,alias:lc"`

	ID          int64          `bun:"id,pk,autoincrement"                   json:"id"`
	Name        string         `bun:"name,notnull"                          json:"name"`
	DisplayName string         `bun:"display_name,notnull"                  json:"display_name"`
	Description string         `bun:"description"                           json:"description"`
	// Source table/view in schema dbo that backs this layer
	SourceTable string         `bun:"source_table,notnull"                  json:"source_table"`
	// GeoJSON geometry column name in SourceTable
	GeomColumn  string         `bun:"geom_column,notnull,default:'the_geom'" json:"geom_column"`
	GeomType    string         `bun:"geom_type,notnull"                     json:"geom_type"` // Point|LineString|Polygon|...
	// MapLibre GL layer type: fill | line | circle | symbol | heatmap | fill-extrusion
	LayerType   string         `bun:"layer_type,notnull,default:'fill'"     json:"layer_type"`
	// JSON blob: MapLibre paint spec — stored in DB so designers can tweak without redeploy
	PaintSpec   map[string]any `bun:"paint_spec,type:jsonb"                 json:"paint_spec"`
	// JSON blob: MapLibre layout spec
	LayoutSpec  map[string]any `bun:"layout_spec,type:jsonb"                json:"layout_spec"`
	// JSON blob: filter columns exposed in the UI sidebar
	FilterSpec  map[string]any `bun:"filter_spec,type:jsonb"                json:"filter_spec"`
	// JSON blob: popup template — field names → display labels
	PopupSpec   map[string]any `bun:"popup_spec,type:jsonb"                 json:"popup_spec"`
	MinZoom     float64        `bun:"min_zoom,default:0"                    json:"min_zoom"`
	MaxZoom     float64        `bun:"max_zoom,default:22"                   json:"max_zoom"`
	// SourceLayer is the MVT layer name Martin embeds in the tile (table name without schema).
	// Used as MapLibre's source-layer property.
	SourceLayer string         `bun:"source_layer,notnull,default:''"       json:"source_layer"`
	IsVisible   bool           `bun:"is_visible,notnull,default:true"       json:"is_visible"`
	IsPublic    bool           `bun:"is_public,notnull,default:false"       json:"is_public"`
	SortOrder   int            `bun:"sort_order,notnull,default:0"          json:"sort_order"`
	CreatedAt   time.Time      `bun:"created_at,notnull,default:now()"     json:"created_at"`
	UpdatedAt   time.Time      `bun:"updated_at,notnull,default:now()"     json:"updated_at"`
}

// BasemapConfig lists available background tile sources.
type BasemapConfig struct {
	bun.BaseModel `bun:"meta.basemap_configs,alias:bm"`

	ID          int64          `bun:"id,pk,autoincrement"              json:"id"`
	Name        string         `bun:"name,notnull"                     json:"name"`
	DisplayName string         `bun:"display_name,notnull"             json:"display_name"`
	// MapLibre style URL or tile URL template
	StyleURL    string         `bun:"style_url,notnull"                json:"style_url"`
	Attribution string         `bun:"attribution"                      json:"attribution"`
	IsDefault   bool           `bun:"is_default,notnull,default:false" json:"is_default"`
	IsActive    bool           `bun:"is_active,notnull,default:true"   json:"is_active"`
	SortOrder   int            `bun:"sort_order,notnull,default:0"     json:"sort_order"`
	ThumbnailURL string        `bun:"thumbnail_url"                    json:"thumbnail_url"`
	CreatedAt   time.Time      `bun:"created_at,notnull,default:now()" json:"created_at"`
}

// AppConfig is a simple key-value store for runtime application settings
// (e.g. default map centre, zoom level, feature flags).
type AppConfig struct {
	bun.BaseModel `bun:"meta.app_configs,alias:ac"`

	Key       string    `bun:"key,pk"                           json:"key"`
	Value     string    `bun:"value,notnull"                    json:"value"`
	ValueType string    `bun:"value_type,notnull,default:'text'" json:"value_type"` // text|number|bool|json
	Category  string    `bun:"category,notnull,default:'general'" json:"category"`
	Label     string    `bun:"label"                            json:"label"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:now()" json:"updated_at"`
}
