import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@radix-ui/themes'
import './index.css'
import '@radix-ui/themes/styles.css'
import App from './App.tsx'

import 'konva/lib/shapes/Rect'
import 'konva/lib/shapes/Text'
import 'konva/lib/shapes/Circle'
import 'konva/lib/shapes/Line'
import 'konva/lib/shapes/Arrow'

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <Theme>
      <App />
    </Theme>
  </StrictMode>
)
