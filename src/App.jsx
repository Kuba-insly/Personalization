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

  // schemaName is the prefix used in translation keys during export.
  // Pre-fill from the loaded JSON's $id when available.
  const [schemaName, setSchemaName] = useState(isDefault ? '' : siteId)

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
            <span className="meta-label" style={{ marginLeft: 12 }}>Nazwa dla kluczy:</span>
            <input
              className="schema-name-input"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="np. pl_krs_auto"
              title="Prefiks używany w kluczach tłumaczeń przy eksporcie"
            />
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
