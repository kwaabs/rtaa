export interface LayerConfig {
  id: number
  name: string
  display_name: string
  description: string
  source_table: string
  geom_column: string
  geom_type: string
  layer_type: 'fill' | 'line' | 'circle' | 'symbol' | 'heatmap' | 'fill-extrusion'
  paint_spec: Record<string, unknown>
  layout_spec: Record<string, unknown>
  filter_spec: Record<string, unknown>
  popup_spec: Record<string, unknown>
  // MVT layer name Martin embeds in the tile — used as MapLibre source-layer
  source_layer: string
  min_zoom: number
  max_zoom: number
  is_visible: boolean
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BasemapConfig {
  id: number
  name: string
  display_name: string
  style_url: string
  attribution: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  thumbnail_url: string
  created_at: string
}

export type AppConfig = Record<string, string>

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  id?: string | number
  geometry: Record<string, unknown>
  properties: Record<string, unknown> | null
}
