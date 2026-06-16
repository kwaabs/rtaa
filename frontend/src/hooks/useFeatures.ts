/**
 * useSearch — attribute / spatial search against the GeoJSON features endpoint.
 *
 * Map tile rendering is handled by Martin. Use this hook only when you need
 * to query specific features (e.g. click-to-identify, search panel, export).
 *
 * At least one of `bbox`, `search`, or `ids` must be supplied.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { GeoJSONFeatureCollection } from '@/types/meta'

export interface SearchOptions {
  /** Bounding box filter [minx, miny, maxx, maxy] EPSG:4326 */
  bbox?: [number, number, number, number]
  /** Text value to ILIKE-match */
  search?: string
  /** Column to match `search` against (default: objectid) */
  field?: string
  /** Comma-separated objectid list */
  ids?: number[]
  /** Max results (default 500, max 5000) */
  limit?: number
  /** Disable the query without removing the hook */
  enabled?: boolean
}

export function useSearch(layerName: string, options: SearchOptions = {}) {
  const { bbox, search, field, ids, limit, enabled = true } = options

  const hasFilter = !!(bbox || search || ids?.length)

  return useQuery({
    queryKey: ['features', layerName, { bbox, search, field, ids, limit }],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (bbox) params.bbox = bbox.join(',')
      if (search) params.search = search
      if (field) params.field = field
      if (ids?.length) params.ids = ids.join(',')
      if (limit) params.limit = String(limit)
      return api.get<GeoJSONFeatureCollection>(
        `/api/v1/layers/${layerName}/features`,
        params,
      )
    },
    enabled: !!layerName && hasFilter && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

/** @deprecated Use useSearch */
export const useFeatures = useSearch

/**
 * useAttrs — fetch raw attribute rows (no geometry) for the attribute window.
 * Avoids ST_AsGeoJSON so the public.geometry type conflict cannot occur.
 */
export function useAttrs(layerName: string, options: SearchOptions = {}) {
  const { ids, search, field, bbox, limit, enabled = true } = options
  const hasFilter = !!(bbox || search || ids?.length)

  return useQuery({
    queryKey: ['attrs', layerName, { ids, search, field, bbox, limit }],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (bbox) params.bbox = bbox.join(',')
      if (search) params.search = search
      if (field) params.field = field
      if (ids?.length) params.ids = ids.join(',')
      if (limit) params.limit = String(limit)
      return api.get<Record<string, unknown>[]>(
        `/api/v1/layers/${layerName}/attrs`,
        params,
      )
    },
    enabled: !!layerName && hasFilter && enabled,
    staleTime: 2 * 60 * 1000,
  })
}
