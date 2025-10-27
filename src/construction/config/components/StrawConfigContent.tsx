import * as Label from '@radix-ui/react-label'
import { Flex, Grid, Heading, Text } from '@radix-ui/themes'
import React from 'react'

import { useConfigActions, useStrawConfig } from '@/construction/config/store'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { LengthField } from '@/shared/components/LengthField'

export function StrawConfigContent(): React.JSX.Element {
  const strawConfig = useStrawConfig()
  const { updateStrawConfig } = useConfigActions()

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      <Heading size="3">Straw Configuration</Heading>

      <Grid columns="8em 1fr 8em 1fr" gap="3" gapX="4">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Min Bale Length
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.baleMinLength}
          onChange={baleMinLength => updateStrawConfig({ baleMinLength })}
          min={200}
          max={strawConfig.baleMaxLength}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Max Bale Length
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.baleMaxLength}
          onChange={baleMaxLength => updateStrawConfig({ baleMaxLength })}
          min={strawConfig.baleMinLength}
          max={2000}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Height
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.baleHeight}
          onChange={baleHeight => updateStrawConfig({ baleHeight })}
          min={200}
          max={2000}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Bale Width
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.baleWidth}
          onChange={baleWidth => updateStrawConfig({ baleWidth })}
          min={200}
          max={2000}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />
      </Grid>

      <Grid columns="8em 1fr" gap="3" gapX="4">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Material
          </Text>
        </Label.Root>
        <MaterialSelectWithEdit
          value={strawConfig.material}
          onValueChange={material => {
            if (!material) return
            updateStrawConfig({ material })
          }}
          size="2"
        />
      </Grid>

      <Grid columns="8em 1fr" gap="3" gapX="4">
        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Tolerance
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.tolerance}
          onChange={tolerance => updateStrawConfig({ tolerance })}
          unit="mm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Top Cutoff Limit
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.topCutoffLimit}
          onChange={topCutoffLimit => updateStrawConfig({ topCutoffLimit })}
          min={0}
          max={strawConfig.baleHeight}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />

        <Label.Root>
          <Text size="1" weight="medium" color="gray">
            Flake Size
          </Text>
        </Label.Root>
        <LengthField
          value={strawConfig.flakeSize}
          onChange={flakeSize => updateStrawConfig({ flakeSize })}
          min={0}
          max={strawConfig.baleMinLength}
          precision={1}
          step={10}
          unit="cm"
          size="2"
        />
      </Grid>
    </Flex>
  )
}
