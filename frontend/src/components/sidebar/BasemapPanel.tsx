import { Check, Loader2 } from 'lucide-react'
import { useBasemaps } from '@/hooks/useMeta'
import { useMapStore } from '@/stores/mapStore'
import { cn } from '@/lib/utils'

export default function BasemapPanel() {
  const { data: basemaps, isLoading, isError } = useBasemaps()
  const { activeBasemap, setBasemap } = useMapStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading basemaps…
      </div>
    )
  }

  if (isError || !basemaps?.length) {
    return (
      <p className="p-4 text-sm text-gray-500 text-center">
        {isError ? 'Failed to load basemaps.' : 'No basemaps configured.'}
      </p>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {basemaps.map((bm) => {
        const active = activeBasemap === bm.name
        return (
          <button
            key={bm.name}
            onClick={() => setBasemap(bm.name)}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              active
                ? 'border-brand-500/60 bg-brand-500/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/15 hover:text-white',
            )}
          >
            {/* Thumbnail placeholder */}
            <div className="w-12 h-9 rounded bg-gray-700 flex-shrink-0 overflow-hidden">
              {bm.thumbnail_url ? (
                <img src={bm.thumbnail_url} alt={bm.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800" />
              )}
            </div>

            <span className="flex-1 text-sm font-medium">{bm.display_name}</span>

            {active && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
