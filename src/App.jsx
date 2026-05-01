import { useEffect, useState } from 'react'
import { normalizeIdd } from './utils/jsonNormalizer'
import defaultIdd from './schema/defaultIdd.json'

function App() {
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    const normalized = normalizeIdd(defaultIdd)
    setFormData(normalized)
    console.log('Normalized IDD:', normalized)
    console.log('Field count:', normalized.fields.length)
    console.log('Field types:', [...new Set(normalized.fields.map(f => f.type))])
  }, [])

  return (
    <div className="app">
      <header className="toolbar">
        <h1>IDD Personalization Tool</h1>
      </header>
      <main className="main-content">
        {formData ? (
          <p>
            Załadowano schemat: <strong>{formData._meta.title}</strong>
            {' · '}
            {formData.fields.length} pól
          </p>
        ) : (
          <p>Ładowanie schematu...</p>
        )}
      </main>
    </div>
  )
}

export default App
