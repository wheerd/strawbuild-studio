import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { Button, Flex, Text } from '@radix-ui/themes'

import type { TagCategoryId } from '@/construction/tags'
import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'

interface OpacityControlButtonProps {
  category: TagCategoryId
  label: string
}

function OpacityControlButton({ category, label }: OpacityControlButtonProps): React.JSX.Element {
  const { getOpacityForCategory, cycleOpacityForCategory } = useOpacityControl()

  const opacity = getOpacityForCategory(category)

  return (
    <Button size="1" variant="ghost" onClick={() => cycleOpacityForCategory(category)}>
      <Flex align="center" gap="2" justify="between" width="100%">
        <Text size="1">{label}</Text>
        {opacity === 1.0 ? (
          <EyeOpenIcon />
        ) : opacity === 0.5 ? (
          <EyeOpenIcon style={{ opacity: 0.5 }} />
        ) : (
          <EyeClosedIcon />
        )}
      </Flex>
    </Button>
  )
}

export default OpacityControlButton
