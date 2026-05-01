import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableFieldItem from './SortableFieldItem'
import FieldItem from './FieldItem'

export default function FormEditor({ formData, onUpdateField, onRemoveField }) {
  if (!formData) return null

  const fieldIds = formData.fields.map((f) => f.key)

  return (
    <div className="form-renderer">
      <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
        {formData.fields.map((field) => (
          <SortableFieldItem
            key={field.key}
            field={field}
            onUpdateField={onUpdateField}
            onRemove={() => onRemoveField(field.key)}
          />
        ))}
      </SortableContext>

      {formData.comment && (
        <div className="sortable-field-item sortable-field-item--static">
          <div className="field-drag-handle field-drag-handle--disabled" />
          <div className="field-item-content">
            <FieldItem
              field={{
                key: '__comment',
                type: 'textarea',
                title: formData.comment.title,
                options: [],
              }}
              onUpdateField={onUpdateField}
            />
          </div>
          <div className="field-remove-btn field-remove-btn--hidden" />
        </div>
      )}
    </div>
  )
}
