import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fieldLabel, optionLabel } from '../utils/translate'
import TextEditor from './TextEditor'

function SortableOption({ opt, onSave, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opt.value,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="field-option field-option--sortable">
      <span className="option-drag-handle" {...attributes} {...listeners} title="Przeciągnij">⠿</span>
      <input type="checkbox" disabled />
      <span>
        <TextEditor value={opt.customLabel ?? optionLabel(opt)} onSave={onSave} />
      </span>
      <button className="option-remove-btn" onClick={onRemove} title="Usuń opcję">×</button>
    </div>
  )
}

export default function FieldItem({ field, onUpdateField }) {
  const { type } = field
  const label = fieldLabel(field)

  // Sensors for option-level drag (checkbox-group). Hooks must be at top level.
  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleLabelSave(newTitle) {
    onUpdateField?.(field.key, { title: newTitle, _titleChanged: true })
  }

  function handleOptionSave(optValue, newLabel) {
    const updatedOptions = field.options.map((o) =>
      o.value === optValue ? { ...o, customLabel: newLabel } : o
    )
    onUpdateField?.(field.key, { options: updatedOptions })
  }

  if (type === 'heading') {
    return (
      <div className="field-heading">
        <TextEditor value={label} onSave={handleLabelSave} />
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="field-boolean">
        <input type="checkbox" disabled />
        <label>
          <TextEditor value={label} onSave={handleLabelSave} />
        </label>
      </div>
    )
  }

  if (type === 'checkbox-group') {
    function addOption() {
      const newOpt = {
        value: `${field.key}_opt_${Date.now()}`,
        translationKey: '',
        customLabel: 'Nowa opcja',
      }
      onUpdateField?.(field.key, { options: [...field.options, newOpt] })
    }

    function removeOption(val) {
      onUpdateField?.(field.key, { options: field.options.filter((o) => o.value !== val) })
    }

    function handleOptionDragEnd({ active, over }) {
      if (!over || active.id === over.id) return
      const from = field.options.findIndex((o) => o.value === active.id)
      const to = field.options.findIndex((o) => o.value === over.id)
      if (from === -1 || to === -1) return
      onUpdateField?.(field.key, { options: arrayMove(field.options, from, to) })
    }

    return (
      <div className="field-checkbox-group">
        <div className="field-section-title">
          <TextEditor value={label} onSave={handleLabelSave} />
        </div>
        <DndContext
          sensors={optionSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleOptionDragEnd}
        >
          <SortableContext
            items={field.options.map((o) => o.value)}
            strategy={rectSortingStrategy}
          >
            <div className="field-options-grid">
              {field.options.map((opt) => (
                <SortableOption
                  key={opt.value}
                  opt={opt}
                  onSave={(newLabel) => handleOptionSave(opt.value, newLabel)}
                  onRemove={() => removeOption(opt.value)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {onUpdateField && (
          <button className="btn-add-option" onClick={addOption}>+ Dodaj opcję</button>
        )}
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="field-row">
        <label className="field-label">
          <TextEditor value={label} onSave={handleLabelSave} />
        </label>
        <div className="field-options-inline">
          {field.options.map((opt) => (
            <label key={opt.value} className="field-option-inline">
              <input type="radio" disabled name={field.key} />
              <span>
                <TextEditor
                  value={opt.customLabel ?? optionLabel(opt)}
                  onSave={(newLabel) => handleOptionSave(opt.value, newLabel)}
                />
              </span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="field-textarea-box">
        <span className="field-textarea-label">
          <TextEditor value={label} onSave={handleLabelSave} className="text-editor--orange" />
        </span>
        <textarea className="field-textarea-inner" disabled rows={3} />
      </div>
    )
  }

  if (type === 'free-array') {
    return null
  }

  // text
  return (
    <div className="field-row">
      <label className="field-label">
        <TextEditor value={label} onSave={handleLabelSave} />
      </label>
      <input className="field-input" type="text" disabled placeholder={label} />
    </div>
  )
}
