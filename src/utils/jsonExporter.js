// Removes Polish diacritics and strips non-alphanumeric characters for key slugs
function slug(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28)
}

// Builds a short English slug from a translated English text (used in new keys)
const STOP_WORDS = new Set(['the','a','an','for','of','and','or','to','in','on','is','are','has','have','with','that','this','from','all','any','by'])
function shortEngSlug(enText, maxLen = 22) {
  if (!enText) return ''
  return enText.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .join('')
    .slice(0, maxLen)
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

// Generates a key for any changed/new option using the English translation slug
function buildOptionKey(opt, siteSlug, enMap) {
  const s = siteSlug || 'custom'
  const pl = opt.customLabel || opt.value
  const en = enMap[pl] || ''
  const keySuffix = shortEngSlug(en) || slug(pl)

  if (opt.translationKey) {
    // Keep the section prefix (e.g. idd.car), replace suffix with English slug
    const parts = opt.translationKey.split('.')
    const prefix = parts.slice(0, -1).join('.')
    return `${prefix}.${s}${keySuffix}`
  }
  return `idd.custom.${s}${keySuffix}`
}

// Builds the schema object for a field that already existed in the original JSON
function buildExistingField(field, priority, siteSlug, translations, enMap) {
  const original = field._originalField ?? {}

  let titleKey = field.title_translation_key

  if (field._titleChanged) {
    const en = enMap[field.title] || ''
    // Use English slug of new title, keeping the original key prefix (e.g. idd.property)
    const originalParts = (field.title_translation_key || 'idd.custom').split('.')
    const prefix = originalParts.slice(0, -1).join('.')
    const s = siteSlug || 'custom'
    const keySuffix = shortEngSlug(en) || slug(field.title)
    titleKey = `${prefix}.${s}${keySuffix}`
    translations.push({ key: titleKey, pl: field.title, en })
  }

  const updated = { ...original, title: field.title, title_translation_key: titleKey, priority }

  // Apply current show_if from state (overrides _originalField.show_if)
  if (field.show_if) {
    updated.show_if = field.show_if
  } else {
    delete updated.show_if
  }

  if (field.type === 'checkbox-group') {
    const enumValues = field.options.map((o) => o.value)
    const enumTranslationKeys = {}
    for (const opt of field.options) {
      if (opt.customLabel !== undefined) {
        const newKey = buildOptionKey(opt, siteSlug, enMap)
        enumTranslationKeys[opt.value] = newKey
        translations.push({ key: newKey, pl: opt.customLabel, en: enMap[opt.customLabel] || '' })
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
        const newKey = buildOptionKey(opt, siteSlug, enMap)
        enumTranslationKeys[opt.value] = newKey
        translations.push({ key: newKey, pl: opt.customLabel, en: enMap[opt.customLabel] || '' })
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
function buildNewField(field, priority, siteSlug, translations, enMap) {
  const s = siteSlug || 'custom'
  const en = enMap[field.title] || ''
  const keySuffix = shortEngSlug(en) || slug(field.title)
  const titleKey = `idd.custom.${s}${keySuffix}`
  translations.push({ key: titleKey, pl: field.title, en })

  const base = { title: field.title, title_translation_key: titleKey, priority }
  if (field.show_if) base.show_if = field.show_if

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
        const k = buildOptionKey(opt, siteSlug, enMap)
        enumTranslationKeys[opt.value] = k
        const pl = opt.customLabel || opt.value
        translations.push({ key: k, pl, en: enMap[pl] || '' })
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
        const k = buildOptionKey(opt, siteSlug, enMap)
        enumTranslationKeys[opt.value] = k
        const pl = opt.customLabel || opt.value
        translations.push({ key: k, pl, en: enMap[pl] || '' })
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
export function exportIdd(internalState, siteSlug = '', enMap = {}) {
  const raw = internalState._raw
  const translations = []

  const answersProperties = {}
  internalState.fields.forEach((field, idx) => {
    const priority = idx + 1
    if (field._isNew) {
      answersProperties[field.key] = buildNewField(field, priority, siteSlug, translations, enMap)
    } else {
      answersProperties[field.key] = buildExistingField(field, priority, siteSlug, translations, enMap)
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

  // Fields with show_if are required-when-visible — Insly handles that via show_if itself.
  // Only unconditionally required fields go into then.required.
  const requiredKeys = internalState.fields
    .filter((f) => f.required && !f.show_if)
    .map((f) => f.key)

  const answersBase = { ...raw.properties?.answers }
  delete answersBase.required  // remove any legacy flat required
  const originalThen = answersBase.then || {}
  if (requiredKeys.length > 0) {
    answersBase.then = { ...originalThen, required: requiredKeys }
  } else {
    const { required: _r, ...restThen } = originalThen
    answersBase.then = Object.keys(restThen).length > 0 ? restThen : undefined
    if (!answersBase.then) delete answersBase.then
  }
  answersBase.properties = answersProperties

  const result = {
    ...raw,
    $id: updatedId,
    properties: {
      ...raw.properties,
      answers: answersBase,
      comment: exportedComment,
    },
  }

  const jsonStr = JSON.stringify(result, null, 4)

  // Deduplicate by key (last write wins)
  // Deduplicate by key, build translations.txt lines: key | PL | EN
  const seen = new Map()
  for (const t of translations) seen.set(t.key, { pl: t.pl, en: t.en || '' })
  const translationsStr = seen.size > 0
    ? [...seen.entries()].map(([k, { pl, en }]) => `${k} | ${pl} | ${en}`).join('\n')
    : ''

  return { jsonStr, translationsStr, translationCount: seen.size }
}
