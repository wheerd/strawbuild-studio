import { Text, TextField } from '@radix-ui/themes'
import { forwardRef } from 'react'

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

export interface VolumeFieldProps extends Omit<React.ComponentPropsWithoutRef<typeof TextField.Root>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  unit?: VolumeUnit
  min?: number
  max?: number
  step?: number
}

export const VolumeField = forwardRef<HTMLInputElement, VolumeFieldProps>(function VolumeField(
  {
    value,
    onChange,
    unit = 'liter',
    min,
    max,
    step,
    size = '2',
    placeholder,
    disabled,
    style,
    className,
    ...props
  },
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

  return (
    <TextField.Root
      ref={ref}
      type="number"
      value={Number.isFinite(displayValue) ? String(displayValue) : ''}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      step={step}
      className={className}
      style={{
        textAlign: 'right',
        ...style
      }}
      {...props}
    >
      <TextField.Slot side="right" style={{ paddingInline: '6px' }}>
        <Text size="1" color="gray">
          {label}
        </Text>
      </TextField.Slot>
    </TextField.Root>
  )
})

