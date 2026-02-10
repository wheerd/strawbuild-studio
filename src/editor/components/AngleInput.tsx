import { Portal } from '@radix-ui/react-portal'
import { useEffect, useRef, useState } from 'react'

import { useStageHeight, useStageWidth } from '@/editor/hooks/useViewportStore'
import { NumberField } from '@/shared/components/NumberField/NumberField'

interface AngleInputProps {
  isOpen: boolean
  value: number
  position: { x: number; y: number }
  onCommit: (angle: number) => void
  onCancel: () => void
}

export function AngleInput({ isOpen, value, position, onCommit, onCancel }: AngleInputProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null)
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [isOpen])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleCommit = () => {
    onCommit(localValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation()
      handleCommit()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
  }

  if (!isOpen) return null

  const horizontalMargin = 100
  const verticalMargin = 50

  const constrainedPosition = {
    x: Math.max(horizontalMargin, Math.min(stageWidth - horizontalMargin, position.x)),
    y: Math.max(verticalMargin, Math.min(stageHeight - verticalMargin, position.y))
  }

  return (
    <Portal>
      <div
        className="pointer-events-auto absolute z-50"
        style={{
          left: constrainedPosition.x,
          top: constrainedPosition.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <NumberField.Root
          value={localValue}
          onChange={v => {
            setLocalValue(v ?? value)
          }}
          onCommit={handleCommit}
          size="lg"
          min={0}
          max={360}
        >
          <NumberField.Input className="w-12" ref={inputRef} onKeyDown={handleKeyDown} onBlur={onCancel} />
          <NumberField.Slot side="right">°</NumberField.Slot>
          <NumberField.Spinner />
        </NumberField.Root>
      </div>
    </Portal>
  )
}
