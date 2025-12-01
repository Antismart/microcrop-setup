import { Loader2 } from 'lucide-react'

/**
 * Dashboard Loading State
 * 
 * Shown during dashboard page transitions and data loading.
 * Provides a contextual loading experience within the dashboard layout.
 */
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          Loading dashboard...
        </p>
      </div>
    </div>
  )
}
