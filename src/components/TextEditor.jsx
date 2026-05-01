import { useState, useRef, useEffect } from 'react'

export default function TextEditor({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEdit(e) {
    e.stopPropagation()
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`text-editor-input ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      className={`text-editor ${className}`}
      onClick={startEdit}
      title="Kliknij aby edytować"
    >
      {value}
      <span className="text-editor-hint">✎</span>
    </span>
  )
}
