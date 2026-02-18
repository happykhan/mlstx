import { useRef, useEffect } from 'react'

interface LogConsoleProps {
  lines: string[]
}

export function LogConsole({ lines }: LogConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  if (lines.length === 0) return null

  return (
    <section className="log-console">
      <div className="log-header">
        <h2>Log</h2>
        <span className="log-count">{lines.length} entries</span>
      </div>
      <div className="log-body">
        {lines.map((line, i) => (
          <div key={i} className="log-line">
            <span className="log-index">{String(i + 1).padStart(3, ' ')}</span>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
