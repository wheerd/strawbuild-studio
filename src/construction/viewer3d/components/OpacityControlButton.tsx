import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons'
import { IconButton } from '@radix-ui/themes'

import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'

function OpacityControlButton(): React.JSX.Element {
  const { getOpacityForCategory, cycleOpacityForCategory } = useOpacityControl()

  const strawOpacity = getOpacityForCategory('straw')

  const label = strawOpacity === 1.0 ? 'Straw: 100%' : strawOpacity === 0.5 ? 'Straw: 50%' : 'Straw: 0%'

  return (
    <IconButton size="2" variant="surface" onClick={() => cycleOpacityForCategory('straw')} title={label}>
      {strawOpacity === 1.0 ? (
        <EyeOpenIcon />
      ) : strawOpacity === 0.5 ? (
        <EyeOpenIcon style={{ opacity: 0.5 }} />
      ) : (
        <EyeClosedIcon />
      )}
    </IconButton>
  )
}

export default OpacityControlButton
