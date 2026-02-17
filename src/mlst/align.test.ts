import { describe, it, expect } from 'vitest'
import { parsePAF } from './align'

describe('parsePAF', () => {
  it('returns empty array for empty input', () => {
    expect(parsePAF('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parsePAF('  \n  ')).toEqual([])
  })

  it('parses a single PAF line correctly', () => {
    // PAF: qName qLen qStart qEnd strand tName tLen tStart tEnd nMatch blockLen mapQ
    const line = 'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t501\t501\t60'
    const hits = parsePAF(line)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toEqual({
      targetName: 'aroC_1', // mapped from PAF query (allele name)
      queryName: 'genome', // mapped from PAF target (genome name)
      identity: 100, // 501/501 * 100
      alignmentLength: 501, // qEnd - qStart
      targetStart: 0,
      targetEnd: 501,
      queryStart: 100,
      queryEnd: 601,
      targetLength: 501, // qLen (allele full length)
    })
  })

  it('calculates identity correctly', () => {
    const line = 'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t450\t501\t60'
    const hits = parsePAF(line)
    expect(hits[0].identity).toBeCloseTo(89.82, 1) // 450/501 * 100
  })

  it('calculates alignment length from query span', () => {
    const line = 'aroC_1\t501\t10\t490\t+\tgenome\t5000000\t100\t580\t480\t480\t60'
    const hits = parsePAF(line)
    expect(hits[0].alignmentLength).toBe(480) // 490 - 10
  })

  it('parses multiple PAF lines', () => {
    const lines = [
      'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t501\t501\t60',
      'dnaN_3\t477\t0\t477\t+\tgenome\t5000000\t2000\t2477\t477\t477\t60',
    ].join('\n')
    const hits = parsePAF(lines)
    expect(hits).toHaveLength(2)
    expect(hits[0].targetName).toBe('aroC_1')
    expect(hits[1].targetName).toBe('dnaN_3')
  })

  it('skips lines with fewer than 12 fields', () => {
    const lines = 'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t501\t501'
    const hits = parsePAF(lines)
    expect(hits).toHaveLength(0)
  })

  it('skips lines with invalid numeric fields', () => {
    const line = 'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\tNA\t501\t60'
    const hits = parsePAF(line)
    expect(hits).toHaveLength(0)
  })

  it('skips lines with zero blockLen', () => {
    const line = 'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t0\t0\t60'
    const hits = parsePAF(line)
    expect(hits).toHaveLength(0)
  })

  it('handles PAF lines with extra tags after column 12', () => {
    const line =
      'aroC_1\t501\t0\t501\t+\tgenome\t5000000\t100\t601\t501\t501\t60\ttp:A:P\tcm:i:50\tNM:i:0'
    const hits = parsePAF(line)
    expect(hits).toHaveLength(1)
    expect(hits[0].identity).toBe(100)
  })
})
