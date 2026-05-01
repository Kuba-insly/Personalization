import { useRef, useState } from 'react'

export default function JsonImport({ onLoad, onClose }) {
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const textareaRef = useRef(null)

  function parseAndLoad(text) {
    try {
      const parsed = JSON.parse(text)
      setError(null)
      onLoad(parsed)
      onClose?.()
    } catch {
      setError('Nieprawidłowy JSON — sprawdź format pliku.')
    }
  }

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => parseAndLoad(e.target.result)
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handlePaste() {
    const text = textareaRef.current?.value?.trim()
    if (text) parseAndLoad(text)
  }

  return (
    <div className="json-import-overlay" onClick={onClose}>
      <div className="json-import-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Wczytaj JSON formularza IDD</h2>

        <div
          className={`drop-zone ${dragging ? 'drop-zone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <span>Upuść plik JSON tutaj lub kliknij, aby wybrać</span>
          <input
            id="file-input"
            type="file"
            accept=".json,.txt"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <div className="import-divider">lub wklej JSON poniżej</div>

        <textarea
          ref={textareaRef}
          className="import-textarea"
          placeholder='{ "$id": "...", "properties": { ... } }'
          rows={8}
        />

        {error && <p className="import-error">{error}</p>}

        <div className="import-actions">
          <button className="btn btn-primary" onClick={handlePaste}>
            Załaduj
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Anuluj
          </button>
        </div>
      </div>
    </div>
  )
}
