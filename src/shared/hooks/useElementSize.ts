import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

export function elementSizeRef(): [
  size: Size,
  ref: (element: Element | null) => void,
  setActive: (active: boolean) => void
] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const observer = useRef<ResizeObserver | null>(null)
  const observedElement = useRef<Element | null>(null)
  const isActive = useRef(true)
  const pendingSize = useRef<Size | null>(null)
  const rafId = useRef<number | null>(null)

  const cleanupObserver = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
  }, [])

  const cancelPendingFrame = useCallback(() => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
  }, [])

  const commitSize = useCallback(() => {
    rafId.current = null
    if (pendingSize.current) {
      setSize(pendingSize.current)
      pendingSize.current = null
    }
  }, [])

  const scheduleCommit = useCallback(() => {
    if (rafId.current !== null) return
    rafId.current = requestAnimationFrame(commitSize)
  }, [commitSize])

  const queueSize = useCallback(
    (next: Size) => {
      if (!isActive.current) return
      pendingSize.current = next
      scheduleCommit()
    },
    [scheduleCommit]
  )

  const attachObserver = useCallback(
    (element: Element) => {
      cleanupObserver()
      observer.current = new ResizeObserver(entries => {
        if (entries.length > 0 && isActive.current) {
          const entry = entries[0]
          queueSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          })
        }
      })
      observer.current.observe(element)

      const rect = element.getBoundingClientRect()
      queueSize({ width: rect.width, height: rect.height })
    },
    [cleanupObserver, queueSize]
  )

  const callback = useCallback(
    (element: Element | null) => {
      observedElement.current = element
      if (!element) {
        cleanupObserver()
        return
      }

      if (!isActive.current) return
      attachObserver(element)
    },
    [attachObserver, cleanupObserver]
  )

  const setActive = useCallback(
    (active: boolean) => {
      if (isActive.current === active) return
      isActive.current = active
      if (!active) {
        cleanupObserver()
        cancelPendingFrame()
        pendingSize.current = null
        return
      }

      if (observedElement.current) {
        attachObserver(observedElement.current)
      }
    },
    [attachObserver, cancelPendingFrame, cleanupObserver]
  )

  useLayoutEffect(() => {
    return () => {
      cleanupObserver()
      cancelPendingFrame()
    }
  }, [cleanupObserver, cancelPendingFrame])

  return [size, callback, setActive]
}

export function useElementSize(element: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (!element.current) return

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length > 0) {
        const entry = entries[0]
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    resizeObserver.observe(element.current)

    // Get initial size
    const rect = element.current.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })

    return () => {
      resizeObserver.disconnect()
    }
  }, [element.current])

  return size
}
