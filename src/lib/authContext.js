import { createContext, useContext } from 'react'

/**
 * Auth state shared across the app. Kept in its own file (no components) so
 * Vite's fast refresh keeps working — see react-refresh/only-export-components.
 *
 * Defaults describe the local-first case: no backend, no session, app usable.
 */
export const AuthContext = createContext({
  session: null,
  user: null,
  loading: false,
  configured: false,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
