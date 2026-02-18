/// <reference types="vite/client" />

declare module '@phylocanvas/phylocanvas.gl' {
  interface PhylocanvasProps {
    source?: string
    size?: { width: number; height: number }
    padding?: number
    type?: string
    fillColour?: string
    strokeColour?: string
    [key: string]: unknown
  }

  export const TreeTypes: {
    Rectangular: string
    Circular: string
    Radial: string
    Diagonal: string
    Hierarchical: string
  }

  export default class PhylocanvasGL {
    constructor(element: HTMLElement, props?: PhylocanvasProps)
    setProps(props: Partial<PhylocanvasProps>): void
    destroy(): void
  }
}
