const MODULE_LABELS = {
  'mail-apk':    'Mail APK',
  'mail-rodo':   'Mail RODO',
  'print-apk':   'Wydruk APK',
  'print-rodo':  'Wydruk RODO',
  'print-offer':    'Wydruk oferty',
  'sales-packages': 'Pakiety sprzedaży',
}

export default function PlaceholderModule({ module }) {
  return (
    <div className="module-placeholder">
      <div className="module-placeholder-icon">🚧</div>
      <div className="module-placeholder-title">{MODULE_LABELS[module] ?? module}</div>
      <div className="module-placeholder-desc">Ten moduł będzie dostępny wkrótce.</div>
    </div>
  )
}
