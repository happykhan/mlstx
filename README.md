# mlstx

Browser-based Multi-Locus Sequence Typing (MLST) — no server required.

mlstx runs [minimap2](https://github.com/lh3/minimap2) compiled to WebAssembly via [Aioli/biowasm](https://biowasm.com) to type bacterial genomes entirely in your browser. No data leaves your machine.

**Live demo:** [mlstx.vercel.app](https://mlstx.vercel.app)

## Features

- Upload genome assemblies (FASTA, gzipped FASTA) and get sequence types in seconds
- Supports multiple MLST schemes: *E. coli*, *Salmonella*, *S. aureus*, and more
- All processing happens client-side — your data stays private
- Dark/light mode
- Export results as CSV

## Supported schemes

| Scheme | Loci |
|--------|------|
| ecoli | dinB, icdA, pabB, polB, putP, trpA, trpB, uidA |
| ecoli_achtman_4 | adk, fumC, gyrB, icd, mdh, purA, recA |
| salmonella | aroC, dnaN, hemD, hisD, purE, sucA, thrA |
| saureus | arcC, aroE, glpF, gmk, pta, tpi, yqiL |

Allele databases are sourced from [tseemann/mlst](https://github.com/tseemann/mlst) (PubMLST).

## Development

```bash
npm install
npm run dev
```

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
```

### Update MLST databases

Fetches the latest allele databases from PubMLST via [tseemann/mlst](https://github.com/tseemann/mlst):

```bash
npm run fetch-db              # all schemes
npm run fetch-db -- ecoli     # single scheme
```

## Benchmarking

A Python benchmark script validates that the minimap2-based approach produces the same results as [Seemann's mlst](https://github.com/tseemann/mlst) CLI tool.

Requires [pixi](https://pixi.sh):

```bash
pixi install
pixi run python scripts/benchmark.py
pixi run python scripts/benchmark.py --input-dir test_data --scheme salmonella
```

## How it works

1. The genome assembly is loaded and all contigs are merged into a single sequence
2. All allele sequences for every locus in the selected scheme are mapped against the genome in a single `minimap2 -c` call via WebAssembly
3. PAF output is parsed and the best hit per locus is selected using 90% identity and 90% coverage thresholds
4. Exact matches (100% identity, full coverage) are assigned allele numbers; the allele combination is looked up in the ST profiles database

## Deploy

```bash
npx vercel --prod
```

## Author

[Nabil-Fareed Alikhan](https://www.happykhan.com) — Centre for Genomic Pathogen Surveillance, University of Oxford
