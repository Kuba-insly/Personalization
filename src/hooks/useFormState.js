import { useState, useRef } from 'react'
import { normalizeIdd } from '../utils/jsonNormalizer'
import defaultIdd from '../schema/defaultIdd.json'

const defaultNormalized = normalizeIdd(defaultIdd)

export function useFormState() {
  const [formData, setFormData] = useState(defaultNormalized)
  const originalRef = useRef(defaultNormalized)
  const [isDirty, setIsDirty] = useState(false)

  function loadForm(rawJson) {
    const normalized = normalizeIdd(rawJson)
    setFormData(normalized)
    originalRef.current = normalized
    setIsDirty(false)
  }

  function updateField(key, changes) {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, ...changes } : f)),
    }))
    setIsDirty(true)
  }

  function resetToOriginal() {
    setFormData(originalRef.current)
    setIsDirty(false)
  }

  return {
    formData,
    isDirty,
    loadForm,
    updateField,
    resetToOriginal,
    originalRaw: originalRef.current?._raw,
  }
}
