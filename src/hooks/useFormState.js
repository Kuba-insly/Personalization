import { useState, useRef, useEffect } from 'react'
import { normalizeIdd } from '../utils/jsonNormalizer'
import defaultIdd from '../schema/defaultIdd.json'

const STORAGE_KEY = 'idd-personalization-state'
const defaultNormalized = normalizeIdd(defaultIdd)
const HISTORY_LIMIT = 50

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { formJson, isDirty } = JSON.parse(raw)
    return { normalized: normalizeIdd(formJson), isDirty, formJson }
  } catch {
    return null
  }
}

function saveToStorage(rawJson, dirty) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formJson: rawJson, isDirty: dirty }))
  } catch {
    // storage quota exceeded — fail silently
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useFormState() {
  const stored = loadFromStorage()

  const [formData, setFormData] = useState(stored?.normalized ?? defaultNormalized)
  const [isDirty, setIsDirty] = useState(stored?.isDirty ?? false)
  // historyLength is state (triggers re-render for canUndo); actual stack is in ref
  const [historyLength, setHistoryLength] = useState(0)

  const currentRawRef = useRef(stored?.formJson ?? defaultIdd)
  const originalRef = useRef(stored?.normalized ?? defaultNormalized)
  const historyRef = useRef([]) // stack of formData snapshots before each change

  // Auto-save to localStorage on every formData change
  useEffect(() => {
    saveToStorage(currentRawRef.current, isDirty)
  }, [formData, isDirty])

  // Warn before unload when there are unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Pushes current formData onto the undo stack before a mutation
  function pushHistory(snapshot) {
    const next = [...historyRef.current, snapshot]
    historyRef.current = next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next
    setHistoryLength(historyRef.current.length)
  }

  function clearHistory() {
    historyRef.current = []
    setHistoryLength(0)
  }

  function loadForm(rawJson) {
    const normalized = normalizeIdd(rawJson)
    currentRawRef.current = rawJson
    originalRef.current = normalized
    clearHistory()
    setFormData(normalized)
    setIsDirty(false)
    saveToStorage(rawJson, false)
  }

  function loadDefault() {
    currentRawRef.current = defaultIdd
    originalRef.current = defaultNormalized
    clearHistory()
    setFormData(defaultNormalized)
    setIsDirty(false)
    clearStorage()
  }

  function updateField(key, changes) {
    pushHistory(formData)
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, ...changes } : f)),
    }))
    setIsDirty(true)
  }

  function addField(newField, beforeKey) {
    pushHistory(formData)
    setFormData((prev) => {
      const fields = [...prev.fields]
      const idx = beforeKey ? fields.findIndex((f) => f.key === beforeKey) : -1
      fields.splice(idx === -1 ? fields.length : idx, 0, newField)
      return { ...prev, fields }
    })
    setIsDirty(true)
  }

  function removeField(key) {
    pushHistory(formData)
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.key !== key),
    }))
    setIsDirty(true)
  }

  function moveField(fromKey, toKey) {
    pushHistory(formData)
    setFormData((prev) => {
      const fields = [...prev.fields]
      const from = fields.findIndex((f) => f.key === fromKey)
      const to = fields.findIndex((f) => f.key === toKey)
      if (from === -1 || to === -1 || from === to) return prev
      const [item] = fields.splice(from, 1)
      fields.splice(to, 0, item)
      return { ...prev, fields }
    })
    setIsDirty(true)
  }

  // Undo the last single change
  function undoLast() {
    if (historyRef.current.length === 0) return
    const previous = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setHistoryLength(historyRef.current.length)
    setFormData(previous)
    setIsDirty(historyRef.current.length > 0)
  }

  // Restore to the state when the form was last loaded/saved
  function resetToOriginal() {
    clearHistory()
    setFormData(originalRef.current)
    setIsDirty(false)
    saveToStorage(currentRawRef.current, false)
  }

  // Called after a successful ZIP export — marks current state as the new baseline
  function markSaved() {
    originalRef.current = formData
    clearHistory()
    setIsDirty(false)
    saveToStorage(currentRawRef.current, false)
  }

  return {
    formData,
    isDirty,
    canUndo: historyLength > 0,
    loadForm,
    loadDefault,
    updateField,
    addField,
    removeField,
    moveField,
    undoLast,
    resetToOriginal,
    markSaved,
    currentRaw: currentRawRef.current,
  }
}
