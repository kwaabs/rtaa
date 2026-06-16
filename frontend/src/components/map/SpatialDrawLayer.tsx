/**
 * SpatialDrawLayer — renders the currently drawn spatial geometry on the map.
 * Must be rendered inside the react-map-gl <Map> component.
 * Reads geometry from spatialStore which is written by SpatialToolbar.
 */
import { Source, Layer } from 'react-map-gl/maplibre'
import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl'
import { useSpatialStore } from '@/stores/spatialStore'

export function SpatialDrawLayer() {
  const { drawn } = useSpatialStore()
  if (!drawn) return null

  const isMeasure = drawn.type === 'measure'

  const fillLayer: FillLayerSpecification = {
    id: 'spatial-draw-fill',
    type: 'fill',
    source: 'spatial-draw',
    paint: {
      'fill-color': isMeasure ? 'transparent' : '#6366f1',
      'fill-opacity': isMeasure ? 0 : 0.12,
    },
  }

  const lineLayer: LineLayerSpecification = {
    id: 'spatial-draw-line',
    type: 'line',
    source: 'spatial-draw',
    paint: {
      'line-color': isMeasure ? '#a855f7' : '#6366f1',
      'line-width': 2,
      'line-dasharray': [4, 2],
    },
  }

  return (
    <Source id="spatial-draw" type="geojson" data={drawn.geojson}>
      <Layer {...fillLayer} />
      <Layer {...lineLayer} />
    </Source>
  )
}
