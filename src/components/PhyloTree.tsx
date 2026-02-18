import { useRef, useEffect, useCallback } from 'react'

interface PhyloTreeProps {
  newick: string
}

export function PhyloTree({ newick }: PhyloTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const treeRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !newick) return

    let cancelled = false

    async function init() {
      const { default: PhylocanvasGL } = await import(
        '@phylocanvas/phylocanvas.gl'
      )
      if (cancelled || !containerRef.current) return

      if (treeRef.current) {
        treeRef.current.destroy()
      }

      const rect = containerRef.current.getBoundingClientRect()
      treeRef.current = new PhylocanvasGL(containerRef.current, {
        source: newick,
        size: { width: rect.width, height: 500 },
        padding: 20,
      })
    }

    init()

    return () => {
      cancelled = true
      if (treeRef.current) {
        treeRef.current.destroy()
        treeRef.current = null
      }
    }
  }, [newick])

  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        treeRef.current.setProps({
          size: { width: rect.width, height: 500 },
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleExportNewick = useCallback(() => {
    const blob = new Blob([newick], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mlstx_tree.nwk'
    a.click()
    URL.revokeObjectURL(url)
  }, [newick])

  return (
    <section className="tree-section">
      <div className="tree-header">
        <h2>Phylogenetic Tree</h2>
        <button className="export-button" onClick={handleExportNewick}>
          Export Newick
        </button>
      </div>
      <div className="tree-container" ref={containerRef} />
    </section>
  )
}
