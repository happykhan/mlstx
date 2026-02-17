import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutPage } from './AboutPage'

describe('AboutPage', () => {
  it('renders about mlstx section', () => {
    render(<AboutPage />)
    expect(screen.getByText('About mlstx')).toBeInTheDocument()
  })

  it('renders author name', () => {
    render(<AboutPage />)
    expect(screen.getByText('Nabil-Fareed Alikhan')).toBeInTheDocument()
  })

  it('renders author role', () => {
    render(<AboutPage />)
    expect(
      screen.getByText(/Senior Bioinformatician, Centre for Genomic Pathogen Surveillance/),
    ).toBeInTheDocument()
  })

  it('renders contact links', () => {
    render(<AboutPage />)
    expect(screen.getByText('happykhan.com')).toBeInTheDocument()
    expect(screen.getByText('nabil@happykhan.com')).toBeInTheDocument()
    expect(screen.getByText(/ORCID/)).toBeInTheDocument()
  })

  it('renders privacy statement', () => {
    render(<AboutPage />)
    expect(
      screen.getByText(/No data leaves your machine/),
    ).toBeInTheDocument()
  })

  it('has external links with noopener', () => {
    render(<AboutPage />)
    const externalLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('target') === '_blank')
    for (const link of externalLinks) {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })
})
