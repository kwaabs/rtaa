import { useEffect, useRef, useCallback, useState } from 'react'

// Lazy-import so the heavy WASM bundle only loads when the panel is opened.
// Types only — actual runtime import happens inside useEffect.
type AcApDocManagerType = {
  createInstance(opts: {
    container: HTMLElement
    autoResize?: boolean
    webworkerFileUrls: {
      mtextRender?: string
      dxfParser?: string
      dwgParser?: string
    }
  }): Promise<void>
  instance: {
    openDocument(
      name: string,
      content: ArrayBuffer | string,
      options?: { minimumChunkSize?: number; readOnly?: boolean },
    ): Promise<void>
    sendStringToExecute(cmd: string): void
  }
}

export type CadStatus = 'idle' | 'initialising' | 'ready' | 'loading' | 'error'

export function useCadViewer(containerRef: React.RefObject<HTMLDivElement | null>) {
  const managerLoadedRef = useRef(false)
  const [status, setStatus] = useState<CadStatus>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialise the engine once the container div is mounted
  useEffect(() => {
    if (!containerRef.current || managerLoadedRef.current) return

    let cancelled = false

    const init = async () => {
      try {
        setStatus('initialising')

        // Dynamic import — keeps the WASM out of the initial JS bundle
        const { AcApDocManager } = await import('@mlightcad/cad-simple-viewer') as { AcApDocManager: AcApDocManagerType }

        if (cancelled || !containerRef.current) return

        await AcApDocManager.createInstance({
          container: containerRef.current,
          autoResize: true,
          // trailing slash is required — SDK appends e.g. "fonts/fonts.json" directly
          baseUrl: 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/',
          webworkerFileUrls: {
            // Served from public/assets/ (copied by scripts/copy-cad-workers.js)
            mtextRender: '/assets/mtext-renderer-worker.js',
            dxfParser:   '/assets/dxf-parser-worker.js',
            dwgParser:   '/assets/libredwg-parser-worker.js',
          },
        })

        if (cancelled) return
        managerLoadedRef.current = true
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(err instanceof Error ? err.message : 'Failed to initialise CAD engine')
        }
      }
    }

    init()

    return () => { cancelled = true }
  }, [containerRef])

  const openFile = useCallback(async (file: File) => {
    if (!managerLoadedRef.current) return
    setStatus('loading')
    setError(null)
    setFileName(file.name)

    try {
      const { AcApDocManager } = await import('@mlightcad/cad-simple-viewer') as { AcApDocManager: AcApDocManagerType }

      const isDxf = file.name.toLowerCase().endsWith('.dxf')
      let content: ArrayBuffer | string

      if (isDxf) {
        content = await file.text()
      } else {
        content = await file.arrayBuffer()
      }

      await AcApDocManager.instance.openDocument(file.name, content, {
        minimumChunkSize: 1000,
        readOnly: true,
      })

      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to open CAD file')
    }
  }, [])

  const sendCommand = useCallback(async (cmd: string) => {
    if (!managerLoadedRef.current) return
    const { AcApDocManager } = await import('@mlightcad/cad-simple-viewer') as { AcApDocManager: AcApDocManagerType }
    AcApDocManager.instance.sendStringToExecute(cmd)
  }, [])

  return { status, fileName, error, openFile, sendCommand }
}
