import { createContext, useContext } from 'react'

export type ConfigTab = 'materials' | 'layers' | 'ringbeams' | 'walls' | 'floors' | 'roofs' | 'openings'

export interface ConfigurationModalContextValue {
  openConfiguration: (tab: ConfigTab, itemId?: string) => void
}

export const ConfigurationModalContext = createContext<ConfigurationModalContextValue | null>(null)

export function useConfigurationModal(): ConfigurationModalContextValue {
  const context = useContext(ConfigurationModalContext)
  if (!context) {
    throw new Error('useConfigurationModal must be used within ConfigurationModalProvider')
  }
  return context
}
