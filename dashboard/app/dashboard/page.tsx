"use client"

import { useAuthStore } from "@/store/auth.store"
import { UserRole } from "@/types"
import AdminDashboard from "@/components/dashboard/AdminDashboard"
import CooperativeDashboard from "@/components/dashboard/CooperativeDashboard"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default function DashboardPage() {
  const { user } = useAuthStore()

  // Show appropriate dashboard based on user role
  if (user?.role === UserRole.ADMIN) {
    return <AdminDashboard />
  }

  if (user?.role === UserRole.COOPERATIVE || user?.role === UserRole.COOPERATIVE_STAFF) {
    return <CooperativeDashboard />
  }

  // Fallback for unknown roles
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Unable to determine dashboard view</p>
          <p className="text-sm text-gray-400 mt-2">Role: {user?.role || "Unknown"}</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
