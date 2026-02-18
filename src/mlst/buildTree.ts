import type { MLSTResult, SchemeData } from './types'
import { parseFastaString } from './parseFasta'

// Aioli is loaded globally via CDN script tag in index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Aioli: any

type ProgressCallback = (message: string, pct: number) => void
type LogCallback = (message: string) => void

export interface TreeResult {
  newick: string
  alignment: string
}

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
 * Extract stdout from an Aioli exec result.
 * With printInterleaved: false, exec returns { stdout, stderr }.
 * With printInterleaved: true (default), exec returns a string.
 */
function getStdout(result: unknown): string {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'stdout' in result) {
    return (result as { stdout: string }).stdout
  }
  return String(result)
}

// mafft E-INS-i mode parameters (from biowasm docs)
const TBFAST_PARAMS =
  '_ -u 0.0 -l 2.7 -C 0 -b 62 -g 0.0 -f -2.00 -Q 100.0 -h 0.0 -O -6.00 -E -0.000 -N -Z _ -+ 16 -W 0.00001 -V -1.53 -s 0.0 -O -C 0 -b 62 -f -1.53 -Q 100.0 -h 0.000 -l 2.7 -X 0.1'
const DVTDITR_PARAMS =
  '-W 0.00001 -E 0.0 -s 0.0 -C 0 -t 0 -F -l 2.7 -z 50 -b 62 -f -1.53 -Q 100.0 -h 0.000 -I 16 -X 0.1 -p BAATARI2 -K 0'

/**
 * Build a phylogenetic tree from MLST results.
 *
 * Pipeline:
 * 1. Extract allele sequences for each genome per locus
 * 2. Run mafft (tbfast + dvtditr) per locus for multiple sequence alignment
 * 3. Concatenate per-locus alignments into a super-alignment
 * 4. Run FastTree on the concatenated alignment
 * 5. Return the Newick tree string
 */
export async function buildTree(
  results: MLSTResult[],
  schemeData: SchemeData,
  onProgress: ProgressCallback,
  onLog?: LogCallback,
): Promise<TreeResult> {
  if (results.length < 2) {
    throw new Error('Need at least 2 genomes to build a tree')
  }

  const loci = schemeData.scheme.loci
  const filenames = results.map((r) => r.filename)
  const mafftVersion = '7.520'

  const log = (msg: string) => onLog?.(msg)

  log('Starting tree building pipeline')
  log(`Genomes: ${results.length}, Loci: ${loci.length}`)

  onProgress('Initializing mafft and FastTree...', 0)
  log('Loading biowasm modules: mafft (tbfast, dvtditr), fasttree, coreutils/cat')
  const cli = await new Aioli(
    [
      'coreutils/cat/8.32',
      {
        tool: 'mafft',
        version: mafftVersion,
        program: 'tbfast',
        reinit: false,
      },
      {
        tool: 'mafft',
        version: mafftVersion,
        program: 'dvtditr',
        reinit: false,
      },
      'fasttree/2.1.11',
    ],
    { printInterleaved: false },
  )
  log('Aioli initialized successfully')

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

    // Mount input and run mafft alignment (E-INS-i mode)
    const inputName = `locus_${locus}.fasta`
    await cli.mount({ name: inputName, data: inputFasta })

    // Clean up /shared/data/pre from previous locus run
    try {
      await cli.fs('unlink', '/shared/data/pre')
    } catch {
      // File may not exist on first run — that's fine
    }

    // tbfast: initial alignment → writes to /shared/data/pre
    log(`[${locus}] Running tbfast...`)
    const tbResult = await cli.exec(`tbfast ${TBFAST_PARAMS} -i ${inputName}`)
    const tbStderr = typeof tbResult === 'object' && tbResult.stderr ? tbResult.stderr : ''
    if (tbStderr) log(`[${locus}] tbfast stderr: ${tbStderr.slice(0, 200)}`)

    // dvtditr: iterative refinement → reads/writes /shared/data/pre
    log(`[${locus}] Running dvtditr (iterative refinement)...`)
    const dvResult = await cli.exec(`dvtditr ${DVTDITR_PARAMS} -i /shared/data/pre`)
    const dvStderr = typeof dvResult === 'object' && dvResult.stderr ? dvResult.stderr : ''
    if (dvStderr) log(`[${locus}] dvtditr stderr: ${dvStderr.slice(0, 200)}`)

    // Read aligned output
    log(`[${locus}] Reading aligned output...`)
    const alignedFasta = getStdout(await cli.exec('cat /shared/data/pre'))

    // Parse the aligned output
    const alignedContigs = parseFastaString(alignedFasta)
    log(`[${locus}] Aligned ${alignedContigs.length} sequences (length: ${alignedContigs[0]?.sequence.length ?? 0})`)
    alignedPerLocus[locus] = {}
    for (const contig of alignedContigs) {
      alignedPerLocus[locus][contig.name] = contig.sequence
    }
  }

  // Concatenate per-locus alignments
  onProgress('Concatenating alignments...', 75)
  log('Concatenating per-locus alignments into super-alignment')
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
  const totalLen = concatLines[1]?.length ?? 0
  log(`Concatenated alignment: ${filenames.length} sequences x ${totalLen} bp`)

  // Run FastTree
  onProgress('Building phylogenetic tree...', 80)
  log('Running FastTree (-nt) on concatenated alignment...')
  await cli.mount({ name: 'concat.fasta', data: concatenatedFasta })
  const ftResult = await cli.exec('fasttree -nt concat.fasta')
  const newick = getStdout(ftResult)
  log(`FastTree complete. Newick length: ${newick.trim().length} chars`)

  onProgress('Tree complete', 100)
  log('Pipeline finished successfully')
  return { newick: newick.trim(), alignment: concatenatedFasta }
}
