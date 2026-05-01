import FieldItem from './FieldItem'
import SectionBlock from './SectionBlock'

export default function FormRenderer({ formData }) {
  if (!formData) return null

  return (
    <div className="form-renderer">
      <SectionBlock>
        {formData.fields.map((field) => (
          <FieldItem key={field.key} field={field} />
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
          />
        </SectionBlock>
      )}
    </div>
  )
}
