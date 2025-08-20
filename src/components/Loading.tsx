import React from 'react'

export function Loading (): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}
    >
      Loading Floor Plan Editor...
    </div>
  )
}
