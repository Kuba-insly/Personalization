import { useState, useRef, useEffect } from 'react'

export default function TextEditor({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  // Resize input to fit its content (scrollWidth trick)
  function resizeInput(input) {
    if (!input) return
    input.style.width = '2px'
    input.style.width = Math.max(80, Math.min(input.scrollWidth + 2, 700)) + 'px'
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      resizeInput(inputRef.current)
      inputRef.current.focus()
      inputRef.current.select()
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

  function handleChange(e) {
    setDraft(e.target.value)
    resizeInput(e.target)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`text-editor-input ${className}`}
        value={draft}
        onChange={handleChange}
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
