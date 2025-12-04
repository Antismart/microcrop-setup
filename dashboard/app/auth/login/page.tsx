"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginFormValues, loginDefaults } from "@/lib/validations/auth"
import { authService } from "@/services/auth.service"
import { useAuthStore } from "@/store/auth.store"
import { useNotificationStore } from "@/store/ui.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogIn, Loader2, AlertCircle, Network, Shield } from "lucide-react"
import Link from "next/link"

// Get subdomain from hostname
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null
  
  const hostname = window.location.hostname
  const host = hostname.split(':')[0]
  
  // For localhost
  if (host.includes('localhost')) {
    const parts = host.split('.')
    if (parts.length > 1) {
      const subdomain = parts[0]
      if (subdomain !== 'www') {
        return subdomain
      }
    }
    return null
  }
  
  // For production
  const parts = host.split('.')
  if (parts.length > 2) {
    const subdomain = parts[0]
    if (subdomain !== 'www') {
      return subdomain
    }
  }
  
  return null
}

// Get branding based on subdomain
function getBranding(subdomain: string | null) {
  if (subdomain === 'network') {
    return {
      title: 'MicroCrop Network',
      subtitle: 'Cooperative Admin Portal',
      description: 'Sign in to manage your cooperative and farmers',
      icon: Network,
      color: 'blue'
    }
  }
  
  // Default to Portal branding for root domain or portal subdomain
  return {
    title: 'MicroCrop Portal',
    subtitle: 'Administrator Dashboard',
    description: 'Sign in to access system administration',
    icon: Shield,
    color: 'purple'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [subdomain, setSubdomain] = useState<string | null>(null)

  // Detect subdomain on mount
  useEffect(() => {
    const detectedSubdomain = getSubdomain()
    setSubdomain(detectedSubdomain)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  const branding = getBranding(subdomain)
  const Icon = branding.icon

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      const response = await authService.login({
        email: data.email,
        password: data.password,
      })

      login(
        {
          id: response.user.id,
          name: `${response.user.firstName} ${response.user.lastName}`,
          email: response.user.email,
          role: response.user.role as any,
          createdAt: new Date(),
        },
        response.token
      )

      addNotification({
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${response.user.firstName}!`,
      })

      // Force full page reload to ensure cookies are set before middleware runs
      window.location.href = "/dashboard"
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Login failed"
      setError(errorMessage)
      
      addNotification({
        type: "error",
        title: "Login Failed",
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-none border border-gray-100">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="flex justify-center">
              <div className={`
                p-3 rounded-2xl
                ${subdomain === 'network' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}
              `}>
                <Icon className="h-8 w-8" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">{branding.title}</CardTitle>
              <p className="text-sm text-gray-500 mt-2">{branding.subtitle}</p>
            </div>
            <CardDescription className="text-sm text-gray-400">
              {branding.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john@example.com" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/auth/forgot-password"
                          className={`
                            text-sm font-medium hover:underline
                            ${subdomain === 'network' ? 'text-blue-600' : 'text-purple-600'}
                          `}
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className={`
                    w-full text-white
                    ${subdomain === 'network' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
                  `}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600 mt-4">
                  Don't have an account?{" "}
                  <Link
                    href="/auth/register"
                    className={`
                      font-medium hover:underline
                      ${subdomain === 'network' ? 'text-blue-600' : 'text-purple-600'}
                    `}
                  >
                    Register here
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
