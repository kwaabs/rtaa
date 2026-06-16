import { X, FileCode2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useCadStore } from '@/stores/cadStore'
import { useState } from 'react'
import { clsx } from 'clsx'

export function CadOverlayControls() {
  const { overlay, clearOverlay, setLayerVisible, setOpacity } = useCadStore()
  const [expanded, setExpanded] = useState(false)

  if (!overlay) return null

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 border border-white/10 rounded-xl shadow-xl text-white text-xs backdrop-blur-sm min-w-64 max-w-xs">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileCode2 size={13} className="text-amber-400 shrink-0" />
        <span className="font-medium text-gray-200 truncate flex-1">{overlay.fileName}</span>
        <span className="text-gray-500 shrink-0">{overlay.geojson.features.length} features</span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
        <button
          onClick={clearOverlay}
          className="p-0.5 rounded hover:bg-red-500/30 text-gray-400 hover:text-red-300 shrink-0"
          title="Remove CAD overlay"
        >
          <X size={13} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/10 px-3 py-2 space-y-2">
          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-14 shrink-0">Opacity</span>
            <input
              type="range" min={0.1} max={1} step={0.05}
              value={overlay.opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-gray-400 w-8 text-right">{Math.round(overlay.opacity * 100)}%</span>
          </div>

          {/* DXF layers */}
          {overlay.layerNames.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <p className="text-gray-500 uppercase tracking-wider text-[10px] mb-1">DXF Layers</p>
              {overlay.layerNames.map(name => {
                const vis = overlay.visibleLayers.has(name)
                return (
                  <label key={name} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-1 py-0.5">
                    <button
                      onClick={() => setLayerVisible(name, !vis)}
                      className={clsx('shrink-0', vis ? 'text-amber-400' : 'text-gray-600')}
                    >
                      {vis ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <span className={clsx('truncate', vis ? 'text-gray-200' : 'text-gray-600')}>{name}</span>
                  </label>
                )
              })}
            </div>
          )}

          <p className="text-gray-600 text-[10px] pt-1">
            Temporary · not saved · {overlay.epsg}
          </p>
        </div>
      )}
    </div>
  )
}
