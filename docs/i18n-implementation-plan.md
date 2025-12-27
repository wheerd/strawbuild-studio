# Internationalization (i18n) Implementation Plan for Strawbaler

> **Status:** This is a planning document for future internationalization support. i18n is not currently implemented in Strawbaler. This document serves as a roadmap for when the project is ready to add multi-language support.

## Executive Summary

This document outlines a comprehensive plan for implementing internationalization (i18n) in the Strawbaler application to support multiple languages and locale-specific number formatting. The plan focuses on translation support while maintaining metric units (no imperial unit conversion).

**Current State:**

- ✅ Already using `Intl.NumberFormat` for some formatting
- ✅ Already using `localeCompare` for string sorting
- ❌ No i18n infrastructure - all text is hardcoded in English
- ❌ ~1,500-2,000 translatable strings across the application
- ❌ Number formatting utilities use `.toFixed()` which isn't locale-aware

---

## Scope of Translation Work

### 1. UI Labels & Navigation (~300-400 strings)

- Toolbar buttons, tool names, menu items
- Example: "View Construction Plan", "Configuration", "About"

### 2. Inspector Panels (~200-250 strings)

- Field labels like "Wall Thickness", "Total Inner Perimeter", "Wall Assembly"
- Technical measurements: "Wall-to-window ratio (WWR)", "Surface-area-to-volume ratio (SA:V)"

### 3. Configuration & Materials (~150-200 strings)

- Material types: "Dimensional", "Strawbale", "Sheet", "Volume"
- Assembly types and configuration options
- Material properties: "Cross Sections", "Stock Lengths", "Density"

### 4. Tooltips (~200-300 strings)

- Throughout the app on buttons and tools

### 5. Error & Validation Messages (~100-150 strings)

- "Perimeter boundary must have at least 3 points"
- "Wall thickness must be greater than 0"

### 6. Welcome Modal & Documentation (~50-80 strings)

- Onboarding text, disclaimers, feature descriptions

### 7. Parts List & Construction Terms (~200-250 strings)

- Table headers, part types, issue messages
- Construction-specific terminology requiring domain expertise

**Total: ~1,500-2,000 strings**

---

## Library Recommendations

### Primary Library: react-i18next

**Why react-i18next?**

- ✅ Most popular React i18n solution (~4M weekly downloads)
- ✅ Excellent TypeScript support
- ✅ Powerful features: pluralization, interpolation, context, namespaces
- ✅ Lazy loading of translations
- ✅ Great developer experience with hooks (`useTranslation`)
- ✅ Can extract translations from code automatically
- ✅ Active maintenance and large ecosystem

**Alternatives considered:**

- **react-intl (Format.js)**: Good, but more verbose API and less flexible
- **next-intl**: Only for Next.js apps
- **lingui**: Good but smaller ecosystem

### Supporting Libraries

1. **@formatjs/intl** - Polyfills for `Intl` APIs
   - Ensures consistent number/date formatting across browsers

2. **i18next-browser-languageDetector**
   - Auto-detect user's preferred language from browser settings

3. **i18next-http-backend** (optional)
   - Load translation files dynamically (for larger apps)

---

## Implementation Plan

### Phase 1: Infrastructure Setup (1-2 days)

#### 1.1 Install Dependencies

```bash
pnpm add react-i18next i18next i18next-browser-languagedetector
pnpm add -D @types/i18next
```

#### 1.2 Create File Structure

```
src/shared/i18n/
├── config.ts
├── formatters.ts
├── useFormatters.ts
├── locales/
│   ├── en/
│   │   ├── common.json      # Buttons, actions, common UI
│   │   ├── toolbar.json     # Toolbar and tools
│   │   ├── inspector.json   # Inspector panels
│   │   ├── materials.json   # Materials and assemblies
│   │   ├── construction.json # Construction terminology
│   │   ├── errors.json      # Error messages
│   │   └── welcome.json     # Welcome modal content
│   └── de/                  # German (example second language)
│       └── [same structure]
```

#### 1.3 Set Up i18next Configuration

Create `src/shared/i18n/config.ts`:

```typescript
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

// Import translation files
import commonEN from './locales/en/common.json'
import constructionEN from './locales/en/construction.json'
import errorsEN from './locales/en/errors.json'
import inspectorEN from './locales/en/inspector.json'
import materialsEN from './locales/en/materials.json'
import toolbarEN from './locales/en/toolbar.json'
import welcomeEN from './locales/en/welcome.json'

const resources = {
  en: {
    common: commonEN,
    toolbar: toolbarEN,
    inspector: inspectorEN,
    materials: materialsEN,
    construction: constructionEN,
    errors: errorsEN,
    welcome: welcomeEN
  }
  // Add more languages here
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'toolbar', 'inspector', 'materials', 'construction', 'errors', 'welcome'],

    interpolation: {
      escapeValue: false // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n
```

#### 1.4 Create Locale-Aware Formatters

Create `src/shared/i18n/formatters.ts`:

```typescript
import type { Area, Length, Volume } from '@/shared/geometry'

/**
 * Formats a length value (in mm) with locale-aware number formatting.
 */
export function formatLength(lengthInMm: Length, locale: string = 'en'): string {
  const value = Math.round(lengthInMm)

  if (value === 0) {
    return '0m'
  }

  // For small values, use mm
  if (Math.abs(value) < 100 && value % 10 !== 0) {
    return `${value}mm`
  }

  // For medium values divisible by 10, use cm
  if (Math.abs(value) < 200 && value % 10 === 0) {
    const cm = value / 10
    return `${cm}cm`
  }

  // For larger values, use meters with locale-aware formatting
  const meters = value / 1000
  let formatter: Intl.NumberFormat

  if (value % 1000 === 0) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  } else if (value % 100 === 0) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  } else if (value % 10 === 0) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } else {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  return `${formatter.format(meters)}m`
}

export function formatLengthInMeters(length: number, locale: string = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return `${formatter.format(length / 1000)}m`
}

const MM2_PER_M2 = 1_000_000
const MM3_PER_M3 = 1_000_000_000
const MM3_PER_LITER = 1_000_000

export function formatArea(area: Area, locale: string = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatter.format(area / MM2_PER_M2)}m²`
}

export function formatVolume(volume: Volume, locale: string = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatter.format(volume / MM3_PER_M3)}m³`
}

export function formatVolumeInLiters(volume: Volume, locale: string = 'en'): string {
  const liters = volume / MM3_PER_LITER
  const decimals = liters === Math.round(liters) ? 0 : 1
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  return `${formatter.format(liters)}L`
}

export function formatWeight(weight: number, locale: string = 'en'): string {
  // Weight in kg
  if (weight >= 1000) {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 })
    return `${formatter.format(weight / 1000)} t`
  }
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  return `${formatter.format(weight)} kg`
}

export function formatPercentage(value: number, locale: string = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${formatter.format(value)}%`
}

export function formatAngle(degrees: number, locale: string = 'en'): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${formatter.format(degrees)}°`
}
```

Create `src/shared/i18n/useFormatters.ts`:

```typescript
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import * as formatters from './formatters'

export function useFormatters() {
  const { i18n } = useTranslation()
  const locale = i18n.language

  return useMemo(
    () => ({
      formatLength: (mm: number) => formatters.formatLength(mm, locale),
      formatLengthInMeters: (mm: number) => formatters.formatLengthInMeters(mm, locale),
      formatArea: (mm2: number) => formatters.formatArea(mm2, locale),
      formatVolume: (mm3: number) => formatters.formatVolume(mm3, locale),
      formatVolumeInLiters: (mm3: number) => formatters.formatVolumeInLiters(mm3, locale),
      formatWeight: (kg: number) => formatters.formatWeight(kg, locale),
      formatPercentage: (value: number) => formatters.formatPercentage(value, locale),
      formatAngle: (degrees: number) => formatters.formatAngle(degrees, locale)
    }),
    [locale]
  )
}
```

#### 1.5 Wrap App with i18n Provider

Update `src/app/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'

import '@/shared/i18n/config' // Import i18n config
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

### Phase 2: Extract & Replace Strings (5-10 days)

#### Priority Order

**High Priority - Frequently Seen UI (Days 1-3)**

1. Common actions (Save, Cancel, Delete, etc.) → `common.json`
2. Main toolbar buttons → `toolbar.json`
3. Tool names and tooltips → `toolbar.json`
4. Status bar messages → `common.json`

**Medium Priority - Configuration (Days 4-6)**

5. Inspector panel labels → `inspector.json`
6. Material configuration → `materials.json`
7. Assembly configuration → `materials.json`

**Lower Priority - Technical Content (Days 7-10)**

8. Welcome modal → `welcome.json`
9. Error messages → `errors.json`
10. Parts list details → `construction.json`
11. Validation messages → `errors.json`

#### Example Transformations

**Before:**

```tsx
// src/editor/MainToolbar.tsx
<IconButton title="View Construction Plan" size="2" variant="solid">
  <ConstructionPlanIcon width={20} height={20} aria-hidden />
</IconButton>
```

**After:**

```tsx
// src/editor/MainToolbar.tsx
import { useTranslation } from 'react-i18next'

function MainToolbar() {
  const { t } = useTranslation('toolbar')

  return (
    <IconButton title={t('viewConstructionPlan')} size="2" variant="solid">
      <ConstructionPlanIcon width={20} height={20} aria-hidden />
    </IconButton>
  )
}
```

**Before:**

```tsx
// Validation in store
throw new Error('Perimeter boundary must have at least 3 points')
```

**After:**

```tsx
import i18n from '@/shared/i18n/config'

throw new Error(i18n.t('errors:perimeter.minPoints'))
```

---

### Phase 3: Number & Date Formatting (2-3 days)

#### 3.1 Update Existing Formatting Utilities

Update `src/shared/utils/formatting.ts` to use the new locale-aware formatters:

```typescript
// Re-export from i18n formatters for backward compatibility
export {
  formatLength,
  formatLengthInMeters,
  formatArea,
  formatVolume,
  formatVolumeInLiters
} from '@/shared/i18n/formatters'
```

Add deprecation notice and gradually migrate to using `useFormatters()` hook.

#### 3.2 Update Components to Use Formatters Hook

**Before:**

```tsx
import { formatArea, formatLength } from '@/shared/utils/formatting'

function Component() {
  return (
    <div>
      <Text>{formatLength(1234)}</Text>
      <Text>{formatArea(1500000)}</Text>
    </div>
  )
}
```

**After:**

```tsx
import { useFormatters } from '@/shared/i18n/useFormatters'

function Component() {
  const { formatLength, formatArea } = useFormatters()

  return (
    <div>
      <Text>{formatLength(1234)}</Text>
      <Text>{formatArea(1500000)}</Text>
    </div>
  )
}
```

#### 3.3 Update ConstructionPartsList.tsx

Replace direct `Intl.NumberFormat` usage with formatter hook to centralize locale handling.

---

### Phase 4: Language Switcher (1 day)

#### 4.1 Create Language Selector Component

Create `src/shared/components/LanguageSwitcher.tsx`:

```tsx
import { GlobeIcon } from '@radix-ui/react-icons'
import { DropdownMenu, IconButton } from '@radix-ui/themes'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' }
  // Add more languages
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton variant="ghost" size="2" title="Change Language">
          <GlobeIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {LANGUAGES.map(lang => (
          <DropdownMenu.Item key={lang.code} onClick={() => changeLanguage(lang.code)}>
            {lang.name}
            {i18n.language === lang.code && ' ✓'}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
```

#### 4.2 Add to Toolbar

Add `<LanguageSwitcher />` to `src/editor/MainToolbar.tsx` alongside other toolbar buttons.

---

### Phase 5: Testing & Quality (2-3 days)

#### 5.1 Pseudo-localization Testing

Create a pseudo-locale for testing:

```json
// src/shared/i18n/locales/xx/common.json
{
  "actions": {
    "save": "[Šävê]",
    "cancel": "[Çäñçél]",
    "delete": "[Ðéléţé]"
  }
}
```

Test with this locale to:

- Verify all strings are externalized
- Check for layout issues with longer text
- Identify hard-coded strings

#### 5.2 Create Translation Guide

Create `docs/translation-guide.md`:

- Document construction terminology
- Provide context for translators
- List technical terms that need expert review
- Include screenshots for context

#### 5.3 Set Up Translation Workflow

**Option A: Simple (JSON files in repo)**

- Translators edit JSON files directly
- Use pull requests for review
- Good for small teams or few languages

**Option B: Translation Management Platform**

- Tools: [lokalise.com](https://lokalise.com/), [crowdin.com](https://crowdin.com/), [phrase.com](https://phrase.com/)
- Better for multiple translators
- Provides context, screenshots, translation memory
- Can sync with repository

---

## Example Translation File Structure

### common.json

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "add": "Add",
    "addNew": "Add New",
    "duplicate": "Duplicate",
    "reset": "Reset to Default",
    "close": "Close"
  },
  "states": {
    "saving": "Saving...",
    "saved": "Saved",
    "loading": "Loading...",
    "error": "Error"
  },
  "placeholders": {
    "select": "Select",
    "selectAssembly": "Select assembly",
    "selectMaterial": "Select material",
    "none": "None",
    "mixed": "Mixed"
  },
  "confirmations": {
    "delete": "Are you sure you want to delete {{item}}?",
    "cannotUndo": "This action cannot be undone.",
    "resetMaterials": "Are you sure you want to reset all materials to default?"
  }
}
```

### toolbar.json

```json
{
  "viewConstructionPlan": "View Construction Plan",
  "viewPartsList": "View Parts List",
  "view3D": "View 3D Construction",
  "configuration": "Configuration",
  "about": "About",
  "tools": {
    "select": "Select",
    "move": "Move",
    "fitToView": "Fit to View",
    "buildingPerimeter": "Building Perimeter",
    "perimeterPresets": "Perimeter Presets",
    "addOpening": "Add Opening",
    "splitWall": "Split Wall",
    "floorArea": "Floor Area",
    "floorOpening": "Floor Opening",
    "roof": "Roof"
  }
}
```

### inspector.json

```json
{
  "perimeter": {
    "totalInnerPerimeter": "Total Inner Perimeter",
    "totalInsideArea": "Total Inside Area",
    "totalOuterPerimeter": "Total Outer Perimeter",
    "totalOverbuiltArea": "Total Overbuilt Area",
    "referenceSide": "Reference Side",
    "inside": "Inside",
    "outside": "Outside",
    "wallConfiguration": "Wall Configuration",
    "wallAssembly": "Wall Assembly",
    "wallThickness": "Wall Thickness",
    "ringBeams": "Ring Beams",
    "basePlate": "Base Plate",
    "topPlate": "Top Plate",
    "viewConstructionPlan": "View Construction Plan",
    "view3D": "View 3D Construction",
    "fitToView": "Fit to view",
    "deletePerimeter": "Delete perimeter"
  },
  "storey": {
    "footprint": "Footprint",
    "usableFloorArea": "Usable Floor Area (GFA)",
    "constructionWallArea": "Construction Wall Area",
    "finishedWallArea": "Finished Wall Area",
    "exteriorWallArea": "Exterior Wall Area",
    "windowArea": "Window Area",
    "wallToWindowRatio": "Wall-to-window ratio (WWR)",
    "doorArea": "Door Area",
    "totalVolume": "Total Volume",
    "surfaceAreaToVolumeRatio": "Surface-area-to-volume ratio (SA:V)",
    "floorHeight": "Floor Height",
    "ceilingHeight": "Ceiling Height"
  },
  "wall": {
    "length": "Length",
    "thickness": "Thickness",
    "height": "Height",
    "area": "Area"
  },
  "opening": {
    "width": "Width",
    "height": "Height",
    "sillHeight": "Sill Height",
    "assembly": "Opening Assembly",
    "deleteOpening": "Delete opening"
  }
}
```

### materials.json

```json
{
  "types": {
    "dimensional": "Dimensional",
    "strawbale": "Strawbale",
    "sheet": "Sheet",
    "volume": "Volume",
    "generic": "Generic"
  },
  "fields": {
    "name": "Name",
    "type": "Type",
    "color": "Color",
    "density": "Density",
    "crossSections": "Cross Sections",
    "stockLengths": "Stock Lengths",
    "sheetSizes": "Sheet Sizes",
    "thicknesses": "Thicknesses",
    "sheetType": "Sheet Type",
    "availableVolumes": "Available Volumes",
    "minBaleLength": "Min Bale Length",
    "maxBaleLength": "Max Bale Length",
    "baleHeight": "Bale Height",
    "baleWidth": "Bale Width",
    "tolerance": "Tolerance",
    "topCutoffLimit": "Top Cutoff Limit",
    "flakeSize": "Flake Size"
  },
  "sheetTypes": {
    "solid": "Solid",
    "tongueGroove": "Tongue & Groove",
    "flexible": "Flexible"
  },
  "warnings": {
    "inUseCannotDelete": "In Use - Cannot Delete",
    "noCrossSections": "No cross sections configured",
    "noLengths": "No lengths configured",
    "noSheetSizes": "No sheet sizes configured",
    "noThicknesses": "No thicknesses configured",
    "noVolumes": "No volumes configured"
  },
  "tabs": {
    "materials": "Materials",
    "ringBeamAssemblies": "Ring Beam Assemblies",
    "wallAssemblies": "Wall Assemblies",
    "openingAssemblies": "Opening Assemblies",
    "floorAssemblies": "Floor Assemblies",
    "roofAssemblies": "Roof Assemblies"
  }
}
```

### construction.json

```json
{
  "partsList": {
    "headers": {
      "type": "Type",
      "material": "Material",
      "label": "Label",
      "description": "Description",
      "quantity": "Quantity",
      "length": "Length",
      "totalLength": "Total Length",
      "totalArea": "Total Area",
      "totalVolume": "Total Volume",
      "totalWeight": "Total Weight",
      "view": "View"
    },
    "categories": {
      "fullBales": "Full bales",
      "partialBales": "Partial bales",
      "flakes": "Flakes",
      "stuffedFill": "Stuffed fill",
      "leftover": "Leftover from partial bales",
      "summary": "Summary",
      "differentParts": "Different Parts"
    },
    "issues": {
      "specialCut": "This part requires a special cut",
      "rawLength": "The given length is the raw length",
      "exceedsMaxLength": "Part length exceeds material maximum available length",
      "crossSectionMismatch": "Cross section does not match available options for this material",
      "thicknessMismatch": "Thickness does not match available options for this material",
      "irregularShape": "This might have a non-regular shape"
    }
  },
  "terms": {
    "strawhenge": "Strawhenge",
    "infill": "Infill",
    "modules": "Modules",
    "header": "Header",
    "sill": "Sill",
    "jamb": "Jamb",
    "beam": "Beam",
    "post": "Post",
    "joist": "Joist",
    "stud": "Stud",
    "subfloor": "Subfloor",
    "sheathing": "Sheathing",
    "plaster": "Plaster"
  }
}
```

### errors.json

```json
{
  "perimeter": {
    "minPoints": "Perimeter boundary must have at least 3 points",
    "invalidThickness": "Wall thickness must be greater than 0",
    "createFailed": "Failed to create perimeter"
  },
  "opening": {
    "invalidWidth": "Opening width must be greater than 0",
    "invalidHeight": "Opening height must be greater than 0",
    "invalidSillHeight": "Window sill height must be non-negative"
  },
  "construction": {
    "notEnoughVerticalSpace": "Not enough vertical space to fill with straw",
    "notEnoughSpaceForPost": "Not enough space for a post",
    "spaceForMoreThanOnePost": "Space for more than one post, but not enough for two"
  }
}
```

### welcome.json

```json
{
  "title": "Welcome to Strawbaler",
  "introduction": "This is a tool specifically designed for strawbale construction planning. Create floor plans with walls and openings. Configure the construction and generate plans and 3D models.",
  "keyFeatures": {
    "title": "Key Features",
    "items": [
      "Define perimeter walls in finished dimensions (with plasters)",
      "Add windows, doors, etc.",
      "Configure your wall assembly (infill, strawhenge, modules)",
      "Generate 2D construction plans for walls and floors"
    ]
  },
  "plannedFeatures": {
    "title": "Planned Features",
    "items": [
      "Cut list for wood, material estimations",
      "Cost and work hours estimations",
      "Support for floors, roofs, intermediate walls, foundations",
      "Import and export in CAD formats",
      "Support for more irregular building shapes"
    ]
  },
  "disclaimer": {
    "title": "Important Disclaimer",
    "intro": "This tool is currently in active development and provided as-is:",
    "items": [
      "No guarantees for accuracy of calculations, plans, or 3D models",
      "Breaking changes may occur between versions",
      "Project data may be lost due to browser storage limitations or updates",
      "Always save and export your work regularly",
      "This tool does not replace professional engineering consultation"
    ]
  },
  "localStorage": {
    "title": "Local Storage",
    "intro": "This application stores data locally in your browser to:",
    "items": [
      "Remember that you've seen this welcome message",
      "Save your floor plans and projects",
      "Preserve your configuration preferences"
    ],
    "privacy": "No cookies, tracking, or third-party analytics are used."
  },
  "continueButton": "I Understand & Continue",
  "reviewInfo": "You can review this information anytime via the info icon in the toolbar",
  "version": "Version {{version}}"
}
```

---

## Special Considerations

### 1. Construction Terminology

- Terms like "Ring Beam", "Strawhenge", "Wall Assembly" require expert knowledge
- Consider working with construction professionals in target languages
- Some terms may not have direct translations
- Create a glossary of technical terms with context

### 2. Pluralization

react-i18next handles pluralization automatically:

```json
{
  "bale": "{{count}} bale",
  "bale_other": "{{count}} bales"
}
```

Usage:

```typescript
t('bale', { count: 1 }) // "1 bale"
t('bale', { count: 5 }) // "5 bales"
```

### 3. Number Formatting Differences

| Locale       | Example  | Decimal | Thousands |
| ------------ | -------- | ------- | --------- |
| English (en) | 1,234.56 | `.`     | `,`       |
| German (de)  | 1.234,56 | `,`     | `.`       |
| French (fr)  | 1 234,56 | `,`     | ` `       |

`Intl.NumberFormat` handles these differences automatically.

### 4. Unit Placement

- Most languages put units after number: `1.5m`
- Some may prefer space: `1.5 m`
- Can be configured in translation files if needed

### 5. Text Length

- German text is typically 30% longer than English
- French and Spanish can be 20-30% longer
- Test UI with longer translations
- Ensure buttons and labels have flexible widths
- Consider truncation strategies for very long text

### 6. Right-to-Left (RTL) Languages

If supporting Arabic or Hebrew in the future:

- Use CSS logical properties (`margin-inline-start` instead of `margin-left`)
- Test layout with RTL
- May need to flip icons/layouts

---

## Timeline Estimates

| Phase       | Task                                | Estimated Time |
| ----------- | ----------------------------------- | -------------- |
| **Phase 1** | Infrastructure Setup                | 1-2 days       |
| **Phase 2** | String Extraction - High Priority   | 3 days         |
|             | String Extraction - Medium Priority | 3 days         |
|             | String Extraction - Low Priority    | 4 days         |
| **Phase 3** | Number & Date Formatting            | 2-3 days       |
| **Phase 4** | Language Switcher                   | 1 day          |
| **Phase 5** | Testing & Quality                   | 2-3 days       |
| **Total**   |                                     | **16-21 days** |

Note: This is for one developer working full-time. Work can be split across multiple developers or done incrementally.

---

## Migration Strategy

### Incremental Approach (Recommended)

1. **Set up infrastructure** (Phase 1) first
2. **Start with one component** (e.g., MainToolbar) as a proof of concept
3. **Gradually migrate** high-priority UI components
4. **Continue feature development** in parallel
5. **Use both old and new** formatters during transition
6. **Complete migration** before releasing i18n feature

### Big Bang Approach

1. Set up infrastructure
2. Extract ALL strings at once
3. Update ALL components
4. Test everything
5. Release

**Recommended:** Incremental approach to minimize disruption and allow learning/adjustments.

---

## Open Questions

Before beginning implementation, clarify:

1. **Target languages:** Which languages to support initially?
   - German, French, Spanish are common for EU
   - Consider your primary user base

2. **Translation workflow:**
   - Self-translate or hire professional translators?
   - Use translation management platform or JSON files?
   - Budget for translation services?

3. **Construction terminology:**
   - Access to construction experts in target languages?
   - Standard translations for strawbale construction terms?
   - Regional variations in terminology?

4. **Priority:**
   - Implement everything or MVP first?
   - Which languages are highest priority?

5. **Number formatting preferences:**
   - Follow locale conventions strictly?
   - Any specific formatting requirements?
   - Preference for unit spacing?

6. **Maintenance:**
   - Who will maintain translations as features are added?
   - Process for updating translations?

---

## Resources

### Documentation

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

### Tools

- [i18n-ally VSCode Extension](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally) - i18n development assistance
- [BabelEdit](https://www.codeandweb.com/babeledit) - Translation editor
- [lokalise.com](https://lokalise.com/) - Translation management platform
- [crowdin.com](https://crowdin.com/) - Translation management platform

### Testing

- [pseudo-localization](https://github.com/tryggvigy/pseudo-localization) - Generate pseudo-locales for testing

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Answer open questions** above
3. **Set up infrastructure** (Phase 1)
4. **Create pilot migration** with one component
5. **Review and adjust** approach based on pilot
6. **Execute full migration** incrementally
7. **Add first additional language**
8. **Set up translation workflow**
9. **Launch i18n feature**

---

_Last updated: December 20, 2025_
