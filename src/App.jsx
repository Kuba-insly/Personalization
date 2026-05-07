import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import { exportIdd } from './utils/jsonExporter'
import inslyLogoLight from './assets/insly-logo-dark.svg'
import inslyLogoDark from './assets/insly-logo.svg'
import inslyLogoGrey from './assets/insly-logo-grey.svg'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core'
import { useFormState } from './hooks/useFormState'
import { useMailApkState } from './hooks/useMailApkState'
import { useMailRodoState } from './hooks/useMailRodoState'
import FormEditor from './components/FormEditor'
import JsonImport from './components/JsonImport'
import PlaceholderModule from './components/PlaceholderModule'
import MailApkEditor from './components/MailApkEditor'
import MailRodoEditor from './components/MailRodoEditor'
import './assets/styles.css'

const TOOLBOX_ITEMS = [
  { id: 'toolbox:heading',       label: 'Sekcja',            icon: '━' },
  { id: 'toolbox:text',          label: 'Pole tekstowe',     icon: 'T' },
  { id: 'toolbox:boolean',       label: 'Checkbox',          icon: '☐' },
  { id: 'toolbox:checkbox-group',label: 'Lista checkboxów',  icon: '☰' },
  { id: 'toolbox:textarea',      label: 'Textarea',          icon: '≡' },
  { id: 'toolbox:select',        label: 'Wybór opcji',       icon: '◉' },
]

function createNewField(fieldType) {
  const key = `custom_${fieldType}_${Date.now()}`
  switch (fieldType) {
    case 'heading':
      return { key, type: 'heading', title: 'Nowa sekcja', options: [], priority: 999, _isNew: true }
    case 'text':
      return { key, type: 'text', title: 'Nowe pole tekstowe', options: [], priority: 999, _isNew: true }
    case 'boolean':
      return { key, type: 'boolean', title: 'Nowe pole wyboru', options: [], priority: 999, _isNew: true }
    case 'checkbox-group':
      return {
        key, type: 'checkbox-group', title: 'Nowa lista checkboxów', priority: 999, _isNew: true,
        options: [
          { value: `${key}_1`, translationKey: '', customLabel: 'Opcja 1' },
          { value: `${key}_2`, translationKey: '', customLabel: 'Opcja 2' },
          { value: `${key}_3`, translationKey: '', customLabel: 'Opcja 3' },
        ],
      }
    case 'textarea':
      return { key, type: 'textarea', title: 'Nowe pole tekstowe', options: [], priority: 999, _isNew: true }
    case 'select':
      return {
        key, type: 'select', title: 'Nowe pole wyboru', priority: 999, _isNew: true,
        options: [
          { value: `${key}_1`, translationKey: '', customLabel: 'Opcja 1' },
          { value: `${key}_2`, translationKey: '', customLabel: 'Opcja 2' },
        ],
      }
    default:
      return { key, type: 'text', title: 'Nowe pole', options: [], priority: 999, _isNew: true }
  }
}

function ToolboxItem({ id, label, icon }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`toolbox-item${isDragging ? ' toolbox-item--dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <span className="toolbox-item-icon">{icon}</span>
      <span className="toolbox-item-label">{label}</span>
    </div>
  )
}

export default function App() {
  const {
    formData, isDirty: iddIsDirty,
    loadForm, loadDefault: iddLoadDefault,
    updateField, addField, removeField, moveField,
    undoLast: iddUndoLast, canUndo: iddCanUndo,
    resetToOriginal: iddResetToOriginal, markSaved,
  } = useFormState()

  const {
    subject: apkSubject, sections: apkSections, isDirty: apkIsDirty, canUndo: apkCanUndo,
    loadMailApk, loadDefault: apkLoadDefault,
    updateSubject: apkUpdateSubject, updateSection: apkUpdateSection, updateOathItems: apkUpdateOathItems,
    undoLast: apkUndoLast, resetToOriginal: apkResetToOriginal,
    getExportData: apkGetExportData, allowedVars: apkAllowedVars,
  } = useMailApkState()

  const {
    subject: rodoSubject, sections: rodoSections, clauses: rodoClauses,
    isDirty: rodoIsDirty, canUndo: rodoCanUndo,
    loadMailRodo, updateSubject: rodoUpdateSubject,
    updateSection: rodoUpdateSection, updateClause: rodoUpdateClause,
    undoLast: rodoUndoLast, resetToOriginal: rodoResetToOriginal,
    getExportData: rodoGetExportData, allowedVars: rodoAllowedVars,
  } = useMailRodoState()

  const [showImport, setShowImport] = useState(false)
  const [activeDrag, setActiveDrag] = useState(null)
  const [exportStep, setExportStep] = useState('')
  const [urlError, setUrlError] = useState(false)
  const [view, setView] = useState('full')
  const [module, setModule] = useState('idd')
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('insly-dark-mode') === 'true'
  })
  const [darkUnlocked, setDarkUnlocked] = useState(false)
  const keyBuffer = useRef('')

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      keyBuffer.current = (keyBuffer.current + e.key).slice(-4)
      if (keyBuffer.current === 'dark') setDarkUnlocked(true)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const siteId = formData?._meta?.$id?.split('/').pop() ?? 'default'
  const isDefault = siteId === 'default'

  const [programUrl, setProgramUrl] = useState('')
  const [siteSlug, setSiteSlug] = useState('')

  function handleUrlChange(raw) {
    setProgramUrl(raw)
    const match = raw.match(/https?:\/\/([^.]+)\.insly\./i)
    setSiteSlug(match ? match[1].toLowerCase() : '')
    if (raw) setUrlError(false)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart({ active }) {
    const toolboxItem = TOOLBOX_ITEMS.find((t) => t.id === active.id)
    if (toolboxItem) {
      setActiveDrag({ label: toolboxItem.label, icon: toolboxItem.icon, fromToolbox: true })
    } else {
      const field = formData?.fields.find((f) => f.key === active.id)
      setActiveDrag({ label: field?.title ?? active.id, icon: '⠿', fromToolbox: false })
    }
  }

  function handleDragEnd({ active, over }) {
    setActiveDrag(null)
    if (!over) return
    if (String(active.id).startsWith('toolbox:')) {
      if (view !== 'full') return
      const fieldType = String(active.id).replace('toolbox:', '')
      addField(createNewField(fieldType), over.id)
    } else if (active.id !== over.id) {
      moveField(String(active.id), String(over.id))
    }
  }

  function handleDragCancel() {
    setActiveDrag(null)
  }

  async function translatePL(text) {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pl|en`
      )
      const data = await res.json()
      if (data.responseStatus === 200) {
        const t = data.responseData.translatedText || ''
        return t.startsWith('PLEASE SELECT') ? '' : t
      }
    } catch {}
    return ''
  }

  async function handleExport() {
    const apkExportData = apkGetExportData()
    const rodoExportData = rodoGetExportData()
    const includeMailApk = !!(apkExportData && apkExportData.isDirty)
    const includeRodo = !!(rodoExportData && rodoExportData.isDirty)
    const includeIdd = !!formData && (iddIsDirty || module === 'idd')

    if (!includeIdd && !includeMailApk && !includeRodo) return
    if (includeIdd && !siteSlug) { setUrlError(true); return }

    try {
      setExportStep('translating')
      let enMap = {}

      if (includeIdd && formData) {
        const toTranslate = new Set()
        for (const field of formData.fields) {
          if (field._isNew || field._titleChanged) toTranslate.add(field.title)
          for (const opt of field.options || []) {
            if (opt.customLabel !== undefined) toTranslate.add(opt.customLabel)
          }
        }
        const labels = [...toTranslate]
        const translated = await Promise.all(labels.map(translatePL))
        enMap = Object.fromEntries(labels.map((l, i) => [l, translated[i]]))
      }

      setExportStep('packing')
      const zip = new JSZip()
      const date = new Date().toISOString().split('T')[0]

      if (includeIdd && formData && siteSlug) {
        const { jsonStr, translationsStr } = exportIdd(formData, siteSlug, enMap)
        zip.file('idd-schema.json', jsonStr)
        if (translationsStr) zip.file('translations.txt', translationsStr)
      }

      if (includeMailApk && apkExportData) {
        zip.file('mail-apk-schema.json', apkExportData.jsonStr)
      }

      if (includeRodo && rodoExportData) {
        zip.file('mail-rodo-schema.json', rodoExportData.schemaJson)
        for (const f of rodoExportData.clauseFiles) {
          zip.file(f.filename, f.json)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `insly-${siteSlug || 'personalizacja'}-${date}.zip`
      a.click()
      URL.revokeObjectURL(url)
      markSaved()
    } finally {
      setExportStep('')
    }
  }

  function toggleDarkMode() {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('insly-dark-mode', String(next))
      return next
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`app${darkMode ? ' app--dark' : ''}`}>
        <header className="toolbar">
          <img src={darkMode ? inslyLogoDark : inslyLogoLight} alt="Insly" className="toolbar-logo" />
          <h1 className="toolbar-title">Personalizacja Insly</h1>
          <div className="toolbar-actions">
            {darkUnlocked && (
              <button className="btn btn-ghost btn-sm darkmode-toggle" onClick={toggleDarkMode} title={darkMode ? 'Tryb jasny' : 'Tryb ciemny'}>
                {darkMode ? '☀' : '☾'}
              </button>
            )}

            {/* IDD-specific actions */}
            {module === 'idd' && iddIsDirty && (
              <span className="dirty-badge">● Niezapisane zmiany</span>
            )}
            {module === 'idd' && iddCanUndo && (
              <button className="btn btn-ghost btn-sm" onClick={iddUndoLast} title="Cofnij ostatnią zmianę">
                ↩ Cofnij
              </button>
            )}
            {module === 'idd' && iddIsDirty && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (confirm('Przywrócić szablon do stanu sprzed edycji? Wszystkie zmiany zostaną utracone.')) iddResetToOriginal()
              }}>
                Przywróć szablon
              </button>
            )}
            {module === 'idd' && !isDefault && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (iddIsDirty && !confirm('Masz niezapisane zmiany. Czy chcesz wrócić do domyślnego schematu?')) return
                iddLoadDefault()
                setProgramUrl('')
                setSiteSlug('')
              }}>
                ↩ Wróć do default
              </button>
            )}

            {/* Mail APK-specific actions */}
            {module === 'mail-apk' && apkIsDirty && (
              <span className="dirty-badge">● Niezapisane zmiany</span>
            )}
            {module === 'mail-apk' && apkCanUndo && (
              <button className="btn btn-ghost btn-sm" onClick={apkUndoLast} title="Cofnij ostatnią zmianę">
                ↩ Cofnij
              </button>
            )}
            {module === 'mail-apk' && apkIsDirty && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (confirm('Przywrócić szablon do stanu sprzed edycji? Wszystkie zmiany zostaną utracone.')) apkResetToOriginal()
              }}>
                Przywróć szablon
              </button>
            )}

            {/* Mail RODO-specific actions */}
            {module === 'mail-rodo' && rodoIsDirty && (
              <span className="dirty-badge">● Niezapisane zmiany</span>
            )}
            {module === 'mail-rodo' && rodoCanUndo && (
              <button className="btn btn-ghost btn-sm" onClick={rodoUndoLast} title="Cofnij ostatnią zmianę">
                ↩ Cofnij
              </button>
            )}
            {module === 'mail-rodo' && rodoIsDirty && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (confirm('Przywrócić szablon do stanu sprzed edycji? Wszystkie zmiany zostaną utracone.')) rodoResetToOriginal()
              }}>
                Przywróć szablon
              </button>
            )}

            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              Wczytaj JSON
            </button>
            <button className="btn btn-primary" onClick={handleExport} disabled={!!exportStep}>
              {exportStep === 'translating' ? 'Tłumaczę…' : exportStep === 'packing' ? 'Pakuję…' : 'Pobierz ZIP'}
            </button>
          </div>
        </header>

        <nav className="module-tabs">
          {[
            { id: 'idd',            label: 'Formularz APK' },
            { id: 'mail-apk',       label: 'Mail APK' },
            { id: 'mail-rodo',      label: 'Mail RODO' },
            { id: 'print-apk',      label: 'Wydruk APK' },
            { id: 'print-rodo',     label: 'Wydruk RODO' },
            { id: 'print-offer',    label: 'Wydruk oferty' },
            { id: 'sales-packages', label: 'Pakiety sprzedaży' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`module-tab${module === tab.id ? ' module-tab--active' : ''}`}
              onClick={() => setModule(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="workspace">
          {module === 'idd' && (
            <aside className={`toolbox${view === 'refusal' ? ' toolbox--disabled' : ''}`}>
              <div className="toolbox-header">Elementy</div>
              <div className="toolbox-items">
                {TOOLBOX_ITEMS.map((item) => (
                  <ToolboxItem key={item.id} {...item} />
                ))}
              </div>
              <div className="toolbox-hint">
                {view === 'refusal'
                  ? 'Dostępne tylko w widoku Pełne IDD'
                  : 'Przeciągnij element na formularz'}
              </div>
              <div className="toolbox-logo-footer">
                <img src={inslyLogoGrey} alt="Insly" className="toolbox-logo-grey" />
              </div>
            </aside>
          )}

          <main className="canvas">
            <div style={{ display: module === 'mail-apk' ? 'contents' : 'none' }}>
              <MailApkEditor
                subject={apkSubject}
                sections={apkSections}
                updateSubject={apkUpdateSubject}
                updateSection={apkUpdateSection}
                updateOathItems={apkUpdateOathItems}
                allowedVars={apkAllowedVars}
                loadMailApk={loadMailApk}
              />
            </div>
            <div style={{ display: module === 'mail-rodo' ? 'contents' : 'none' }}>
              <MailRodoEditor
                subject={rodoSubject}
                sections={rodoSections}
                clauses={rodoClauses}
                updateSubject={rodoUpdateSubject}
                updateSection={rodoUpdateSection}
                updateClause={rodoUpdateClause}
                allowedVars={rodoAllowedVars}
              />
            </div>
            {module === 'idd' ? (
              <>
                <div className="canvas-meta">
                  <span className="meta-label">Schemat:</span>
                  <span className="meta-value">{siteId}</span>
                  <span className="meta-label" style={{ marginLeft: 12 }}>Link do programu:</span>
                  <input
                    className={`program-url-input${urlError ? ' program-url-input--error' : ''}`}
                    value={programUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://nazwa.insly.pl"
                    title="Wklej link do programu Insly — subdomena zostanie użyta w kluczach tłumaczeń"
                  />
                  {siteSlug
                    ? <span className="meta-value" title="Subdomena używana w kluczach tłumaczeń">{siteSlug}</span>
                    : urlError && <span className="url-error-hint">← Uzupełnij link do programu przed pobraniem</span>
                  }
                </div>

                <div className="view-toggle">
                  <button
                    className={`view-toggle-btn${view === 'full' ? ' view-toggle-btn--active' : ''}`}
                    onClick={() => setView('full')}
                  >
                    Pełne IDD
                  </button>
                  <button
                    className={`view-toggle-btn${view === 'refusal' ? ' view-toggle-btn--active' : ''}`}
                    onClick={() => setView('refusal')}
                  >
                    Odmowa IDD
                  </button>
                </div>

                <FormEditor
                  formData={formData}
                  onUpdateField={updateField}
                  onRemoveField={removeField}
                  view={view}
                />
              </>
            ) : module !== 'mail-apk' && module !== 'mail-rodo' ? (
              <PlaceholderModule module={module} />
            ) : null}
          </main>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div className={`drag-overlay-pill${activeDrag.fromToolbox ? ' drag-overlay-pill--toolbox' : ''}`}>
            <span>{activeDrag.icon}</span>
            <span>{activeDrag.label}</span>
          </div>
        )}
      </DragOverlay>

      {showImport && (
        <JsonImport
          onLoad={(rawJson) => {
            if (rawJson?.service_tag === 'gdpr') {
              loadMailRodo(rawJson)
              setModule('mail-rodo')
            } else if (rawJson?.service_tag !== undefined || rawJson?.send_channel !== undefined) {
              loadMailApk(rawJson)
              setModule('mail-apk')
            } else {
              loadForm(rawJson)
              const id = rawJson?.$id?.split('/').pop() ?? ''
              if (id && id !== 'default') setSiteSlug(id)
            }
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </DndContext>
  )
}
