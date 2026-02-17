/** A single contig from a parsed FASTA file */
export interface Contig {
  name: string
  sequence: string
}

/** A parsed FASTA file with its contigs */
export interface ParsedFasta {
  filename: string
  contigs: Contig[]
}

/** Alignment hit from LASTZ output */
export interface AlignmentHit {
  queryName: string
  targetName: string
  identity: number
  alignmentLength: number
  queryStart: number
  queryEnd: number
  targetStart: number
  targetEnd: number
  targetLength: number
}

/** Best hit result for a single locus */
export interface LocusResult {
  locus: string
  allele: string // allele number, "novel", or "no_hit"
  identity: number
  coverage: number
  bestHit: AlignmentHit | null
}

/** MLST result for a single input file */
export interface MLSTResult {
  filename: string
  scheme: string
  st: string
  alleles: Record<string, string>
}

/** An MLST scheme definition */
export interface MLSTScheme {
  name: string
  loci: string[]
}

/** Profile entry mapping allele combination to ST */
export interface STProfile {
  st: string
  alleles: Record<string, string>
}

/** Scheme data stored in public/db/<scheme>/ */
export interface SchemeData {
  scheme: MLSTScheme
  profiles: STProfile[]
  /** Map from locus name to FASTA content (all alleles for that locus) */
  alleleFastas: Record<string, string>
}

