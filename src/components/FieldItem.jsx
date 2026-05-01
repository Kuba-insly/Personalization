import { fieldLabel, optionLabel } from '../utils/translate'

export default function FieldItem({ field }) {
  const { type } = field
  const label = fieldLabel(field)

  if (type === 'heading') {
    return (
      <div className="field-heading">
        <span>{label}</span>
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="field-boolean">
        <input type="checkbox" disabled />
        <label>{label}</label>
      </div>
    )
  }

  if (type === 'checkbox-group') {
    return (
      <div className="field-checkbox-group">
        <div className="field-section-title">{label}</div>
        <div className="field-options-grid">
          {field.options.map((opt) => (
            <label key={opt.value} className="field-option">
              <input type="checkbox" disabled />
              <span>{optionLabel(opt)}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="field-row">
        <label className="field-label">{label}</label>
        <div className="field-options-inline">
          {field.options.map((opt) => (
            <label key={opt.value} className="field-option-inline">
              <input type="radio" disabled name={field.key} />
              <span>{optionLabel(opt)}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="field-textarea-box">
        <span className="field-textarea-label">{label.toUpperCase()}</span>
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
      <label className="field-label">{label}</label>
      <input className="field-input" type="text" disabled placeholder={label} />
    </div>
  )
}
