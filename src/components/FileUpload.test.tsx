import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileUpload } from './FileUpload'

describe('FileUpload', () => {
  it('renders drop zone prompt when no files selected', () => {
    render(
      <FileUpload files={[]} onFilesChange={() => {}} disabled={false} />,
    )
    expect(
      screen.getByText(/Drop FASTA files here or click to browse/),
    ).toBeInTheDocument()
  })

  it('shows file count when files are selected', () => {
    const files = [new File([''], 'test.fasta')] as File[]
    render(
      <FileUpload files={files} onFilesChange={() => {}} disabled={false} />,
    )
    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()
  })

  it('lists selected filenames', () => {
    const files = [
      new File([''], 'genome1.fasta'),
      new File([''], 'genome2.fasta'),
    ] as File[]
    render(
      <FileUpload files={files} onFilesChange={() => {}} disabled={false} />,
    )
    expect(screen.getByText('genome1.fasta')).toBeInTheDocument()
    expect(screen.getByText('genome2.fasta')).toBeInTheDocument()
  })

  it('disables file input when disabled', () => {
    render(
      <FileUpload files={[]} onFilesChange={() => {}} disabled={true} />,
    )
    expect(screen.getByLabelText('Upload FASTA genome files')).toBeDisabled()
  })

  it('has accessible file input label', () => {
    render(
      <FileUpload files={[]} onFilesChange={() => {}} disabled={false} />,
    )
    expect(
      screen.getByLabelText('Upload FASTA genome files'),
    ).toBeInTheDocument()
  })
})
