// Determines our internal field type from the raw JSON Schema field definition
function resolveFieldType(field) {
  if (field.type === 'boolean') return 'boolean'
  if (field.type === 'object') return 'heading'
  if (field.type === 'array') {
    if (field.items?.enum) return 'checkbox-group'
    return 'free-array'
  }
  if (field.type === 'string') {
    if (field.field_type === 'select') return 'select'
    if (field.format === 'textarea') return 'textarea'
    return 'text'
  }
  return 'text'
}

// Extracts ordered options array from a checkbox-group or select field
function resolveOptions(field) {
  if (field.type === 'array' && field.items?.enum) {
    return field.items.enum.map((value) => ({
      value,
      translationKey: field.items.enum_translation_keys?.[value] ?? value,
    }))
  }
  if (field.field_type === 'select' && field.enum) {
    return field.enum.map((value) => ({
      value,
      translationKey: field.enum_translation_keys?.[value] ?? value,
    }))
  }
  return []
}

/**
 * Converts a raw Insly IDD JSON Schema into the internal representation used by the editor.
 *
 * Internal shape:
 * {
 *   _meta: { $id, $schema, type, title, description, required, ... },
 *   _raw: <original JSON>,
 *   comment: { title, title_translation_key, _originalField },
 *   fields: [
 *     {
 *       key: string,               // property name in answers.properties
 *       priority: number,
 *       type: 'boolean' | 'heading' | 'checkbox-group' | 'free-array' | 'text' | 'textarea' | 'select',
 *       title: string,
 *       title_translation_key: string,
 *       tag: string | undefined,
 *       options: Array<{ value, translationKey }>,  // for checkbox-group and select
 *       show_if: object | undefined,
 *       _originalField: object,    // full original field, preserved for export
 *     }
 *   ]
 * }
 */
export function normalizeIdd(rawJson) {
  const answersProperties = rawJson?.properties?.answers?.properties ?? {}
  const commentField = rawJson?.properties?.comment

  const answersRequired = new Set([
    ...(rawJson?.properties?.answers?.required ?? []),
    ...(rawJson?.properties?.answers?.then?.required ?? []),
  ])

  const fields = Object.entries(answersProperties)
    .map(([key, field]) => ({
      key,
      priority: field.priority ?? 999,
      type: resolveFieldType(field),
      title: field.title ?? key,
      title_translation_key: field.title_translation_key ?? '',
      tag: field.tag,
      options: resolveOptions(field),
      show_if: field.show_if,
      required: answersRequired.has(key),
      _originalField: field,
    }))
    .sort((a, b) => a.priority - b.priority)

  const { properties: _p, description: _d, ...restMeta } = rawJson
  const meta = {
    ...restMeta,
    description: rawJson.description,
    required: rawJson.required,
  }

  return {
    _meta: meta,
    _raw: rawJson,
    comment: commentField
      ? {
          title: commentField.title ?? 'Comment',
          title_translation_key: commentField.title_translation_key ?? 'idd.comment',
          _originalField: commentField,
        }
      : null,
    fields,
  }
}
