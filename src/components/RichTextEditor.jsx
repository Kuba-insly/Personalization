import { useRef, useEffect, useState, useCallback } from 'react'

// Variable picker dropdown (mousedown+preventDefault to avoid stealing editor focus)
function VarDropdown({ vars, onInsert, anchorRef }) {
  const [open, setOpen] = useState(false)

  function handleToggle(e) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(o => !o)
  }

  function handleInsert(e, varName) {
    e.preventDefault()
    e.stopPropagation()
    onInsert(varName)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function close(e) {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, anchorRef])

  return (
    <div className="rich-var-wrapper" ref={anchorRef}>
      <button
        className="rich-toolbar-btn"
        title="Wstaw zmienną"
        onMouseDown={handleToggle}
        type="button"
      >
        {'{x}'}
      </button>
      {open && (
        <div className="rich-var-dropdown">
          {vars.map(v => (
            <div
              key={v.name}
              className="rich-var-item"
              onMouseDown={e => handleInsert(e, v.name)}
            >
              <span className="rich-var-chip">{'{{.' + v.name + '}}'}</span>
              <span className="rich-var-type">{v.type || 'any'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The contentEditable editing area (uncontrolled pattern)
export function RichTextArea({ html, onChange, placeholder }) {
  const elRef = useRef(null)
  const lastHtmlRef = useRef(html)

  // Set innerHTML only on mount or when html changes from outside (undo/load)
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html
      el.innerHTML = html || ''
    }
  }, [html])

  // Initial mount
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    el.innerHTML = html || ''
    lastHtmlRef.current = html
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBlur() {
    const el = elRef.current
    if (!el) return
    const current = el.innerHTML
    lastHtmlRef.current = current
    onChange(current)
  }

  return (
    <div
      ref={elRef}
      className="rich-area"
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      data-placeholder={placeholder || 'Wpisz treść...'}
    />
  )
}

// Full rich text editor: toolbar + contentEditable area
export default function RichTextEditor({ html, onChange, allowedVars = [], placeholder }) {
  const varAnchorRef = useRef(null)
  const colorInputRef = useRef(null)
  const areaRef = useRef(null)

  const execCmd = useCallback((cmd, value) => {
    document.execCommand(cmd, false, value ?? null)
  }, [])

  function handleBold(e) {
    e.preventDefault()
    execCmd('bold')
  }
  function handleItalic(e) {
    e.preventDefault()
    execCmd('italic')
  }
  function handleUnderline(e) {
    e.preventDefault()
    execCmd('underline')
  }

  function handleColor(e) {
    e.preventDefault()
    colorInputRef.current?.click()
  }

  function handleColorChange(e) {
    execCmd('foreColor', e.target.value)
  }

  function handleLink(e) {
    e.preventDefault()
    const url = window.prompt('Podaj adres URL:')
    if (url) execCmd('createLink', url)
  }

  function handleImage(e) {
    e.preventDefault()
    const url = window.prompt('Podaj adres URL obrazka (np. logo):')
    if (url) execCmd('insertImage', url)
  }

  function handleInsertVar(varName) {
    const chip = `<span class="tpl-var" contenteditable="false">{{.${varName}}}</span>&nbsp;`
    execCmd('insertHTML', chip)
    // Trigger change after inserting
    const el = areaRef.current?.querySelector?.('[contenteditable]') ||
      document.activeElement
    if (el) {
      setTimeout(() => {
        onChange(el.innerHTML)
      }, 0)
    }
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        <button className="rich-toolbar-btn" title="Pogrubienie" onMouseDown={handleBold} type="button"><b>B</b></button>
        <button className="rich-toolbar-btn" title="Kursywa" onMouseDown={handleItalic} type="button"><i>I</i></button>
        <button className="rich-toolbar-btn" title="Podkreślenie" onMouseDown={handleUnderline} type="button"><u>U</u></button>
        <div className="rich-toolbar-sep" />
        <button className="rich-toolbar-btn" title="Kolor tekstu" onMouseDown={handleColor} type="button">
          <span style={{ borderBottom: '3px solid #FF7D00' }}>A</span>
          <input
            ref={colorInputRef}
            type="color"
            style={{ display: 'none' }}
            onChange={handleColorChange}
            defaultValue="#FF7D00"
          />
        </button>
        <button className="rich-toolbar-btn" title="Dodaj link" onMouseDown={handleLink} type="button">🔗</button>
        <button className="rich-toolbar-btn" title="Wstaw obrazek / logo" onMouseDown={handleImage} type="button">🖼</button>
        <div className="rich-toolbar-sep" />
        {allowedVars.length > 0 && (
          <VarDropdown vars={allowedVars} onInsert={handleInsertVar} anchorRef={varAnchorRef} />
        )}
      </div>
      <div ref={areaRef}>
        <RichTextArea html={html} onChange={onChange} placeholder={placeholder} />
      </div>
    </div>
  )
}
