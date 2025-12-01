import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Subdomain to role mapping
// NOTE: FARMER role is NOT allowed on web dashboard - farmers use mobile app only
const SUBDOMAIN_ROLES = {
  network: ['COOPERATIVE'],
  portal: ['ADMIN'],
  // Main domain only allows COOPERATIVE and ADMIN (no FARMER access)
  www: ['COOPERATIVE', 'ADMIN'],
  '': ['COOPERATIVE', 'ADMIN'],
}

// Protected routes that require authentication
const PROTECTED_ROUTES = ['/dashboard']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Extract subdomain
  const subdomain = getSubdomain(hostname)

  // If accessing subdomain root (network.localhost:3000 or portal.localhost:3000)
  // redirect to login page
  if ((subdomain === 'network' || subdomain === 'portal') && pathname === '/') {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Check if it's a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Get auth token from cookie
    const token = request.cookies.get('authToken')?.value
    const authStorage = request.cookies.get('auth-storage')?.value

    // If no token, redirect to login
    if (!token && !authStorage) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Parse user data from storage
    let userRole: string | null = null
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage)
        userRole = authData?.state?.user?.role || null
      } catch (error) {
        console.error('Failed to parse auth storage:', error)
      }
    }

    // Check subdomain access based on user role
    if (subdomain && userRole) {
      const allowedRoles = SUBDOMAIN_ROLES[subdomain as keyof typeof SUBDOMAIN_ROLES] || []
      
      if (!allowedRoles.includes(userRole)) {
        // Redirect to appropriate subdomain based on role
        const correctSubdomain = getSubdomainForRole(userRole)
        if (correctSubdomain !== subdomain) {
          const redirectUrl = new URL(request.url)
          redirectUrl.hostname = correctSubdomain 
            ? `${correctSubdomain}.${getBaseDomain(hostname)}`
            : getBaseDomain(hostname)
          return NextResponse.redirect(redirectUrl)
        }
      }
    }
  }

  // Add subdomain info to headers for use in components
  const response = NextResponse.next()
  response.headers.set('x-subdomain', subdomain || '')
  return response
}

// Extract subdomain from hostname
function getSubdomain(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // For localhost development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // Check for subdomain in localhost (e.g., network.localhost)
    const parts = host.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0]
    }
    return ''
  }

  // For production domain (e.g., network.microcrop.app)
  const parts = host.split('.')
  if (parts.length > 2) {
    // Has subdomain
    const sub = parts[0]
    if (sub !== 'www') {
      return sub
    }
  }

  return ''
}

// Get base domain without subdomain
function getBaseDomain(hostname: string): string {
  const host = hostname.split(':')[0]
  
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return host
  }

  const parts = host.split('.')
  if (parts.length > 2) {
    // Return last two parts (e.g., microcrop.app)
    return parts.slice(-2).join('.')
  }

  return host
}

// Get appropriate subdomain for user role
function getSubdomainForRole(role: string): string {
  switch (role) {
    case 'COOPERATIVE':
      return 'network'
    case 'ADMIN':
      return 'portal'
    case 'FARMER':
      return '' // No subdomain for farmers
    default:
      return ''
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
