interface SchemeSelectorProps {
  schemes: string[]
  selected: string
  onSelect: (scheme: string) => void
  disabled: boolean
  loading: boolean
}

export function SchemeSelector({
  schemes,
  selected,
  onSelect,
  disabled,
  loading,
}: SchemeSelectorProps) {
  return (
    <div className="scheme-selector">
      <label htmlFor="scheme-select">MLST Scheme:</label>
      <select
        id="scheme-select"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">
          {loading ? 'Loading schemes...' : 'Select a scheme'}
        </option>
        {schemes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  )
}
