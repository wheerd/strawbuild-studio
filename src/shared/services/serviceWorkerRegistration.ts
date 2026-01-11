import { Workbox } from 'workbox-window'

let workbox: Workbox | null = null
let serviceWorkerReady = false

type ReadyCallback = (ready: boolean) => void

const readySubscribers = new Set<ReadyCallback>()

function notifyReady(): void {
  for (const callback of readySubscribers) {
    callback(serviceWorkerReady)
  }
}

function setServiceWorkerReady(value: boolean): void {
  if (serviceWorkerReady !== value) {
    serviceWorkerReady = value
    notifyReady()
  }
}

export function subscribeToServiceWorkerReady(callback: ReadyCallback): () => void {
  readySubscribers.add(callback)
  callback(serviceWorkerReady)
  return () => {
    readySubscribers.delete(callback)
  }
}

export function isServiceWorkerReady(): boolean {
  return serviceWorkerReady
}

export function registerServiceWorker(): void {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  if (workbox !== null) {
    return
  }

  if (navigator.serviceWorker.controller) {
    setServiceWorkerReady(true)
  }

  workbox = new Workbox('/sw.js', { scope: '/' })

  workbox.addEventListener('waiting', () => {
    workbox?.messageSkipWaiting()
  })

  workbox.addEventListener('controlling', () => {
    window.location.reload()
  })

  workbox.addEventListener('activated', event => {
    if (event.isUpdate !== true) {
      console.info('Service worker activated, app is now available offline.')
    }
    setServiceWorkerReady(true)
  })

  workbox
    .register()
    .then(() => {
      navigator.serviceWorker.ready
        .then(() => {
          setServiceWorkerReady(true)
        })
        .catch(() => {
          setServiceWorkerReady(false)
        })
    })
    .catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
}
