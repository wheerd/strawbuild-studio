/// <reference types="vite/client" />
import '@react-three/fiber'
import '@testing-library/jest-dom'

declare global {
  declare const __APP_VERSION__: string
  declare const __APP_COMMIT__: string
  declare const __APP_COMMIT_FULL__: string
  declare const __APP_BUILD_TIME__: string
  declare const __APP_BRANCH__: string
  declare const __GIT_TAG__: string | null
  declare const __GIT_COMMITS_SINCE_TAG__: number
}

interface ImportMetaEnv {
  readonly VITE_SKETCHUP_API_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
