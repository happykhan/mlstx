import { useCallback } from 'react'

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled: boolean
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFilesChange(Array.from(e.target.files))
      }
    },
    [onFilesChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files) {
        const fastaFiles = Array.from(e.dataTransfer.files).filter((f) => {
          const name = f.name.replace(/\.gz$/, '')
          return (
            name.endsWith('.fasta') ||
            name.endsWith('.fa') ||
            name.endsWith('.fna') ||
            name.endsWith('.fsa')
          )
        })
        if (fastaFiles.length > 0) {
          onFilesChange(fastaFiles)
        }
      }
    },
    [onFilesChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="file-upload"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <label className="file-upload-area">
        <input
          type="file"
          multiple
          accept=".fasta,.fa,.fna,.fsa,.fasta.gz,.fa.gz,.fna.gz,.fsa.gz,.gz"
          onChange={handleChange}
          disabled={disabled}
        />
        <div className="file-upload-label">
          {files.length === 0
            ? 'Drop FASTA files here or click to browse (.fasta, .fa, .gz)'
            : `${files.length} file(s) selected`}
        </div>
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        )}
      </label>
    </div>
  )
}
