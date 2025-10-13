import { createContext, useContext } from 'react'

export type ConfigTab = 'materials' | 'ringbeams' | 'perimeter' | 'floors'

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
