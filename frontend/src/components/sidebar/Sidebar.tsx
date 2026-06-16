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
          'rounded-r-md transition-all duration-300',
        )}
        style={{
          left: sidebarOpen ? 'var(--sidebar-width)' : 0,
          background: 'var(--sidebar-toggle-bg)',
          border: '1px solid var(--sidebar-toggle-border)',
          color: 'var(--sidebar-toggle-text)',
        }}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Sidebar panel */}
      <aside
        className={cn(
          'absolute left-0 top-0 bottom-0 z-10 w-[var(--sidebar-width)]',
          'flex flex-col transition-transform duration-300 backdrop-blur-sm',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <TabButton icon={<Layers className="w-4 h-4" />} label="Layers" active={tab === 'layers'} onClick={() => setTab('layers')} />
          <TabButton icon={<Search className="w-4 h-4" />} label="Query" active={tab === 'query'} onClick={() => setTab('query')} />
          <TabButton icon={<MapIcon className="w-4 h-4" />} label="Basemaps" active={tab === 'basemaps'} onClick={() => setTab('basemaps')} />
        </div>

        {/* Content */}
        <div className={cn('flex-1 min-h-0', tab === 'query' ? 'flex flex-col' : 'overflow-y-auto')}>
          {tab === 'layers' && <LayerPanel />}
          {tab === 'query' && (
            <div className="flex-1 overflow-hidden bg-white">
              <QueryPanel />
            </div>
          )}
          {tab === 'basemaps' && <BasemapPanel />}
        </div>

        {/* Admin link */}
        {isAdmin && (
          <div style={{ borderTop: '1px solid var(--sidebar-border)' }} className="px-3 py-2">
            <Link
              to="/admin"
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded transition"
              style={{ color: '#f59e0b' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
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
      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2"
      style={{
        color: active ? '#0ea5e9' : 'var(--sidebar-tab-inactive)',
        borderBottomColor: active ? '#0ea5e9' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-tab-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-tab-inactive)'
      }}
    >
      {icon}
      {label}
    </button>
  )
}
