import { useThemeContext } from '@radix-ui/themes'
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'

interface CanvasThemeColors {
  // Primary accent colors
  primary: string
  primaryLight: string
  primaryDark: string

  // Secondary colors
  secondary: string
  secondaryLight: string

  // Semantic colors
  success: string
  warning: string
  danger: string
  info: string

  // Text colors
  text: string
  textSecondary: string
  textTertiary: string

  // Grid colors
  gridVertical: string
  gridHorizontal: string
  grid: string

  // Canvas backgrounds
  bgSubtle: string
  bgCanvas: string

  // Basic colors
  white: string
  black: string

  // Selection highlight (for openings)
  primaryLightOutline: string
}

export const CanvasThemeContext = createContext<CanvasThemeColors | null>(null)

function readColorsFromElement(element: HTMLElement | null): CanvasThemeColors {
  const styles = element && getComputedStyle(element)
  const get = (varName: string): string => {
    if (!styles) {
      return '#000000'
    }
    return styles.getPropertyValue(varName).trim() || '#000000'
  }

  return {
    primary: get('--color-primary'),
    primaryLight: get('--color-primary-light'),
    primaryDark: get('--color-primary-dark'),
    secondary: get('--color-secondary'),
    secondaryLight: get('--color-secondary-light'),
    success: get('--color-success'),
    warning: get('--color-warning'),
    danger: get('--color-danger'),
    info: get('--color-info'),
    text: get('--color-text'),
    textSecondary: get('--color-text-secondary'),
    textTertiary: get('--color-text-tertiary'),
    gridVertical: get('--color-grid-vertical'),
    gridHorizontal: get('--color-grid-horizontal'),
    grid: get('--color-grid'),
    bgSubtle: get('--color-bg-subtle'),
    bgCanvas: get('--color-bg-canvas'),
    white: '#ffffff',
    black: '#000000',
    primaryLightOutline: get('--color-primary-dark')
  }
}

export function CanvasThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const radixTheme = useThemeContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const [colors, setColors] = useState<CanvasThemeColors>(() => readColorsFromElement(null))

  useEffect(() => {
    if (containerRef.current) {
      setColors(readColorsFromElement(containerRef.current))
    }
  }, [radixTheme.appearance, radixTheme.accentColor, radixTheme.grayColor, containerRef.current])

  return (
    <div ref={containerRef} style={{ display: 'contents' }} className="canvas-theme-context">
      <CanvasThemeContext.Provider value={colors}>{children}</CanvasThemeContext.Provider>
    </div>
  )
}

export function useCanvasTheme(): CanvasThemeColors {
  const context = useContext(CanvasThemeContext)
  if (!context) {
    throw new Error('useCanvasTheme must be used within CanvasThemeProvider')
  }
  return context
}
