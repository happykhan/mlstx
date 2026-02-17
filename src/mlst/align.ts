import type {
  ParsedFasta,
  SchemeData,
  MLSTResult,
  AlignmentHit,
} from './types'
import { parseFastaString } from './parseFasta'
import { callAllele } from './callAllele'
import { callST } from './callST'

// Aioli is loaded globally via CDN script tag in index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Aioli: any

type ProgressCallback = (message: string, pct: number) => void

/**
 * Merge all contigs into a single sequence (joined with 100 N's as spacers,
 * same approach as BRIG) and return as a single-entry FASTA string.
 */
function mergeContigsToFasta(
  filename: string,
  contigs: { name: string; sequence: string }[],
): string {
  const merged = contigs.map((c) => c.sequence).join('N'.repeat(100))
  return `>${filename}\n${merged}\n`
}

/**
 * Parse minimap2 PAF output into AlignmentHit format.
 *
 * PAF columns (0-indexed):
 *   0: qName   1: qLen   2: qStart   3: qEnd   4: strand
 *   5: tName   6: tLen   7: tStart   8: tEnd
 *   9: nMatch  10: blockLen  11: mapQ
 *
 * In our usage: query = alleles, target = genome.
 * AlignmentHit.targetName = allele name (to match callAllele expectations).
 */
export function parsePAF(pafText: string): AlignmentHit[] {
  const hits: AlignmentHit[] = []
  const lines = pafText.trim().split('\n')

  for (const line of lines) {
    if (!line) continue
    const fields = line.split('\t')
    if (fields.length < 12) continue

    const qName = fields[0] // allele name (e.g., "adk_1")
    const qLen = parseInt(fields[1], 10)
    const qStart = parseInt(fields[2], 10)
    const qEnd = parseInt(fields[3], 10)
    // fields[4] = strand
    const tName = fields[5] // genome/contig name
    const tStart = parseInt(fields[7], 10)
    const tEnd = parseInt(fields[8], 10)
    const nMatch = parseInt(fields[9], 10)
    const blockLen = parseInt(fields[10], 10)

    if (isNaN(nMatch) || isNaN(blockLen) || blockLen === 0) continue

    // Identity as percentage (0–100) to match LASTZ format
    const identity = (nMatch / blockLen) * 100

    hits.push({
      targetName: qName, // allele name (callAllele looks this up)
      queryName: tName, // genome name
      identity,
      alignmentLength: qEnd - qStart, // aligned span on allele
      targetStart: qStart,
      targetEnd: qEnd,
      queryStart: tStart,
      queryEnd: tEnd,
      targetLength: qLen, // full allele length
    })
  }

  return hits
}

/**
 * Run MLST analysis for a single FASTA file against a scheme.
 * Uses a single minimap2 call with all alleles from all loci.
 */
async function analyzeFile(
  fasta: ParsedFasta,
  schemeData: SchemeData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cli: any,
  alleleLengths: Record<string, number>,
  onProgress: ProgressCallback,
): Promise<MLSTResult> {
  const loci = schemeData.scheme.loci
  onProgress(`${fasta.filename}: aligning...`, 0)

  // Run minimap2: alleles (query) mapped against genome (target)
  // -c enables base-level alignment for accurate identity
  // Genome and alleles are already mounted by the caller
  const pafText = await cli.exec(
    'minimap2 -c genome.fasta alleles.fasta',
  )

  // Parse PAF output
  const allHits = parsePAF(pafText)

  // Group hits by locus and call alleles
  const locusResults = loci.map((locus, li) => {
    onProgress(
      `${fasta.filename}: ${locus} (${li + 1}/${loci.length})`,
      ((li + 1) / loci.length) * 100,
    )

    const locusPrefix = locus + '_'
    const locusHits = allHits.filter((h) =>
      h.targetName.startsWith(locusPrefix),
    )
    return callAllele(locus, locusHits, alleleLengths)
  })

  onProgress(`${fasta.filename}: calling ST`, 100)
  return callST(
    fasta.filename,
    schemeData.scheme.name,
    locusResults,
    schemeData.profiles,
  )
}

/**
 * Main entry point: run MLST analysis on multiple files.
 * Uses minimap2 via Aioli — a single minimap2 call per genome
 * maps all alleles from all loci simultaneously.
 */
export async function runMLST(
  files: ParsedFasta[],
  schemeData: SchemeData,
  onProgress: ProgressCallback,
): Promise<MLSTResult[]> {
  onProgress('Initializing minimap2...', 0)

  // Initialize Aioli with minimap2
  const cli = await new Aioli(['minimap2/2.22'])

  // Concatenate all allele FASTAs and build length map
  const alleleFastaChunks: string[] = []
  const alleleLengths: Record<string, number> = {}

  for (const locus of schemeData.scheme.loci) {
    const locusFasta = schemeData.alleleFastas[locus]
    if (!locusFasta) continue

    alleleFastaChunks.push(locusFasta)
    const contigs = parseFastaString(locusFasta)
    for (const c of contigs) {
      alleleLengths[c.name] = c.sequence.length
    }
  }

  const allAllelesFasta = alleleFastaChunks.join('\n')

  // Mount alleles file (shared across all genome files)
  await cli.mount({ name: 'alleles.fasta', data: allAllelesFasta })

  const results: MLSTResult[] = []

  for (let i = 0; i < files.length; i++) {
    const fasta = files[i]
    const fileProgress = (msg: string, pct: number) => {
      const overallPct = ((i + pct / 100) / files.length) * 100
      onProgress(msg, overallPct)
    }

    // Mount genome for this file
    const genomeFasta = mergeContigsToFasta(fasta.filename, fasta.contigs)
    await cli.mount({ name: 'genome.fasta', data: genomeFasta })

    const result = await analyzeFile(
      fasta,
      schemeData,
      cli,
      alleleLengths,
      fileProgress,
    )
    results.push(result)
  }

  onProgress('Complete', 100)
  return results
}
