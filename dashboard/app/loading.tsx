import { Loader2 } from 'lucide-react'

/**
 * Global Loading State
 * 
 * Shown during initial page load and navigation transitions.
 * Automatically used by Next.js during page navigation.
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/loading
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">
          Loading...
        </p>
      </div>
    </div>
  )
}
