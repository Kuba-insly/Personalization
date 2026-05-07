import { htmlToEditorHtml, editorHtmlToRaw, findMatchingEnd } from './mailApkParser'

const TPL_IF_SMS = '{{if .SmsSent}}'
const TPL_ELSE = '{{else}}'
const TPL_END = '{{end}}'
const TPL_IF_MARKETING = '{{if .MarketingFound}}'

export function parseRodoBodyToSections(bodyHtml) {
  const s = {
    intro: { html: '' },
    smsSentIntro: { html: '' },
    noSmsSentIntro: { html: '' },
    bridgeText: { html: '' },
    footerText: { html: '' },
    signature: { html: '' },
  }

  const contentTag = '<div id="content">'
  const contentStart = bodyHtml.indexOf(contentTag)
  if (contentStart === -1) return s
  const contentEnd = contentStart + contentTag.length

  // Intro: before {{if .SmsSent}}
  const smsIfIdx = bodyHtml.indexOf(TPL_IF_SMS, contentEnd)
  if (smsIfIdx === -1) return s
  s.intro = { html: htmlToEditorHtml(bodyHtml.slice(contentEnd, smsIfIdx).trim()) }

  // SmsSent branches
  const elseIdx = bodyHtml.indexOf(TPL_ELSE, smsIfIdx)
  const smsEndIdx = findMatchingEnd(bodyHtml, smsIfIdx)
  s.smsSentIntro = { html: htmlToEditorHtml(bodyHtml.slice(smsIfIdx + TPL_IF_SMS.length, elseIdx).trim()) }
  s.noSmsSentIntro = { html: htmlToEditorHtml(bodyHtml.slice(elseIdx + TPL_ELSE.length, smsEndIdx).trim()) }

  // After SMS end: find ClauseDataProcessing and bridge text before MarketingFound
  const afterSmsEnd = smsEndIdx + TPL_END.length
  const marketingIdx = bodyHtml.indexOf(TPL_IF_MARKETING, afterSmsEnd)
  const contentDivEnd = bodyHtml.indexOf('</div>', afterSmsEnd)
  const betweenEnd = marketingIdx !== -1 ? marketingIdx : contentDivEnd

  const between = bodyHtml.slice(afterSmsEnd, betweenEnd)
  const clauseDpMarker = '<p>{{$.ClauseDataProcessing}}</p>'
  const dpPos = between.indexOf(clauseDpMarker)
  if (dpPos !== -1) {
    s.bridgeText = { html: htmlToEditorHtml(between.slice(dpPos + clauseDpMarker.length).trim()) }
  }

  // Footer text: <p style="text-align: justify;">
  const footerMarker = '<p style="text-align: justify;">'
  const footerStart = bodyHtml.indexOf(footerMarker, contentDivEnd)
  if (footerStart !== -1) {
    const footerEnd = bodyHtml.indexOf('</p>', footerStart) + '</p>'.length
    s.footerText = { html: htmlToEditorHtml(bodyHtml.slice(footerStart, footerEnd)) }
  }

  // Signature: last table
  const tableStart = bodyHtml.lastIndexOf('<table')
  const tableEnd = bodyHtml.lastIndexOf('</table>') + '</table>'.length
  if (tableStart !== -1 && tableEnd > tableStart) {
    s.signature = { html: htmlToEditorHtml(bodyHtml.slice(tableStart, tableEnd)) }
  }

  return s
}

export function assembleRodoBody(sections) {
  const intro = editorHtmlToRaw(sections.intro?.html || '')
  const smsSentIntro = editorHtmlToRaw(sections.smsSentIntro?.html || '')
  const noSmsSentIntro = editorHtmlToRaw(sections.noSmsSentIntro?.html || '')
  const bridgeText = editorHtmlToRaw(sections.bridgeText?.html || '')
  const footerText = editorHtmlToRaw(sections.footerText?.html || '')
  const signature = editorHtmlToRaw(sections.signature?.html || '')

  const approveButton = `{{if not .SmsSent}}<a href="{{.ApproveUrl}}" target="_blank" style="display:none;" rel="nofollow noopener"><button style="background-color: #ff7b00cc;color: #fff;border: 1px solid #e4e4e4;padding: 8px;border-radius: 3px;cursor: pointer; position: relative; left: 35%; width:200px;"><b>Potwierdzam</b></button></a>{{end}}`

  const marketingBlock = `{{if .MarketingFound}}<p>{{$.ClauseMarketing}}</p>{{if .EmailFound}}<p> - Email [TAK]</p>{{else}}<p> - Email [NIE]</p>{{end}}{{if .PhoneFound}}<p> - TELEFON [TAK]</p>{{else}}<p> - TELEFON [NIE]</p>{{end}}{{if .SmsFound}}<p> - SMS [TAK]</p>{{else}}<p> - SMS [NIE]</p>{{end}}{{end}}`

  return `<html lang="pl"><head><title>Insly - APK</title><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="text-align: justify;"><div id="content">${intro}<br>{{if .SmsSent}}${smsSentIntro}{{else}}${noSmsSentIntro}{{end}}<p>{{$.ClauseDataProcessing}}</p>${bridgeText}${marketingBlock}</div>${approveButton}${footerText}${signature}</body></html>`
}
