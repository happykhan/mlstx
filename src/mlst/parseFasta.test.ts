import { describe, it, expect } from 'vitest'
import { parseFastaString } from './parseFasta'

describe('parseFastaString', () => {
  it('returns empty array for empty input', () => {
    expect(parseFastaString('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseFastaString('  \n  \n  ')).toEqual([])
  })

  it('parses a single contig', () => {
    const result = parseFastaString('>seq1\nATCG\nGGCC\n')
    expect(result).toEqual([{ name: 'seq1', sequence: 'ATCGGGCC' }])
  })

  it('parses multiple contigs', () => {
    const result = parseFastaString('>seq1\nATCG\n>seq2\nGGCC\n')
    expect(result).toEqual([
      { name: 'seq1', sequence: 'ATCG' },
      { name: 'seq2', sequence: 'GGCC' },
    ])
  })

  it('uppercases sequences', () => {
    const result = parseFastaString('>seq1\natcg\n')
    expect(result[0].sequence).toBe('ATCG')
  })

  it('handles headers with descriptions (takes first token)', () => {
    const result = parseFastaString('>seq1 some description here\nATCG\n')
    expect(result[0].name).toBe('seq1')
  })

  it('handles multi-line sequences', () => {
    const result = parseFastaString('>seq1\nATCG\nTTAA\nGGCC\n')
    expect(result[0].sequence).toBe('ATCGTTAAGGCC')
  })

  it('handles input without trailing newline', () => {
    const result = parseFastaString('>seq1\nATCG')
    expect(result).toEqual([{ name: 'seq1', sequence: 'ATCG' }])
  })

  it('skips blank lines between sequences', () => {
    const result = parseFastaString('>seq1\nATCG\n\n>seq2\nGGCC\n')
    expect(result).toHaveLength(2)
  })
})
