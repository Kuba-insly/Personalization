import { useState } from 'react'
import { useFormState } from './hooks/useFormState'
import FormRenderer from './components/FormRenderer'
import JsonImport from './components/JsonImport'
import './assets/styles.css'

export default function App() {
  const { formData, isDirty, loadForm, loadDefault, resetToLoaded, updateField } = useFormState()
  const [showImport, setShowImport] = useState(false)

  const siteId = formData?._meta?.$id?.split('/').pop() ?? 'default'
  const isDefault = siteId === 'default'

  // siteSlug is extracted from the Insly program URL, e.g.
  // "https://piotrektest.insly.pl/idd" → "piotrektest"
  // Used as suffix in translation keys: idd.car.piotrektestmtpl
  const [programUrl, setProgramUrl] = useState('')
  const [siteSlug, setSiteSlug] = useState('')

  function handleUrlChange(raw) {
    setProgramUrl(raw)
    const match = raw.match(/https?:\/\/([^.]+)\.insly\./i)
    setSiteSlug(match ? match[1].toLowerCase() : '')
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar-title">IDD Personalization Tool</h1>
        <div className="toolbar-actions">
          {isDirty && (
            <>
              <span className="dirty-badge">● Niezapisane zmiany</span>
              <button className="btn btn-ghost btn-sm" onClick={resetToLoaded}>
                Cofnij zmiany
              </button>
            </>
          )}
          {!isDefault && (
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (isDirty && !confirm('Masz niezapisane zmiany. Czy chcesz wrócić do domyślnego schematu?')) return
              loadDefault()
              setSchemaName('')
            }}>
              ↩ Wróć do default
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            Wczytaj JSON
          </button>
          <button className="btn btn-primary" disabled>
            Pobierz ZIP
          </button>
        </div>
      </header>

      <div className="workspace">
        {/* Left toolbox — placeholder, will be built in Zadanie 4 */}
        <aside className="toolbox">
          <div className="toolbox-header">Elementy</div>
          <div className="toolbox-placeholder">
            <p>Edytor drag&amp;drop</p>
            <p className="toolbox-note">dostępny w kolejnym zadaniu</p>
          </div>
        </aside>

        {/* Main form canvas */}
        <main className="canvas">
          <div className="canvas-meta">
            <span className="meta-label">Schemat:</span>
            <span className="meta-value">{siteId}</span>
            <span className="meta-label" style={{ marginLeft: 12 }}>Link do programu:</span>
            <input
              className="program-url-input"
              value={programUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://nazwa.insly.pl/idd"
              title="Wklej link do programu Insly — subdomena zostanie użyta w kluczach tłumaczeń"
            />
            {siteSlug && (
              <span className="meta-value" title="Subdomena używana w kluczach tłumaczeń">{siteSlug}</span>
            )}
            {isDirty && <span className="meta-saved-note">· zmiany zapisane lokalnie</span>}
          </div>
          <FormRenderer formData={formData} onUpdateField={updateField} />
        </main>
      </div>

      {showImport && (
        <JsonImport
          onLoad={(rawJson) => {
            loadForm(rawJson)
            const id = rawJson?.$id?.split('/').pop() ?? rawJson?.properties?.answers?.properties?.$id ?? ''
            if (id && id !== 'default') setSchemaName(id)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
