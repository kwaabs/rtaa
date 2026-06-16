/**
 * Parses an ASCII DXF file and converts entities to a GeoJSON FeatureCollection.
 * Optionally reprojects from a source CRS to WGS84 (EPSG:4326).
 *
 * Supported entity types: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, POINT,
 * TEXT, MTEXT, SPLINE (approximated), ELLIPSE (approximated).
 */

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'

// ── Known CRS definitions (proj4 strings) ────────────────────────────────────
export const CRS_OPTIONS: { label: string; epsg: string; proj4: string }[] = [
  {
    label: 'WGS84 – EPSG:4326 (lat / lng already)',
    epsg: 'EPSG:4326',
    proj4: '+proj=longlat +datum=WGS84 +no_defs',
  },
  {
    label: 'WGS84 / UTM Zone 30N – EPSG:32630',
    epsg: 'EPSG:32630',
    proj4: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs',
  },
  {
    label: 'WGS84 / UTM Zone 30S – EPSG:32730',
    epsg: 'EPSG:32730',
    proj4: '+proj=utm +zone=30 +south +datum=WGS84 +units=m +no_defs',
  },
  {
    label: 'Ghana National Grid – EPSG:25000',
    epsg: 'EPSG:25000',
    proj4: '+proj=tmerc +lat_0=4.6666667 +lon_0=-1 +k=0.99975 +x_0=274319.7391633579 +y_0=0 +ellps=clrk80 +towgs84=-199,32,322,0,0,0,0 +units=m +no_defs',
  },
  {
    label: 'Accra 1960 / Ghana National Grid – EPSG:2136',
    epsg: 'EPSG:2136',
    proj4: '+proj=tmerc +lat_0=4.6666667 +lon_0=-1 +k=0.99975 +x_0=900000 +y_0=0 +ellps=clrk80 +towgs84=-199,32,322,0,0,0,0 +units=m +no_defs',
  },
]

// Degrees → radians
const DEG = Math.PI / 180

// ── Main export ───────────────────────────────────────────────────────────────

export interface DxfParseResult {
  geojson: FeatureCollection
  layerNames: string[]
  entityCount: number
  skipped: number
  /** Best-guess source EPSG from $EXTMIN/$EXTMAX extents */
  suggestedEpsg: string
}

export async function parseDxf(
  text: string,
  sourceEpsg = 'EPSG:4326',
): Promise<DxfParseResult> {
  // Dynamic import — keeps dxf-parser out of the initial bundle
  const DxfParser = (await import('dxf-parser')).default
  const parser = new DxfParser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dxf: any
  try {
    dxf = parser.parseSync(text)
  } catch (e) {
    throw new Error(`DXF parse error: ${e instanceof Error ? e.message : e}`)
  }

  // Guess CRS from extents
  const extMin = dxf.header?.$EXTMIN
  const extMax = dxf.header?.$EXTMAX
  const suggestedEpsg = guessCrs(extMin, extMax)

  // Choose actual source CRS
  const activeSrcEpsg = sourceEpsg === 'auto' ? suggestedEpsg : sourceEpsg

  // Build transform function
  const transform = await buildTransform(activeSrcEpsg)

  const features: Feature[] = []
  const layerSet = new Set<string>()
  let skipped = 0

  // dwg2dxf puts all model-space entities inside blocks['*Model_Space'].entities
  // rather than the top-level entities array. Collect from both to handle DXF files
  // produced by different tools.
  const topLevel: unknown[] = dxf.entities ?? []
  const modelSpaceBlock =
    dxf.blocks?.['*Model_Space'] ??
    dxf.blocks?.['*model_space'] ??
    dxf.blocks?.['*MODEL_SPACE']
  const blockEntities: unknown[] = modelSpaceBlock?.entities ?? []

  // De-duplicate by handle so we don't double-count if a file has both
  const seen = new Set<string>()
  const allEntities = [...topLevel, ...blockEntities].filter((e: any) => {
    if (!e?.handle) return true
    if (seen.has(e.handle)) return false
    seen.add(e.handle)
    return true
  })

  // Recursive helper to process an entity (handles INSERT expansion)
  function processEntity(e: any) {
    if (e.layer) layerSet.add(e.layer)

    // INSERT = a block reference; expand inline
    if (e.type === 'INSERT') {
      const refBlock =
        dxf.blocks?.[e.name] ??
        dxf.blocks?.[e.name?.replace(/^\*/, '')] // strip leading *
      if (refBlock?.entities) {
        for (const child of refBlock.entities) {
          processEntity(child)
        }
      }
      return
    }

    const f = entityToFeature(e, transform)
    if (f) features.push(f)
    else skipped++
  }

  for (const entity of allEntities) {
    processEntity(entity as any)
  }

  return {
    geojson: { type: 'FeatureCollection', features },
    layerNames: [...layerSet].sort(),
    entityCount: features.length,
    skipped,
    suggestedEpsg,
  }
}

// ── CRS auto-detection ────────────────────────────────────────────────────────

function guessCrs(
  extMin?: { x: number; y: number },
  extMax?: { x: number; y: number },
): string {
  if (!extMin || !extMax) return 'EPSG:4326'
  const cx = (extMin.x + extMax.x) / 2
  const cy = (extMin.y + extMax.y) / 2

  // Looks like geographic lat/lng
  if (cx >= -180 && cx <= 180 && cy >= -90 && cy <= 90) return 'EPSG:4326'

  // Ghana UTM Zone 30N range: easting ~200k–900k, northing ~400k–1200k
  if (cx > 100_000 && cx < 1_000_000 && cy > 0 && cy < 2_000_000) {
    return 'EPSG:32630'
  }

  // Ghana National Grid (older surveys — easting near 274k)
  if (cx > 0 && cx < 600_000 && cy > -200_000 && cy < 800_000) {
    return 'EPSG:25000'
  }

  return 'EPSG:32630' // default fallback for metric coords in Ghana region
}

// ── Coordinate transformation ─────────────────────────────────────────────────

type TransformFn = (xy: [number, number]) => [number, number]

async function buildTransform(srcEpsg: string): Promise<TransformFn> {
  if (srcEpsg === 'EPSG:4326') return (xy) => xy

  const proj4 = (await import('proj4')).default
  const def = CRS_OPTIONS.find(c => c.epsg === srcEpsg)?.proj4
  if (!def) return (xy) => xy

  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs'
  return ([x, y]) => {
    const [lng, lat] = proj4(def, wgs84, [x, y]) as [number, number]
    return [lng, lat]
  }
}

// ── Entity → GeoJSON feature ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entityToFeature(entity: any, transform: TransformFn): Feature | null {
  const props: GeoJsonProperties = {
    _dxf_type:  entity.type,
    _dxf_layer: entity.layer ?? '0',
    _dxf_color: entity.colorIndex ?? null,
    _dxf_handle: entity.handle ?? null,
  }

  try {
    switch (entity.type) {
      case 'LINE': {
        // dxf-parser uses start/end; some converters use vertices[0]/[1]
        const s = entity.start ?? entity.vertices?.[0]
        const e = entity.end   ?? entity.vertices?.[1]
        if (!s || !e) return null
        const a = transform([s.x, s.y])
        const b = transform([e.x, e.y])
        return feat({ type: 'LineString', coordinates: [a, b] }, props)
      }

      case 'LWPOLYLINE':
      case 'POLYLINE': {
        const verts = (entity.vertices as { x: number; y: number }[])
        if (!verts?.length) return null
        const coords = verts.map(v => transform([v.x, v.y]))
        const closed = entity.shape || entity.closed
        if (closed && coords.length >= 3) {
          coords.push(coords[0])
          return feat({ type: 'Polygon', coordinates: [coords] }, props)
        }
        if (coords.length < 2) return null
        return feat({ type: 'LineString', coordinates: coords }, props)
      }

      case 'CIRCLE': {
        const c = entity.center
        const r = entity.radius
        const coords = circleCoords(c.x, c.y, r, 64, transform)
        return feat({ type: 'Polygon', coordinates: [coords] }, { ...props, _radius: r })
      }

      case 'ARC': {
        const c = entity.center
        const r = entity.radius
        let sa = entity.startAngle * DEG
        let ea = entity.endAngle * DEG
        if (ea <= sa) ea += 2 * Math.PI
        const steps = Math.max(12, Math.ceil(((ea - sa) / Math.PI) * 32))
        const coords = Array.from({ length: steps + 1 }, (_, i) => {
          const a = sa + (i / steps) * (ea - sa)
          return transform([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r])
        })
        return feat({ type: 'LineString', coordinates: coords }, props)
      }

      case 'ELLIPSE': {
        const c = entity.center
        const major = entity.majorAxisEndPoint
        const ratio = entity.axisRatio ?? 1
        const majorLen = Math.sqrt(major.x ** 2 + major.y ** 2)
        const minorLen = majorLen * ratio
        const rotation = Math.atan2(major.y, major.x)
        const coords = circleCoords(c.x, c.y, majorLen, 64, transform, minorLen, rotation)
        return feat({ type: 'Polygon', coordinates: [coords] }, props)
      }

      case 'SPLINE': {
        const verts = entity.controlPoints as { x: number; y: number }[] | undefined
        if (!verts || verts.length < 2) return null
        const coords = verts.map(v => transform([v.x, v.y]))
        return feat({ type: 'LineString', coordinates: coords }, props)
      }

      case 'POINT': {
        const p = entity.position
        return feat({ type: 'Point', coordinates: transform([p.x, p.y]) }, props)
      }

      case 'TEXT':
      case 'ATTDEF':
      case 'ATTRIB': {
        const p = entity.startPoint ?? entity.position
        if (!p) return null
        return feat(
          { type: 'Point', coordinates: transform([p.x, p.y]) },
          { ...props, label: entity.text ?? entity.string ?? '' },
        )
      }

      case 'MTEXT': {
        const p = entity.position
        if (!p) return null
        return feat(
          { type: 'Point', coordinates: transform([p.x, p.y]) },
          { ...props, label: entity.text ?? entity.string ?? '' },
        )
      }

      default:
        return null
    }
  } catch {
    return null
  }
}

function feat(geometry: Geometry, properties: GeoJsonProperties): Feature {
  return { type: 'Feature', geometry, properties }
}

function circleCoords(
  cx: number, cy: number, rx: number, steps: number,
  transform: TransformFn,
  ry = rx, rotation = 0,
): [number, number][] {
  const coords = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    const lx = cx + Math.cos(a) * rx * Math.cos(rotation) - Math.sin(a) * ry * Math.sin(rotation)
    const ly = cy + Math.cos(a) * rx * Math.sin(rotation) + Math.sin(a) * ry * Math.cos(rotation)
    return transform([lx, ly])
  })
  return coords
}
