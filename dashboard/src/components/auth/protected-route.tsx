"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: string[]
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push("/auth/login")
      return
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push("/unauthorized")
      return
    }
  }, [isAuthenticated, user, requireAuth, allowedRoles, router])

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
