import { z } from 'zod'

/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at build/runtime.
 * Prevents deployment with missing or invalid configuration.
 * 
 * Usage:
 *   import { env } from '@/lib/env'
 *   const apiUrl = env.NEXT_PUBLIC_API_URL
 */

// Define the schema for environment variables
const envSchema = z.object({
  // Required: API Configuration
  NEXT_PUBLIC_API_URL: z
    .string()
    .min(1, 'API URL is required')
    .url('API URL must be a valid URL'),
  
  NEXT_PUBLIC_BASE_DOMAIN: z
    .string()
    .min(1, 'Base domain is required')
    .refine(
      (val) => !val.startsWith('http'),
      'Base domain should not include protocol (http://)'
    ),
  
  // Optional: Blockchain Configuration
  NEXT_PUBLIC_ENABLE_BLOCKCHAIN: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z
    .string()
    .optional()
    .default(''),
  
  NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS: z
    .string()
    .optional()
    .default('')
    .refine(
      (val) => !val || val.startsWith('0x') || val === '',
      'Insurance contract address must start with 0x if provided'
    ),
  
  NEXT_PUBLIC_USDC_CONTRACT_ADDRESS: z
    .string()
    .optional()
    .default('')
    .refine(
      (val) => !val || val.startsWith('0x') || val === '',
      'USDC contract address must start with 0x if provided'
    ),
  
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>

/**
 * Validates and parses environment variables
 * Throws an error if validation fails with detailed messages
 */
function validateEnv(): Env {
  try {
    const env = envSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN,
      NEXT_PUBLIC_ENABLE_BLOCKCHAIN: process.env.NEXT_PUBLIC_ENABLE_BLOCKCHAIN,
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS,
      NEXT_PUBLIC_USDC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS,
      NODE_ENV: process.env.NODE_ENV,
    })
    
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => {
        const path = err.path.join('.')
        return `  ❌ ${path}: ${err.message}`
      }).join('\n')
      
      throw new Error(
        `\n❌ Environment variable validation failed:\n\n${missingVars}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.\n` +
        `See .env.local for reference.\n`
      )
    }
    throw error
  }
}

// Validate and export environment variables
export const env = validateEnv()

/**
 * Helper function to check if blockchain features are enabled
 */
export function isBlockchainEnabled(): boolean {
  return env.NEXT_PUBLIC_ENABLE_BLOCKCHAIN && 
         !!env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS &&
         !!env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
}

/**
 * Helper function to get the full subdomain URL
 */
export function getSubdomainUrl(subdomain: string): string {
  const protocol = env.NODE_ENV === 'development' ? 'http' : 'https'
  const port = env.NODE_ENV === 'development' ? ':3000' : ''
  
  if (!subdomain || subdomain === 'www') {
    return `${protocol}://${env.NEXT_PUBLIC_BASE_DOMAIN}${port}`
  }
  
  return `${protocol}://${subdomain}.${env.NEXT_PUBLIC_BASE_DOMAIN}${port}`
}
