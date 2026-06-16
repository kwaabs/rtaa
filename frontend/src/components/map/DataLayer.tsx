import { Source, Layer } from 'react-map-gl/maplibre'
import type { LayerSpecification, FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl'
import { useMapStore } from '@/stores/mapStore'
import type { LayerConfig } from '@/types/meta'

const _MARTIN_PATH = import.meta.env.VITE_MARTIN_URL ?? '/martin'
const MARTIN_BASE = _MARTIN_PATH.startsWith('http')
  ? _MARTIN_PATH
  : `${window.location.origin}${_MARTIN_PATH}`

// Highlight colour applied on top of symbology when features are selected via query
const HIGHLIGHT_COLOR = '#fbbf24'
const HIGHLIGHT_OUTLINE = '#f59e0b'

interface DataLayerProps {
  layer: LayerConfig
}

export default function DataLayer({ layer }: DataLayerProps) {
  const opacity          = useMapStore((s) => s.layerOpacity[layer.name] ?? 1)
  const paintOverride    = useMapStore((s) => s.layerPaintOverrides[layer.name])
  const highlightedIds   = useMapStore((s) => s.highlightedIds[layer.name])

  const sourceLayer =
    layer.source_layer ||
    (layer.source_table.includes('.')
      ? layer.source_table.split('.').at(-1)!
      : layer.source_table)

  const tileUrl = `${MARTIN_BASE}/${sourceLayer}/{z}/{x}/{y}`

  // Symbology overrides take priority over seed paint_spec
  const basePaintSpec = paintOverride ?? layer.paint_spec
  const paint = applyOpacity(layer.layer_type, basePaintSpec as Record<string, unknown>, opacity)

  const baseLayerSpec: LayerSpecification = {
    id: layer.name,
    type: layer.layer_type as LayerSpecification['type'],
    source: `src-${layer.name}`,
    'source-layer': sourceLayer,
    paint: paint as LayerSpecification['paint'],
    layout: layer.layout_spec as LayerSpecification['layout'],
    minzoom: layer.min_zoom,
    maxzoom: layer.max_zoom,
  }

  // Companion bold border for polygon layers
  const borderLayerSpec: LineLayerSpecification | null =
    layer.layer_type === 'fill'
      ? {
          id: `${layer.name}-border`,
          type: 'line',
          source: `src-${layer.name}`,
          'source-layer': sourceLayer,
          minzoom: layer.min_zoom,
          maxzoom: layer.max_zoom,
          paint: {
            'line-color': extractFillColor(basePaintSpec as Record<string, unknown>),
            'line-width': 2.5,
            'line-opacity': Math.min(1,
              (typeof (basePaintSpec as Record<string, unknown>)['fill-opacity'] === 'number'
                ? (basePaintSpec as Record<string, unknown>)['fill-opacity'] as number
                : 0.9) * opacity * 4),
          },
        }
      : null

  // Highlight layer — drawn on top when query results are active
  const hasHighlights = highlightedIds && highlightedIds.size > 0
  const highlightIds  = hasHighlights ? [...highlightedIds] : []
  const highlightLayerSpec: LayerSpecification | null = hasHighlights
    ? buildHighlightLayer(layer, sourceLayer, highlightIds)
    : null

  return (
    <Source
      id={`src-${layer.name}`}
      type="vector"
      tiles={[tileUrl]}
      minzoom={0}
      maxzoom={22}
    >
      <Layer {...(baseLayerSpec as FillLayerSpecification)} />
      {borderLayerSpec && <Layer {...borderLayerSpec} />}
      {highlightLayerSpec && <Layer {...(highlightLayerSpec as FillLayerSpecification)} />}
    </Source>
  )
}

function buildHighlightLayer(
  layer: LayerConfig,
  sourceLayer: string,
  ids: (string | number)[],
): LayerSpecification {
  const base = {
    id: `${layer.name}-highlight`,
    source: `src-${layer.name}`,
    'source-layer': sourceLayer,
    minzoom: layer.min_zoom,
    maxzoom: layer.max_zoom,
    filter: ['in',
      ['coalesce', ['get', 'objectid'], ['get', 'OBJECTID'], ['get', 'id'], ['get', 'ID']],
      ['literal', [...ids.map(Number), ...ids.map(String)]],
    ] as unknown as boolean,
  }
  if (layer.layer_type === 'fill') {
    return { ...base, type: 'fill', paint: { 'fill-color': HIGHLIGHT_COLOR, 'fill-opacity': 0.6, 'fill-outline-color': HIGHLIGHT_OUTLINE } }
  }
  if (layer.layer_type === 'circle') {
    return { ...base, type: 'circle', paint: { 'circle-color': HIGHLIGHT_COLOR, 'circle-radius': 9, 'circle-stroke-width': 2, 'circle-stroke-color': HIGHLIGHT_OUTLINE } }
  }
  if (layer.layer_type === 'symbol') {
    return { ...base, type: 'symbol', paint: { 'text-color': HIGHLIGHT_COLOR, 'text-halo-color': HIGHLIGHT_OUTLINE, 'text-halo-width': 2 }, layout: { 'text-field': '▲', 'text-size': 22 } as unknown as undefined }
  }
  return { ...base, type: 'line', paint: { 'line-color': HIGHLIGHT_COLOR, 'line-width': 4 } }
}

/** Pull the fill colour from paint_spec to reuse as border colour. */
function extractFillColor(paintSpec: Record<string, unknown>): string {
  const c = paintSpec['fill-color']
  return typeof c === 'string' ? c : '#ffffff'
}

function applyOpacity(
  layerType: string,
  paintSpec: Record<string, unknown>,
  opacity: number,
): Record<string, unknown> {
  const p = { ...paintSpec }
  const opacityProp: Record<string, string> = {
    fill: 'fill-opacity',
    line: 'line-opacity',
    circle: 'circle-opacity',
    symbol: 'icon-opacity',
    heatmap: 'heatmap-opacity',
    'fill-extrusion': 'fill-extrusion-opacity',
  }
  const prop = opacityProp[layerType]
  if (prop) {
    const existing = typeof p[prop] === 'number' ? (p[prop] as number) : 1
    p[prop] = existing * opacity
  }
  return p
}
