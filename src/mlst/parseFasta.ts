import type { Contig, ParsedFasta } from './types'

/**
 * Parse a FASTA-formatted string into contigs.
 */
export function parseFastaString(text: string): Contig[] {
  const contigs: Contig[] = []
  let currentName = ''
  let currentSeq: string[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('>')) {
      if (currentName) {
        contigs.push({ name: currentName, sequence: currentSeq.join('') })
      }
      currentName = trimmed.slice(1).split(/\s+/)[0]
      currentSeq = []
    } else if (trimmed && currentName) {
      currentSeq.push(trimmed.toUpperCase())
    }
  }

  if (currentName) {
    contigs.push({ name: currentName, sequence: currentSeq.join('') })
  }

  return contigs
}

/**
 * Read a File object as a FASTA (or gzipped FASTA) and return parsed contigs.
 */
export async function parseFastaFile(file: File): Promise<ParsedFasta> {
  let text: string
  if (file.name.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip')
    const decompressed = file.stream().pipeThrough(ds)
    text = await new Response(decompressed).text()
  } else {
    text = await file.text()
  }
  const contigs = parseFastaString(text)
  // Strip .gz from filename for display
  const displayName = file.name.replace(/\.gz$/, '')
  return { filename: displayName, contigs }
}
