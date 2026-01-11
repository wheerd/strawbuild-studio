import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'

import { injectMaterialCSS } from '@/construction/materials/materialCSS'
import { getAllMaterials, subscribeToMaterials } from '@/construction/materials/store'
import { ErrorFallback } from '@/shared/components/ErrorBoundary'
import { ensureClipperModule } from '@/shared/geometry/clipperInstance'
import { ensureManifoldModule } from '@/shared/geometry/manifoldInstance'
import '@/shared/i18n/config'
import { registerServiceWorker } from '@/shared/services/serviceWorkerRegistration'

import App from './App.tsx'
import './index.css'

function removeInitialLoadingScreen() {
  const loadingScreen = document.querySelector('[data-loading-screen]')
  loadingScreen?.parentElement?.removeChild(loadingScreen)
}

async function bootstrap() {
  // Load both geometry modules in parallel
  await Promise.all([ensureClipperModule(), ensureManifoldModule()])

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
      <ErrorBoundary fallback={<div>An error occurred</div>}>
        <ThemeProvider attribute="class">
          <Theme>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <App />
            </ErrorBoundary>
          </Theme>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoadingScreen()
      registerServiceWorker()
    })
  })
}

void bootstrap()
