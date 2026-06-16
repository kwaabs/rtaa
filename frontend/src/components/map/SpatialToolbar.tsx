/**
 * SpatialToolbar — floating UI buttons for draw/measure tools.
 *
 * Map event listeners attach directly to the underlying MapLibre GL JS map via
 * mapStore.mapRef (avoids requiring this component to be inside react-map-gl's
 * Map context). Drawn geometry is written to spatialStore, which is then read
 * by SpatialDrawLayer (rendered inside MapView's Map component).
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { Square, Pentagon, Ruler, Circle, Trash2, X, ChevronDown } from 'lucide-react'
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

export function SpatialToolbar() {
  const { mapRef, setSpatialFilter } = useMapStore()
  const { setOpen: openQuery } = useQueryStore()
  const {
    activeTool, drawn, measureInfo, bufferRadius,
    setActiveTool, setDrawn, setMeasureInfo, setBufferRadius, clearAll,
  } = useSpatialStore()

  const [expanded, setExpanded] = useState(false)

  const anchorsRef = useRef<[number, number][]>([])

  const activate = useCallback((tool: SpatialTool) => {
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
  }, [activeTool, mapRef, bufferRadius, setSpatialFilter, openQuery, setActiveTool, setDrawn, setMeasureInfo])

  return (
    <>
      {/* Floating tool buttons — collapsed by default */}
      <div className="absolute left-4 top-24 z-30 flex flex-col gap-1">
        {/* Toggle button */}
        <button
          onClick={() => {
            if (expanded) { clearAll(); anchorsRef.current = []; setSpatialFilter(null) }
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
            <ToolButton icon={<Square size={16} />} label="Rectangle select" active={activeTool === 'rect'} onClick={() => activate('rect')} />
            <ToolButton icon={<Pentagon size={16} />} label="Polygon select" active={activeTool === 'poly'} onClick={() => activate('poly')} />
            <ToolButton icon={<Ruler size={16} />} label="Measure distance" active={activeTool === 'measure'} onClick={() => activate('measure')} />
            <ToolButton icon={<Circle size={16} />} label="Buffer circle" active={activeTool === 'buffer'} onClick={() => activate('buffer')} />

            {activeTool === 'buffer' && (
              <div className="px-1.5 py-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Radius (m)</label>
                <input
                  type="number" min={10} step={50} value={bufferRadius}
                  onChange={(e) => setBufferRadius(Number(e.target.value))}
                  className="w-16 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
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

      {/* Hint banner */}
      {activeTool !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white text-xs rounded-full px-4 py-1.5 pointer-events-none whitespace-nowrap">
          {activeTool === 'rect'    && 'Click first corner, then click to complete rectangle'}
          {activeTool === 'poly'    && 'Click to add vertices · Double-click to close polygon'}
          {activeTool === 'measure' && 'Click start point, then click end point'}
          {activeTool === 'buffer'  && 'Click a point to draw a buffer circle'}
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
