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
          unit="mm"
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
          unit="mm"
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
          unit="mm"
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
          unit="mm"
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
          onValueChange={material => updateStrawConfig({ material })}
          size="2"
        />
      </Grid>
    </Flex>
  )
}
