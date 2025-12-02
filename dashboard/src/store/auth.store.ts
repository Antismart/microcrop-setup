import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "../types"
import { deleteCookie, setCookie } from "@/lib/cookies"

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => set({ token }),
      
      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
        })
        // Store token in localStorage and cookies
        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", token)
          setCookie("authToken", token)
        }
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
        // Clear token from localStorage and cookies
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken")
          deleteCookie("authToken")
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      hasRole: (role) => {
        const { user } = get()
        return user?.role === role
      },
      
      hasAnyRole: (roles) => {
        const { user } = get()
        return user ? roles.includes(user.role) : false
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
