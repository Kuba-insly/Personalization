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

    function moveOption(val, dir) {
      const opts = [...field.options]
      const i = opts.findIndex((o) => o.value === val)
      if (i < 0) return
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= opts.length) return
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
      onUpdateField?.(field.key, { options: opts })
    }

    return (
      <div className="field-checkbox-group">
        <div className="field-section-title">
          <TextEditor value={label} onSave={handleLabelSave} />
        </div>
        <div className="field-options-grid">
          {field.options.map((opt, idx) => (
            <div key={opt.value} className="field-option field-option--editable">
              <input type="checkbox" disabled />
              <span>
                <TextEditor
                  value={opt.customLabel ?? optionLabel(opt)}
                  onSave={(newLabel) => handleOptionSave(opt.value, newLabel)}
                />
              </span>
              {onUpdateField && (
                <div className="option-controls">
                  <button onClick={() => moveOption(opt.value, 'up')} disabled={idx === 0} title="W górę">↑</button>
                  <button onClick={() => moveOption(opt.value, 'down')} disabled={idx === field.options.length - 1} title="W dół">↓</button>
                  <button onClick={() => removeOption(opt.value)} title="Usuń opcję">×</button>
                </div>
              )}
            </div>
          ))}
        </div>
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
