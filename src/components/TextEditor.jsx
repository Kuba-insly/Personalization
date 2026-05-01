import { useState, useRef, useEffect } from 'react'

export default function TextEditor({ value, onSave, className = '', multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  function resizeInput(el) {
    if (!el) return
    el.style.width = '2px'
    el.style.width = Math.max(80, Math.min(el.scrollWidth + 2, 700)) + 'px'
  }

  function resizeArea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    if (!editing || !inputRef.current) return
    if (multiline) resizeArea(inputRef.current)
    else resizeInput(inputRef.current)
    inputRef.current.focus()
    inputRef.current.select()
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
    if (multiline) resizeArea(e.target)
    else resizeInput(e.target)
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          className={`text-editor-input text-editor-input--area ${className}`}
          value={draft}
          onChange={handleChange}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          rows={1}
        />
      )
    }
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
