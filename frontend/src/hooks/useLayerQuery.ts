import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FilterCondition, QueryResult } from '@/stores/queryStore'

export interface FieldInfo {
  name: string
  data_type: 'text' | 'integer' | 'numeric' | 'boolean' | 'timestamp' | 'geometry'
}

/** Fetch column metadata for a layer (used to populate the field dropdown). */
export function useLayerFields(layerName: string) {
  return useQuery<FieldInfo[]>({
    queryKey: ['layer-fields', layerName],
    queryFn: () => api.get<FieldInfo[]>(`/api/v1/layers/${layerName}/fields`),
    enabled: !!layerName,
    staleTime: 10 * 60 * 1000,
  })
}

/** POST query with filter conditions (and optional bbox) to the backend. */
export function useLayerQueryMutation() {
  return useMutation({
    mutationFn: async ({
      layerName,
      conditions,
      logic,
      limit,
      bbox,
    }: {
      layerName: string
      conditions: FilterCondition[]
      logic: 'AND' | 'OR'
      limit: number
      bbox?: [number, number, number, number] | null
    }) => {
      const payload = {
        conditions: conditions.map(({ field, op, value }) => ({ field, op, value })),
        logic,
        limit,
        ...(bbox ? { bbox, has_bbox: true } : {}),
      }
      return api.post<QueryResult>(`/api/v1/layers/${layerName}/query`, payload)
    },
  })
}
