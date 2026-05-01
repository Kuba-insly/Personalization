import { useState } from 'react'
import JSZip from 'jszip'
import { exportIdd } from './utils/jsonExporter'
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
import FormEditor from './components/FormEditor'
import JsonImport from './components/JsonImport'
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
    formData, isDirty,
    loadForm, loadDefault,
    updateField, addField, removeField, moveField,
    undoLast, canUndo, resetToOriginal, markSaved,
  } = useFormState()

  const [showImport, setShowImport] = useState(false)
  const [activeDrag, setActiveDrag] = useState(null) // { label, icon } for overlay
  const [exportStep, setExportStep] = useState('') // '' | 'translating' | 'packing'
  const [urlError, setUrlError] = useState(false)

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
        // MyMemory returns "PLEASE SELECT..." when it can't translate
        return t.startsWith('PLEASE SELECT') ? '' : t
      }
    } catch {}
    return ''
  }

  async function handleExport() {
    if (!formData) return
    if (!siteSlug) { setUrlError(true); return }

    try {
      // Collect unique Polish labels that need translation
      setExportStep('translating')
      const toTranslate = new Set()
      for (const field of formData.fields) {
        if (field._isNew || field._titleChanged) toTranslate.add(field.title)
        for (const opt of field.options || []) {
          if (opt.customLabel !== undefined) toTranslate.add(opt.customLabel)
        }
      }

      const labels = [...toTranslate]
      const translated = await Promise.all(labels.map(translatePL))
      const enMap = Object.fromEntries(labels.map((l, i) => [l, translated[i]]))

      setExportStep('packing')
      const { jsonStr, translationsStr } = exportIdd(formData, siteSlug, enMap)
      const zip = new JSZip()
      const date = new Date().toISOString().split('T')[0]
      zip.file('idd-schema.json', jsonStr)
      if (translationsStr) {
        zip.file('translations.txt', translationsStr)
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `idd-${siteSlug}-${date}.zip`
      a.click()
      URL.revokeObjectURL(url)
      markSaved()
    } finally {
      setExportStep('')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app">
        <header className="toolbar">
          <h1 className="toolbar-title">Insly - Personalizacja APK</h1>
          <div className="toolbar-actions">
            {isDirty && (
              <span className="dirty-badge">● Niezapisane zmiany</span>
            )}
            {canUndo && (
              <button className="btn btn-ghost btn-sm" onClick={undoLast} title="Cofnij ostatnią zmianę">
                ↩ Cofnij
              </button>
            )}
            {isDirty && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (confirm('Przywrócić szablon do stanu sprzed edycji? Wszystkie zmiany zostaną utracone.')) resetToOriginal()
              }}>
                Przywróć szablon
              </button>
            )}
            {!isDefault && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (isDirty && !confirm('Masz niezapisane zmiany. Czy chcesz wrócić do domyślnego schematu?')) return
                loadDefault()
                setProgramUrl('')
                setSiteSlug('')
              }}>
                ↩ Wróć do default
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              Wczytaj JSON
            </button>
            <button className="btn btn-primary" onClick={handleExport} disabled={!!exportStep || !formData}>
              {exportStep === 'translating' ? 'Tłumaczę…' : exportStep === 'packing' ? 'Pakuję…' : 'Pobierz ZIP'}
            </button>
          </div>
        </header>

        <div className="workspace">
          <aside className="toolbox">
            <div className="toolbox-header">Elementy</div>
            <div className="toolbox-items">
              {TOOLBOX_ITEMS.map((item) => (
                <ToolboxItem key={item.id} {...item} />
              ))}
            </div>
            <div className="toolbox-hint">Przeciągnij element na formularz</div>
          </aside>

          <main className="canvas">
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
            <FormEditor
              formData={formData}
              onUpdateField={updateField}
              onRemoveField={removeField}
            />
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
            loadForm(rawJson)
            const id = rawJson?.$id?.split('/').pop() ?? ''
            if (id && id !== 'default') setSiteSlug(id)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </DndContext>
  )
}
