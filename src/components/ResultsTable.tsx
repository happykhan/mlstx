import type { MLSTResult } from '../mlst/types'

interface ResultsTableProps {
  results: MLSTResult[]
  loci: string[]
}

export function ResultsTable({ results, loci }: ResultsTableProps) {
  if (results.length === 0) return null

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>File</th>
            <th>ST</th>
            {loci.map((l) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.filename}>
              <td>{r.filename}</td>
              <td className={`st-cell st-${classifyResult(r.st)}`}>{r.st}</td>
              {loci.map((l) => (
                <td
                  key={l}
                  className={`allele-cell allele-${classifyResult(r.alleles[l])}`}
                >
                  {r.alleles[l] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function classifyResult(val: string | undefined): string {
  if (!val) return 'missing'
  if (val === 'no_hit' || val === 'incomplete') return 'nohit'
  if (val === 'novel') return 'novel'
  return 'exact'
}

export function exportCSV(results: MLSTResult[], loci: string[]): void {
  const header = ['File', 'ST', ...loci].join(',')
  const rows = results.map((r) => {
    const alleleValues = loci.map((l) => r.alleles[l] ?? '-')
    return [r.filename, r.st, ...alleleValues].join(',')
  })
  const csv = [header, ...rows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mlst_results.csv'
  a.click()
  URL.revokeObjectURL(url)
}
