/**
 * Renders the temporary CAD overlay on the MapLibre map.
 * Uses a single GeoJSON source with separate layers for lines, fills, and points.
 */
import { Source, Layer } from 'react-map-gl/maplibre'
import { useCadStore } from '@/stores/cadStore'
import type { FeatureCollection } from 'geojson'

const SRC = 'cad-overlay'

export function CadOverlayLayer() {
  const overlay = useCadStore(s => s.overlay)
  if (!overlay) return null

  // Filter GeoJSON to only visible DXF layers
  const visibleGeoJSON: FeatureCollection = {
    type: 'FeatureCollection',
    features: overlay.geojson.features.filter(
      f => overlay.visibleLayers.has((f.properties?._dxf_layer as string) ?? '0'),
    ),
  }

  const op = overlay.opacity

  return (
    <Source id={SRC} type="geojson" data={visibleGeoJSON}>
      {/* Polygon fills */}
      <Layer
        id="cad-fill"
        type="fill"
        filter={['==', ['geometry-type'], 'Polygon']}
        paint={{
          'fill-color': '#f59e0b',
          'fill-opacity': op * 0.25,
        }}
      />
      {/* Polygon + line outlines */}
      <Layer
        id="cad-line"
        type="line"
        filter={['in', ['geometry-type'], ['literal', ['Polygon', 'LineString', 'MultiLineString']]]}
        paint={{
          'line-color': '#f59e0b',
          'line-width': 1.5,
          'line-opacity': op,
        }}
      />
      {/* Points */}
      <Layer
        id="cad-point"
        type="circle"
        filter={['==', ['geometry-type'], 'Point']}
        paint={{
          'circle-color': '#f59e0b',
          'circle-radius': 4,
          'circle-opacity': op,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-stroke-opacity': op,
        }}
      />
    </Source>
  )
}
