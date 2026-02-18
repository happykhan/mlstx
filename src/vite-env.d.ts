/// <reference types="vite/client" />

declare module '@phylocanvas/phylocanvas.gl' {
  interface PhylocanvasProps {
    source?: string
    size?: { width: number; height: number }
    padding?: number
    fillColour?: string
    strokeColour?: string
    [key: string]: unknown
  }

  export default class PhylocanvasGL {
    constructor(element: HTMLElement, props?: PhylocanvasProps)
    setProps(props: Partial<PhylocanvasProps>): void
    destroy(): void
  }
}
