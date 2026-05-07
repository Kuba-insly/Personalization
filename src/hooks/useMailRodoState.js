import { useState, useEffect, useRef } from 'react'
import { parseRodoBodyToSections, assembleRodoBody } from '../utils/mailRodoParser'
import { htmlToEditorHtml, editorHtmlToRaw } from '../utils/mailApkParser'
import defaultMailRodo from '../schema/defaultMailRodo.json'
import defaultRodoClauses from '../schema/defaultRodoClauses.json'

const STORAGE_KEY = 'mail-rodo-personalization-state-v3'
const MAX_HISTORY = 50

function normalizeMailRodo(rawJson) {
  return {
    subject: rawJson.subject || '',
    sections: parseRodoBodyToSections(rawJson.body || ''),
    _raw: rawJson,
  }
}

export function useMailRodoState() {
  const [subject, setSubjectState] = useState('')
  const [sections, setSectionsState] = useState(null)
  const [clauses, setClauses] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [canUndo, setCanUndo] = useState(false)

  const rawRef = useRef(null)
  const originalRef = useRef(null)
  const historyRef = useRef([])

  // Load from localStorage or default on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.rawJson) {
          rawRef.current = parsed.rawJson
          const normalized = normalizeMailRodo(parsed.rawJson)
          originalRef.current = { subject: normalized.subject, sections: normalized.sections, clauses: defaultRodoClauses }
          setSubjectState(parsed.subject ?? normalized.subject)
          setSectionsState(parsed.sections ? JSON.parse(parsed.sections) : normalized.sections)
          const rawClauses = parsed.clauses ? JSON.parse(parsed.clauses) : null
          setClauses(rawClauses || Object.fromEntries(
            Object.entries(defaultRodoClauses).map(([k, v]) => [k, htmlToEditorHtml(v)])
          ))
          setIsDirty(parsed.isDirty || false)
          return
        }
      }
    } catch {}
    loadDefault()
  }, [])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (!sections || !rawRef.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        rawJson: rawRef.current,
        subject,
        sections: JSON.stringify(sections),
        clauses: JSON.stringify(clauses),
        isDirty,
      }))
    } catch {}
  }, [subject, sections, clauses, isDirty])

  function pushHistory() {
    const snapshot = {
      subject,
      sections: JSON.parse(JSON.stringify(sections)),
      clauses: JSON.parse(JSON.stringify(clauses)),
    }
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), snapshot]
    setCanUndo(true)
  }

  function loadMailRodo(rawJson) {
    rawRef.current = rawJson
    const normalized = normalizeMailRodo(rawJson)
    originalRef.current = { subject: normalized.subject, sections: normalized.sections, clauses: clauses || defaultRodoClauses }
    historyRef.current = []
    setSubjectState(normalized.subject)
    setSectionsState(normalized.sections)
    setIsDirty(false)
    setCanUndo(false)
  }

  function loadDefault() {
    rawRef.current = defaultMailRodo
    const normalized = normalizeMailRodo(defaultMailRodo)
    const initClauses = Object.fromEntries(
      Object.entries(defaultRodoClauses).map(([k, v]) => [k, htmlToEditorHtml(v)])
    )
    originalRef.current = { subject: normalized.subject, sections: normalized.sections, clauses: initClauses }
    historyRef.current = []
    setSubjectState(normalized.subject)
    setSectionsState(normalized.sections)
    setClauses(initClauses)
    setIsDirty(false)
    setCanUndo(false)
  }

  function updateSubject(newSubject) {
    pushHistory()
    setSubjectState(newSubject)
    setIsDirty(true)
  }

  function updateSection(key, changes) {
    pushHistory()
    setSectionsState(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...changes } }))
    setIsDirty(true)
  }

  function updateClause(key, content) {
    pushHistory()
    setClauses(prev => ({ ...prev, [key]: content }))
    setIsDirty(true)
  }

  function undoLast() {
    const history = historyRef.current
    if (history.length === 0) return
    const prev = history[history.length - 1]
    historyRef.current = history.slice(0, -1)
    setSubjectState(prev.subject)
    setSectionsState(prev.sections)
    setClauses(prev.clauses)
    setIsDirty(true)
    setCanUndo(historyRef.current.length > 0)
  }

  function resetToOriginal() {
    if (!originalRef.current) return
    historyRef.current = []
    setSubjectState(originalRef.current.subject)
    setSectionsState(originalRef.current.sections)
    setClauses(originalRef.current.clauses)
    setIsDirty(false)
    setCanUndo(false)
  }

  function markSaved() {
    setIsDirty(false)
  }

  function getExportData() {
    if (!sections || !rawRef.current) return null
    const body = assembleRodoBody(sections)
    const schema = { ...rawRef.current, subject, body }
    const clauseNames = {
      dataProcessing: 'gdpr-data-processing',
      marketing: 'gdpr-marketing',
      email: 'gdpr-email',
      phone: 'gdpr-phone',
      sms: 'gdpr-sms',
    }
    const clauseFiles = Object.entries(clauseNames).map(([key, filename]) => ({
      filename: `${filename}.json`,
      json: JSON.stringify({ content: editorHtmlToRaw(clauses[key] || '') }, null, 4),
    }))
    return { schemaJson: JSON.stringify(schema, null, 4), clauseFiles, isDirty }
  }

  return {
    subject,
    sections,
    clauses,
    isDirty,
    canUndo,
    loadMailRodo,
    loadDefault,
    updateSubject,
    updateSection,
    updateClause,
    undoLast,
    resetToOriginal,
    markSaved,
    getExportData,
    allowedVars: rawRef.current?.allowed_vars || defaultMailRodo.allowed_vars,
  }
}
