import { useEffect, useMemo, useState } from 'react'

import { getPreloadProgress, subscribeToPreloadProgress } from '@/shared/services/chunkPreloader'
import { isServiceWorkerReady, subscribeToServiceWorkerReady } from '@/shared/services/serviceWorkerRegistration'

export type OfflineStatus = 'offline' | 'loading' | 'ready'

interface OfflineStatusState {
  status: OfflineStatus
  isOnline: boolean
  progress: {
    total: number
    loaded: number
  }
}

const DEFAULT_PROGRESS = { total: 0, loaded: 0 }

export function useOfflineStatus(): OfflineStatusState {
  const shouldTrackServiceWorker =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !import.meta.env.DEV

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [serviceWorkerReady, setServiceWorkerReady] = useState(() =>
    shouldTrackServiceWorker ? isServiceWorkerReady() : true
  )
  const [progress, setProgress] = useState(() => {
    const snapshot = getPreloadProgress()
    return { total: snapshot.total, loaded: snapshot.loaded }
  })
  const [preloadDone, setPreloadDone] = useState(() => getPreloadProgress().done)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    return subscribeToPreloadProgress(snapshot => {
      setProgress({ total: snapshot.total, loaded: snapshot.loaded })
      setPreloadDone(snapshot.done)
    })
  }, [])

  useEffect(() => {
    if (!shouldTrackServiceWorker) {
      return
    }

    return subscribeToServiceWorkerReady(setServiceWorkerReady)
  }, [shouldTrackServiceWorker])

  const status: OfflineStatus = useMemo(() => {
    if (!isOnline) {
      return 'offline'
    }

    if (!shouldTrackServiceWorker) {
      return 'ready'
    }

    if (serviceWorkerReady && preloadDone) {
      return 'ready'
    }

    return 'loading'
  }, [isOnline, preloadDone, serviceWorkerReady, shouldTrackServiceWorker])

  return {
    status,
    isOnline,
    progress: progress || DEFAULT_PROGRESS
  }
}
