import { useState, useRef, useEffect } from 'react'
import { normalizeIdd } from '../utils/jsonNormalizer'
import defaultIdd from '../schema/defaultIdd.json'

const STORAGE_KEY = 'idd-personalization-state'
const defaultNormalized = normalizeIdd(defaultIdd)

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

  // tracks the raw JSON currently loaded (for export and reset)
  const currentRawRef = useRef(stored?.formJson ?? defaultIdd)
  // tracks the original state at load time (for resetToLoaded)
  const originalRef = useRef(stored?.normalized ?? defaultNormalized)

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

  function loadForm(rawJson) {
    const normalized = normalizeIdd(rawJson)
    currentRawRef.current = rawJson
    originalRef.current = normalized
    setFormData(normalized)
    setIsDirty(false)
    saveToStorage(rawJson, false)
  }

  function loadDefault() {
    currentRawRef.current = defaultIdd
    originalRef.current = defaultNormalized
    setFormData(defaultNormalized)
    setIsDirty(false)
    clearStorage()
  }

  function updateField(key, changes) {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, ...changes } : f)),
    }))
    setIsDirty(true)
  }

  function resetToLoaded() {
    setFormData(originalRef.current)
    setIsDirty(false)
    saveToStorage(currentRawRef.current, false)
  }

  // Called after a successful ZIP export — marks current state as the new baseline
  function markSaved() {
    originalRef.current = formData
    setIsDirty(false)
    saveToStorage(currentRawRef.current, false)
  }

  function addField(newField, beforeKey) {
    setFormData((prev) => {
      const fields = [...prev.fields]
      const idx = beforeKey ? fields.findIndex((f) => f.key === beforeKey) : -1
      fields.splice(idx === -1 ? fields.length : idx, 0, newField)
      return { ...prev, fields }
    })
    setIsDirty(true)
  }

  function removeField(key) {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.key !== key),
    }))
    setIsDirty(true)
  }

  function moveField(fromKey, toKey) {
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

  return {
    formData,
    isDirty,
    loadForm,
    loadDefault,
    updateField,
    addField,
    removeField,
    moveField,
    resetToLoaded,
    markSaved,
    currentRaw: currentRawRef.current,
  }
}
