import RichTextEditor, { RichTextArea } from './RichTextEditor'

export default function MailApkSectionEditor({
  label,
  conditionLabel,
  value,
  onChange,
  allowedVars = [],
  placeholder,
  multiItem = false,
  items = [],
  onItemsChange,
}) {
  function handleItemChange(index, newHtml) {
    const updated = items.map((item, i) => (i === index ? newHtml : item))
    onItemsChange?.(updated)
  }

  function handleAddItem() {
    onItemsChange?.([...items, 'Nowe oświadczenie'])
  }

  function handleRemoveItem(index) {
    onItemsChange?.(items.filter((_, i) => i !== index))
  }

  return (
    <div className="mail-apk-section">
      <div className="mail-apk-section-header">
        <span className="mail-apk-section-label">{label}</span>
        {conditionLabel && (
          <span className="mail-apk-condition-badge">{conditionLabel}</span>
        )}
      </div>
      {multiItem ? (
        <div className="oath-list-editor">
          {items.map((item, i) => (
            <div key={i} className="oath-item-row">
              <span className="oath-item-number">{i + 1}.</span>
              <div className="oath-item-area-wrap">
                <RichTextArea
                  html={item}
                  onChange={html => handleItemChange(i, html)}
                  placeholder="Treść oświadczenia..."
                />
              </div>
              <button
                className="btn btn-ghost btn-sm oath-item-remove"
                onClick={() => handleRemoveItem(i)}
                title="Usuń oświadczenie"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn-add-oath"
            onClick={handleAddItem}
            type="button"
          >
            + Dodaj oświadczenie
          </button>
        </div>
      ) : (
        <RichTextEditor
          html={value}
          onChange={onChange}
          allowedVars={allowedVars}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}
