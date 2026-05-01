import pl from '../i18n/pl.js'

/**
 * Returns the Polish label for a given translation key.
 * Falls back to `fallback` if the key is not in the translations file.
 */
export function t(key, fallback = '') {
  return pl[key] ?? fallback
}

/**
 * Returns the best display label for a field:
 * 1. Polish translation for title_translation_key (if found)
 * 2. title from JSON (already Polish in custom schemas)
 * 3. key as last resort
 */
export function fieldLabel(field) {
  if (field.title_translation_key) {
    const translated = pl[field.title_translation_key]
    if (translated) return translated
  }
  return field.title || field.key
}

/**
 * Returns the best display label for a checkbox/radio option:
 * 1. Polish translation for translationKey (if found)
 * 2. translationKey string cleaned up (last segment after dot)
 */
export function optionLabel(opt) {
  if (opt.translationKey && pl[opt.translationKey]) {
    return pl[opt.translationKey]
  }
  // Fallback: last segment of the translation key, e.g. "idd.car.mtplSafre" → "mtplSafre"
  if (opt.translationKey?.includes('.')) {
    return opt.translationKey.split('.').pop()
  }
  return opt.value
}
