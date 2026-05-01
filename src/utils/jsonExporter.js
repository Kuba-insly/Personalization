// Removes Polish diacritics and strips non-alphanumeric characters for key slugs
function slug(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28)
}

// Generates a new translation key by inserting siteSlug before the last segment
// e.g. generateKey('idd.car.mtpl', 'piotrektest') → 'idd.car.piotrektestmtpl'
function generateKey(originalKey, siteSlug) {
  const s = siteSlug || 'custom'
  if (!originalKey) return `idd.custom.${s}`
  const parts = originalKey.split('.')
  const last = parts[parts.length - 1]
  const prefix = parts.slice(0, -1).join('.')
  return `${prefix}.${s}${last}`
}

// Generates a key for a new or renamed option
function optionKey(opt, siteSlug) {
  const s = siteSlug || 'custom'
  if (!opt.translationKey) {
    return `idd.custom.${s}${slug(opt.customLabel || opt.value)}`
  }
  return generateKey(opt.translationKey, siteSlug)
}

// Builds the schema object for a field that already existed in the original JSON
function buildExistingField(field, priority, siteSlug, translations) {
  const original = field._originalField ?? {}

  let titleKey = field.title_translation_key

  if (field._titleChanged) {
    titleKey = generateKey(field.title_translation_key, siteSlug)
    translations.push({ key: titleKey, pl: field.title })
  }

  const updated = { ...original, title: field.title, title_translation_key: titleKey, priority }

  if (field.type === 'checkbox-group') {
    const enumValues = field.options.map((o) => o.value)
    const enumTranslationKeys = {}
    for (const opt of field.options) {
      if (opt.customLabel !== undefined) {
        const newKey = optionKey(opt, siteSlug)
        enumTranslationKeys[opt.value] = newKey
        translations.push({ key: newKey, pl: opt.customLabel })
      } else {
        enumTranslationKeys[opt.value] = opt.translationKey
      }
    }
    updated.items = { ...original.items, enum: enumValues, enum_translation_keys: enumTranslationKeys }
  }

  if (field.type === 'select') {
    const enumValues = field.options.map((o) => o.value)
    const enumTranslationKeys = {}
    for (const opt of field.options) {
      if (opt.customLabel !== undefined) {
        const newKey = optionKey(opt, siteSlug)
        enumTranslationKeys[opt.value] = newKey
        translations.push({ key: newKey, pl: opt.customLabel })
      } else {
        enumTranslationKeys[opt.value] = opt.translationKey
      }
    }
    updated.enum = enumValues
    updated.enum_translation_keys = enumTranslationKeys
  }

  return updated
}

// Builds the schema object for a brand-new field created in the editor
function buildNewField(field, priority, siteSlug, translations) {
  const s = siteSlug || 'custom'
  const titleKey = `idd.custom.${s}${slug(field.title)}`
  translations.push({ key: titleKey, pl: field.title })

  const base = { title: field.title, title_translation_key: titleKey, priority }

  switch (field.type) {
    case 'heading':
      return { ...base, type: 'object', properties: {} }
    case 'boolean':
      return { ...base, type: 'boolean' }
    case 'text':
      return { ...base, type: 'string' }
    case 'textarea':
      return { ...base, type: 'string', format: 'textarea' }
    case 'checkbox-group': {
      const enumValues = field.options.map((o) => o.value)
      const enumTranslationKeys = {}
      for (const opt of field.options) {
        const k = optionKey(opt, siteSlug)
        enumTranslationKeys[opt.value] = k
        translations.push({ key: k, pl: opt.customLabel || opt.value })
      }
      return {
        ...base,
        type: 'array',
        items: { type: 'string', enum: enumValues, enum_translation_keys: enumTranslationKeys },
      }
    }
    case 'select': {
      const enumValues = field.options.map((o) => o.value)
      const enumTranslationKeys = {}
      for (const opt of field.options) {
        const k = optionKey(opt, siteSlug)
        enumTranslationKeys[opt.value] = k
        translations.push({ key: k, pl: opt.customLabel || opt.value })
      }
      return { ...base, type: 'string', field_type: 'select', enum: enumValues, enum_translation_keys: enumTranslationKeys }
    }
    default:
      return { ...base, type: 'string' }
  }
}

/**
 * Exports the current editor state as:
 *   jsonStr        — full Insly-compatible JSON schema string
 *   translationsStr — translations.txt content (key | PL | EN) for new/changed keys only
 *   translationCount — how many new/changed keys were found
 */
export function exportIdd(internalState, siteSlug = '') {
  const raw = internalState._raw
  const translations = []

  const answersProperties = {}
  internalState.fields.forEach((field, idx) => {
    const priority = idx + 1
    if (field._isNew) {
      answersProperties[field.key] = buildNewField(field, priority, siteSlug, translations)
    } else {
      answersProperties[field.key] = buildExistingField(field, priority, siteSlug, translations)
    }
  })

  const exportedComment = internalState.comment
    ? { ...internalState.comment._originalField, title: internalState.comment.title }
    : raw.properties?.comment

  // Replace the last segment of $id with siteSlug (e.g. /idd/default → /idd/piotrektest)
  let updatedId = raw.$id
  if (siteSlug && raw.$id) {
    const parts = raw.$id.split('/')
    parts[parts.length - 1] = siteSlug
    updatedId = parts.join('/')
  }

  const result = {
    ...raw,
    $id: updatedId,
    properties: {
      ...raw.properties,
      answers: { ...raw.properties?.answers, properties: answersProperties },
      comment: exportedComment,
    },
  }

  const jsonStr = JSON.stringify(result, null, 4)

  // Deduplicate by key (last write wins)
  const seen = new Map()
  for (const t of translations) seen.set(t.key, t.pl)
  const translationsStr = seen.size > 0
    ? [...seen.entries()].map(([k, pl]) => `${k} | ${pl} | `).join('\n')
    : ''

  return { jsonStr, translationsStr, translationCount: seen.size }
}
