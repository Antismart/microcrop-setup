'use client'

import { useEffect } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Dashboard Error Boundary
 * 
 * Catches errors within the dashboard section and provides contextual recovery options.
 * More specific than the global error boundary with dashboard-aware navigation.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard error caught:', error)
    }
    
    // TODO: Log to error tracking service with dashboard context
    // logErrorToService(error, { section: 'dashboard' })
  }, [error])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Error
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          We encountered an issue loading this dashboard section. Try refreshing or return to the dashboard home.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-6 space-y-3">
          <Button
            onClick={reset}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          
          <Link href="/dashboard" className="block">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
