import { useCallback, useEffect, useState } from 'react'

import type { OpenMode } from '@/shared/components/WelcomeModal'

interface WelcomeState {
  accepted: boolean
  acceptedAt: string
  version: string
}

const STORAGE_KEY = 'strawbuild-welcome-state'
const CURRENT_VERSION = '0.2'

function loadWelcomeState(): WelcomeState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as WelcomeState
  } catch {
    return null
  }
}

function saveWelcomeState(state: WelcomeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    console.warn('Failed to save welcome state to localStorage')
  }
}

export interface UseWelcomeModalReturn {
  isOpen: boolean
  mode: OpenMode
  openManually: () => void
  handleAccept: () => void
}

export function useWelcomeModal(): UseWelcomeModalReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<OpenMode>('first-visit')

  useEffect(() => {
    const state = loadWelcomeState()
    if (state?.version !== CURRENT_VERSION) {
      setIsOpen(true)
      setMode('first-visit')
    }
  }, [])

  const handleAccept = useCallback(() => {
    const state: WelcomeState = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: CURRENT_VERSION
    }
    saveWelcomeState(state)
    setIsOpen(false)
  }, [])

  const openManually = useCallback(() => {
    setMode('manual')
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    mode,
    openManually,
    handleAccept
  }
}
