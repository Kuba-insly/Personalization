# Insly Personalization Tool

Webowa aplikacja do personalizacji konfiguracji Insly: formularze IDD, treści maili, wydruki.

## Wymagania

- [Node.js](https://nodejs.org/) v18 lub nowszy
- npm (dołączony do Node.js)

## Uruchomienie lokalne

```bash
# Sklonuj repozytorium
git clone <URL_REPOZYTORIUM>
cd Personalization

# Zainstaluj zależności
npm install

# Uruchom dev server
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:5173

## Pliki referencyjne

Przed rozpoczęciem pracy (Zadanie 1) wrzuć do folderu `reference/`:

| Plik | Opis |
|------|------|
| `idd-default.json` | Domyślny formularz IDD z Insly (baza) |
| `idd-customization-*.json` | Przykładowe personalizacje (partial JSON) |
| `idd-screenshot-*.png` | Zrzuty ekranu aktualnego formularza |

## Plan zadań

| Zadanie | Opis | Status |
|---------|------|--------|
| 0 | Struktura projektu + Git | ✅ Done |
| 1 | Analiza plików referencyjnych + schemat danych | ⏳ Czeka na pliki w `reference/` |
| 2 | Renderer formularza (widok tylko do odczytu) | 🔒 |
| 3 | Edytor pól (edycja etykiet i tekstu) | 🔒 |
| 4 | Edytor struktury (dodaj/usuń/przesuń) | 🔒 |
| 5 | Eksport JSON | 🔒 |
| 6 | UI i dopracowanie | 🔒 |

## Build produkcyjny

```bash
npm run build
```

Pliki wyjściowe znajdą się w folderze `dist/`.
