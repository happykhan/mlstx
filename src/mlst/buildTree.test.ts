import { describe, it, expect } from 'vitest'
import { getSequenceForAllele, computeMedianLengths } from './buildTree'

const mockAlleleFastas: Record<string, string> = {
  aroC: [
    '>aroC_1',
    'ATCGATCGATCG',
    '>aroC_2',
    'ATCGATCGATCC',
    '>aroC_5',
    'GGGGCCCCAAAA',
  ].join('\n'),
  dnaN: ['>dnaN_1', 'AAAAAA', '>dnaN_3', 'CCCCCC'].join('\n'),
}

describe('computeMedianLengths', () => {
  it('returns median length for loci with alleles', () => {
    const result = computeMedianLengths(['aroC', 'dnaN'], mockAlleleFastas)
    expect(result.aroC).toBe(12)
    expect(result.dnaN).toBe(6)
  })

  it('returns 400 for missing locus', () => {
    const result = computeMedianLengths(['missing'], mockAlleleFastas)
    expect(result.missing).toBe(400)
  })

  it('returns 400 for empty FASTA', () => {
    const result = computeMedianLengths(['empty'], { empty: '' })
    expect(result.empty).toBe(400)
  })
})

describe('getSequenceForAllele', () => {
  const medianLengths = { aroC: 12, dnaN: 6 }

  it('returns exact allele sequence', () => {
    const seq = getSequenceForAllele(
      'aroC',
      '5',
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('GGGGCCCCAAAA')
  })

  it('returns N-gaps for no_hit', () => {
    const seq = getSequenceForAllele(
      'aroC',
      'no_hit',
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('N'.repeat(12))
  })

  it('returns N-gaps for novel', () => {
    const seq = getSequenceForAllele(
      'dnaN',
      'novel',
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('N'.repeat(6))
  })

  it('returns N-gaps for undefined allele', () => {
    const seq = getSequenceForAllele(
      'aroC',
      undefined,
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('N'.repeat(12))
  })

  it('returns N-gaps when allele number not found', () => {
    const seq = getSequenceForAllele(
      'aroC',
      '999',
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('N'.repeat(12))
  })

  it('returns N-gaps when locus FASTA missing', () => {
    const seq = getSequenceForAllele(
      'missing',
      '1',
      mockAlleleFastas,
      medianLengths,
    )
    expect(seq).toBe('N'.repeat(400))
  })
})
