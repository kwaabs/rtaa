/**
 * SpatialToolbar — floating UI buttons for draw/measure/analysis tools.
 *
 * Map event listeners attach directly to the underlying MapLibre GL JS map via
 * mapStore.mapRef (avoids requiring this component to be inside react-map-gl's
 * Map context). Drawn geometry is written to spatialStore, which is then read
 * by SpatialDrawLayer (rendered inside MapView's Map component).
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { Square, Pentagon, Ruler, Circle, Trash2, X, ChevronDown, RouteIcon, Crosshair } from 'lucide-react'
import * as turf from '@turf/turf'
// ── Minimal geo math (no external dependency) ───────────────────────────────

/** Haversine distance in metres between two [lng, lat] points. */
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(b[1] - a[1])
  const dLng = toR(b[0] - a[0])
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(sin2))
}

/** Bounding box [minLng, minLat, maxLng, maxLat] from a list of points. */
function ptsBbox(pts: [number, number][]): [number, number, number, number] {
  const lngs = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)]
}

/** GeoJSON Polygon from a bbox. */
function bboxPolygon(bbox: [number, number, number, number]): GeoJSON.Feature<GeoJSON.Polygon> {
  const [w, s, e, n] = bbox
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }
}

/** Approximate circle polygon around [lng, lat] with radius in metres. */
function circlePolygon(center: [number, number], radiusM: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dLat = (radiusM / 111_320) * Math.cos(angle)
    const dLng = (radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
    coords.push([lng + dLng, lat + dLat])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }
}

import { clsx } from 'clsx'
import { useMapStore } from '@/stores/mapStore'
import { useQueryStore } from '@/stores/queryStore'
import { useSpatialStore, type SpatialTool } from '@/stores/spatialStore'

interface NearbyFeature {
  layerId: string
  properties: Record<string, unknown>
  distanceM: number
}

interface LineLengthResult {
  lengthM: number
  layerId: string
}

export function SpatialToolbar() {
  const { mapRef, setSpatialFilter } = useMapStore()
  const { setOpen: openQuery } = useQueryStore()
  const {
    activeTool, drawn, measureInfo, bufferRadius,
    setActiveTool, setDrawn, setMeasureInfo, setBufferRadius, clearAll,
  } = useSpatialStore()

  const [expanded, setExpanded] = useState(false)
  const [nearbyRadius, setNearbyRadius] = useState(500)
  const [nearbyResults, setNearbyResults] = useState<NearbyFeature[] | null>(null)
  const [lineLengthResult, setLineLengthResult] = useState<LineLengthResult | null>(null)

  const anchorsRef = useRef<[number, number][]>([])

  const activate = useCallback((tool: SpatialTool | 'line-length' | 'nearest') => {
    setNearbyResults(null)
    setLineLengthResult(null)
    if (tool === 'line-length' || tool === 'nearest') {
      // These are handled locally, not in spatialStore
      if ((activeTool as string) === tool) {
        clearAll()
        anchorsRef.current = []
        setActiveTool('none')
      } else {
        clearAll()
        anchorsRef.current = []
        setActiveTool(tool as SpatialTool)
      }
      return
    }
    if (activeTool === tool) { clearAll(); anchorsRef.current = []; return }
    clearAll()
    anchorsRef.current = []
    setActiveTool(tool)
  }, [activeTool, clearAll, setActiveTool])

  // Set cursor style
  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map) return
    map.getCanvas().style.cursor = activeTool !== 'none' ? 'crosshair' : ''
    return () => { map.getCanvas().style.cursor = '' }
  }, [activeTool, mapRef])

  // Map click / dblclick events
  useEffect(() => {
    const map = mapRef?.getMap()
    if (!map || activeTool === 'none') return

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      const anchors = anchorsRef.current

      // ── Turf: Line Length ─────────────────────────────────────────────────
      if ((activeTool as string) === 'line-length') {
        const features = map.queryRenderedFeatures(e.point)
        const lineFeature = features.find(
          (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString',
        )
        if (lineFeature) {
          const lengthKm = turf.length(lineFeature as GeoJSON.Feature, { units: 'kilometers' })
          setLineLengthResult({
            lengthM: lengthKm * 1000,
            layerId: lineFeature.layer.id,
          })
        } else {
          setLineLengthResult(null)
        }
        return
      }

      // ── Turf: Nearest Features in Radius ─────────────────────────────────
      if ((activeTool as string) === 'nearest') {
        const clickPt = turf.point(pt)
        // Expand pixel search area for better coverage
        const pixelRadius = Math.min(nearbyRadius / 5, 200)
        const features = map.queryRenderedFeatures(
          [
            [e.point.x - pixelRadius, e.point.y - pixelRadius],
            [e.point.x + pixelRadius, e.point.y + pixelRadius],
          ],
        )

        const results: NearbyFeature[] = []
        const seen = new Set<string>()

        for (const f of features) {
          let centroid: GeoJSON.Feature<GeoJSON.Point>
          try {
            centroid = turf.centroid(f as GeoJSON.Feature)
          } catch {
            continue
          }
          const distKm = turf.distance(clickPt, centroid, { units: 'kilometers' })
          const distM = distKm * 1000
          if (distM > nearbyRadius) continue

          const key = `${f.layer.id}:${JSON.stringify(f.properties)}`
          if (seen.has(key)) continue
          seen.add(key)

          results.push({
            layerId: f.layer.id,
            properties: (f.properties ?? {}) as Record<string, unknown>,
            distanceM: distM,
          })
        }

        results.sort((a, b) => a.distanceM - b.distanceM)
        setNearbyResults(results.slice(0, 10))
        return
      }

      if (activeTool === 'rect') {
        if (anchors.length === 0) {
          anchorsRef.current = [pt]
        } else {
          const bbox = ptsBbox([anchors[0], pt])
          setDrawn({ geojson: bboxPolygon(bbox), type: 'bbox' })
          setSpatialFilter(bbox)
          openQuery(true)
          setActiveTool('none')
          anchorsRef.current = []
        }
        return
      }

      if (activeTool === 'poly') {
        anchorsRef.current = [...anchors, pt]
        if (anchorsRef.current.length >= 3) {
          const pts = anchorsRef.current
          const bbox = ptsBbox(pts)
          const closed = [...pts, pts[0]]
          setDrawn({ geojson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed] } }, type: 'polygon' })
          setSpatialFilter(bbox)
        }
        return
      }

      if (activeTool === 'measure') {
        if (anchors.length === 0) {
          anchorsRef.current = [pt]
        } else {
          const dist = haversineM(anchors[0], pt)
          const label = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist.toFixed(0)} m`
          setMeasureInfo(label)
          setDrawn({ geojson: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [anchors[0], pt] } }, type: 'measure' })
          setActiveTool('none')
          anchorsRef.current = []
        }
        return
      }

      if (activeTool === 'buffer') {
        const circle = circlePolygon(pt, bufferRadius)
        setDrawn({ geojson: circle, type: 'buffer' })
        setSpatialFilter(ptsBbox([pt, pt].map((p) => p as [number, number]) as [number, number][]))
        const coords = (circle.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][]
        setSpatialFilter(ptsBbox(coords))
        openQuery(true)
        setActiveTool('none')
        return
      }
    }

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (activeTool !== 'poly') return
      e.preventDefault()
      const anchors = anchorsRef.current
      if (anchors.length >= 3) {
        const closed = [...anchors, anchors[0]]
        const bbox = ptsBbox(anchors)
        setDrawn({ geojson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closed] } }, type: 'polygon' })
        setSpatialFilter(bbox)
        openQuery(true)
        setActiveTool('none')
        anchorsRef.current = []
      }
    }

    map.on('click', handleClick)
    map.on('dblclick', handleDblClick)
    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDblClick)
    }
  }, [activeTool, mapRef, bufferRadius, nearbyRadius, setSpatialFilter, openQuery, setActiveTool, setDrawn, setMeasureInfo])

  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`

  return (
    <>
      {/* Floating tool buttons — collapsed by default */}
      <div className="absolute left-4 top-24 z-30 flex flex-col gap-1">
        {/* Toggle button */}
        <button
          onClick={() => {
            if (expanded) { clearAll(); anchorsRef.current = []; setSpatialFilter(null); setNearbyResults(null); setLineLengthResult(null) }
            setExpanded((v) => !v)
          }}
          title={expanded ? 'Close spatial tools' : 'Spatial tools'}
          className={clsx(
            'w-9 h-9 flex items-center justify-center rounded-xl shadow-lg border transition',
            expanded
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white/95 backdrop-blur text-gray-600 border-gray-200 hover:bg-gray-50',
          )}
        >
          {expanded ? <ChevronDown size={16} /> : <Ruler size={16} />}
        </button>

        {/* Expanded tools */}
        {expanded && (
          <div className="flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-1.5">
            {/* Selection tools */}
            <p className="text-[10px] font-semibold uppercase text-gray-400 px-1 pt-0.5">Select</p>
            <ToolButton icon={<Square size={16} />} label="Rectangle select" active={activeTool === 'rect'} onClick={() => activate('rect')} />
            <ToolButton icon={<Pentagon size={16} />} label="Polygon select" active={activeTool === 'poly'} onClick={() => activate('poly')} />

            <div className="h-px bg-gray-200 my-0.5" />

            {/* Measure tools */}
            <p className="text-[10px] font-semibold uppercase text-gray-400 px-1">Measure</p>
            <ToolButton icon={<Ruler size={16} />} label="Measure distance" active={activeTool === 'measure'} onClick={() => activate('measure')} />
            <ToolButton icon={<Circle size={16} />} label="Buffer circle" active={activeTool === 'buffer'} onClick={() => activate('buffer')} />

            {activeTool === 'buffer' && (
              <div className="px-1.5 py-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Radius (m)</label>
                <input
                  type="number" min={10} step={50} value={bufferRadius}
                  onChange={(e) => setBufferRadius(Number(e.target.value))}
                  className="w-20 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}

            <div className="h-px bg-gray-200 my-0.5" />

            {/* Analysis tools (Turf.js) */}
            <p className="text-[10px] font-semibold uppercase text-gray-400 px-1">Analysis</p>
            <ToolButton
              icon={<RouteIcon size={16} />}
              label="Line length — click a line feature"
              active={(activeTool as string) === 'line-length'}
              onClick={() => activate('line-length')}
            />
            <ToolButton
              icon={<Crosshair size={16} />}
              label="Nearest features in radius"
              active={(activeTool as string) === 'nearest'}
              onClick={() => activate('nearest')}
            />

            {(activeTool as string) === 'nearest' && (
              <div className="px-1.5 py-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Radius (m)</label>
                <input
                  type="number" min={10} step={50} value={nearbyRadius}
                  onChange={(e) => setNearbyRadius(Number(e.target.value))}
                  className="w-20 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}

            {drawn && (
              <button
                onClick={() => { clearAll(); anchorsRef.current = []; setSpatialFilter(null) }}
                className="flex items-center justify-center gap-1 text-[11px] text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Measure result */}
      {measureInfo && (
        <div className="absolute left-4 top-56 z-30 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
          <Ruler size={14} className="text-purple-500" />
          <span className="text-sm font-semibold text-gray-800">{measureInfo}</span>
          <button onClick={() => { setMeasureInfo(null); setDrawn(null) }} className="text-gray-400 hover:text-gray-600 ml-1">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Turf: Line length result */}
      {lineLengthResult && (
        <div className="absolute left-4 top-56 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[220px]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <RouteIcon size={14} className="text-green-500" />
              Line Length
            </div>
            <button onClick={() => setLineLengthResult(null)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatDist(lineLengthResult.lengthM)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">Layer: {lineLengthResult.layerId}</p>
        </div>
      )}

      {/* Turf: Nearest features result */}
      {nearbyResults && (
        <div className="absolute left-4 top-56 z-30 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-72 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Crosshair size={14} className="text-blue-500" />
              Nearby Features
            </div>
            <button onClick={() => setNearbyResults(null)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
          {nearbyResults.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No features found within {formatDist(nearbyRadius)}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {nearbyResults.map((r, i) => {
                const label = (r.properties['name'] ?? r.properties['label'] ?? r.properties['id'] ?? `#${i + 1}`) as string
                return (
                  <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{String(label)}</span>
                      <span className="text-[11px] font-semibold text-blue-600 ml-2 shrink-0">{formatDist(r.distanceM)}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{r.layerId}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Hint banner */}
      {activeTool !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white text-xs rounded-full px-4 py-1.5 pointer-events-none whitespace-nowrap">
          {activeTool === 'rect'        && 'Click first corner, then click to complete rectangle'}
          {activeTool === 'poly'        && 'Click to add vertices · Double-click to close polygon'}
          {activeTool === 'measure'     && 'Click start point, then click end point'}
          {activeTool === 'buffer'      && 'Click a point to draw a buffer circle'}
          {(activeTool as string) === 'line-length' && 'Click on any line feature to measure its length'}
          {(activeTool as string) === 'nearest'     && `Click a point to find features within ${formatDist(nearbyRadius)}`}
        </div>
      )}
    </>
  )
}

function ToolButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx(
        'w-9 h-9 flex items-center justify-center rounded-lg transition',
        active ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      {icon}
    </button>
  )
}
