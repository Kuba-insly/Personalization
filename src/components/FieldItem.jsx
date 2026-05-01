// Renders a single IDD field in read-only mode based on its type.
// In Zadanie 3 the title will become a TextEditor (click-to-edit).
export default function FieldItem({ field }) {
  const { type, title, options } = field

  if (type === 'heading') {
    return (
      <div className="field-heading">
        <span>{title}</span>
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="field-boolean">
        <input type="checkbox" disabled />
        <label>{title}</label>
      </div>
    )
  }

  if (type === 'checkbox-group') {
    return (
      <div className="field-checkbox-group">
        <div className="field-section-title">{title}</div>
        <div className="field-options-grid">
          {options.map((opt) => (
            <label key={opt.value} className="field-option">
              <input type="checkbox" disabled />
              <span>{opt.translationKey}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="field-row">
        <label className="field-label">{title}</label>
        <div className="field-options-inline">
          {options.map((opt) => (
            <label key={opt.value} className="field-option-inline">
              <input type="radio" disabled name={field.key} />
              <span>{opt.translationKey}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="field-row">
        <label className="field-label">{title}</label>
        <textarea className="field-textarea" disabled placeholder={title} rows={3} />
      </div>
    )
  }

  if (type === 'free-array') {
    return null
  }

  // text (default)
  return (
    <div className="field-row">
      <label className="field-label">{title}</label>
      <input className="field-input" type="text" disabled placeholder={title} />
    </div>
  )
}
