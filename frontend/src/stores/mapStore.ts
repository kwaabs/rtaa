import { create } from 'zustand'
import type { MapRef } from 'react-map-gl/maplibre'
import type { LayerConfig, BasemapConfig } from '@/types/meta'

interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  bearing: number
  pitch: number
}

// Per-layer paint expression overrides (for symbology)
export type PaintOverrides = Record<string, unknown>

// Highlighted feature IDs per layer (for query results)
export type HighlightSet = Record<string, Set<string | number>>

interface MapState {
  mapRef: MapRef | null
  viewState: MapViewState
  activeLayers: Set<string>
  activeBasemap: string
  layerOpacity: Record<string, number>
  sidebarOpen: boolean
  mousePos: { lng: number; lat: number } | null
  layerPaintOverrides: Record<string, PaintOverrides>
  highlightedIds: HighlightSet
  spatialFilter: [number, number, number, number] | null // bbox [w,s,e,n]

  // Actions
  setMapRef: (ref: MapRef | null) => void
  setViewState: (vs: Partial<MapViewState>) => void
  setMousePos: (pos: { lng: number; lat: number } | null) => void
  toggleLayer: (layerName: string) => void
  setLayerOpacity: (layerName: string, opacity: number) => void
  setBasemap: (basemapName: string) => void
  setSidebarOpen: (open: boolean) => void
  flyTo: (lng: number, lat: number, zoom?: number) => void
  initFromConfig: (layers: LayerConfig[], basemaps: BasemapConfig[], appConfig: Record<string, string>) => void
  setLayerPaintOverride: (layerName: string, paint: PaintOverrides) => void
  clearLayerPaintOverride: (layerName: string) => void
  setHighlightedIds: (layerName: string, ids: (string | number)[]) => void
  clearHighlights: () => void
  setSpatialFilter: (bbox: [number, number, number, number] | null) => void
}

export const useMapStore = create<MapState>((set, get) => ({
  mapRef: null,
  viewState: { longitude: 0, latitude: 0, zoom: 4, bearing: 0, pitch: 0 },
  activeLayers: new Set(),
  activeBasemap: 'osm-bright',
  layerOpacity: {},
  sidebarOpen: true,
  mousePos: null,
  layerPaintOverrides: {},
  highlightedIds: {},
  spatialFilter: null,

  setMapRef: (ref) => set({ mapRef: ref }),
  setMousePos: (pos) => set({ mousePos: pos }),

  setViewState: (vs) =>
    set((s) => ({ viewState: { ...s.viewState, ...vs } })),

  toggleLayer: (name) =>
    set((s) => {
      const next = new Set(s.activeLayers)
      next.has(name) ? next.delete(name) : next.add(name)
      return { activeLayers: next }
    }),

  setLayerOpacity: (name, opacity) =>
    set((s) => ({ layerOpacity: { ...s.layerOpacity, [name]: opacity } })),

  setBasemap: (name) => set({ activeBasemap: name }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  flyTo: (lng, lat, zoom) => {
    get().mapRef?.flyTo({ center: [lng, lat], zoom: zoom ?? get().viewState.zoom })
  },

  setLayerPaintOverride: (layerName, paint) =>
    set((s) => ({
      layerPaintOverrides: { ...s.layerPaintOverrides, [layerName]: paint },
    })),
  clearLayerPaintOverride: (layerName) =>
    set((s) => {
      const next = { ...s.layerPaintOverrides }
      delete next[layerName]
      return { layerPaintOverrides: next }
    }),
  setHighlightedIds: (layerName, ids) =>
    set((s) => ({
      highlightedIds: { ...s.highlightedIds, [layerName]: new Set(ids) },
    })),
  clearHighlights: () => set({ highlightedIds: {} }),
  setSpatialFilter: (bbox) => set({ spatialFilter: bbox }),

  initFromConfig: (layers, basemaps, appConfig) => {
    const defaultBasemap = basemaps.find((b) => b.is_default)?.name ?? 'osm-bright'
    const defaultLayers = new Set(
      layers.filter((l) => l.is_visible).map((l) => l.name),
    )
    const lng = parseFloat(appConfig['map.default_center_lng'] ?? '0')
    const lat = parseFloat(appConfig['map.default_center_lat'] ?? '0')
    const zoom = parseFloat(appConfig['map.default_zoom'] ?? '4')

    set({
      activeBasemap: defaultBasemap,
      activeLayers: defaultLayers,
      viewState: { longitude: lng, latitude: lat, zoom, bearing: 0, pitch: 0 },
    })
  },
}))
