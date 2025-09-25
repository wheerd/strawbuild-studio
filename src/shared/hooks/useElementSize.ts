import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

export function elementSizeRef(): [size: Size, ref: (element: Element | null) => void] {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const observer = useRef<ResizeObserver | null>(null)

  const callback = useCallback((element: Element | null) => {
    if (observer.current) {
      observer.current.disconnect()
    }

    if (!element) return

    observer.current = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    observer.current.observe(element)

    // Get initial size
    const rect = element.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
  }, [])

  return [size, callback]
}

export function useElementSize(element: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (!element.current) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
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

    return () => resizeObserver.disconnect()
  }, [element.current])

  return size
}
