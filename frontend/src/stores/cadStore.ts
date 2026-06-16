import { create } from 'zustand'
import type { FeatureCollection } from 'geojson'

interface CadOverlay {
  fileName: string
  epsg: string
  geojson: FeatureCollection
  layerNames: string[]
  visibleLayers: Set<string>
  opacity: number
}

interface CadState {
  overlay: CadOverlay | null
  importing: boolean
  importError: string | null

  setOverlay: (o: CadOverlay) => void
  clearOverlay: () => void
  setLayerVisible: (layer: string, visible: boolean) => void
  setOpacity: (v: number) => void
  setImporting: (v: boolean) => void
  setImportError: (e: string | null) => void
}

export const useCadStore = create<CadState>((set) => ({
  overlay: null,
  importing: false,
  importError: null,

  setOverlay: (overlay) => set({ overlay, importing: false, importError: null }),
  clearOverlay: () => set({ overlay: null }),
  setLayerVisible: (layer, visible) =>
    set(state => {
      if (!state.overlay) return {}
      const vl = new Set(state.overlay.visibleLayers)
      visible ? vl.add(layer) : vl.delete(layer)
      return { overlay: { ...state.overlay, visibleLayers: vl } }
    }),
  setOpacity: (opacity) =>
    set(state => state.overlay ? { overlay: { ...state.overlay, opacity } } : {}),
  setImporting: (importing) => set({ importing }),
  setImportError: (importError) => set({ importError, importing: false }),
}))
