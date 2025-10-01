import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DEFAULT_MATERIALS } from '@/construction/materials/material'
import { injectMaterialCSS } from '@/construction/materials/materialCSS'

import App from './App.tsx'
import './index.css'

// Initialize material CSS styles
injectMaterialCSS(Object.values(DEFAULT_MATERIALS))

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
