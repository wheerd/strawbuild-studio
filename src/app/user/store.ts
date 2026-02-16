import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { User } from './types'

interface AuthState {
  user: User | null
  isLoading: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

export type AuthStore = AuthState & { actions: AuthActions }

const initialState: AuthState = {
  user: null,
  isLoading: true
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    set => ({
      ...initialState,

      actions: {
        setUser: user => {
          set({ user, isLoading: false }, false, 'auth/setUser')
        },

        setLoading: isLoading => {
          set({ isLoading }, false, 'auth/setLoading')
        },

        reset: () => {
          set(initialState, false, 'auth/reset')
        }
      }
    }),
    { name: 'auth-store' }
  )
)

export const useUser = () => useAuthStore(state => state.user)
export const useUserId = () => useAuthStore(state => state.user?.id ?? null)
export const useUserEmail = () => useAuthStore(state => state.user?.email ?? null)
export const useIsAuthenticated = () => useAuthStore(state => state.user !== null)
export const useAuthLoading = () => useAuthStore(state => state.isLoading)
export const useAuthActions = () => useAuthStore(state => state.actions)
