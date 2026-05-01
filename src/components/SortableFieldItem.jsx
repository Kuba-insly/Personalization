import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FieldItem from './FieldItem'

export default function SortableFieldItem({ field, onUpdateField, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const label = field.type === 'heading' ? `sekcję "${field.title}"` : `pole "${field.title}"`

  return (
    <div ref={setNodeRef} style={style} className="sortable-field-item">
      <div className="field-drag-handle" {...attributes} {...listeners} title="Przeciągnij aby przenieść">
        ⠿
      </div>
      <div className="field-item-content">
        <FieldItem field={field} onUpdateField={onUpdateField} />
      </div>
      <button
        className="field-remove-btn"
        onClick={() => {
          if (confirm(`Usunąć ${label}?`)) onRemove()
        }}
        title="Usuń"
      >
        ×
      </button>
    </div>
  )
}
