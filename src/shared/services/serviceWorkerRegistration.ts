import { Workbox } from 'workbox-window'

let workbox: Workbox | null = null

export function registerServiceWorker(): void {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  if (workbox !== null) {
    return
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
      // eslint-disable-next-line no-console -- Useful signal during early rollout
      console.info('Service worker activated, app is now available offline.')
    }
  })

  workbox
    .register()
    .catch(error => {
      // eslint-disable-next-line no-console -- Provide visibility when registration fails
      console.error('Service worker registration failed', error)
    })
}
