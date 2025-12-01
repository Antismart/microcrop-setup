import { redirect } from "next/navigation"
import { headers } from "next/headers"

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]
  
  if (host === 'localhost' || host === '127.0.0.1') {
    return null
  }
  
  if (host.includes('localhost')) {
    const parts = host.split('.')
    if (parts.length > 1) {
      return parts[0]
    }
    return null
  }
  
  const parts = host.split('.')
  if (parts.length > 2) {
    const subdomain = parts[0]
    if (subdomain !== 'www') {
      return subdomain
    }
  }
  
  return null
}

export default async function Home() {
  const headersList = await headers()
  const hostname = headersList.get('host') || 'localhost'
  const subdomain = getSubdomain(hostname)
  
  if (subdomain === 'network' || subdomain === 'portal') {
    redirect('/auth/login')
  } else {
    redirect('/auth/login')
  }
}
