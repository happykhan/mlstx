import { useRef, useEffect, useCallback } from 'react'
import { phylotree } from 'phylotree'

interface PhyloTreeProps {
  newick: string
  alignment?: string
}

export function PhyloTree({ newick, alignment }: PhyloTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !newick) return

    // Clear previous tree
    containerRef.current.innerHTML = ''

    const tree = new phylotree(newick)
    const rect = containerRef.current.getBoundingClientRect()

    const display = tree.render({
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

    // phylotree.js creates a detached SVG — append it to the container
    const svgNode = display.show()
    if (svgNode && containerRef.current) {
      containerRef.current.appendChild(svgNode)
    }

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

  const handleExportAlignment = useCallback(() => {
    if (!alignment) return
    const blob = new Blob([alignment], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mlstx_alignment.fasta'
    a.click()
    URL.revokeObjectURL(url)
  }, [alignment])

  return (
    <section className="tree-section">
      <div className="tree-header">
        <h2>Phylogenetic Tree</h2>
        <div className="results-actions">
          <button className="export-button" onClick={handleExportNewick}>
            Export Newick
          </button>
          {alignment && (
            <button className="export-button" onClick={handleExportAlignment}>
              Export MSA
            </button>
          )}
        </div>
      </div>
      <div className="tree-container" ref={containerRef} />
    </section>
  )
}
