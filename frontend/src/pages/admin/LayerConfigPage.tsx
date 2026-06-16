import { useState } from 'react'
import { Save, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react'
import { useAdminLayers, useUpdateLayer } from '@/hooks/useAdmin'
import type { LayerConfig } from '@/types/meta'
import { clsx } from 'clsx'

const LAYER_TYPE_OPTIONS = ['fill', 'line', 'circle', 'symbol', 'heatmap', 'fill-extrusion']

const TYPE_BADGE: Record<string, string> = {
  fill:   'bg-blue-100 text-blue-800',
  line:   'bg-green-100 text-green-800',
  circle: 'bg-orange-100 text-orange-800',
  symbol: 'bg-purple-100 text-purple-800',
}

export default function LayerConfigPage() {
  const { data: layers, isLoading } = useAdminLayers()
  const { mutateAsync: save, isPending } = useUpdateLayer()
  const [editing, setEditing] = useState<Record<number, Partial<LayerConfig>>>({})
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState<Set<number>>(new Set())

  const toggle = (id: number) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const patch = (id: number, field: string, val: unknown) =>
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))

  const handleSave = async (layer: LayerConfig) => {
    const changes = editing[layer.id] ?? {}
    await save({ id: layer.id, data: { ...layer, ...changes } })
    setSaved(prev => new Set(prev).add(layer.id))
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(layer.id); return n }), 2000)
    setEditing(prev => { const n = {...prev}; delete n[layer.id]; return n })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader2 className="animate-spin mr-2" /> Loading layers…
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Layer Configurations</h1>
      <p className="text-sm text-gray-600 mb-5">{layers?.length} layers · Edit paint/layout specs, zoom range, visibility</p>

      <div className="space-y-2">
        {layers?.map((layer) => {
          const e = editing[layer.id] ?? {}
          const isExpanded = expanded.has(layer.id)
          const isDirty = Object.keys(e).length > 0
          const layerType = (e.layer_type ?? layer.layer_type) as string

          return (
            <div key={layer.id} className={clsx(
              'bg-white rounded-xl border shadow-sm overflow-hidden',
              isDirty ? 'border-blue-400' : 'border-gray-200',
            )}>
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => toggle(layer.id)}
              >
                <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                  TYPE_BADGE[layerType] ?? 'bg-gray-100 text-gray-700')}>
                  {layerType}
                </span>
                <span className="font-semibold text-gray-900 flex-1 truncate">
                  {e.display_name ?? layer.display_name}
                </span>
                <span className="text-xs text-gray-500 font-mono shrink-0">{layer.name}</span>
                {isDirty && <span className="text-xs font-semibold text-blue-600 shrink-0">unsaved</span>}
                {isExpanded ? <ChevronUp size={15} className="text-gray-500 shrink-0" /> : <ChevronDown size={15} className="text-gray-500 shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-4 grid grid-cols-2 gap-4 bg-gray-50/50">
                  {/* Display name */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={e.display_name ?? layer.display_name}
                      onChange={ev => patch(layer.id, 'display_name', ev.target.value)}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Layer type */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Layer Type</label>
                    <select
                      value={e.layer_type ?? layer.layer_type}
                      onChange={ev => patch(layer.id, 'layer_type', ev.target.value)}
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LAYER_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Zoom range */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Min Zoom</label>
                      <input type="number" min={0} max={22}
                        value={e.min_zoom ?? layer.min_zoom}
                        onChange={ev => patch(layer.id, 'min_zoom', Number(ev.target.value))}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Max Zoom</label>
                      <input type="number" min={0} max={22}
                        value={e.max_zoom ?? layer.max_zoom}
                        onChange={ev => patch(layer.id, 'max_zoom', Number(ev.target.value))}
                        className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Paint spec */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Paint Spec <span className="font-normal text-gray-500">(JSON)</span></label>
                    <textarea
                      rows={5}
                      spellCheck={false}
                      value={JSON.stringify(e.paint_spec ?? layer.paint_spec, null, 2)}
                      onChange={ev => {
                        try { patch(layer.id, 'paint_spec', JSON.parse(ev.target.value)) } catch { /* ignore invalid JSON while typing */ }
                      }}
                      className="w-full text-xs text-gray-900 font-mono border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  {/* Layout spec */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Layout Spec <span className="font-normal text-gray-500">(JSON)</span></label>
                    <textarea
                      rows={3}
                      spellCheck={false}
                      value={JSON.stringify(e.layout_spec ?? layer.layout_spec, null, 2)}
                      onChange={ev => {
                        try { patch(layer.id, 'layout_spec', JSON.parse(ev.target.value)) } catch { /* ignore */ }
                      }}
                      className="w-full text-xs text-gray-900 font-mono border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>

                  {/* Visibility + sort */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                      <input type="checkbox"
                        checked={e.is_visible ?? layer.is_visible}
                        onChange={ev => patch(layer.id, 'is_visible', ev.target.checked)}
                        className="w-4 h-4 accent-blue-600" />
                      Visible by default
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Sort Order</label>
                    <input type="number"
                      value={e.sort_order ?? layer.sort_order}
                      onChange={ev => patch(layer.id, 'sort_order', Number(ev.target.value))}
                      className="w-28 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => setEditing(prev => { const n = {...prev}; delete n[layer.id]; return n })}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
                    >
                      <RotateCcw size={12} /> Discard
                    </button>
                    <button
                      onClick={() => handleSave(layer)}
                      disabled={isPending || !isDirty}
                      className={clsx(
                        'flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition',
                        saved.has(layer.id)
                          ? 'bg-green-600 text-white'
                          : isDirty
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                      )}
                    >
                      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saved.has(layer.id) ? 'Saved!' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
