import React from 'react'

import { COLORS } from '@/shared/theme/colors'

export function Loading(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: COLORS.ui.gray600
      }}
    >
      Loading Floor Plan Editor...
    </div>
  )
}
