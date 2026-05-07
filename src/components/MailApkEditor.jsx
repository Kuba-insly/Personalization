import { useEffect, useRef, useState, useCallback } from 'react'
import { RichTextArea } from './RichTextEditor'
import { VAR_LABELS } from '../utils/mailApkParser'

const PICKER_VARS = ['BrokerName', 'UserName']

// Floating / docked rich-text toolbar
function EditorToolbar({ allowedVars, onInsertVar, colorInputRef }) {
  function cmd(command, value) {
    document.execCommand(command, false, value ?? null)
  }

  function handleInsertVar(e, name) {
    e.preventDefault()
    onInsertVar(name)
    setVarOpen(false)
  }

  const [varOpen, setVarOpen] = useState(false)
  const varRef = useRef(null)

  useEffect(() => {
    if (!varOpen) return
    function close(e) {
      if (varRef.current && !varRef.current.contains(e.target)) setVarOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [varOpen])

  return (
    <div className="mail-editor-toolbar">
      <button className="rich-toolbar-btn" onMouseDown={e => { e.preventDefault(); cmd('bold') }} title="Pogrubienie"><b>B</b></button>
      <button className="rich-toolbar-btn" onMouseDown={e => { e.preventDefault(); cmd('italic') }} title="Kursywa"><i>I</i></button>
      <button className="rich-toolbar-btn" onMouseDown={e => { e.preventDefault(); cmd('underline') }} title="Podkreślenie"><u>U</u></button>
      <div className="rich-toolbar-sep" />
      <button
        className="rich-toolbar-btn"
        title="Kolor tekstu"
        onMouseDown={e => { e.preventDefault(); colorInputRef.current?.click() }}
      >
        <span style={{ borderBottom: '3px solid #FF7D00' }}>A</span>
      </button>
      <button
        className="rich-toolbar-btn"
        title="Dodaj link"
        onMouseDown={e => {
          e.preventDefault()
          const url = window.prompt('Podaj adres URL:')
          if (url) cmd('createLink', url)
        }}
      >🔗</button>
      <button
        className="rich-toolbar-btn"
        title="Wstaw obrazek / logo"
        onMouseDown={e => {
          e.preventDefault()
          const url = window.prompt('Podaj URL obrazka (np. logo):')
          if (url) cmd('insertImage', url)
        }}
      >🖼</button>
      <div className="rich-toolbar-sep" />
      <div className="rich-var-wrapper" ref={varRef}>
        <button
          className="rich-toolbar-btn"
          title="Wstaw zmienną"
          onMouseDown={e => { e.preventDefault(); setVarOpen(o => !o) }}
        >{'{x}'}</button>
        {varOpen && (
          <div className="rich-var-dropdown">
            {allowedVars.map(v => (
              <div key={v.name} className="rich-var-item" onMouseDown={e => handleInsertVar(e, v.name)}>
                <span className="rich-var-label">{v.label || VAR_LABELS[v.name] || v.name}</span>
                <span className="rich-var-chip">{'{{.' + v.name + '}}'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        ref={colorInputRef}
        type="color"
        style={{ display: 'none' }}
        defaultValue="#FF7D00"
        onChange={e => cmd('foreColor', e.target.value)}
      />
    </div>
  )
}

// Single inline editable section in the email view
function InlineSection({ sectionKey, html, onChange, allowedVars, placeholder, label, conditionColor }) {
  return (
    <div
      className="mail-inline-section"
      style={conditionColor ? { borderLeft: `3px solid ${conditionColor}` } : {}}
    >
      <div className="mail-inline-label">{label}</div>
      <RichTextArea html={html} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

// Oath list inline editor
function OathListSection({ sectionKey, items, onItemsChange, conditionColor, label }) {
  function handleItemChange(i, html) {
    const updated = [...items]
    updated[i] = html
    onItemsChange(updated)
  }

  function addItem() {
    onItemsChange([...items, 'Nowe oświadczenie'])
  }

  function removeItem(i) {
    onItemsChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <div
      className="mail-inline-section mail-oath-section"
      style={conditionColor ? { borderLeft: `3px solid ${conditionColor}` } : {}}
    >
      <div className="mail-inline-label">{label}</div>
      <ol className="mail-oath-list">
        {items.map((item, i) => (
          <li key={i} className="mail-oath-item">
            <RichTextArea
              html={item}
              onChange={html => handleItemChange(i, html)}
              placeholder="Treść oświadczenia..."
            />
            <button
              className="oath-item-remove btn btn-ghost btn-sm"
              onMouseDown={e => { e.preventDefault(); removeItem(i) }}
              title="Usuń"
              type="button"
            >✕</button>
          </li>
        ))}
      </ol>
      <button className="btn-add-oath" onClick={addItem} type="button">
        + Dodaj oświadczenie
      </button>
    </div>
  )
}

export default function MailApkEditor({ subject, sections, updateSubject, updateSection, updateOathItems, allowedVars }) {
  const [refusal, setRefusal] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const colorInputRef = useRef(null)

  const handleInsertVar = useCallback((varName) => {
    const label = VAR_LABELS[varName] || varName
    const chip = `<span class="tpl-var" contenteditable="false" data-var="{{.${varName}}}">${label}</span>&nbsp;`
    document.execCommand('insertHTML', false, chip)
  }, [])

  if (!sections) return <div className="mail-apk-loading">Ładowanie...</div>

  const introHtml = sections.intro?.html || ''
  const currentIntroHtml = refusal
    ? (sections.refusalIntro?.html || '')
    : (sections.normalIntro?.html || '')
  const currentIntroKey = refusal ? 'refusalIntro' : 'normalIntro'
  const buttonPromptHtml = sections.buttonPrompt?.html || ''
  const currentOaths = refusal
    ? (sections.refusalOaths?.items || [])
    : (sections.normalOaths?.items || [])
  const currentOathsKey = refusal ? 'refusalOaths' : 'normalOaths'
  const signatureHtml = sections.signature?.html || ''

  return (
    <div className="mail-apk-root">
      {/* Top bar */}
      <div className="mail-apk-toolbar">
        <div className="mail-apk-subject-row">
          <span className="meta-label">Temat:</span>
          <input
            className="mail-apk-subject-input"
            value={subject}
            onChange={e => updateSubject(e.target.value)}
            placeholder="Temat wiadomości e-mail..."
          />
        </div>

        <div className="view-toggle" style={{ flexShrink: 0 }}>
          <button
            className={`view-toggle-btn${!refusal ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setRefusal(false)}
          >Bez odmowy</button>
          <button
            className={`view-toggle-btn${refusal ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setRefusal(true)}
          >Odmowa</button>
        </div>

      </div>

      {/* Formatting toolbar */}
      <EditorToolbar
        allowedVars={allowedVars.filter(v => PICKER_VARS.includes(v.name))}
        onInsertVar={handleInsertVar}
        colorInputRef={colorInputRef}
      />

      {/* Email canvas */}
      <div className="mail-apk-email-canvas">
        <div className="mail-apk-email-frame">

          {/* Intro section */}
          <InlineSection
            sectionKey="intro"
            label="Powitanie"
            html={introHtml}
            onChange={html => updateSection('intro', { html })}
            allowedVars={allowedVars}
            placeholder="Treść powitania..."
          />

          {/* Conditional intro */}
          <div className="mail-conditional-banner" style={{ background: refusal ? '#fff5f3' : '#f0faf7' }}>
            <span className="mail-conditional-indicator">
              {refusal ? '⚠ Sekcja widoczna tylko przy odmowie APK' : '✓ Sekcja widoczna przy standardowym przebiegu'}
            </span>
          </div>
          <InlineSection
            key={currentIntroKey}
            sectionKey={currentIntroKey}
            label={refusal ? 'Wstęp — odmowa' : 'Wstęp — bez odmowy'}
            html={currentIntroHtml}
            onChange={html => updateSection(currentIntroKey, { html })}
            allowedVars={allowedVars}
            conditionColor={refusal ? '#E23009' : '#00AF87'}
            placeholder="Treść wstępu..."
          />

          {/* Button prompt (conditional on SmsSent) */}
          {!smsSent && (
            <InlineSection
              sectionKey="buttonPrompt"
              label="Tekst przed przyciskiem (gdy brak SMS)"
              html={buttonPromptHtml}
              onChange={html => updateSection('buttonPrompt', { html })}
              allowedVars={allowedVars}
              conditionColor="#D2863C"
              placeholder='Np. "Klikając w poniższy przycisk potwierdza Pan/Pani oświadczenia:"'
            />
          )}

          {/* Oath list */}
          <OathListSection
            key={currentOathsKey}
            sectionKey={currentOathsKey}
            label={refusal ? 'Oświadczenia — odmowa' : 'Oświadczenia — bez odmowy'}
            items={currentOaths}
            onItemsChange={items => updateOathItems(currentOathsKey, items)}
            conditionColor={refusal ? '#E23009' : '#00AF87'}
          />

          {/* Approve button preview (non-editable, structural) */}
          {!smsSent && (
            <div className="mail-approve-preview">
              <button className="mail-approve-btn" disabled>Akceptuje</button>
            </div>
          )}

          {/* Signature */}
          <InlineSection
            sectionKey="signature"
            label="Podpis"
            html={signatureHtml}
            onChange={html => updateSection('signature', { html })}
            allowedVars={allowedVars}
            placeholder="Podpis — możesz dodać logo przez przycisk 🖼 w pasku..."
          />

          {/* SMS toggle hint */}
          <div className="mail-sms-toggle-row">
            <label className="mail-preview-sms-toggle">
              <input type="checkbox" checked={smsSent} onChange={e => setSmsSent(e.target.checked)} />
              Pokaż widok gdy SMS wysłany (ukrywa przycisk akceptacji)
            </label>
          </div>
        </div>
      </div>

    </div>
  )
}
