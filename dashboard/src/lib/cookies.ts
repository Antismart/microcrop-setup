export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === 'undefined') return

  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  const expires = `expires=${date.toUTCString()}`

  // Get base domain for cross-subdomain cookies
  const hostname = window.location.hostname
  let domain = ''

  // For production, set domain to allow cross-subdomain access
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length > 2) {
      // Has subdomain - set cookie for base domain (e.g., .microcrop.app)
      domain = `;domain=.${parts.slice(-2).join('.')}`
    } else {
      // No subdomain - set for current domain
      domain = `;domain=.${hostname}`
    }
  }

  // Set cookie with path=/ and domain to make it available across subdomains
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax${domain}`
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return

  // Get base domain for cross-subdomain cookies
  const hostname = window.location.hostname
  let domain = ''

  // For production, set domain to allow cross-subdomain deletion
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length > 2) {
      // Has subdomain - delete cookie for base domain (e.g., .microcrop.app)
      domain = `;domain=.${parts.slice(-2).join('.')}`
    } else {
      // No subdomain - delete for current domain
      domain = `;domain=.${hostname}`
    }
  }

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domain}`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const nameEQ = `${name}=`
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}
