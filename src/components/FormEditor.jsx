import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableFieldItem from './SortableFieldItem'
import FieldItem from './FieldItem'

export default function FormEditor({ formData, onUpdateField, onRemoveField, view = 'full' }) {
  if (!formData) return null

  const visibleFields = view === 'refusal'
    ? formData.fields.filter((f) => f.key === 'refusal' || f.key === 'agreementforemail')
    : formData.fields

  const fieldIds = visibleFields.map((f) => f.key)

  return (
    <div className="form-renderer">
      <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
        {visibleFields.map((field) => (
          <SortableFieldItem
            key={field.key}
            field={field}
            onUpdateField={onUpdateField}
            onRemove={view !== 'refusal' ? () => onRemoveField(field.key) : undefined}
            allFields={formData.fields}
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
