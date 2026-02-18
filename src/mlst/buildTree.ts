import type { MLSTResult, SchemeData } from './types'
import { parseFastaString } from './parseFasta'

// Aioli is loaded globally via CDN script tag in index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Aioli: any

type ProgressCallback = (message: string, pct: number) => void

/**
 * Compute median allele length for each locus (used for gap filling).
 */
export function computeMedianLengths(
  loci: string[],
  alleleFastas: Record<string, string>,
): Record<string, number> {
  const medians: Record<string, number> = {}
  for (const locus of loci) {
    const fasta = alleleFastas[locus]
    if (!fasta) {
      medians[locus] = 400
      continue
    }
    const alleles = parseFastaString(fasta)
    const lengths = alleles.map((a) => a.sequence.length).sort((a, b) => a - b)
    medians[locus] = lengths[Math.floor(lengths.length / 2)] ?? 400
  }
  return medians
}

/**
 * Extract the allele sequence for a given genome's locus call.
 * Returns the sequence string, or N-gaps if the allele is missing/novel.
 */
export function getSequenceForAllele(
  locus: string,
  alleleCall: string | undefined,
  alleleFastas: Record<string, string>,
  medianLengths: Record<string, number>,
): string {
  if (!alleleCall || alleleCall === 'no_hit' || alleleCall === 'novel') {
    return 'N'.repeat(medianLengths[locus] ?? 400)
  }

  const fastaContent = alleleFastas[locus]
  if (!fastaContent) {
    return 'N'.repeat(medianLengths[locus] ?? 400)
  }

  const alleles = parseFastaString(fastaContent)
  const targetName = `${locus}_${alleleCall}`
  const match = alleles.find((a) => a.name === targetName)

  if (!match) {
    return 'N'.repeat(medianLengths[locus] ?? 400)
  }

  return match.sequence
}

/**
 * Build a phylogenetic tree from MLST results.
 *
 * Pipeline:
 * 1. Extract allele sequences for each genome per locus
 * 2. Run mafft per locus for multiple sequence alignment
 * 3. Concatenate per-locus alignments into a super-alignment
 * 4. Run FastTree on the concatenated alignment
 * 5. Return the Newick tree string
 */
export async function buildTree(
  results: MLSTResult[],
  schemeData: SchemeData,
  onProgress: ProgressCallback,
): Promise<string> {
  if (results.length < 2) {
    throw new Error('Need at least 2 genomes to build a tree')
  }

  const loci = schemeData.scheme.loci
  const filenames = results.map((r) => r.filename)

  onProgress('Initializing mafft and FastTree...', 0)
  const cli = await new Aioli(['mafft/7.520', 'fasttree/2.1.11'], {
    printInterleaved: false,
  })

  onProgress('Computing allele lengths...', 5)
  const medianLengths = computeMedianLengths(loci, schemeData.alleleFastas)

  // Per-locus extraction and alignment
  const alignedPerLocus: Record<string, Record<string, string>> = {}

  for (let li = 0; li < loci.length; li++) {
    const locus = loci[li]
    const pct = 10 + (li / loci.length) * 60
    onProgress(`Aligning locus ${locus} (${li + 1}/${loci.length})...`, pct)

    // Build multi-FASTA for this locus: one entry per genome
    const inputLines: string[] = []
    for (const result of results) {
      const seq = getSequenceForAllele(
        locus,
        result.alleles[locus],
        schemeData.alleleFastas,
        medianLengths,
      )
      inputLines.push(`>${result.filename}`)
      inputLines.push(seq)
    }
    const inputFasta = inputLines.join('\n') + '\n'

    // Mount input and run mafft
    const inputName = `locus_${locus}.fasta`
    await cli.mount({ name: inputName, data: inputFasta })
    const mafftResult = await cli.exec(`mafft --auto ${inputName}`)
    const alignedFasta =
      typeof mafftResult === 'string' ? mafftResult : mafftResult.stdout

    // Parse the aligned output
    const alignedContigs = parseFastaString(alignedFasta)
    alignedPerLocus[locus] = {}
    for (const contig of alignedContigs) {
      alignedPerLocus[locus][contig.name] = contig.sequence
    }
  }

  // Concatenate per-locus alignments
  onProgress('Concatenating alignments...', 75)
  const concatLines: string[] = []
  for (const filename of filenames) {
    const parts: string[] = []
    for (const locus of loci) {
      parts.push(alignedPerLocus[locus]?.[filename] ?? '')
    }
    concatLines.push(`>${filename}`)
    concatLines.push(parts.join(''))
  }
  const concatenatedFasta = concatLines.join('\n') + '\n'

  // Run FastTree
  onProgress('Building phylogenetic tree...', 80)
  await cli.mount({ name: 'concat.fasta', data: concatenatedFasta })
  const ftResult = await cli.exec('fasttree -nt concat.fasta')
  const newick = typeof ftResult === 'string' ? ftResult : ftResult.stdout

  onProgress('Tree complete', 100)
  return newick.trim()
}
