import { useState, useRef, useEffect } from 'react'
import { normalizeIdd } from '../utils/jsonNormalizer'
import defaultIdd from '../schema/defaultIdd.json'

const STORAGE_KEY = 'idd-personalization-state'

function getSectionParentFromList(fieldKey, fields) {
  const idx = fields.findIndex((f) => f.key === fieldKey)
  if (idx <= 0) return null
  for (let i = idx - 1; i >= 0; i--) {
    if (fields[i].type === 'heading') return null
    if (fields[i].type === 'checkbox-group' || fields[i].type === 'select') return fields[i]
  }
  return null
}
const defaultNormalized = normalizeIdd(defaultIdd)
const HISTORY_LIMIT = 50

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { formJson, isDirty } = JSON.parse(raw)
    // If stored form is the default schema with no unsaved changes, always use the
    // current defaultIdd.json so updates (e.g. new required fields) are reflected.
    if (!isDirty && formJson?.$id === defaultIdd.$id) return null
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
    if (key === '__comment') {
      setFormData((prev) => ({
        ...prev,
        comment: prev.comment ? { ...prev.comment, ...changes } : prev.comment,
      }))
    } else {
      setFormData((prev) => {
        let fields = prev.fields.map((f) => (f.key === key ? { ...f, ...changes } : f))

        // When options change on a field, clean up orphaned show_if on other fields
        if (changes.options) {
          const currentField = prev.fields.find((f) => f.key === key)
          if (currentField) {
            const newValueSet = new Set((changes.options).map((o) => o.value))
            const removedValues = (currentField.options || [])
              .map((o) => o.value)
              .filter((v) => !newValueSet.has(v))

            if (removedValues.length > 0) {
              fields = fields.map((f) => {
                if (!f.show_if?.fields?.length) return f
                const { name, value: condValues } = f.show_if.fields[0]
                if (name.replace('answers.', '') !== key) return f
                const remaining = (condValues || []).filter((v) => !removedValues.includes(v))
                if (remaining.length === condValues.length) return f
                if (remaining.length === 0) return { ...f, show_if: null }
                return { ...f, show_if: { fields: [{ name, value: remaining }] } }
              })
            }
          }
        }

        return { ...prev, fields }
      })
    }
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
      fields: prev.fields
        .filter((f) => f.key !== key)
        .map((f) => {
          if (!f.show_if?.fields?.length) return f
          const parentKey = f.show_if.fields[0].name.replace('answers.', '')
          if (parentKey !== key) return f
          return { ...f, show_if: null }
        }),
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

      // If the moved field had a show_if, check if its new section parent still matches.
      // If not, clear the condition to avoid a dangling reference.
      const movedIdx = fields.findIndex((f) => f.key === fromKey)
      const moved = fields[movedIdx]
      if (moved?.show_if?.fields?.length) {
        const condParentKey = moved.show_if.fields[0].name.replace('answers.', '')
        const newSectionParent = getSectionParentFromList(fromKey, fields)
        if (!newSectionParent || newSectionParent.key !== condParentKey) {
          fields[movedIdx] = { ...moved, show_if: null }
        }
      }

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
