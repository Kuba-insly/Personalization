import { fieldLabel, optionLabel } from '../utils/translate'
import TextEditor from './TextEditor'

export default function FieldItem({ field, onUpdateField }) {
  const { type } = field
  const label = fieldLabel(field)

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
    return (
      <div className="field-checkbox-group">
        <div className="field-section-title">
          <TextEditor value={label} onSave={handleLabelSave} />
        </div>
        <div className="field-options-grid">
          {field.options.map((opt) => (
            <label key={opt.value} className="field-option">
              <input type="checkbox" disabled />
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
