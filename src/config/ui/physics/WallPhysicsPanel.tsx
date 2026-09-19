import * as Label from '@radix-ui/react-label'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { resolveWallAssembly } from '@/construction/assemblies/perimeterWalls'
import type { PerimeterWallConfig } from '@/construction/assemblies/perimeterWalls/types'
import { computeAssemblyPhysics } from '@/construction/assemblies/physics'
import type { AssemblyPhysics } from '@/construction/assemblies/physics'
import type { Length } from '@/shared/geometry'
import { LengthField } from '@/shared/ui/LengthField'
import { Card } from '@/shared/ui/components/card'

import { PhysicsBreakdown } from './shared/PhysicsBreakdown'
import { PhysicsSummaryValues } from './shared/PhysicsSummaryValues'

interface WallPhysicsPanelProps {
  config: PerimeterWallConfig
}

const DEFAULT_HEIGHT: Length = 3000

export function WallPhysicsPanel({ config }: WallPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const assembly = resolveWallAssembly(config)
  const defaultThickness = assembly.thicknessRange.min

  const [thickness, setThickness] = useState<Length>(defaultThickness)
  const [height, setHeight] = useState<Length>(DEFAULT_HEIGHT)

  const physicsStructure = assembly.getPhysicsStructure(thickness, height)
  const physics: AssemblyPhysics = computeAssemblyPhysics(physicsStructure)

  const massPerRunningMeter = physics.totalMassPerArea != null ? physics.totalMassPerArea * (height / 1000) : undefined

  return (
    <Card variant="soft" className="p-3">
      <div className="flex flex-col gap-3">
        <div className="text-base font-bold">{t($ => $.physics.title)}</div>

        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-3 gap-y-1">
          <Label.Root className="text-muted-foreground text-sm">{t($ => $.physics.wallThickness)}</Label.Root>
          <LengthField
            value={thickness}
            onChange={value => {
              setThickness(value)
            }}
            unit="cm"
            min={1}
          />

          <Label.Root className="text-muted-foreground text-sm">{t($ => $.physics.wallHeight)}</Label.Root>
          <LengthField
            value={height}
            onChange={value => {
              setHeight(value)
            }}
            unit="m"
            min={1000}
          />
        </div>

        <PhysicsSummaryValues physics={physics} massPerRunningMeter={massPerRunningMeter} />

        <PhysicsBreakdown physics={physics} />
      </div>
    </Card>
  )
}
