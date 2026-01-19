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
  size?: 'sm' | 'base' | 'lg'
}

export const VolumeField = forwardRef<HTMLInputElement, VolumeFieldProps>(function VolumeField(
  { value, onChange, unit = 'liter', min, max, step, size = 'base', placeholder, disabled, style, className, ...props },
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
    sm: 'h-7 text-xs',
    base: 'h-9 <Text text-sm',
    lg: 'h-10 <Text text-base'
  }

  return (
    <div
      className={cn(
        'border-input bg-background ring-offset-background focus-within:ring-ring flex items-center rounded-md border focus-within:ring-2 focus-within:ring-offset-2',
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
        className={cn('min-w-0 flex-1 bg-transparent px-2 text-right outline-none', sizeClasses[size])}
        {...props}
      />
      <span className="text-muted-foreground px-1.5 text-xs">{label}</span>
    </div>
  )
})
