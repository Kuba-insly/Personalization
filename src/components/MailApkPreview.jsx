import { useState, useMemo } from 'react'
import { editorHtmlToRaw, oathItemsToHtml } from '../utils/mailApkParser'

const MOCK_VARS = {
  UserName: 'Anna Kowalska',
  BrokerName: 'Agencja Ubezpieczeń XYZ',
  Email: 'klient@example.com',
  Phone: '+48 500 000 000',
  Name: 'Jan Kowalski',
  Code: 'APK-2026-001',
  CreatedAt: '15.01.2026',
  ApproveUrl: '#',
  EmailContent: '',
}

function resolveVars(html, vars) {
  if (!html) return ''
  return html.replace(/\{\{\.([A-Za-z]+)\}\}/g, (_, name) => {
    const val = vars[name]
    if (val === undefined) return `<mark class="preview-var">{{.${name}}}</mark>`
    return `<span class="preview-var-resolved">${val}</span>`
  })
}

function buildPreviewHtml(sections, subject, refusal, smsSent) {
  if (!sections) return ''

  const intro = editorHtmlToRaw(sections.intro || '')
  const introResolved = resolveVars(intro, { ...MOCK_VARS })

  const currentIntro = refusal
    ? resolveVars(editorHtmlToRaw(sections.refusalIntro || ''), MOCK_VARS)
    : resolveVars(editorHtmlToRaw(sections.normalIntro || ''), MOCK_VARS)

  const oathsHtml = refusal
    ? oathItemsToHtml(sections.refusalOaths || [])
    : oathItemsToHtml(sections.normalOaths || [])
  const oathsResolved = resolveVars(oathsHtml, MOCK_VARS)

  const buttonPromptResolved = !smsSent && sections.buttonPrompt
    ? `<p>${resolveVars(editorHtmlToRaw(sections.buttonPrompt || ''), MOCK_VARS)}</p>`
    : ''

  const approveButton = !smsSent
    ? `<div style="text-align:center; margin: 16px 0;">
        <a href="#" style="display:inline-block; text-decoration:none;">
          <button style="background-color:#FF7D00;color:#fff;border:1px solid #e4e4e4;padding:8px 24px;border-radius:3px;cursor:pointer;width:200px;"><b>Akceptuje</b></button>
        </a>
      </div>`
    : ''

  const signatureResolved = resolveVars(editorHtmlToRaw(sections.signature || ''), MOCK_VARS)

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
      <div id="content">
        ${introResolved}
        ${currentIntro}
        ${buttonPromptResolved}
        ${oathsResolved}
      </div>
      ${approveButton}
      ${signatureResolved}
    </div>
  `
}

export default function MailApkPreview({ subject, sections }) {
  const [refusal, setRefusal] = useState(false)
  const [smsSent, setSmsSent] = useState(false)

  const previewHtml = useMemo(
    () => buildPreviewHtml(sections, subject, refusal, smsSent),
    [sections, subject, refusal, smsSent]
  )

  return (
    <div className="mail-preview-panel">
      <div className="mail-preview-controls">
        <div className="view-toggle mail-preview-toggle">
          <button
            className={`view-toggle-btn${!refusal ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setRefusal(false)}
          >
            Bez odmowy
          </button>
          <button
            className={`view-toggle-btn${refusal ? ' view-toggle-btn--active' : ''}`}
            onClick={() => setRefusal(true)}
          >
            Odmowa
          </button>
        </div>
        <label className="mail-preview-sms-toggle">
          <input
            type="checkbox"
            checked={smsSent}
            onChange={e => setSmsSent(e.target.checked)}
          />
          SMS wysłany
        </label>
      </div>

      <div className="mail-preview-subject">
        <span className="mail-preview-subject-label">Temat:</span>
        <span className="mail-preview-subject-value">{subject}</span>
      </div>

      <div
        className="mail-preview-frame"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  )
}
