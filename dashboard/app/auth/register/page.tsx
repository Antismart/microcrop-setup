"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth"
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
import { UserPlus, Loader2, AlertCircle, Network, Shield } from "lucide-react"
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

// Get role based on subdomain
// NOTE: FARMER role is not supported on web - farmers use mobile app only
function getRoleFromSubdomain(subdomain: string | null): 'COOPERATIVE' | 'ADMIN' {
  if (subdomain === 'network') return 'COOPERATIVE'
  if (subdomain === 'portal') return 'ADMIN'
  // Default to COOPERATIVE (should never reach here due to redirect in useEffect)
  return 'COOPERATIVE'
}

// Get branding based on subdomain
function getBranding(subdomain: string | null) {
  if (subdomain === 'network') {
    return {
      title: 'MicroCrop Network',
      subtitle: 'Cooperative Admin Registration',
      description: 'Register your cooperative to manage farmers and policies',
      icon: Network,
      color: 'blue'
    }
  }
  if (subdomain === 'portal') {
    return {
      title: 'MicroCrop Portal',
      subtitle: 'Administrator Registration',
      description: 'Register as system administrator with full access',
      icon: Shield,
      color: 'purple'
    }
  }
  return {
    title: 'MicroCrop',
    subtitle: 'Farmer Registration',
    description: 'Register to access crop insurance services',
    icon: UserPlus,
    color: 'green'
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [subdomain, setSubdomain] = useState<string | null>(null)
  const [role, setRole] = useState<'COOPERATIVE' | 'ADMIN'>("COOPERATIVE")

  // Detect subdomain on mount
  useEffect(() => {
    const detectedSubdomain = getSubdomain()
    setSubdomain(detectedSubdomain)
    const detectedRole = getRoleFromSubdomain(detectedSubdomain)
    setRole(detectedRole)
    
    // Block registration for main domain (farmers only sign up via cooperatives)
    if (!detectedSubdomain || (detectedSubdomain !== 'network' && detectedSubdomain !== 'portal')) {
      router.push('/auth/login')
    }
  }, [router])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  const branding = getBranding(subdomain)
  const Icon = branding.icon

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: role,
      cooperativeName: "",
      acceptTerms: false
    },
  })

  // Update role in form when detected
  useEffect(() => {
    form.setValue('role', role)
  }, [role, form])

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true)
      setError("")

      // Ensure role matches subdomain
      const submitData = {
        ...data,
        role: role
      }

      const response = await authService.register(submitData)

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
        title: "Registration Successful",
        message: "Welcome to MicroCrop!",
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Registration failed"
      setError(errorMessage)
      
      addNotification({
        type: "error",
        title: "Registration Failed",
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="flex justify-center">
              <div className={`
                p-3 rounded-2xl 
                ${subdomain === 'network' ? 'bg-blue-600' : subdomain === 'portal' ? 'bg-purple-600' : 'bg-green-600'}
              `}>
                <Icon className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{branding.title}</CardTitle>
              <p className="text-sm font-medium text-gray-600 mt-1">{branding.subtitle}</p>
            </div>
            <CardDescription className="text-sm">
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {role === 'COOPERATIVE' && (
                  <FormField
                    control={form.control}
                    name="cooperativeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cooperative Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Farmers Cooperative Society" 
                            {...field} 
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="+254712345678" 
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
                      <FormLabel>Password</FormLabel>
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
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

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal text-gray-700">
                          I accept the terms and conditions
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className={`
                    w-full text-white
                    ${subdomain === 'network' ? 'bg-blue-600 hover:bg-blue-700' : subdomain === 'portal' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}
                  `}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600 mt-4">
                  Already have an account?{" "}
                  <Link 
                    href="/auth/login" 
                    className={`
                      font-medium hover:underline
                      ${subdomain === 'network' ? 'text-blue-600' : subdomain === 'portal' ? 'text-purple-600' : 'text-green-600'}
                    `}
                  >
                    Sign in
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
