import { useState } from 'react'
import { useFormState } from './hooks/useFormState'
import FormRenderer from './components/FormRenderer'
import JsonImport from './components/JsonImport'
import './assets/styles.css'

export default function App() {
  const { formData, isDirty, loadForm, resetToOriginal } = useFormState()
  const [showImport, setShowImport] = useState(false)

  const siteId = formData?._meta?.$id?.split('/').pop() ?? 'default'

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar-title">IDD Personalization Tool</h1>
        <div className="toolbar-actions">
          {isDirty && (
            <>
              <span className="dirty-badge">● Niezapisane zmiany</span>
              <button className="btn btn-ghost btn-sm" onClick={resetToOriginal}>
                Resetuj
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            Wczytaj JSON
          </button>
          <button className="btn btn-primary" disabled>
            Pobierz JSON
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
          </div>
          <FormRenderer formData={formData} />
        </main>
      </div>

      {showImport && (
        <JsonImport onLoad={loadForm} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
