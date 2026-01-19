import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

export type VolumeUnit = 'liter' | 'm3'

const UNIT_CONFIG: Record<VolumeUnit, { label: string; factor: number }> = {
  liter: {
    label: 'L',
    factor: 1_000_000 // 1 liter = 1e6 mm³
  },
  m3: {
    label: 'm³',
    factor: 1_000_000_000 // 1 m³ = 1e9 mm³
  }
}

export interface VolumeFieldProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'size'> {
  value: number
  onChange: (value: number) => void
  unit?: VolumeUnit
  min?: number
  max?: number
  step?: number
  size?: '1' | '2' | '3'
}

export const VolumeField = forwardRef<HTMLInputElement, VolumeFieldProps>(function VolumeField(
  { value, onChange, unit = 'liter', min, max, step, size = '2', placeholder, disabled, style, className, ...props },
  ref
) {
  const { label, factor } = UNIT_CONFIG[unit]
  const displayValue = Number.isFinite(value) ? value / factor : 0

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    const parsed = parseFloat(next)

    if (Number.isNaN(parsed)) {
      onChange(0)
      return
    }

    let mmValue = parsed * factor
    if (min !== undefined && mmValue < min) {
      mmValue = min
    }
    if (max !== undefined && mmValue > max) {
      mmValue = max
    }
    onChange(mmValue)
  }

  const sizeClasses = {
    '1': 'h-7 text-xs',
    '2': 'h-9 <Text text-sm',
    '3': 'h-10 <Text text-base'
  }

  return (
    <div
      className={cn(
        'flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        sizeClasses[size],
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={style}
    >
      <input
        ref={ref}
        type="number"
        value={Number.isFinite(displayValue) ? String(displayValue) : ''}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        className={cn('flex-1 bg-transparent px-2 text-right outline-none min-w-0', sizeClasses[size])}
        {...props}
      />
      <span className="text-xs text-muted-foreground px-1.5">{label}</span>
    </div>
  )
})
