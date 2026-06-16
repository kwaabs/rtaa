import { useState } from 'react'
import { Save, Loader2, RotateCcw } from 'lucide-react'
import { useAdminBasemaps, useUpdateBasemap } from '@/hooks/useAdmin'
import type { BasemapConfig } from '@/types/meta'
import { clsx } from 'clsx'

export default function BasemapPage() {
  const { data: basemaps, isLoading } = useAdminBasemaps()
  const { mutateAsync: save, isPending } = useUpdateBasemap()
  const [editing, setEditing] = useState<Record<number, Partial<BasemapConfig>>>({})
  const [saved, setSaved] = useState<Set<number>>(new Set())

  const patch = (id: number, field: string, val: unknown) =>
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))

  const handleSave = async (bm: BasemapConfig) => {
    await save({ id: bm.id, data: { ...bm, ...editing[bm.id] } })
    setSaved(prev => new Set(prev).add(bm.id))
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(bm.id); return n }), 2000)
    setEditing(prev => { const n = {...prev}; delete n[bm.id]; return n })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader2 className="animate-spin mr-2" /> Loading basemaps…
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Basemap Configurations</h1>
      <p className="text-sm text-gray-600 mb-5">{basemaps?.length} basemaps configured</p>

      <div className="space-y-4">
        {basemaps?.map((bm) => {
          const e = editing[bm.id] ?? {}
          const isDirty = Object.keys(e).length > 0

          return (
            <div key={bm.id} className={clsx(
              'bg-white rounded-xl border shadow-sm p-5',
              isDirty ? 'border-blue-400' : 'border-gray-200',
            )}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Display Name</label>
                  <input type="text"
                    value={e.display_name ?? bm.display_name}
                    onChange={ev => patch(bm.id, 'display_name', ev.target.value)}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Sort Order</label>
                  <input type="number"
                    value={e.sort_order ?? bm.sort_order}
                    onChange={ev => patch(bm.id, 'sort_order', Number(ev.target.value))}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Style URL</label>
                  <input type="text"
                    value={e.style_url ?? bm.style_url}
                    onChange={ev => patch(bm.id, 'style_url', ev.target.value)}
                    className="w-full text-sm text-gray-900 font-mono border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">
                    Special values: <code className="bg-gray-100 text-gray-700 px-1 rounded">_google_maps_</code> · <code className="bg-gray-100 text-gray-700 px-1 rounded">_google_satellite_</code> · <code className="bg-gray-100 text-gray-700 px-1 rounded">_google_hybrid_</code>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Attribution</label>
                  <input type="text"
                    value={e.attribution ?? bm.attribution ?? ''}
                    onChange={ev => patch(bm.id, 'attribution', ev.target.value)}
                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                    <input type="checkbox"
                      checked={e.is_default ?? bm.is_default}
                      onChange={ev => patch(bm.id, 'is_default', ev.target.checked)}
                      className="w-4 h-4 accent-blue-600" />
                    Default basemap
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                    <input type="checkbox"
                      checked={e.is_active ?? bm.is_active}
                      onChange={ev => patch(bm.id, 'is_active', ev.target.checked)}
                      className="w-4 h-4 accent-blue-600" />
                    Active
                  </label>
                </div>

                <div className="col-span-2 flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setEditing(prev => { const n = {...prev}; delete n[bm.id]; return n })}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
                  >
                    <RotateCcw size={12} /> Discard
                  </button>
                  <button
                    onClick={() => handleSave(bm)}
                    disabled={!isDirty || isPending}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition',
                      saved.has(bm.id)
                        ? 'bg-green-600 text-white'
                        : isDirty
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    )}
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {saved.has(bm.id) ? 'Saved!' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
