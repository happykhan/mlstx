/**
 * fetch_pubmlst.ts
 *
 * Downloads MLST scheme data from tseemann/mlst GitHub repo and converts
 * it into the normalized format used by mlstx.
 *
 * Output structure per scheme:
 *   public/db/<scheme>/scheme.json   — { name, loci }
 *   public/db/<scheme>/profiles.json — [{ st, alleles }]
 *   public/db/<scheme>/<locus>.fasta — allele sequences
 *
 * Also outputs:
 *   public/db/schemes.json — list of available scheme names
 *
 * Usage:
 *   npx tsx scripts/fetch_pubmlst.ts
 *   npx tsx scripts/fetch_pubmlst.ts ecoli    # fetch only ecoli
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_URL = 'https://github.com/tseemann/mlst.git'
const CLONE_DIR = '/tmp/mlst-repo'
const DB_SRC = path.join(CLONE_DIR, 'db', 'pubmlst')
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'db')

function cloneRepo() {
  if (fs.existsSync(CLONE_DIR)) {
    console.log('Repo already cloned, pulling latest...')
    execSync('git pull', { cwd: CLONE_DIR, stdio: 'inherit' })
  } else {
    console.log('Cloning mlst repo...')
    execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, {
      stdio: 'inherit',
    })
  }
}

function parseProfiles(
  profilePath: string,
  loci: string[],
): Array<{ st: string; alleles: Record<string, string> }> {
  const text = fs.readFileSync(profilePath, 'utf-8')
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split('\t')
  // First column is ST, then loci columns, possibly followed by other columns
  const lociIndices: Record<string, number> = {}
  for (const locus of loci) {
    const idx = header.indexOf(locus)
    if (idx >= 0) lociIndices[locus] = idx
  }

  const profiles: Array<{ st: string; alleles: Record<string, string> }> = []
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split('\t')
    if (!fields[0]) continue

    const alleles: Record<string, string> = {}
    for (const locus of loci) {
      const idx = lociIndices[locus]
      alleles[locus] = idx !== undefined ? fields[idx] : ''
    }

    profiles.push({ st: fields[0], alleles })
  }

  return profiles
}

function processScheme(schemeName: string) {
  const schemeDir = path.join(DB_SRC, schemeName)
  if (!fs.statSync(schemeDir).isDirectory()) return false

  // Find FASTA files (loci) and profile
  const files = fs.readdirSync(schemeDir)
  const fastaFiles = files.filter(
    (f) => f.endsWith('.tfa') || f.endsWith('.fasta'),
  )
  const profileFile = files.find((f) => f.endsWith('.tsv') || f === schemeName + '.txt')

  if (fastaFiles.length === 0) {
    console.log(`  Skipping ${schemeName}: no allele FASTA files found`)
    return false
  }

  // Derive loci names from FASTA filenames
  const loci = fastaFiles.map((f) => f.replace(/\.(tfa|fasta)$/, ''))

  const outDir = path.join(OUTPUT_DIR, schemeName)
  fs.mkdirSync(outDir, { recursive: true })

  // Write scheme.json
  fs.writeFileSync(
    path.join(outDir, 'scheme.json'),
    JSON.stringify({ name: schemeName, loci }, null, 2),
  )

  // Copy allele FASTA files
  for (const ff of fastaFiles) {
    const locusName = ff.replace(/\.(tfa|fasta)$/, '')
    const src = path.join(schemeDir, ff)
    const dst = path.join(outDir, locusName + '.fasta')
    fs.copyFileSync(src, dst)
  }

  // Parse and write profiles
  if (profileFile) {
    const profiles = parseProfiles(path.join(schemeDir, profileFile), loci)
    fs.writeFileSync(
      path.join(outDir, 'profiles.json'),
      JSON.stringify(profiles),
    )
    console.log(
      `  ${schemeName}: ${loci.length} loci, ${profiles.length} profiles`,
    )
  } else {
    fs.writeFileSync(path.join(outDir, 'profiles.json'), '[]')
    console.log(`  ${schemeName}: ${loci.length} loci, no profiles file found`)
  }

  return true
}

function main() {
  const filterScheme = process.argv[2]

  cloneRepo()

  if (!fs.existsSync(DB_SRC)) {
    console.error(`ERROR: ${DB_SRC} not found. Repo structure may have changed.`)
    process.exit(1)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const schemeNames = fs.readdirSync(DB_SRC).filter((d) => {
    const fullPath = path.join(DB_SRC, d)
    return fs.statSync(fullPath).isDirectory()
  })

  const processed: string[] = []

  for (const name of schemeNames) {
    if (filterScheme && name !== filterScheme) continue
    console.log(`Processing: ${name}`)
    if (processScheme(name)) {
      processed.push(name)
    }
  }

  // Write schemes list (merge with existing if filtering)
  let allSchemes = new Set(processed)
  const schemesPath = path.join(OUTPUT_DIR, 'schemes.json')
  if (filterScheme && fs.existsSync(schemesPath)) {
    const existing: string[] = JSON.parse(fs.readFileSync(schemesPath, 'utf-8'))
    for (const s of existing) allSchemes.add(s)
  }
  const sortedSchemes = [...allSchemes].sort()
  fs.writeFileSync(schemesPath, JSON.stringify(sortedSchemes, null, 2))

  console.log(`\nDone. ${processed.length} schemes written to ${OUTPUT_DIR}`)
}

main()
