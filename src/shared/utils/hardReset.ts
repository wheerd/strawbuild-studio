const STORAGE_KEYS = [
  'strawbaler-model',
  'strawbaler-config',
  'strawbaler-materials',
  'strawbaler-persistence'
] as const

export function hardReset(): void {
  STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove ${key} from localStorage:`, error)
    }
  })

  window.location.reload()
}
