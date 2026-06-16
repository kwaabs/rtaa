import { useState } from 'react'
import { Settings2, Loader2, Palette } from 'lucide-react'
import { useLayers } from '@/hooks/useMeta'
import { useMapStore } from '@/stores/mapStore'
import { cn } from '@/lib/utils'
import { SymbologyEditor } from './SymbologyEditor'
import type { LayerConfig } from '@/types/meta'

export default function LayerPanel() {
  const { data: layers, isLoading, isError } = useLayers()
  const { activeLayers, layerOpacity, layerPaintOverrides, toggleLayer, setLayerOpacity } = useMapStore()
  const [opacityOpen, setOpacityOpen] = useState<Set<string>>(new Set())
  const [symbologyLayer, setSymbologyLayer] = useState<LayerConfig | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading layers…
      </div>
    )
  }

  if (isError || !layers?.length) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        {isError ? 'Failed to load layers.' : 'No layers configured.'}
      </div>
    )
  }

  function toggleOpacityPanel(name: string) {
    setOpacityOpen((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // Symbology editor overlays the whole panel
  if (symbologyLayer) {
    return (
      <div className="h-full flex flex-col">
        <SymbologyEditor layer={symbologyLayer} onClose={() => setSymbologyLayer(null)} />
      </div>
    )
  }

  return (
    <div className="p-3 space-y-1">
      {layers.map((layer) => {
        const active = activeLayers.has(layer.name)
        const opacity = layerOpacity[layer.name] ?? 1
        const showOpacity = opacityOpen.has(layer.name)
        const hasOverride = !!layerPaintOverrides[layer.name]

        return (
          <div
            key={layer.name}
            className={cn(
              'rounded-lg border transition-colors',
              active ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/5 bg-white/[0.02]',
            )}
          >
            {/* Main row */}
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                id={`layer-${layer.name}`}
                checked={active}
                onChange={() => toggleLayer(layer.name)}
                className="flex-shrink-0 w-3.5 h-3.5 rounded accent-brand-500 cursor-pointer"
              />

              <label
                htmlFor={`layer-${layer.name}`}
                className={cn(
                  'flex-1 min-w-0 cursor-pointer select-none',
                  active ? 'text-white' : 'text-gray-500',
                )}
              >
                <p className="text-sm font-medium truncate">{layer.display_name}</p>
                {layer.description && (
                  <p className="text-xs text-gray-600 truncate mt-0.5">{layer.description}</p>
                )}
              </label>

              {/* Symbology button */}
              <button
                onClick={() => setSymbologyLayer(layer)}
                title="Edit symbology"
                className={cn(
                  'flex-shrink-0 p-0.5 rounded transition-colors',
                  hasOverride
                    ? 'text-purple-400 bg-purple-500/15'
                    : 'text-gray-600 hover:text-purple-300',
                )}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* Opacity gear — only when active */}
              {active && (
                <button
                  onClick={() => toggleOpacityPanel(layer.name)}
                  title="Adjust opacity"
                  className={cn(
                    'flex-shrink-0 p-0.5 rounded transition-colors',
                    showOpacity
                      ? 'text-brand-400 bg-brand-500/15'
                      : 'text-gray-600 hover:text-gray-300',
                  )}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Collapsible opacity slider */}
            {active && showOpacity && (
              <div className="px-3 pb-2.5 flex items-center gap-2 border-t border-white/5 pt-2">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setLayerOpacity(layer.name, parseFloat(e.target.value))}
                  className="flex-1 accent-brand-500 h-1"
                />
                <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
