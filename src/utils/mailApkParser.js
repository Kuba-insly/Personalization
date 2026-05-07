export const VAR_LABELS = {
  BrokerName: 'Nazwa agencji',
  UserName: 'Nazwa agenta',
  UserEmail: 'E-mail agenta',
  Name: 'Imię i nazwisko klienta',
  Email: 'E-mail klienta',
  Phone: 'Telefon klienta',
  Code: 'Kod weryfikacyjny',
  EmailContent: 'Treść e-maila',
  CreatedAt: 'Data dokumentu',
  GdprDate: 'Data RODO',
  Refusal: 'Odmowa (warunek)',
  SmsSent: 'SMS wysłany (warunek)',
  ApproveUrl: 'Link do akceptacji',
}

// Converts {{.VarName}} and {{$.VarName}} tokens to styled chip spans showing Polish label
export function htmlToEditorHtml(html) {
  if (!html) return html
  return html
    .replace(/\{\{\$\.([A-Za-z]+)\}\}/g, (match, name) =>
      `<span class="tpl-var" contenteditable="false" data-var="${match}">${VAR_LABELS[name] || name}</span>`
    )
    .replace(/\{\{\.([A-Za-z]+)\}\}/g, (match, name) =>
      `<span class="tpl-var" contenteditable="false" data-var="${match}">${VAR_LABELS[name] || name}</span>`
    )
}

// Converts chip spans back to raw {{.VarName}} tokens for export
export function editorHtmlToRaw(html) {
  if (!html) return html
  // New format: token stored in data-var attribute
  html = html.replace(/<span[^>]*class="tpl-var"[^>]*data-var="({{[^"]+}})"[^>]*>[^<]*<\/span>/g, '$1')
  // Old format fallback: token was the innerHTML
  html = html.replace(/<span[^>]*class="tpl-var"[^>]*>({{[^}]+}})<\/span>/g, '$1')
  return html
}

// Parses <ol>...</ol> HTML into array of item innerHTML strings (with chips)
export function parseOathList(olHtml) {
  if (!olHtml) return []
  const wrapper = document.createElement('div')
  wrapper.innerHTML = olHtml
  const items = wrapper.querySelectorAll('li')
  return [...items].map(li => htmlToEditorHtml(li.innerHTML.trim()))
}

// Serializes oath items array back to <ol>...</ol> HTML
export function oathItemsToHtml(items) {
  if (!items || items.length === 0) return '<ol></ol>'
  const lis = items.map(item => `<li>${editorHtmlToRaw(item)}</li>`).join('\n                    ')
  return `<ol>            \n                    ${lis}            \n              </ol>`
}

// Extracts text between two string markers (exclusive)
function extractBetween(str, startMarker, endMarker, fromIndex = 0) {
  const start = str.indexOf(startMarker, fromIndex)
  if (start === -1) return { content: '', nextIndex: fromIndex }
  const contentStart = start + startMarker.length
  const end = str.indexOf(endMarker, contentStart)
  if (end === -1) return { content: str.slice(contentStart), nextIndex: str.length }
  return { content: str.slice(contentStart, end), nextIndex: end + endMarker.length }
}

const TPL_IF_REFUSAL = '{{if .Refusal}}'
const TPL_IF_NOT_SMS = '{{if not .SmsSent}}'
const TPL_ELSE = '{{else}}'
const TPL_END = '{{end}}'

// Main parser: converts body HTML with Go templates to sections model
// All text sections are { html: string }, oath sections are { items: string[] }
export function parseBodyToSections(bodyHtml) {
  const s = {
    intro: { html: '' },
    refusalIntro: { html: '' },
    normalIntro: { html: '' },
    buttonPrompt: { html: '' },
    refusalOaths: { items: [] },
    normalOaths: { items: [] },
    signature: { html: '' },
  }

  // Find first {{if .Refusal}} block
  const firstRefusalIdx = bodyHtml.indexOf(TPL_IF_REFUSAL)
  if (firstRefusalIdx === -1) {
    s.intro = { html: htmlToEditorHtml(extractDivContent(bodyHtml) || bodyHtml) }
    s.signature = { html: htmlToEditorHtml(extractSignature(bodyHtml)) }
    return s
  }

  // INTRO: everything inside div#content before first {{if .Refusal}}
  const contentStart = bodyHtml.indexOf('<div id="content">')
  const introRaw = contentStart !== -1
    ? bodyHtml.slice(contentStart + '<div id="content">'.length, firstRefusalIdx)
    : bodyHtml.slice(0, firstRefusalIdx)
  s.intro = { html: htmlToEditorHtml(introRaw.trim()) }

  // First {{if .Refusal}}...{{else}}...{{end}} block
  const firstElseIdx = bodyHtml.indexOf(TPL_ELSE, firstRefusalIdx)
  const firstEndIdx = findMatchingEnd(bodyHtml, firstRefusalIdx)

  const refusalBlock1 = bodyHtml.slice(firstRefusalIdx + TPL_IF_REFUSAL.length, firstElseIdx)
  const afterElse1 = bodyHtml.slice(firstElseIdx + TPL_ELSE.length, firstEndIdx)

  const refusalHasOl = /<ol[\s>]/i.test(refusalBlock1)
  const normalHasOl = /<ol[\s>]/i.test(afterElse1)

  if (refusalHasOl) {
    const olStart1 = refusalBlock1.indexOf('<ol')
    const olEnd1 = refusalBlock1.lastIndexOf('</ol>') + 5
    s.refusalIntro = { html: htmlToEditorHtml(refusalBlock1.slice(0, olStart1).trim()) }
    s.refusalOaths = { items: parseOathList(refusalBlock1.slice(olStart1, olEnd1)) }

    if (normalHasOl) {
      const olStart2 = afterElse1.indexOf('<ol')
      const olEnd2 = afterElse1.lastIndexOf('</ol>') + 5
      const smsInNormal = afterElse1.indexOf(TPL_IF_NOT_SMS)
      if (smsInNormal !== -1) {
        s.normalIntro = { html: htmlToEditorHtml(afterElse1.slice(0, smsInNormal).trim()) }
        const { content: smsContent } = extractBetween(afterElse1, TPL_IF_NOT_SMS, TPL_END, smsInNormal)
        s.buttonPrompt = { html: htmlToEditorHtml(smsContent.trim()) }
        s.normalOaths = { items: parseOathList(afterElse1.slice(afterElse1.indexOf('<ol'), afterElse1.lastIndexOf('</ol>') + 5)) }
      } else {
        s.normalIntro = { html: htmlToEditorHtml(afterElse1.slice(0, olStart2).trim()) }
        s.normalOaths = { items: parseOathList(afterElse1.slice(olStart2, olEnd2)) }
      }
    } else {
      s.normalIntro = { html: htmlToEditorHtml(afterElse1.trim()) }
    }
  } else {
    s.refusalIntro = { html: htmlToEditorHtml(refusalBlock1.trim()) }
    s.normalIntro = { html: htmlToEditorHtml(afterElse1.trim()) }
  }

  // Button prompt: {{if not .SmsSent}} after first {{end}} (not the approve button)
  const afterFirstEnd = bodyHtml.slice(firstEndIdx + TPL_END.length)
  const smsIdx = afterFirstEnd.indexOf(TPL_IF_NOT_SMS)
  if (smsIdx !== -1 && !s.buttonPrompt.html) {
    const { content: smsContent } = extractBetween(afterFirstEnd, TPL_IF_NOT_SMS, TPL_END, smsIdx)
    if (!smsContent.includes('ApproveUrl')) {
      s.buttonPrompt = { html: htmlToEditorHtml(smsContent.trim()) }
    }
  }

  // Oath lists: second {{if .Refusal}} block (when not found above)
  if (s.refusalOaths.items.length === 0) {
    const secondRefusalIdx = bodyHtml.indexOf(TPL_IF_REFUSAL, firstEndIdx)
    if (secondRefusalIdx !== -1) {
      const secondElseIdx = bodyHtml.indexOf(TPL_ELSE, secondRefusalIdx)
      const secondEndIdx = findMatchingEnd(bodyHtml, secondRefusalIdx)
      const refusalBlock2 = bodyHtml.slice(secondRefusalIdx + TPL_IF_REFUSAL.length, secondElseIdx)
      const normalBlock2 = bodyHtml.slice(secondElseIdx + TPL_ELSE.length, secondEndIdx)
      const olRefusal = refusalBlock2.match(/<ol[\s\S]*?<\/ol>/i)
      const olNormal = normalBlock2.match(/<ol[\s\S]*?<\/ol>/i)
      if (olRefusal) s.refusalOaths = { items: parseOathList(olRefusal[0]) }
      if (olNormal) s.normalOaths = { items: parseOathList(olNormal[0]) }
    }
  }

  s.signature = { html: htmlToEditorHtml(extractSignature(bodyHtml)) }

  return s
}

// Finds the {{end}} matching the {{if ...}} at ifIndex (handles nesting)
export function findMatchingEnd(str, ifIndex) {
  // Start scanning AFTER the opening {{if ...}} tag to avoid counting it as nested
  const afterOpenTag = str.indexOf('}}', ifIndex) + 2
  let depth = 0
  let i = afterOpenTag
  while (i < str.length) {
    const ifPos = str.indexOf('{{if ', i)
    const endPos = str.indexOf(TPL_END, i)
    if (endPos === -1) return str.length
    if (ifPos !== -1 && ifPos < endPos) {
      // Found a nested {{if ...}}, skip past its opening tag and increase depth
      depth++
      i = str.indexOf('}}', ifPos) + 2
    } else {
      if (depth === 0) return endPos
      depth--
      i = endPos + TPL_END.length
    }
  }
  return str.length
}

function extractDivContent(html) {
  const start = html.indexOf('<div id="content">') + '<div id="content">'.length
  const end = html.lastIndexOf('</div>')
  if (start === -1 || end === -1) return null
  return html.slice(start, end)
}

function extractSignature(html) {
  const tableStart = html.lastIndexOf('<table')
  const tableEnd = html.lastIndexOf('</table>') + '</table>'.length
  if (tableStart === -1 || tableEnd <= tableStart) return ''
  return html.slice(tableStart, tableEnd)
}

// Assembles body HTML from sections model
export function assembleBodyFromSections(sections, raw) {
  const intro = editorHtmlToRaw(sections.intro?.html || '')
  const refusalIntro = editorHtmlToRaw(sections.refusalIntro?.html || '')
  const normalIntro = editorHtmlToRaw(sections.normalIntro?.html || '')
  const buttonPrompt = editorHtmlToRaw(sections.buttonPrompt?.html || '')
  const refusalOathsHtml = oathItemsToHtml(sections.refusalOaths?.items || [])
  const normalOathsHtml = oathItemsToHtml(sections.normalOaths?.items || [])
  const signature = editorHtmlToRaw(sections.signature?.html || '')

  const buttonPromptBlock = buttonPrompt
    ? `{{if not .SmsSent}}${buttonPrompt}\n{{end}}   `
    : ''

  const approveButton = `{{if not .SmsSent}}<a href="{{.ApproveUrl}}" target="_blank" style="display:none;" rel="nofollow noopener">\n    <button style="background-color: #FF7D00;color: #fff;border: 1px solid #e4e4e4;padding: 8px;border-radius: 3px;cursor: pointer; position: relative; left: 35%; width:200px;"><b>Akceptuje</b></button></a>\n{{end}}`

  return `<html lang="pl">   \n      <head>      \n                <title>Dokumenty - APK</title>      \n      </head>   \n      <body>      <div id="content">         ${intro}\n         {{if .Refusal}}         ${refusalIntro}\n          {{else}}               ${normalIntro}\n          {{end}}${buttonPromptBlock}{{if .Refusal}}                ${refusalOathsHtml}         {{else}}               ${normalOathsHtml}         {{end}}            </div>  ${approveButton}\n${signature}</body>   \n</html>\n`
}
