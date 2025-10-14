import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { injectMaterialCSS } from '@/construction/materials/materialCSS'
import { getAllMaterials, subscribeToMaterials } from '@/construction/materials/store'
import { registerServiceWorker } from '@/shared/services/serviceWorkerRegistration'

import App from './App.tsx'
import './index.css'

function removeInitialLoadingScreen() {
  const loadingScreen = document.querySelector('[data-loading-screen]')
  if (loadingScreen && loadingScreen.parentElement) {
    loadingScreen.parentElement.removeChild(loadingScreen)
  }
}

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

const root = createRoot(rootElement)

root.render(
  <StrictMode>
    <ThemeProvider attribute="class">
      <Theme>
        <App />
      </Theme>
    </ThemeProvider>
  </StrictMode>
)

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    removeInitialLoadingScreen()
    registerServiceWorker()
  })
})
