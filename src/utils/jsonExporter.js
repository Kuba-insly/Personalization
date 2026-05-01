// Rebuilds the items object for a checkbox-group field from the internal options array
function buildItems(internalField) {
  const original = internalField._originalField
  if (internalField.type !== 'checkbox-group') return original.items

  const enumValues = internalField.options.map((o) => o.value)
  const enumTranslationKeys = Object.fromEntries(
    internalField.options.map((o) => [o.value, o.translationKey])
  )

  return {
    ...original.items,
    enum: enumValues,
    enum_translation_keys: enumTranslationKeys,
  }
}

// Rebuilds a single answers.properties field from an internal field object
function buildField(internalField) {
  const original = internalField._originalField
  const updated = {
    ...original,
    title: internalField.title,
    title_translation_key: internalField.title_translation_key,
    priority: internalField.priority,
  }

  if (internalField.type === 'checkbox-group') {
    updated.items = buildItems(internalField)
  }

  if (internalField.type === 'select') {
    updated.enum = internalField.options.map((o) => o.value)
    updated.enum_translation_keys = Object.fromEntries(
      internalField.options.map((o) => [o.value, o.translationKey])
    )
  }

  return updated
}

/**
 * Converts the internal editor state back to a full Insly-compatible JSON Schema.
 * Preserves all original keys not modeled by the editor (pass-through).
 * Returns a formatted JSON string ready for download.
 */
export function exportIdd(internalState) {
  const raw = internalState._raw

  // Rebuild answers.properties from the fields array (sorted by priority)
  const answersProperties = {}
  for (const field of internalState.fields) {
    answersProperties[field.key] = buildField(field)
  }

  const exportedComment = internalState.comment
    ? {
        ...internalState.comment._originalField,
        title: internalState.comment.title,
        title_translation_key: internalState.comment.title_translation_key,
      }
    : raw.properties?.comment

  const result = {
    ...raw,
    properties: {
      ...raw.properties,
      answers: {
        ...raw.properties?.answers,
        properties: answersProperties,
      },
      comment: exportedComment,
    },
  }

  return JSON.stringify(result, null, 4)
}
