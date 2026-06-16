import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AppConfig, BasemapConfig, LayerConfig } from '@/types/meta'

export function useLayers() {
  return useQuery({
    queryKey: ['meta', 'layers'],
    queryFn: () => api.get<LayerConfig[]>('/api/v1/meta/layers'),
    staleTime: 0, // always fetch fresh — layer configs change during development
  })
}

export function useBasemaps() {
  return useQuery({
    queryKey: ['meta', 'basemaps'],
    queryFn: () => api.get<BasemapConfig[]>('/api/v1/meta/basemaps'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useAppConfig() {
  return useQuery({
    queryKey: ['meta', 'config'],
    queryFn: () => api.get<AppConfig>('/api/v1/meta/config'),
    staleTime: 5 * 60 * 1000,
  })
}
