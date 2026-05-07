import { useEffect, useRef, useState, useCallback } from 'react'
import { RichTextArea } from './RichTextEditor'
import { VAR_LABELS } from '../utils/mailApkParser'

const RODO_PICKER_VARS = ['BrokerName', 'UserName', 'UserEmail']

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

function InlineSection({ html, onChange, placeholder, label, conditionColor }) {
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

function ClauseBlock({ label, html, onChange }) {
  return (
    <div className="rodo-clause-block">
      <div className="rodo-clause-header">
        <span className="rodo-clause-label">{label}</span>
      </div>
      <RichTextArea html={html} onChange={onChange} placeholder="Treść klauzuli..." />
    </div>
  )
}

export default function MailRodoEditor({ subject, sections, clauses, updateSubject, updateSection, updateClause, allowedVars }) {
  const [marketingFound, setMarketingFound] = useState(true)
  const [emailFound, setEmailFound] = useState(true)
  const [phoneFound, setPhoneFound] = useState(false)
  const [smsFound, setSmsFound] = useState(false)
  const colorInputRef = useRef(null)

  const handleInsertVar = useCallback((varName) => {
    const label = VAR_LABELS[varName] || varName
    const chip = `<span class="tpl-var" contenteditable="false" data-var="{{.${varName}}}">${label}</span>&nbsp;`
    document.execCommand('insertHTML', false, chip)
  }, [])

  if (!sections || !clauses) return <div className="mail-apk-loading">Ładowanie...</div>

  return (
    <div className="mail-apk-root">

      {/* Subject toolbar */}
      <div className="mail-apk-toolbar mail-apk-toolbar--rodo">
        <div className="mail-apk-subject-row">
          <span className="meta-label">Temat:</span>
          <input
            className="mail-apk-subject-input"
            value={subject}
            onChange={e => updateSubject(e.target.value)}
            placeholder="Temat wiadomości e-mail..."
          />
        </div>
      </div>

      {/* Formatting toolbar — identical to Mail APK */}
      <EditorToolbar
        allowedVars={allowedVars.filter(v => RODO_PICKER_VARS.includes(v.name))}
        onInsertVar={handleInsertVar}
        colorInputRef={colorInputRef}
      />

      {/* Canvas wrapper: left bar floats absolutely, email frame centers like APK */}
      <div className="mail-apk-email-canvas rodo-canvas-wrapper">

        {/* Left bar — absolute overlay, does not affect flow */}
        <div className="rodo-left-bar">
          <div className="rodo-left-bar-title">Wyrażone zgody</div>
          <label className="rodo-left-toggle">
            <input type="checkbox" checked={marketingFound} onChange={e => setMarketingFound(e.target.checked)} />
            Zgoda marketingowa
          </label>
          {marketingFound && (
            <>
              <label className="rodo-left-toggle rodo-left-toggle--sub">
                <input type="checkbox" checked={emailFound} onChange={e => setEmailFound(e.target.checked)} />
                Kanał E-mail
              </label>
              <label className="rodo-left-toggle rodo-left-toggle--sub">
                <input type="checkbox" checked={phoneFound} onChange={e => setPhoneFound(e.target.checked)} />
                Kanał Telefon
              </label>
              <label className="rodo-left-toggle rodo-left-toggle--sub">
                <input type="checkbox" checked={smsFound} onChange={e => setSmsFound(e.target.checked)} />
                Kanał SMS
              </label>
            </>
          )}
        </div>

        {/* Email frame — same centering as Mail APK */}
        <div className="mail-apk-email-frame">

          <InlineSection
            label="Powitanie"
            html={sections.intro?.html || ''}
            onChange={html => updateSection('intro', { html })}
            placeholder="Powitanie..."
          />

          <InlineSection
            label="Wstęp — bez SMS"
            html={sections.noSmsSentIntro?.html || ''}
            onChange={html => updateSection('noSmsSentIntro', { html })}
            conditionColor="#00AF87"
            placeholder="Treść wstępu standardowego..."
          />

          <InlineSection
            label="Wstęp — z kodem SMS"
            html={sections.smsSentIntro?.html || ''}
            onChange={html => updateSection('smsSentIntro', { html })}
            conditionColor="#4A6FA5"
            placeholder="Treść wstępu gdy SMS wysłany..."
          />

          <ClauseBlock
            label="Klauzula: Przetwarzanie danych"
            html={clauses.dataProcessing || ''}
            onChange={html => updateClause('dataProcessing', html)}
          />

          <InlineSection
            label='Tekst "Przesyłam również..."'
            html={sections.bridgeText?.html || ''}
            onChange={html => updateSection('bridgeText', { html })}
            placeholder="Tekst łączący..."
          />

          {marketingFound && (
            <>
              <ClauseBlock
                label="Klauzula: Marketing"
                html={clauses.marketing || ''}
                onChange={html => updateClause('marketing', html)}
              />
              <div className="rodo-channel-rows">
                <p className="rodo-channel-row">- Email [{emailFound ? 'TAK' : 'NIE'}]</p>
                <p className="rodo-channel-row">- TELEFON [{phoneFound ? 'TAK' : 'NIE'}]</p>
                <p className="rodo-channel-row">- SMS [{smsFound ? 'TAK' : 'NIE'}]</p>
              </div>
            </>
          )}

          <div className="mail-approve-preview">
            <button className="mail-approve-btn" disabled>Potwierdzam</button>
          </div>

          <InlineSection
            label="Tekst końcowy"
            html={sections.footerText?.html || ''}
            onChange={html => updateSection('footerText', { html })}
            placeholder="Tekst końcowy..."
          />

          <InlineSection
            label="Podpis"
            html={sections.signature?.html || ''}
            onChange={html => updateSection('signature', { html })}
            placeholder="Podpis..."
          />

        </div>
      </div>
    </div>
  )
}
