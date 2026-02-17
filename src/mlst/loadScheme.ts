import type { SchemeData, MLSTScheme, STProfile } from './types'

/**
 * Fetch the list of available MLST schemes.
 */
export async function fetchSchemeList(): Promise<string[]> {
  const res = await fetch('/db/schemes.json')
  if (!res.ok) throw new Error('Failed to load scheme list')
  return res.json()
}

/**
 * Load full scheme data for a given scheme name.
 * Downloads scheme.json, profiles.json, and all locus FASTA files.
 */
export async function loadSchemeData(schemeName: string): Promise<SchemeData> {
  const base = `/db/${schemeName}`

  const [schemeRes, profilesRes] = await Promise.all([
    fetch(`${base}/scheme.json`),
    fetch(`${base}/profiles.json`),
  ])

  if (!schemeRes.ok) throw new Error(`Failed to load scheme: ${schemeName}`)
  if (!profilesRes.ok) throw new Error(`Failed to load profiles: ${schemeName}`)

  const scheme: MLSTScheme = await schemeRes.json()
  const profiles: STProfile[] = await profilesRes.json()

  // Load allele FASTAs in parallel
  const alleleFastas: Record<string, string> = {}
  const fastaPromises = scheme.loci.map(async (locus) => {
    const res = await fetch(`${base}/${locus}.fasta`)
    if (!res.ok) {
      console.warn(`Failed to load alleles for locus: ${locus}`)
      return
    }
    alleleFastas[locus] = await res.text()
  })

  await Promise.all(fastaPromises)

  return { scheme, profiles, alleleFastas }
}
