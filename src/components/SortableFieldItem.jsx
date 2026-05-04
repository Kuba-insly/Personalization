import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FieldItem from './FieldItem'
import { fieldLabel, optionLabel } from '../utils/translate'

function parseCondition(showIf) {
  if (!showIf?.fields?.length) return null
  const { name, value } = showIf.fields[0]
  return { parentKey: name.replace('answers.', ''), values: value || [] }
}

// Fields excluded from condition editing
const NO_CONDITION_KEYS = new Set([
  'agreementforemail',
  'otherIddRequirenment_comment',
  'nonAcceptableExclusions_comment',
  'searchingEsgProduct_comment',
  'others_comment',
])

// Fields excluded from required toggling
const NO_REQUIRED_KEYS = new Set([
  'others_comment',
])

// Returns the nearest preceding checkbox-group or select field (the "section parent").
// Stops at a heading — does not cross section boundaries.
function getSectionParent(fieldKey, allFields) {
  const idx = allFields.findIndex((f) => f.key === fieldKey)
  if (idx <= 0) return null
  for (let i = idx - 1; i >= 0; i--) {
    if (allFields[i].type === 'heading') return null
    if (allFields[i].type === 'checkbox-group' || allFields[i].type === 'select') {
      return allFields[i]
    }
  }
  return null
}

function ConditionEditor({ field, sectionParent, onUpdateField, onClose }) {
  const condition = parseCondition(field.show_if)
  const parentField = sectionParent

  const allParentOpts = parentField?.options?.map((o) => o.value) || []
  const isCurrentlyAny =
    allParentOpts.length > 0 && allParentOpts.every((v) => condition?.values?.includes(v))

  const [selectedValues, setSelectedValues] = useState(new Set(condition?.values || []))
  const [anyMode, setAnyMode] = useState(isCurrentlyAny)

  function toggleValue(val) {
    const next = new Set(selectedValues)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setSelectedValues(next)
  }

  function save() {
    if (!parentField) {
      onUpdateField(field.key, { show_if: null })
      onClose()
      return
    }
    const values = anyMode ? allParentOpts : [...selectedValues]
    if (values.length === 0) {
      onUpdateField(field.key, { show_if: null })
      onClose()
      return
    }
    onUpdateField(field.key, {
      show_if: { fields: [{ name: `answers.${parentField.key}`, value: values }] },
    })
    onClose()
  }

  function clear() {
    onUpdateField(field.key, { show_if: null })
    onClose()
  }

  return (
    <div className="condition-editor">
      <div className="condition-editor-header">
        <span className="condition-editor-title">Warunek wyświetlania</span>
        <button className="condition-editor-close" onClick={onClose} title="Zamknij">×</button>
      </div>

      {parentField ? (
        <>
          <div className="condition-editor-row">
            <span className="condition-editor-label">
              Pole pojawia się gdy zaznaczono w: <strong>{fieldLabel(parentField)}</strong>
            </span>
          </div>

          <div className="condition-mode-row">
            <label className="condition-mode-opt">
              <input type="radio" checked={anyMode} onChange={() => setAnyMode(true)} />
              Jakikolwiek zaznaczony
            </label>
            <label className="condition-mode-opt">
              <input type="radio" checked={!anyMode} onChange={() => setAnyMode(false)} />
              Konkretne opcje:
            </label>
          </div>
          {!anyMode && (
            <div className="condition-values">
              {parentField.options.map((opt) => (
                <label key={opt.value} className="condition-value-opt">
                  <input
                    type="checkbox"
                    checked={selectedValues.has(opt.value)}
                    onChange={() => toggleValue(opt.value)}
                  />
                  {opt.customLabel ?? optionLabel(opt)}
                </label>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="condition-editor-row">
          <span className="condition-editor-label">Brak pola nadrzędnego w tej sekcji.</span>
        </div>
      )}

      <div className="condition-editor-actions">
        {field.show_if && (
          <button className="btn btn-sm btn-ghost" onClick={clear}>Usuń warunek</button>
        )}
        <button className="btn btn-sm btn-primary" onClick={save} disabled={!parentField}>Zapisz</button>
      </div>
    </div>
  )
}

export default function SortableFieldItem({ field, onUpdateField, onRemove, allFields = [] }) {
  const [editingCondition, setEditingCondition] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const label = field.type === 'heading' ? `sekcję "${field.title}"` : `pole "${field.title}"`
  const condition = parseCondition(field.show_if)
  const sectionParent = getSectionParent(field.key, allFields)

  let conditionDesc = null
  if (condition) {
    const parentField = allFields.find((f) => f.key === condition.parentKey)
    const parentName = parentField ? fieldLabel(parentField) : condition.parentKey
    const allOpts = parentField?.options?.map((o) => o.value) || []
    const isAny = allOpts.length > 0 && allOpts.every((v) => condition.values.includes(v))
    if (isAny) {
      conditionDesc = `Widoczne gdy cokolwiek zaznaczono w: ${parentName}`
    } else {
      const valueLabels = condition.values.map((v) => {
        const opt = parentField?.options?.find((o) => o.value === v)
        return opt ? (opt.customLabel ?? optionLabel(opt)) : v
      })
      conditionDesc = `Widoczne gdy ${parentName} → ${valueLabels.join(', ')}`
    }
  }

  const canHaveCondition =
    onUpdateField &&
    (field.type === 'text' || field.type === 'textarea') &&
    field.key !== 'refusal' &&
    sectionParent !== null &&
    !NO_CONDITION_KEYS.has(field.key)

  // Fields with show_if are always required when visible — Insly enforces this inherently.
  // Show a locked badge; don't allow toggling.
  const isInherentlyRequired =
    !!(field.show_if) &&
    (field.type === 'text' || field.type === 'textarea') &&
    !NO_REQUIRED_KEYS.has(field.key)

  const canHaveRequired =
    onUpdateField &&
    (field.type === 'text' || field.type === 'textarea') &&
    !NO_REQUIRED_KEYS.has(field.key) &&
    !isInherentlyRequired

  return (
    <div ref={setNodeRef} style={style} className="sortable-field-item">
      <div className="field-drag-handle" {...attributes} {...listeners} title="Przeciągnij aby przenieść">
        ⠿
      </div>
      <div className="field-item-content">
        {isInherentlyRequired && !editingCondition && (
          <div className="required-badge required-badge--locked" title="Wymagane gdy pole jest widoczne — zachowanie wbudowane w Insly">
            <span className="required-badge-star">*</span>
            <span className="required-badge-text">Wymagane gdy widoczne</span>
          </div>
        )}

        {field.required && !isInherentlyRequired && !editingCondition && (
          <div
            className="required-badge"
            onClick={() => onUpdateField(field.key, { required: false })}
            title="Kliknij aby oznaczyć jako opcjonalne"
            style={{ cursor: 'pointer' }}
          >
            <span className="required-badge-star">*</span>
            <span className="required-badge-text">Wymagane</span>
            <span className="required-badge-edit">✏</span>
          </div>
        )}

        {canHaveRequired && !field.required && !editingCondition && (
          <button
            className="required-add-btn"
            onClick={() => onUpdateField(field.key, { required: true })}
          >
            + Wymagane
          </button>
        )}

        {conditionDesc && !editingCondition && (
          <div
            className="condition-badge"
            onClick={canHaveCondition ? () => setEditingCondition(true) : undefined}
            title={canHaveCondition ? 'Kliknij aby edytować warunek' : undefined}
            style={canHaveCondition ? { cursor: 'pointer' } : undefined}
          >
            <span className="condition-badge-icon">⚡</span>
            <span className="condition-badge-text">{conditionDesc}</span>
            {canHaveCondition && <span className="condition-badge-edit">✏</span>}
          </div>
        )}

        {canHaveCondition && !condition && !editingCondition && (
          <button className="condition-add-btn" onClick={() => setEditingCondition(true)}>
            + Warunek wyświetlania
          </button>
        )}

        {editingCondition && (
          <ConditionEditor
            field={field}
            sectionParent={sectionParent}
            onUpdateField={onUpdateField}
            onClose={() => setEditingCondition(false)}
          />
        )}

        <FieldItem field={field} onUpdateField={onUpdateField} />
      </div>
      {onRemove && !editingCondition && (
        <button
          className="field-remove-btn"
          onClick={() => {
            if (confirm(`Usunąć ${label}?`)) onRemove()
          }}
          title="Usuń"
        >
          ×
        </button>
      )}
    </div>
  )
}
