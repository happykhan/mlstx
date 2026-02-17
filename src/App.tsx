import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { SchemeSelector } from './components/SchemeSelector'
import { ResultsTable, exportCSV } from './components/ResultsTable'
import { AboutPage } from './components/AboutPage'
import { fetchSchemeList, loadSchemeData } from './mlst/loadScheme'
import { parseFastaFile } from './mlst/parseFasta'
import { runMLST } from './mlst/align'
import type { MLSTResult } from './mlst/types'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'mlst' | 'about'

function App() {
  const [schemes, setSchemes] = useState<string[]>([])
  const [schemesLoading, setSchemesLoading] = useState(true)
  const [selectedScheme, setSelectedScheme] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [results, setResults] = useState<MLSTResult[]>([])
  const [loci, setLoci] = useState<string[]>([])
  const [error, setError] = useState('')

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('mlstx-theme') as Theme) || 'light'
  })

  const [currentView, setCurrentView] = useState<View>('mlst')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mlstx-theme', theme)
  }, [theme])

  useEffect(() => {
    fetchSchemeList()
      .then((list) => {
        setSchemes(list)
        setSchemesLoading(false)
      })
      .catch((err) => {
        setError(`Failed to load schemes: ${err.message}`)
        setSchemesLoading(false)
      })
  }, [])

  const handleRun = useCallback(async () => {
    if (files.length === 0 || !selectedScheme) return

    setRunning(true)
    setError('')
    setResults([])
    setProgress('Loading scheme data...')
    setProgressPct(0)

    try {
      const schemeData = await loadSchemeData(selectedScheme)
      setLoci(schemeData.scheme.loci)

      setProgress('Parsing FASTA files...')
      const parsedFiles = await Promise.all(files.map(parseFastaFile))

      const mlstResults = await runMLST(
        parsedFiles,
        schemeData,
        (msg, pct) => {
          setProgress(msg)
          setProgressPct(pct)
        },
      )

      setResults(mlstResults)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [files, selectedScheme])

  const canRun = files.length > 0 && selectedScheme !== '' && !running

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>mlstx</h1>
          <button
            className="theme-toggle"
            onClick={() =>
              setTheme((t) => (t === 'light' ? 'dark' : 'light'))
            }
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <p className="subtitle">Browser-based MLST Typing</p>
        <nav className="tab-bar">
          <button
            className={`tab ${currentView === 'mlst' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('mlst')}
          >
            Analysis
          </button>
          <button
            className={`tab ${currentView === 'about' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('about')}
          >
            About
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'mlst' ? (
          <>
            <section className="controls">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                disabled={running}
              />
              <SchemeSelector
                schemes={schemes}
                selected={selectedScheme}
                onSelect={setSelectedScheme}
                disabled={running}
                loading={schemesLoading}
              />
              <button
                className="run-button"
                onClick={handleRun}
                disabled={!canRun}
              >
                {running ? 'Running...' : 'Run MLST'}
              </button>
            </section>

            {running && (
              <section className="progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="progress-text">{progress}</p>
              </section>
            )}

            {error && (
              <section className="error">
                <p>{error}</p>
              </section>
            )}

            {results.length > 0 && (
              <section className="results">
                <div className="results-header">
                  <h2>Results</h2>
                  <button
                    className="export-button"
                    onClick={() => exportCSV(results, loci)}
                  >
                    Export CSV
                  </button>
                </div>
                <ResultsTable results={results} loci={loci} />
              </section>
            )}
          </>
        ) : (
          <AboutPage />
        )}
      </main>

      <footer className="app-footer">
        <a
          href="https://www.happykhan.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nabil-Fareed Alikhan
        </a>
      </footer>
    </div>
  )
}

export default App
