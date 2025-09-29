export const COLORS = {
  // Material/Construction colors
  materials: {
    strawbale: '#daa520',
    limePlaster: '#555555',
    clayPlaster: '#8b4513',
    other: '#2f2f2f',
    woodSupport: '#cd853f',
    // Opening types
    door: '#8b4513',
    window: '#87ceeb',
    concrete: '#545452'
  },

  // Interactive States
  selection: {
    primary: '#007acc', // Selected items
    outline: '#1e40af', // Selection boundaries
    secondary: '#ff9999',
    secondaryOutline: '#dc3545'
  },

  // Canvas/Drawing & Fills
  canvas: {
    grid: '#cccccc',
    background: '#ffffff',
    // Shape fill colors
    buildingBackground: '#aaaaaa',
    openingBackground: '#999999'
  },

  // Length Indicators & Annotations
  indicators: {
    main: '#000000',
    secondary: '#333333',
    selected: '#007acc'
  },

  // Snapping System
  snapping: {
    points: '#007bff',
    pointStroke: '#ffffff',
    lines: '#0066ff',
    highlight: '#007bff',
    highlightStroke: '#ffffff'
  },

  // Storey Level Colors
  levels: {
    ground: '#16a34a', // green-600 - Ground level (0)
    aboveGround: '#2563eb', // blue-600 - Above ground levels (1, 2, 3...)
    belowGround: '#ea580c' // orange-600 - Below ground levels (-1, -2, -3...)
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
export type LevelColor = keyof typeof COLORS.levels
export type UIColor = keyof typeof COLORS.ui

// Helper function to get colors with type safety
export function getColor<T extends ColorCategory>(category: T, color: keyof (typeof COLORS)[T]): string {
  return COLORS[category][color] as string
}

// Helper function to get level color based on storey level
export function getLevelColor(level: number): string {
  if (level === 0) {
    return COLORS.levels.ground
  } else if (level > 0) {
    return COLORS.levels.aboveGround
  } else {
    return COLORS.levels.belowGround
  }
}

// Convenience exports for backward compatibility and common usage
export const MATERIAL_COLORS = COLORS.materials
export const SELECTION_COLORS = COLORS.selection
export const CANVAS_COLORS = COLORS.canvas
export const INDICATOR_COLORS = COLORS.indicators
export const SNAPPING_COLORS = COLORS.snapping
export const LEVEL_COLORS = COLORS.levels
export const UI_COLORS = COLORS.ui
