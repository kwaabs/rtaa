import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useAdminConfig, useUpdateConfig } from '@/hooks/useAdmin'
import { clsx } from 'clsx'

export default function AppConfigPage() {
  const { data: configs, isLoading } = useAdminConfig()
  const { mutateAsync: save, isPending } = useUpdateConfig()
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const handleSave = async (key: string, row: NonNullable<typeof configs>[0]) => {
    await save({ key, data: { ...row, value: editing[key] ?? row.value } })
    setSaved(prev => new Set(prev).add(key))
    setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(key); return n }), 2000)
    setEditing(prev => { const n = {...prev}; delete n[key]; return n })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader2 className="animate-spin mr-2" /> Loading config…
    </div>
  )

  if (!configs?.length) return (
    <div className="p-6 text-gray-600">No app config entries found.</div>
  )

  // Group by category, skip auth_provider (handled on Auth Providers page)
  const grouped: Record<string, NonNullable<typeof configs>> = {}
  for (const c of configs) {
    if (c.category === 'auth_provider') continue
    grouped[c.category] = grouped[c.category] ?? []
    grouped[c.category].push(c)
  }

  if (!Object.keys(grouped).length) return (
    <div className="p-6 text-gray-600">No general config entries. Auth provider settings are on the Auth Providers page.</div>
  )

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">App Configuration</h1>
      <p className="text-sm text-gray-600 mb-5">Application-level settings stored in the database.</p>

      {Object.entries(grouped).map(([cat, rows]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">{cat}</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
            {rows.map(row => {
              const val = editing[row.key] ?? row.value
              const isDirty = editing[row.key] !== undefined && editing[row.key] !== row.value
              return (
                <div key={row.key} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800">{row.label || row.key}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{row.key}</div>
                  </div>
                  <input
                    type={row.value_type === 'password' ? 'password' : 'text'}
                    value={val}
                    onChange={ev => setEditing(prev => ({ ...prev, [row.key]: ev.target.value }))}
                    className="w-72 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleSave(row.key, row)}
                    disabled={!isDirty || isPending}
                    className={clsx(
                      'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0',
                      saved.has(row.key)
                        ? 'bg-green-600 text-white'
                        : isDirty
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    )}
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {saved.has(row.key) ? 'Saved' : 'Save'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
