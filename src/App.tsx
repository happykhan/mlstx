import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { SchemeSelector } from './components/SchemeSelector'
import { ResultsTable, exportCSV } from './components/ResultsTable'
import { AboutPage } from './components/AboutPage'
import { fetchSchemeList, loadSchemeData } from './mlst/loadScheme'
import { parseFastaFile } from './mlst/parseFasta'
import { runMLST } from './mlst/align'
import { buildTree } from './mlst/buildTree'
import { PhyloTree } from './components/PhyloTree'
import { LogConsole } from './components/LogConsole'
import type { MLSTResult, SchemeData } from './mlst/types'
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
  const [schemeData, setSchemeData] = useState<SchemeData | null>(null)
  const [error, setError] = useState('')

  // Tree state
  const [newick, setNewick] = useState('')
  const [alignment, setAlignment] = useState('')
  const [treeBuilding, setTreeBuilding] = useState(false)
  const [treeProgress, setTreeProgress] = useState('')
  const [treeProgressPct, setTreeProgressPct] = useState(0)
  const [treeError, setTreeError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])

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
    setNewick('')
    setAlignment('')
    setTreeError('')
    setLogLines([])
    setProgress('Loading scheme data...')
    setProgressPct(0)

    try {
      const data = await loadSchemeData(selectedScheme)
      setSchemeData(data)
      setLoci(data.scheme.loci)

      setProgress('Parsing FASTA files...')
      const parsedFiles = await Promise.all(files.map(parseFastaFile))

      const mlstResults = await runMLST(
        parsedFiles,
        data,
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

  const handleBuildTree = useCallback(async () => {
    if (!schemeData || results.length < 2) return

    setTreeBuilding(true)
    setTreeError('')
    setNewick('')
    setAlignment('')
    setLogLines([])

    try {
      const result = await buildTree(
        results,
        schemeData,
        (msg, pct) => {
          setTreeProgress(msg)
          setTreeProgressPct(pct)
        },
        (msg) => {
          setLogLines((prev) => [...prev, msg])
        },
      )
      setNewick(result.newick)
      setAlignment(result.alignment)
      setTreeProgress('')
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : String(err))
    } finally {
      setTreeBuilding(false)
    }
  }, [results, schemeData])

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
            <div className="controls">
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
            </div>

            {running && (
              <section className="progress" aria-live="polite">
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={Math.round(progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="MLST analysis progress"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="progress-text">{progress}</p>
              </section>
            )}

            {error && (
              <section className="error" role="alert">
                <p>{error}</p>
              </section>
            )}

            {results.length > 0 && (
              <section className="results">
                <div className="results-header">
                  <h2>Results</h2>
                  <div className="results-actions">
                    <button
                      className="export-button"
                      onClick={() => exportCSV(results, loci)}
                    >
                      Export CSV
                    </button>
                    {results.length >= 2 && (
                      <button
                        className="tree-button"
                        onClick={handleBuildTree}
                        disabled={treeBuilding}
                      >
                        {treeBuilding ? 'Building...' : 'Build Tree'}
                      </button>
                    )}
                  </div>
                </div>
                <ResultsTable results={results} loci={loci} />
              </section>
            )}

            {treeBuilding && (
              <section className="progress" aria-live="polite">
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={Math.round(treeProgressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Tree building progress"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${treeProgressPct}%` }}
                  />
                </div>
                <p className="progress-text">{treeProgress}</p>
              </section>
            )}

            {treeError && (
              <section className="error" role="alert">
                <p>{treeError}</p>
              </section>
            )}

            {logLines.length > 0 && <LogConsole lines={logLines} />}

            {newick && <PhyloTree newick={newick} alignment={alignment} />}
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
