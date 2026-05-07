import { useState, useEffect, useRef } from 'react'
import { parseBodyToSections, assembleBodyFromSections } from '../utils/mailApkParser'
import defaultMailApk from '../schema/defaultMailApk.json'

const STORAGE_KEY = 'mail-apk-personalization-state-v3'
const MAX_HISTORY = 50

function normalizeMailApk(rawJson) {
  return {
    subject: rawJson.subject || '',
    sections: parseBodyToSections(rawJson.body || ''),
    _raw: rawJson,
  }
}

export function useMailApkState() {
  const [subject, setSubjectState] = useState('')
  const [sections, setSectionsState] = useState(null)
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
          const normalized = normalizeMailApk(parsed.rawJson)
          originalRef.current = { subject: normalized.subject, sections: normalized.sections }
          // Restore editing state
          setSubjectState(parsed.subject ?? normalized.subject)
          setSectionsState(parsed.sections ? JSON.parse(parsed.sections) : normalized.sections)
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
        isDirty,
      }))
    } catch {}
  }, [subject, sections, isDirty])

  function pushHistory() {
    const snapshot = { subject, sections: JSON.parse(JSON.stringify(sections)) }
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), snapshot]
    setCanUndo(true)
  }

  function loadMailApk(rawJson) {
    rawRef.current = rawJson
    const normalized = normalizeMailApk(rawJson)
    originalRef.current = { subject: normalized.subject, sections: normalized.sections }
    historyRef.current = []
    setSubjectState(normalized.subject)
    setSectionsState(normalized.sections)
    setIsDirty(false)
    setCanUndo(false)
  }

  function loadDefault() {
    loadMailApk(defaultMailApk)
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

  function updateOathItems(key, items) {
    pushHistory()
    setSectionsState(prev => ({ ...prev, [key]: { items } }))
    setIsDirty(true)
  }

  function undoLast() {
    const history = historyRef.current
    if (history.length === 0) return
    const prev = history[history.length - 1]
    historyRef.current = history.slice(0, -1)
    setSubjectState(prev.subject)
    setSectionsState(prev.sections)
    setIsDirty(true)
    setCanUndo(historyRef.current.length > 0)
  }

  function resetToOriginal() {
    if (!originalRef.current) return
    historyRef.current = []
    setSubjectState(originalRef.current.subject)
    setSectionsState(originalRef.current.sections)
    setIsDirty(false)
    setCanUndo(false)
  }

  function markSaved() {
    setIsDirty(false)
  }

  function getExportData() {
    if (!sections || !rawRef.current) return null
    const body = assembleBodyFromSections(sections, rawRef.current)
    const schema = { ...rawRef.current, subject, body }
    return {
      jsonStr: JSON.stringify(schema, null, 4),
      isDirty,
    }
  }

  return {
    subject,
    sections,
    isDirty,
    canUndo,
    loadMailApk,
    loadDefault,
    updateSubject,
    updateSection,
    updateOathItems,
    undoLast,
    resetToOriginal,
    markSaved,
    getExportData,
    allowedVars: rawRef.current?.allowed_vars || defaultMailApk.allowed_vars,
  }
}
