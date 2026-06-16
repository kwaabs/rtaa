import { create } from 'zustand'
import type { GeoJSON } from 'geojson'

export type SpatialTool = 'none' | 'rect' | 'poly' | 'measure' | 'buffer'

export interface DrawnShape {
  geojson: GeoJSON
  type: 'bbox' | 'polygon' | 'measure' | 'buffer'
}

interface SpatialState {
  activeTool: SpatialTool
  drawn: DrawnShape | null
  measureInfo: string | null
  bufferRadius: number // metres

  setActiveTool: (t: SpatialTool) => void
  setDrawn: (d: DrawnShape | null) => void
  setMeasureInfo: (s: string | null) => void
  setBufferRadius: (r: number) => void
  clearAll: () => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  activeTool: 'none',
  drawn: null,
  measureInfo: null,
  bufferRadius: 500,

  setActiveTool: (t) => set({ activeTool: t }),
  setDrawn: (d) => set({ drawn: d }),
  setMeasureInfo: (s) => set({ measureInfo: s }),
  setBufferRadius: (r) => set({ bufferRadius: r }),
  clearAll: () => set({ activeTool: 'none', drawn: null, measureInfo: null }),
}))
