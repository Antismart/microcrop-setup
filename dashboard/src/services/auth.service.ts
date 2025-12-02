import { apiClient } from "./api-client"
import { setCookie, deleteCookie } from "@/lib/cookies"

// Helper to get subdomain URL for role
function getSubdomainUrlForRole(role: string): string {
  if (typeof window === "undefined") return "/dashboard"
  
  const hostname = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ""
  const protocol = window.location.protocol
  
  // Handle localhost
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    switch (role) {
      case "COOPERATIVE":
        return `${protocol}//network.localhost${port}/dashboard`
      case "ADMIN":
        return `${protocol}//portal.localhost${port}/dashboard`
      default:
        return `${protocol}//localhost${port}/dashboard`
    }
  }
  
  // Handle production domains
  const baseDomain = hostname.replace(/^(www\.|network\.|portal\.)/, "")
  
  switch (role) {
    case "COOPERATIVE":
      return `${protocol}//network.${baseDomain}${port}/dashboard`
    case "ADMIN":
      return `${protocol}//portal.${baseDomain}${port}/dashboard`
    default:
      return `${protocol}//${baseDomain}${port}/dashboard`
  }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  role: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
  token: string
  refreshToken?: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface NewPasswordRequest {
  token: string
  password: string
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<any>("/auth/login", data)
      
      // Backend returns: { success, message, user, token, refreshToken }
      if (response.success && response.token && response.user) {
        // Store tokens in localStorage and cookies
        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", response.token)
          setCookie("authToken", response.token)
          
          if (response.refreshToken) {
            localStorage.setItem("refreshToken", response.refreshToken)
          }
        }
        
        return {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
        }
      }
      
      throw new Error(response.error || response.message || "Login failed")
    } catch (error: any) {
      // Handle network errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.message) {
        throw error
      }
      throw new Error("Network error. Please check your connection.")
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<any>("/auth/register", data)
      
      // Backend returns: { success, user, token, refreshToken }
      if (response.success && response.token && response.user) {
        // Store tokens in localStorage and cookies
        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", response.token)
          setCookie("authToken", response.token)
          
          if (response.refreshToken) {
            localStorage.setItem("refreshToken", response.refreshToken)
          }
        }
        
        return {
          user: response.user,
          token: response.token,
          refreshToken: response.refreshToken,
        }
      }
      
      throw new Error(response.error || response.message || "Registration failed")
    } catch (error: any) {
      // Handle network errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.message) {
        throw error
      }
      throw new Error("Network error. Please check your connection.")
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout")
    } finally {
      // Clear tokens from localStorage and cookies regardless of API response
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken")
        deleteCookie("authToken")
        localStorage.removeItem("refreshToken")
        
        // Redirect to main domain login page
        const hostname = window.location.hostname
        const port = window.location.port ? `:${window.location.port}` : ""
        const protocol = window.location.protocol
        
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          window.location.href = `${protocol}//localhost${port}/login`
        } else {
          const baseDomain = hostname.replace(/^(www\.|network\.|portal\.)/, "")
          window.location.href = `${protocol}//${baseDomain}${port}/login`
        }
      }
    }
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post<any>("/auth/reset-password", data)
      return { message: response.message || "Password reset email sent" }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  },

  newPassword: async (data: NewPasswordRequest): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post<any>("/auth/new-password", data)
      return { message: response.message || "Password updated successfully" }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      throw error
    }
  },

  verifyToken: async (): Promise<AuthResponse["user"]> => {
    const response = await apiClient.get<any>("/auth/verify")
    
    // Backend returns: { success, valid, user }
    if (response.success && response.valid && response.user) {
      return response.user
    }
    
    throw new Error("Token verification failed")
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<any>("/auth/refresh-token", { refreshToken })
    
    // Backend returns: { success, token, refreshToken, user }
    if (response.success && response.token) {
      // Store new tokens
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", response.token)
        setCookie("authToken", response.token)
        
        if (response.refreshToken) {
          localStorage.setItem("refreshToken", response.refreshToken)
        }
      }
      
      return {
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
      }
    }
    
    throw new Error(response.error || "Token refresh failed")
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; email?: string; phone?: string }): Promise<AuthResponse["user"]> => {
    const response = await apiClient.put<any>("/auth/profile", data)
    if (response.success && response.user) {
      return response.user
    }
    throw new Error(response.error || "Profile update failed")
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await apiClient.post<any>("/auth/change-password", data)
    return { message: response.message || "Password changed successfully" }
  },
}
