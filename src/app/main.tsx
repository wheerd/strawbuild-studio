import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import 'konva/lib/shapes/Arrow'
import 'konva/lib/shapes/Circle'
import 'konva/lib/shapes/Line'
import 'konva/lib/shapes/Rect'
import 'konva/lib/shapes/Text'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './index.css'

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
