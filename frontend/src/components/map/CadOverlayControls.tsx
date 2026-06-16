import { X, FileCode2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useCadStore } from '@/stores/cadStore'
import { useState } from 'react'

export function CadOverlayControls() {
  const { overlay, clearOverlay, setLayerVisible, setOpacity } = useCadStore()
  const [expanded, setExpanded] = useState(false)

  if (!overlay) return null

  return (
    <div
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 rounded-xl shadow-xl text-xs min-w-64 max-w-xs"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border-strong)',
        color: 'var(--panel-text)',
      }}
    >
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileCode2 size={13} className="text-amber-400 shrink-0" />
        <span className="font-medium truncate flex-1" style={{ color: 'var(--panel-text)' }}>{overlay.fileName}</span>
        <span className="shrink-0" style={{ color: 'var(--panel-muted)' }}>{overlay.geojson.features.length} features</span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-0.5 rounded shrink-0 transition-colors"
          style={{ color: 'var(--panel-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--panel-surface)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
        <button
          onClick={clearOverlay}
          className="p-0.5 rounded shrink-0 transition-colors hover:text-red-400"
          style={{ color: 'var(--panel-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          title="Remove CAD overlay"
        >
          <X size={13} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-2" style={{ borderTop: '1px solid var(--panel-border)' }}>
          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0" style={{ color: 'var(--panel-muted)' }}>Opacity</span>
            <input
              type="range" min={0.1} max={1} step={0.05}
              value={overlay.opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="w-8 text-right shrink-0" style={{ color: 'var(--panel-muted)' }}>{Math.round(overlay.opacity * 100)}%</span>
          </div>

          {/* DXF layers */}
          {overlay.layerNames.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: 'var(--panel-muted-2)' }}>DXF Layers</p>
              {overlay.layerNames.map(name => {
                const vis = overlay.visibleLayers.has(name)
                return (
                  <label
                    key={name}
                    className="flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 transition-colors"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--panel-surface)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <button
                      onClick={() => setLayerVisible(name, !vis)}
                      className="shrink-0"
                      style={{ color: vis ? '#f59e0b' : 'var(--panel-muted-2)' }}
                    >
                      {vis ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <span className="truncate" style={{ color: vis ? 'var(--panel-text)' : 'var(--panel-muted-2)' }}>{name}</span>
                  </label>
                )
              })}
            </div>
          )}

          <p className="text-[10px] pt-1" style={{ color: 'var(--panel-muted-2)' }}>
            Temporary · not saved · {overlay.epsg}
          </p>
        </div>
      )}
    </div>
  )
}
