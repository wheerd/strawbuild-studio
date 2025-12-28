# Internationalization (i18n)

This directory contains the internationalization infrastructure for Strawbaler.

## Current Status

✅ **Implemented**: Locale-aware number formatting  
❌ **Not Yet Implemented**: UI string translations (see `/docs/i18n-implementation-plan.md` for roadmap)

## Supported Languages

- **English (en)** - Default
- **German (de)** - Test locale for number formatting

## File Structure

```
src/shared/i18n/
├── config.ts           # i18next configuration and initialization
├── formatters.ts       # Locale-aware number formatting functions
├── useFormatters.ts    # React hook for formatting functions
├── locales/
│   ├── en/
│   │   └── common.json # English translations (placeholder)
│   └── de/
│       └── common.json # German translations (placeholder)
└── README.md           # This file
```

## Usage

### In React Components

Use the `useFormatters()` hook to get locale-aware formatting functions:

```typescript
import { useFormatters } from '@/shared/i18n/useFormatters'

function MyComponent() {
  const { formatLength, formatArea, formatWeight } = useFormatters()

  return (
    <div>
      <Text>Length: {formatLength(1234)}</Text>         {/* "1.234m" in EN, "1,234m" in DE */}
      <Text>Area: {formatArea(1500000)}</Text>          {/* "1.50m²" in EN, "1,50m²" in DE */}
      <Text>Weight: {formatWeight(500)}</Text>          {/* "500 kg" in both */}
    </div>
  )
}
```

### In Non-React Code

Import formatters directly with explicit locale parameter:

```typescript
import * as formatters from '@/shared/i18n/formatters'

const formatted = formatters.formatLength(1234, 'de') // "1,234m"
```

### Available Formatters

| Function                    | Input            | Output Example (EN / DE) |
| --------------------------- | ---------------- | ------------------------ |
| `formatLength(mm)`          | Length in mm     | `1.234m` / `1,234m`      |
| `formatLengthInMeters(mm)`  | Length in mm     | `1.234m` / `1,234m`      |
| `formatArea(mm²)`           | Area in mm²      | `1.50m²` / `1,50m²`      |
| `formatVolume(mm³)`         | Volume in mm³    | `1.50m³` / `1,50m³`      |
| `formatVolumeInLiters(mm³)` | Volume in mm³    | `1.5L` / `1,5L`          |
| `formatWeight(kg)`          | Weight in kg     | `1,234 kg` / `1.234 kg`  |
| `formatPercentage(%)`       | Percentage       | `12.5%` / `12,5%`        |
| `formatAngle(°)`            | Angle in degrees | `45.5°` / `45,5°`        |

## Number Formatting Differences by Locale

| Locale       | Decimal Separator | Thousands Separator | Example    |
| ------------ | ----------------- | ------------------- | ---------- |
| EN (English) | `.` (period)      | `,` (comma)         | `1,234.56` |
| DE (German)  | `,` (comma)       | `.` (period)        | `1.234,56` |

## Language Switching

Users can switch languages via the globe icon (🌐) in the status bar, next to the theme toggle.

The selected language is automatically:

- Detected from browser settings on first visit
- Saved to `localStorage` for persistence
- Applied to all number formatting throughout the app

## Backward Compatibility

The old formatting utility functions in `src/shared/utils/formatting.ts` continue to work but now default to English locale. These are deprecated in favor of the `useFormatters()` hook:

```typescript
// ❌ Old way (still works, but deprecated)
import { formatLength } from '@/shared/utils/formatting'
const text = formatLength(1234)  // Always uses 'en' locale

// ✅ New way (locale-aware)
import { useFormatters } from '@/shared/i18n/useFormatters'
const { formatLength } = useFormatters()  // Respects user's language
const text = formatLength(1234)
```

## Migration Status

### Migrated Components (use `useFormatters()` hook)

- ✅ `StoreyInspector` - Storey measurements and statistics
- ✅ `PerimeterInspector` - Perimeter measurements
- ✅ `ConstructionPartsList` - Parts list (helper functions support locale parameter)

### Pending Components (use old `formatLength` imports)

- All other components (~35 files) continue to work with default English locale
- Gradual migration planned

## Future Work

See `/docs/i18n-implementation-plan.md` for the full roadmap, including:

- **Phase 2**: Extract and translate UI strings (~1,500-2,000 strings)
- **Additional languages**: French, Spanish, etc.
- **Translation workflow**: Set up translation management system
- **RTL support**: If needed for Arabic/Hebrew

## Technical Details

### Libraries Used

- **i18next** (^25.7.3) - Core i18n framework
- **react-i18next** (^16.5.0) - React bindings for i18next
- **i18next-browser-languagedetector** (^8.2.0) - Auto-detect user language

### Configuration

The i18n system is initialized in `src/app/main.tsx` and configured in `src/shared/i18n/config.ts`.

Key settings:

- **Fallback language**: English (`en`)
- **Detection order**: localStorage → browser navigator
- **Cache**: localStorage
- **Debug mode**: Enabled in development

### Adding a New Language

1. Create locale directory: `src/shared/i18n/locales/[code]/`
2. Add `common.json` placeholder file
3. Update `config.ts` to import and register the new locale
4. Add language to `LanguageSwitcher.tsx` component

Example for French:

```typescript
// In config.ts
import commonFR from './locales/fr/common.json'

const resources = {
  en: { common: commonEN },
  de: { common: commonDE },
  fr: { common: commonFR } // Add this
}

// In LanguageSwitcher.tsx
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' } // Add this
]
```

## Testing

To test locale formatting:

1. Start the dev server: `pnpm dev`
2. Open the app in your browser
3. Click the globe icon (🌐) in the bottom-left corner
4. Switch between English and German
5. Observe number formatting changes in:
   - Inspector panels (areas, lengths, volumes)
   - Parts list (quantities, weights)
   - Any component using `useFormatters()`

Example differences to look for:

- English: `1.234m`, `1.50m²`, `1,234 kg`
- German: `1,234m`, `1,50m²`, `1.234 kg`

---

**Last Updated**: December 2025  
**Implemented By**: Phase 1 & 3 of i18n Implementation Plan
