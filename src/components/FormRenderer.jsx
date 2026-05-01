import FieldItem from './FieldItem'
import SectionBlock from './SectionBlock'

export default function FormRenderer({ formData, onUpdateField }) {
  if (!formData) return null

  return (
    <div className="form-renderer">
      <SectionBlock>
        {formData.fields.map((field) => (
          <FieldItem key={field.key} field={field} onUpdateField={onUpdateField} />
        ))}
      </SectionBlock>

      {formData.comment && (
        <SectionBlock>
          <FieldItem
            field={{
              key: '__comment',
              type: 'textarea',
              title: formData.comment.title,
              options: [],
            }}
            onUpdateField={onUpdateField}
          />
        </SectionBlock>
      )}
    </div>
  )
}
