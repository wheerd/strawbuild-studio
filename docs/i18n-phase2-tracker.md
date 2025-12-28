# Phase 2 i18n Translation Implementation Tracker

**Status:** In Progress  
**Started:** December 29, 2024  
**Target Completion:** TBD

## Summary Statistics

- **Total Estimated Strings:** ~500
- **Categories:** 7 main areas
- **Estimated Effort:** 5-7 days
- **Completion:** 5% (1/19 components)

---

## Progress Tracking

| Category                                | Component                  | Strings  | Status         | Notes |
| --------------------------------------- | -------------------------- | -------- | -------------- | ----- |
| **Priority 1: High-Visibility UI**      |                            |          |                |       |
| Welcome                                 | WelcomeModal.tsx           | 60       | ⬜ Not Started |       |
| Toolbar                                 | MainToolbar.tsx            | 10       | ⬜ Not Started |       |
| Toolbar                                 | metadata.ts                | 15       | ⬜ Not Started |       |
| **Priority 2: Inspector Panels**        |                            |          |                |       |
| Inspector                               | StoreyInspector.tsx        | 20       | ⬜ Not Started |       |
| Inspector                               | PerimeterInspector.tsx     | 35       | ⬜ Not Started |       |
| Inspector                               | PerimeterWallInspector.tsx | 30       | ⬜ Not Started |       |
| Inspector                               | OpeningInspector.tsx       | 40       | ⬜ Not Started |       |
| Inspector                               | RoofInspector.tsx          | 25       | ⬜ Not Started |       |
| **Priority 3: Configuration UI**        |                            |          |                |       |
| Config                                  | MaterialsConfigContent.tsx | 60       | ⬜ Not Started |       |
| Config                                  | ConfigurationModal.tsx     | 8        | ⬜ Not Started |       |
| Config                                  | WallAssemblyContent.tsx    | 20       | ⬜ Not Started |       |
| **Priority 4: Parts List**              |                            |          |                |       |
| Parts                                   | ConstructionPartsList.tsx  | 80       | ⬜ Not Started |       |
| **Priority 5: Error Handling & Common** |                            |          |                |       |
| Errors                                  | ErrorFallback.tsx          | 15       | ⬜ Not Started |       |
| Errors                                  | FeatureErrorFallback.tsx   | 8        | ⬜ Not Started |       |
| Errors                                  | ModalErrorFallback.tsx     | 7        | ⬜ Not Started |       |
| Tools                                   | PerimeterToolInspector.tsx | 25       | ⬜ Not Started |       |
| Tools                                   | SelectToolInspector.tsx    | 5        | ⬜ Not Started |       |
| Status                                  | StoreyManagementModal.tsx  | 5        | ⬜ Not Started |       |
| Status                                  | StoreySelector.tsx         | 2        | ⬜ Not Started |       |
| **TOTAL**                               | **19 components**          | **~500** | **5%**         |       |

---

## Translation File Structure

```
src/shared/i18n/locales/
├── en/
│   ├── common.json          # Common UI (buttons, states, confirmations)
│   ├── toolbar.json         # Toolbar, tools, tool inspectors
│   ├── inspector.json       # All inspector panels
│   ├── materials.json       # Materials & assembly configuration
│   ├── construction.json    # Parts list, construction terms
│   ├── errors.json          # Error messages, validation
│   └── welcome.json         # Welcome modal content
└── de/
    └── [same structure]
```

---

## Implementation Guidelines

### Process for Each Component

1. **Prepare Translation Keys**
   - Add keys to appropriate JSON file(s)
   - Include both EN and DE translations
   - Use nested structure for organization

2. **Update Component**
   - Import `useTranslation` hook
   - Extract hardcoded strings
   - Replace with `t('key')` calls
   - Handle dynamic interpolation with params

3. **Test Manually**
   - Verify in English
   - Switch to German and verify
   - Check for layout issues

4. **Commit**
   - One commit per component group
   - Clear commit message

### Quality Checklist

For each completed component:

- [ ] All visible text uses translation keys
- [ ] Dynamic content uses interpolation
- [ ] Pluralization handled (if needed)
- [ ] Both EN and DE translations provided
- [ ] Layout works with longer German text
- [ ] Tooltips and aria-labels translated
- [ ] No hardcoded strings remain

---

## Priority Order

1. **WelcomeModal** (Days 1) - Most visible, self-contained
2. **MainToolbar + metadata** (Days 1) - High visibility
3. **Inspectors** (Days 2-3) - Core functionality
4. **Configuration UI** (Days 4-5) - Material/assembly setup
5. **Parts List** (Day 6) - Technical content
6. **Errors & Remaining** (Day 7) - Error handling, misc

---

## Notes

- Number formatting already implemented and working
- Construction issues already i18n-enabled
- German translations provided for all strings
- Language switcher available in status bar
- Infrastructure is solid and tested

---

**Last Updated:** December 29, 2024
