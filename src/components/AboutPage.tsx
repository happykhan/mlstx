export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About mlstx</h2>
        <p>
          mlstx is a browser-based Multi-Locus Sequence Typing (MLST) tool. It
          uses minimap2 compiled to WebAssembly via{' '}
          <a href="https://biowasm.com" target="_blank" rel="noopener noreferrer">
            Aioli/biowasm
          </a>{' '}
          to align alleles against bacterial genomes entirely in your browser.
        </p>
        <div className="privacy-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens client-side.
            Upload your genome assemblies, select an MLST scheme, and get
            sequence type assignments in seconds.
          </p>
        </div>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance,
          University of Oxford
        </p>
        <p>
          Bioinformatics researcher and software developer specialising in microbial genomics. I build widely used open-source tools, publish peer-reviewed research, and co-host the MicroBinfie podcast. My work is recognised across the bacterial genomics community for its focus on practical, open science.
        </p>
        <div className="about-links">
          <a
            href="https://www.happykhan.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            happykhan.com
          </a>
          <a
            href="https://orcid.org/0000-0002-1243-0767"
            target="_blank"
            rel="noopener noreferrer"
          >
            ORCID: 0000-0002-1243-0767
          </a>
          <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
          <a
            href="https://twitter.com/happy_khan"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter: @happy_khan
          </a>
          <a
            href="https://mstdn.science/@happykhan"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mastodon: @happykhan@mstdn.science
          </a>
        </div>
      </section>
    </div>
  )
}
