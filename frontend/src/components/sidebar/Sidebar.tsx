import { ChevronLeft, ChevronRight, Layers, Map as MapIcon, Search, ShieldCheck } from 'lucide-react'
import { useMapStore } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import LayerPanel from './LayerPanel'
import BasemapPanel from './BasemapPanel'
import { QueryPanel } from './QueryPanel'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Tab = 'layers' | 'basemaps' | 'query'

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useMapStore()
  const { session } = useAuthStore()
  const [tab, setTab] = useState<Tab>('layers')

  const isAdmin = (session?.user as { app_metadata?: Record<string, string> })?.app_metadata?.['role'] === 'admin'

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 flex items-center justify-center',
          'bg-gray-800 border border-white/10 rounded-r-md text-gray-400 hover:text-white',
          'transition-all duration-300',
          sidebarOpen ? 'left-[var(--sidebar-width)]' : 'left-0',
        )}
        style={{ left: sidebarOpen ? 'var(--sidebar-width)' : 0 }}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Sidebar panel */}
      <aside
        className={cn(
          'absolute left-0 top-0 bottom-0 z-10 w-[var(--sidebar-width)]',
          'bg-gray-900/95 border-r border-white/10 backdrop-blur-sm',
          'flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <TabButton icon={<Layers className="w-4 h-4" />} label="Layers" active={tab === 'layers'} onClick={() => setTab('layers')} />
          <TabButton icon={<Search className="w-4 h-4" />} label="Query" active={tab === 'query'} onClick={() => setTab('query')} />
          <TabButton icon={<MapIcon className="w-4 h-4" />} label="Basemaps" active={tab === 'basemaps'} onClick={() => setTab('basemaps')} />
        </div>

        {/* Content — QueryPanel must not scroll at the outer level (it manages its own scroll) */}
        <div className={cn('flex-1 min-h-0', tab === 'query' ? 'flex flex-col' : 'overflow-y-auto')}>
          {tab === 'layers' && <LayerPanel />}
          {tab === 'query' && (
            <div className="flex-1 overflow-hidden bg-white">
              <QueryPanel />
            </div>
          )}
          {tab === 'basemaps' && <BasemapPanel />}
        </div>

        {/* Admin link — only shown to admin users */}
        {isAdmin && (
          <div className="border-t border-white/10 px-3 py-2">
            <Link to="/admin" className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded hover:bg-white/5 transition">
              <ShieldCheck size={13} /> Admin Panel
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}

function TabButton({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium',
        'transition-colors border-b-2',
        active
          ? 'text-brand-400 border-brand-500'
          : 'text-gray-400 border-transparent hover:text-white hover:border-white/20',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
