import { useRef, useEffect, useCallback } from 'react'
import { phylotree } from 'phylotree'

interface PhyloTreeProps {
  newick: string
}

export function PhyloTree({ newick }: PhyloTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !newick) return

    // Clear previous tree
    containerRef.current.innerHTML = ''

    const tree = new phylotree(newick)
    const rect = containerRef.current.getBoundingClientRect()

    tree.render({
      container: containerRef.current,
      width: rect.width || 800,
      height: 500,
      'left-right-spacing': 'fixed-step',
      'top-bottom-spacing': 'fixed-step',
      zoom: true,
      'show-scale': true,
      'show-labels': true,
      brush: false,
    })

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [newick])

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
