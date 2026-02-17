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
        <p>
          No data leaves your machine — all processing happens client-side. Upload
          your genome assemblies, select an MLST scheme, and get sequence type
          assignments in seconds.
        </p>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance,
          University of Oxford
        </p>
        <p>
          Nabil-Fareed Alikhan works with David Aanensen at the Centre for Genomic
          Pathogen Surveillance. He previously served as Interim Head of Informatics
          at the Quadram Institute Bioscience and held a Senior Research Fellow
          position with Mark Achtman at the University of Warwick. He holds a PhD
          (2015) from the University of Queensland, supervised by Scott Beatson,
          along with dual undergraduate degrees in Information Technology and
          Science (2008).
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
