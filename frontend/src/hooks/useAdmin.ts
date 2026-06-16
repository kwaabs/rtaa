import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LayerConfig, BasemapConfig } from '@/types/meta'

export interface AppConfigRow {
  key: string
  value: string
  value_type: string
  category: string
  label: string
  updated_at: string
}

export type AuthProviders = Record<string, Record<string, string>>

const QK = {
  layers:    ['admin', 'layers'],
  basemaps:  ['admin', 'basemaps'],
  config:    ['admin', 'config'],
  providers: ['admin', 'auth-providers'],
}

export function useAdminLayers()    { return useQuery<LayerConfig[]>  ({ queryKey: QK.layers,    queryFn: () => api.get('/api/v1/admin/layers'),         staleTime: 0 }) }
export function useAdminBasemaps()  { return useQuery<BasemapConfig[]>({ queryKey: QK.basemaps,  queryFn: () => api.get('/api/v1/admin/basemaps'),       staleTime: 0 }) }
export function useAdminConfig()    { return useQuery<AppConfigRow[]> ({ queryKey: QK.config,    queryFn: () => api.get('/api/v1/admin/config'),          staleTime: 0 }) }
export function useAuthProviders()  { return useQuery<AuthProviders>  ({ queryKey: QK.providers, queryFn: () => api.get('/api/v1/admin/auth-providers'),  staleTime: 0 }) }

export function useUpdateLayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LayerConfig> }) =>
      api.put(`/api/v1/admin/layers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.layers }),
  })
}

export function useUpdateBasemap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BasemapConfig> }) =>
      api.put(`/api/v1/admin/basemaps/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.basemaps }),
  })
}

export function useUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<AppConfigRow> }) =>
      api.put(`/api/v1/admin/config/${key}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.config }),
  })
}

export function useUpdateAuthProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, data }: { provider: string; data: Record<string, string> }) =>
      api.put(`/api/v1/admin/auth-providers/${provider}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.providers }),
  })
}
