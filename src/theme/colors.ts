export const COLORS = {
  // Material/Construction colors
  materials: {
    strawbale: '#DAA520',
    limePlaster: '#555555',
    clayPlaster: '#8B4513',
    other: '#2F2F2F',
    woodSupport: '#CD853F',
    // Opening types
    door: '#8B4513',
    window: '#87CEEB'
  },

  // Interactive States
  selection: {
    primary: '#007acc', // Selected items
    outline: '#1e40af', // Selection boundaries
    secondary: '#F99',
    secondaryOutline: '#dc3545'
  },

  // Canvas/Drawing & Fills
  canvas: {
    grid: '#cccccc',
    background: '#ffffff',
    // Shape fill colors
    buildingBackground: '#AAA',
    openingBackground: '#999'
  },

  // Length Indicators & Annotations
  indicators: {
    main: '#000',
    secondary: '#333',
    selected: '#007acc'
  },

  // Snapping System
  snapping: {
    points: '#007bff',
    pointStroke: 'white',
    lines: '#0066ff',
    highlight: '#007bff',
    highlightStroke: 'white'
  },

  // UI System (Bootstrap-like)
  ui: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',

    // Grays
    white: '#ffffff',
    gray100: '#f8f9fa',
    gray200: '#e9ecef',
    gray300: '#dee2e6',
    gray400: '#ced4da',
    gray500: '#adb5bd',
    gray600: '#6c757d',
    gray700: '#495057',
    gray800: '#343a40',
    gray900: '#212529',
    black: '#000000'
  }
} as const

// Type exports for autocomplete and type safety
export type ColorCategory = keyof typeof COLORS
export type MaterialColor = keyof typeof COLORS.materials
export type SelectionColor = keyof typeof COLORS.selection
export type CanvasColor = keyof typeof COLORS.canvas
export type IndicatorColor = keyof typeof COLORS.indicators
export type SnappingColor = keyof typeof COLORS.snapping
export type UIColor = keyof typeof COLORS.ui

// Helper function to get colors with type safety
export function getColor<T extends ColorCategory>(category: T, color: keyof (typeof COLORS)[T]): string {
  return COLORS[category][color] as string
}

// Convenience exports for backward compatibility and common usage
export const MATERIAL_COLORS = COLORS.materials
export const SELECTION_COLORS = COLORS.selection
export const CANVAS_COLORS = COLORS.canvas
export const INDICATOR_COLORS = COLORS.indicators
export const SNAPPING_COLORS = COLORS.snapping
export const UI_COLORS = COLORS.ui
