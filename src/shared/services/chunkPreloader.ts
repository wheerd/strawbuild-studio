interface ManifestEntry {
  file: string
  src?: string
  isEntry?: boolean
  isDynamicEntry?: boolean
  css?: string[]
  assets?: string[]
  imports?: string[]
  dynamicImports?: string[]
}

type ViteManifest = Record<string, ManifestEntry>

type ResourceType = 'script' | 'style'

interface PreloadItem {
  href: string
  type: ResourceType
}

interface IdleDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}manifest.json`
const PREFETCHED_RESOURCES = new Set<string>()
const PREFETCH_DELAY_MS = 1500

let manifestPromise: Promise<ViteManifest | null> | null = null
let preloadQueue: PreloadItem[] = []
let isScheduling = false
let hasStarted = false
let totalQueued = 0
let completed = 0

interface PreloadProgress {
  total: number
  loaded: number
  done: boolean
}

type ProgressCallback = (progress: PreloadProgress) => void

const progressSubscribers = new Set<ProgressCallback>()

function getProgress(): PreloadProgress {
  const done = totalQueued === 0 || completed >= totalQueued
  return { total: totalQueued, loaded: Math.min(completed, totalQueued), done }
}

function notifyProgress(): void {
  const snapshot = getProgress()
  for (const callback of progressSubscribers) {
    callback(snapshot)
  }
}

function markItemCompleted(): void {
  if (completed < totalQueued) {
    completed += 1
    notifyProgress()
  }
}

export function subscribeToPreloadProgress(callback: ProgressCallback): () => void {
  progressSubscribers.add(callback)
  callback(getProgress())
  return () => {
    progressSubscribers.delete(callback)
  }
}

export function getPreloadProgress(): PreloadProgress {
  return getProgress()
}

export function startChunkPreloading(): void {
  if (hasStarted || import.meta.env.DEV || typeof window === 'undefined') {
    return
  }

  hasStarted = true
  totalQueued = 0
  completed = 0
  prepareQueue().catch(() => undefined)
}

async function prepareQueue(): Promise<void> {
  const manifest = await loadManifest()
  if (manifest === null) {
    notifyProgress()
    return
  }

  completed = 0
  preloadQueue = buildPreloadQueue(manifest)
  totalQueued = preloadQueue.length
  notifyProgress()

  if (preloadQueue.length > 0) {
    window.setTimeout(() => {
      scheduleProcessing()
    }, PREFETCH_DELAY_MS)
  }
}

async function loadManifest(): Promise<ViteManifest | null> {
  if (manifestPromise === null) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) {
          return null
        }
        return (await response.json()) as ViteManifest
      })
      .catch(() => null)
  }

  return manifestPromise
}

function buildPreloadQueue(manifest: ViteManifest): PreloadItem[] {
  const queue: PreloadItem[] = []
  const seen = new Set<string>()

  for (const entry of Object.values(manifest)) {
    if (!entry.file) {
      continue
    }

    const filePath = entry.file
    if (!filePath.startsWith('assets/')) {
      continue
    }

    if (entry.isEntry === true) {
      // Entry bundles are already requested by the document
      continue
    }

    const href = `/${filePath}`
    if (seen.has(href)) {
      continue
    }

    if (filePath.includes('index-')) {
      // The main bundle and CSS are already loaded
      continue
    }

    const type: ResourceType = href.endsWith('.css') ? 'style' : 'script'
    queue.push({ href, type })
    seen.add(href)

    if (Array.isArray(entry.css)) {
      for (const cssFile of entry.css) {
        const cssHref = `/${cssFile}`
        if (seen.has(cssHref)) {
          continue
        }
        queue.push({ href: cssHref, type: 'style' })
        seen.add(cssHref)
      }
    }
  }

  return queue
}

function scheduleProcessing(): void {
  if (typeof window === 'undefined' || preloadQueue.length === 0 || isScheduling) {
    return
  }

  isScheduling = true
  const globalWindow = window

  const callback = (deadline: IdleDeadline): void => {
    isScheduling = false
    processQueue(deadline)
  }

  if (typeof globalWindow.requestIdleCallback === 'function') {
    globalWindow.requestIdleCallback(callback, { timeout: 1000 })
  } else {
    globalWindow.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 200)
  }
}

function processQueue(deadline: IdleDeadline): void {
  if (preloadQueue.length === 0) {
    return
  }

  while (preloadQueue.length > 0 && (deadline.didTimeout || deadline.timeRemaining() > 10)) {
    const item = preloadQueue.shift()
    if (item !== undefined) {
      prefetchResource(item)
    }
  }

  if (preloadQueue.length > 0) {
    scheduleProcessing()
  }
}

function prefetchResource(item: PreloadItem): void {
  if (PREFETCHED_RESOURCES.has(item.href)) {
    return
  }
  PREFETCHED_RESOURCES.add(item.href)

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = item.href
  link.as = item.type === 'style' ? 'style' : 'script'
  link.crossOrigin = 'anonymous'

  const supportsPrefetch = (() => {
    try {
      return link.relList?.supports?.('prefetch') ?? false
    } catch {
      return false
    }
  })()

  if (supportsPrefetch) {
    let settled = false
    let fallbackTimeout: number | undefined
    const settle = () => {
      if (!settled) {
        settled = true
        if (fallbackTimeout !== undefined) {
          window.clearTimeout(fallbackTimeout)
          fallbackTimeout = undefined
        }
        markItemCompleted()
      }
    }

    link.addEventListener('load', settle, { once: true })
    link.addEventListener('error', settle, { once: true })
    document.head.appendChild(link)
    fallbackTimeout = window.setTimeout(settle, 10000)
    return
  }

  fetch(item.href, { cache: 'force-cache', mode: 'no-cors' })
    .catch(() => undefined)
    .finally(() => {
      markItemCompleted()
    })
}
