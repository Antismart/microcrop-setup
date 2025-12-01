import { useEffect, useState } from 'react'

export type Subdomain = 'network' | 'portal' | 'www' | ''

/**
 * Subdomain Information
 * 
 * Note: FARMER role does not have web dashboard access (mobile app only).
 * The subdomain system is only for COOPERATIVE (network) and ADMIN (portal) users.
 */
interface SubdomainInfo {
  subdomain: Subdomain
  isCooperative: boolean
  isAdmin: boolean
  baseDomain: string
  fullDomain: string
}

export function useSubdomain(): SubdomainInfo {
  const [subdomainInfo, setSubdomainInfo] = useState<SubdomainInfo>({
    subdomain: '',
    isCooperative: false,
    isAdmin: false,
    baseDomain: '',
    fullDomain: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hostname = window.location.hostname
    const subdomain = getSubdomainFromHostname(hostname)
    const baseDomain = getBaseDomain(hostname)

    setSubdomainInfo({
      subdomain: subdomain as Subdomain,
      isCooperative: subdomain === 'network',
      isAdmin: subdomain === 'portal',
      baseDomain,
      fullDomain: hostname,
    })
  }, [])

  return subdomainInfo
}

function getSubdomainFromHostname(hostname: string): string {
  // For localhost development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0]
    }
    return ''
  }

  // For production
  const parts = hostname.split('.')
  if (parts.length > 2) {
    const sub = parts[0]
    if (sub !== 'www') {
      return sub
    }
  }

  return ''
}

function getBaseDomain(hostname: string): string {
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return hostname
  }

  const parts = hostname.split('.')
  if (parts.length > 2) {
    return parts.slice(-2).join('.')
  }

  return hostname
}

// Utility function to get URL for a specific role
export function getUrlForRole(role: string, baseDomain: string, path: string = ''): string {
  let subdomain = ''
  
  switch (role) {
    case 'COOPERATIVE':
      subdomain = 'network'
      break
    case 'ADMIN':
      subdomain = 'portal'
      break
    case 'FARMER':
      // NOTE: FARMER role does not have web dashboard access (mobile app only)
      throw new Error('FARMER role does not have web dashboard access. Farmers use mobile app (USSD).')
  }

  if (baseDomain.includes('localhost') || baseDomain.includes('127.0.0.1')) {
    // For localhost, use subdomain.localhost format
    const url = subdomain 
      ? `http://${subdomain}.${baseDomain}${path}`
      : `http://${baseDomain}${path}`
    return url
  }

  // For production
  const protocol = 'https://'
  const url = subdomain
    ? `${protocol}${subdomain}.${baseDomain}${path}`
    : `${protocol}${baseDomain}${path}`
  
  return url
}

// Check if user has access to current subdomain
export function hasSubdomainAccess(subdomain: Subdomain, userRole: string): boolean {
  const accessMap: Record<Subdomain, string[]> = {
    network: ['COOPERATIVE'],
    portal: ['ADMIN'],
    // NOTE: FARMER role is NOT allowed on web dashboard - farmers use mobile app only
    www: ['COOPERATIVE', 'ADMIN'],
    '': ['COOPERATIVE', 'ADMIN'],
  }

  return accessMap[subdomain]?.includes(userRole) || false
}
