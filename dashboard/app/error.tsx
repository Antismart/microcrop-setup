'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Global Error Boundary
 * 
 * Catches unhandled errors in the app and displays a user-friendly error page.
 * Automatically wrapped around page components by Next.js.
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error caught:', error)
    }
    
    // TODO: Log to error tracking service (e.g., Sentry, LogRocket)
    // logErrorToService(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-50 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong!
        </h1>
        
        <p className="text-gray-600 mb-2">
          We encountered an unexpected error. This has been logged and we'll look into it.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
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
            Try again
          </Button>
          
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
