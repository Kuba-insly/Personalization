# Insly Personalization Tool — dokumentacja dla Claude

## Cel biznesowy

Webowa aplikacja do personalizacji formularza IDD (Initial Disclosure Document) oraz treści maili i wydruków systemu Insly. Agenci ubezpieczeniowi mogą:
- edytować strukturę formularza IDD (kolejność pól, etykiety, opcje)
- dodawać warunki wyświetlania pól (show_if)
- oznaczać pola jako wymagane
- eksportować wynik jako JSON schema + plik tłumaczeń (ZIP)

## Skrypty npm

```
npm run dev      # dev server localhost:5173
npm run build    # build do dist/
npm run preview  # podgląd buildu
```

Vite base path: `/IDDPersonalization/`

## Mapa plików

### Komponenty (`src/components/`)

| Plik | Odpowiedzialność |
|------|-----------------|
| `FormEditor.jsx` | Render listy pól z drag-drop sortowaniem; obsługuje dwa widoki: full IDD i odmowa IDD |
| `SortableFieldItem.jsx` | Wrapper na pole: drag handle, przycisk usuń, edytor show_if, toggle required |
| `FieldItem.jsx` | Renderuje konkretny typ pola (heading/text/textarea/boolean/checkbox-group/select) + inline edycja opcji |
| `TextEditor.jsx` | Reużywalny inline edytor: klikalne pole → input/textarea; Enter/Escape/blur do commit |
| `JsonImport.jsx` | Modal do importu JSON (drag-drop pliku lub wklejenie) |
| `PlaceholderModule.jsx` | Placeholder dla modułów Mail/Wydruk (przyszłość) |
| `ExportButton.jsx` | Stub — logika eksportu jest w App.jsx |

### Hook (`src/hooks/`)

| Plik | Odpowiedzialność |
|------|-----------------|
| `useFormState.js` | Cały state management: formData, historia (undo do 50 kroków), localStorage persistence, warn-before-unload |

Akcje hooka:
- `loadForm(rawJson)` — wczytaj JSON
- `loadDefault()` — załaduj defaultIdd.json
- `updateField(key, changes)` — edytuj pole
- `addField(newField, beforeKey)` — dodaj pole
- `removeField(key)` — usuń pole (czyści orphaned show_if)
- `moveField(fromKey, toKey)` — przenieś pole (czyści invalid show_if)
- `undoLast()` — cofnij
- `resetToOriginal()` — przywróć do stanu sprzed edycji
- `markSaved()` — po eksporcie

### Utils (`src/utils/`)

| Plik | Odpowiedzialność |
|------|-----------------|
| `jsonNormalizer.js` | Raw Insly JSON Schema → internal formData format |
| `jsonExporter.js` | Internal formData → Insly JSON Schema + translations.txt; tłumaczenie PL→EN via MyMemory API |
| `translate.js` | `t(key, fallback)`, `fieldLabel(field)`, `optionLabel(opt)` |

### Dane (`src/i18n/`, `src/schema/`)

| Plik | Zawartość |
|------|-----------|
| `i18n/pl.js` | Słownik `{ translationKey: 'Polski tekst' }` dla wszystkich pól IDD |
| `schema/defaultIdd.json` | Domyślny JSON Schema IDD (draft-07) |

### Root (`src/`)

| Plik | Odpowiedzialność |
|------|-----------------|
| `App.jsx` | Layout (toolbar + tabs + workspace), DndContext, switch modułów, obsługa eksportu ZIP, import |
| `main.jsx` | Punkt wejścia React |
| `assets/styles.css` | Wszystkie style CSS (czysty CSS, bez Tailwind/Bootstrap) |

## Struktura danych — formData

```js
{
  _meta: { $id, $schema, type, title, description, required },
  _raw: <originalJSON>,
  comment: { title, title_translation_key, _originalField } | null,
  fields: [
    {
      key: string,                   // nazwa property w answers.properties
      priority: number,
      type: 'text'|'textarea'|'heading'|'boolean'|'checkbox-group'|'select'|'free-array',
      title: string,                 // polska etykieta
      title_translation_key: string,
      tag: string | undefined,
      options: [{ value, translationKey, customLabel? }],  // checkbox-group i select
      show_if: {
        fields: [{ name: 'answers.KEY', value: ['opt1', 'opt2'] }]
      } | undefined,
      required: boolean,
      _originalField: object,        // oryginał z JSON (do eksportu)
      _isNew: boolean,               // dodane w edytorze
      _titleChanged: boolean,        // tytuł zmieniony przez użytkownika
    }
  ]
}
```

## Struktura JSON Schema (format Insly)

```
root
├── $id, $schema, type, title, required
└── properties
    ├── customer_data, quote_id, policy_numbers, status
    ├── answers (najważniejszy)
    │   ├── type: "object"
    │   ├── properties: { <KEY>: <fieldDef>, ... }
    │   ├── required: [...]            // zawsze wymagane
    │   └── allOf: [{ if, then }]     // warunkowo wymagane
    └── comment
```

Struktura definicji pola w `answers.properties`:
```js
{
  priority: number,
  type: 'boolean'|'object'|'array'|'string',
  title: 'Polska etykieta',
  title_translation_key: 'idd.section.field',
  tag: string | undefined,
  show_if: { fields: [{ name: 'answers.KEY', value: [...] }] } | undefined,

  // array (checkbox-group):
  items: { type: 'string', enum: [...], enum_translation_keys: { val: 'key' } }

  // string (text/textarea/select):
  format: 'textarea' | undefined,
  field_type: 'select' | undefined,
  enum: [...],
  enum_translation_keys: { val: 'key' }
}
```

## Przepływ danych

```
Import JSON
  → jsonNormalizer.normalizeIdd() → formData
    → useFormState (state + history + localStorage)
      → App.jsx (layout + DndContext)
        → FormEditor (lista pól)
          → SortableFieldItem (drag handle + controls)
            → FieldItem (renderowanie typu)
              → TextEditor (inline edycja)

Eksport:
  formData → jsonExporter → { JSON, translations.txt } → JSZip → download
```

## Wzorce i konwencje

### Drag and Drop (@dnd-kit)
- `DndContext` na poziomie `App.jsx` (obsługuje toolbox i pole)
- `useSortable` w `SortableFieldItem` dla pól formularza
- `PointerSensor` z `activationConstraint: { distance: 5 }` (zapobiega drag przy kliknięciu)
- Drag opcji wewnątrz `FieldItem` dla checkbox-group

### Show_if (warunki wyświetlania)
- Edytowalne tylko dla pól text/textarea
- Warunek odwołuje się do poprzedniego pola checkbox-group lub select w tej samej sekcji
- Tryby: "Jakikolwiek zaznaczony" lub konkretne opcje
- Niektóre pola mają `locked` warunek (np. `car_comment`)

### Required (wymagane pola)
- `required: true` bez `show_if` → dodawane do `answers.required`
- `required: true` z `show_if` → generuje `allOf/if-then` w eksporcie
- Dla pól w sekcji (heading): required ustawia show_if dla wszystkich opcji sekcji

### Inline edycja (TextEditor)
- Kliknięcie etykiety → input/textarea z auto-resize
- Enter lub blur → commit (onSave)
- Escape → anuluj

### Tłumaczenia
- Klucze: `idd.section.field` (hierarchia)
- `pl.js` → mapa klucz → tekst PL
- Eksport generuje angielskie wersje via MyMemory API

## Kolory CSS (główne)

| Użycie | Wartość |
|--------|---------|
| Tło strony | `#f0f2f5` |
| Toolbar | `#1a1a1a` |
| Primary button | `#ca6000` (pomarańczowy) |
| Dirty badge | `#fbbf24` (żółty) |
| Success | `#22c55e` (zielony) |
| Tekst | `#111111` |

## Moduły (zakładki w UI)

| Moduł | Status |
|-------|--------|
| IDD | Zaimplementowany |
| Mail APK | Placeholder |
| Mail RODO | Placeholder |
| Wydruk APK | Placeholder |
| Wydruk RODO | Placeholder |
| Wydruk oferty | Placeholder |

## Widoki IDD

- **Pełne IDD** — wszystkie pola formularza
- **Odmowa IDD** — tylko pola `refusal` i `agreementforemail`

## Zewnętrzne zależności

| Pakiet | Użycie |
|--------|--------|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Drag and drop |
| `jszip` | Pakowanie eksportu do ZIP |
| MyMemory API | Tłumaczenie PL→EN (fetch w App.jsx, brak klucza API) |
