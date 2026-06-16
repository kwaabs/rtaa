import { useState, useCallback } from 'react'
import MapView from '@/components/map/MapView'
import AttributeWindow from '@/components/map/AttributeWindow'
import MapStatusBar from '@/components/map/MapStatusBar'
import { QueryResultsWindow } from '@/components/map/QueryResultsWindow'
import { CadImportDialog } from '@/components/map/CadImportDialog'
import { CadOverlayControls } from '@/components/map/CadOverlayControls'
import { CadViewerPanel } from '@/components/map/CadViewerPanel'
import Sidebar from '@/components/sidebar/Sidebar'
import Header from '@/components/layout/Header'
import { useCadStore } from '@/stores/cadStore'
import { FileCode2, X } from 'lucide-react'

export default function MapPage() {
  const [cadDialogOpen, setCadDialogOpen] = useState(false)
  const [dwgFile, setDwgFile] = useState<File | null>(null)
  const { overlay, clearOverlay } = useCadStore()

  // Called by the import dialog when user picks a DWG file
  const handleOpenDwg = useCallback((file: File) => {
    setDwgFile(file)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="relative flex-1 overflow-hidden">
        <MapView />
        <Sidebar />

        {/* CAD button — bottom-right, above the NavigationControl */}
        <div className="absolute bottom-8 right-12 z-30 flex items-center gap-1">
          {overlay && (
            <button
              onClick={clearOverlay}
              title="Remove CAD overlay"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition"
            >
              <X size={12} /> Clear CAD
            </button>
          )}
          <button
            onClick={() => setCadDialogOpen(true)}
            title="Import DXF / DWG file"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg border transition ${
              overlay
                ? 'bg-amber-500 border-amber-400 text-white'
                : 'bg-gray-800 border-white/10 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileCode2 size={14} />
            {overlay ? 'CAD loaded' : 'CAD'}
          </button>
        </div>

        {/* CAD overlay controls (DXF on map) */}
        <CadOverlayControls />

        {/* CAD import dialog */}
        {cadDialogOpen && (
          <CadImportDialog
            onClose={() => setCadDialogOpen(false)}
            onOpenDwg={handleOpenDwg}
          />
        )}

        {/* DWG floating viewer panel — mounts immediately so the canvas ref is ready */}
        {dwgFile && (
          <CadViewerPanel
            initialFile={dwgFile}
            onClose={() => setDwgFile(null)}
          />
        )}

        {/* Floating attribute inspector */}
        <AttributeWindow />
        {/* Status bar */}
        <MapStatusBar />
        {/* Query results */}
        <QueryResultsWindow />
      </div>
    </div>
  )
}
