import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { injectMaterialCSS } from '@/construction/materials/materialCSS'
import { getAllMaterials, subscribeToMaterials } from '@/construction/materials/store'

import App from './App.tsx'
import './index.css'

// Initialize material CSS styles
injectMaterialCSS(getAllMaterials())

// Re-inject CSS whenever materials change
subscribeToMaterials(materials => {
  injectMaterialCSS(materials)
})

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
