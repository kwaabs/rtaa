import { useCallback, useEffect, useRef } from 'react'
import Map, {
  NavigationControl,
  ScaleControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre'
import { useMapStore } from '@/stores/mapStore'
import { useLayers, useBasemaps, useAppConfig } from '@/hooks/useMeta'
import { usePopupStore } from '@/stores/popupStore'
import DataLayer from './DataLayer'
import FeaturePicker from './FeaturePicker'
import { SpatialDrawLayer } from './SpatialDrawLayer'
import { CadOverlayLayer } from './CadOverlayLayer'
import type { LayerConfig } from '@/types/meta'
import type { MapMouseEvent } from 'maplibre-gl'

const GOOGLE_TILES: Record<string, string> = {
  '_google_maps_':      'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  '_google_satellite_': 'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  '_google_hybrid_':    'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
}

function resolveBasemapStyle(url: string): string | object {
  const tile = GOOGLE_TILES[url]
  if (!tile) return url
  return {
    version: 8,
    // Glyphs are needed for symbol layers (▲ transformer markers)
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: { basemap: { type: 'raster', tiles: [tile], tileSize: 256 } },
    layers:  [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}

function extractAccentColor(paint: Record<string, unknown>, type: string): string {
  const key: Record<string, string> = {
    fill: 'fill-color', line: 'line-color', circle: 'circle-color',
    symbol: 'text-color', heatmap: 'heatmap-color', 'fill-extrusion': 'fill-extrusion-color',
  }
  const v = paint[key[type] ?? '']
  return typeof v === 'string' ? v : '#6366f1'
}

// Rendering order: areas at the bottom, lines in the middle, points on top.
// MapLibre renders layers in the order they are added — lower number = drawn first = behind.
const LAYER_Z_ORDER: Record<string, number> = {
  fill:             0,
  'fill-extrusion': 1,
  heatmap:          2,
  line:             3,
  circle:           4,
  symbol:           5,
}

/** Draw a solid-colour triangle onto a canvas and return it as ImageData. */
function makeTriangleImage(fill: string, size = 18): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.moveTo(size / 2, 1)
  ctx.lineTo(size - 1, size - 1)
  ctx.lineTo(1, size - 1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5
  ctx.stroke()
  return ctx.getImageData(0, 0, size, size)
}

function addMarkerImages(map: maplibregl.Map) {
  const pairs: [string, string][] = [
    ['triangle-red',  '#E53935'],
    ['triangle-blue', '#1565C0'],
  ]
  pairs.forEach(([id, colour]) => {
    if (!map.hasImage(id)) {
      map.addImage(id, makeTriangleImage(colour) as unknown as Parameters<typeof map.addImage>[1])
    }
  })
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null)
  const { viewState, setViewState, setMapRef, activeBasemap, activeLayers, initFromConfig, setMousePos, setHighlightedIds, clearHighlights } =
    useMapStore()
  const { setPopup, setPicker } = usePopupStore()

  const { data: layers } = useLayers()
  const { data: basemaps } = useBasemaps()
  const { data: appConfig } = useAppConfig()

  useEffect(() => {
    if (layers && basemaps && appConfig) {
      initFromConfig(layers, basemaps, appConfig)
    }
  }, [layers, basemaps, appConfig, initFromConfig])

  const handleMapLoad = useCallback(() => {
    setMapRef(mapRef.current)
    const map = mapRef.current?.getMap()
    if (map) addMarkerImages(map)
  }, [setMapRef])

  const interactiveLayerIds = layers
    ?.filter((l) => activeLayers.has(l.name))
    .map((l) => l.name) ?? []

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!e.features?.length || !layers) { clearHighlights(); return }

      const lng = e.lngLat.lng
      const lat = e.lngLat.lat

      // Deduplicate: one entry per layer
      const seen = new Set<string>()
      const unique = e.features.filter((f) => {
        if (seen.has(f.layer.id)) return false
        seen.add(f.layer.id)
        return true
      })

      const toCandidates = () =>
        unique
          .map((f) => {
            const cfg = layers.find((l) => l.name === f.layer.id)
            if (!cfg) return null
            return {
              layerName: cfg.name,
              displayName: cfg.display_name,
              layerType: cfg.layer_type,
              accentColor: extractAccentColor(cfg.paint_spec, cfg.layer_type),
              properties: (f.properties ?? {}) as Record<string, unknown>,
              popupSpec: cfg.popup_spec,
            }
          })
          .filter(Boolean) as import('@/stores/popupStore').PickerCandidate[]

      /** Highlight the clicked feature by objectid if available */
      const highlightFeature = (layerName: string, props: Record<string, unknown>) => {
        const oid = props['objectid'] ?? props['OBJECTID']
        if (oid != null) setHighlightedIds(layerName, [Number(oid)])
        else clearHighlights()
      }

      clearHighlights()

      if (unique.length === 1) {
        const cfg = layers.find((l) => l.name === unique[0].layer.id) as LayerConfig | undefined
        if (!cfg) return
        const props = (unique[0].properties ?? {}) as Record<string, unknown>
        highlightFeature(cfg.name, props)
        setPopup({
          longitude: lng,
          latitude: lat,
          layerName: cfg.name,
          displayName: cfg.display_name,
          layerType: cfg.layer_type,
          accentColor: extractAccentColor(cfg.paint_spec, cfg.layer_type),
          properties: props,
          popupSpec: cfg.popup_spec,
        })
      } else {
        const candidates = toCandidates()
        if (candidates.length === 1) {
          const c = candidates[0]
          highlightFeature(c.layerName, c.properties)
          setPopup({ longitude: lng, latitude: lat, ...c })
        } else if (candidates.length > 1) {
          setPicker({ longitude: lng, latitude: lat, candidates })
        }
      }
    },
    [layers, setPopup, setPicker, setHighlightedIds, clearHighlights],
  )

  const rawStyleUrl =
    basemaps?.find((b) => b.name === activeBasemap)?.style_url ??
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

  const basemapStyleUrl = resolveBasemapStyle(rawStyleUrl)

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(e) => setViewState(e.viewState)}
      onLoad={handleMapLoad}
      onStyleData={() => {
        const map = mapRef.current?.getMap()
        if (map) addMarkerImages(map)
      }}
      onClick={handleMapClick}
      onMouseMove={(e: MapMouseEvent) => setMousePos({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
      onMouseLeave={() => setMousePos(null)}
      interactiveLayerIds={interactiveLayerIds}
      mapStyle={basemapStyleUrl}
      style={{ position: 'absolute', inset: 0 }}
      attributionControl={false}
      cursor={interactiveLayerIds.length ? 'pointer' : 'grab'}
    >
      <NavigationControl position="bottom-right" style={{ marginBottom: '36px', marginRight: '8px' }} />

      {layers
        ?.filter((l) => activeLayers.has(l.name))
        .slice()
        .sort((a, b) => LAYER_Z_ORDER[a.layer_type] - LAYER_Z_ORDER[b.layer_type])
        .map((layer) => (
          <DataLayer key={layer.name} layer={layer} />
        ))}

      <FeaturePicker />
      <SpatialDrawLayer />
      <CadOverlayLayer />
    </Map>
  )
}
