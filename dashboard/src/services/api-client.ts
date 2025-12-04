import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import { env } from "@/lib/env"
import { deleteCookie } from "@/lib/cookies"

const API_BASE_URL = env.NEXT_PUBLIC_API_URL

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    })

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
          console.log('[API Client] Token attached to request:', token.substring(0, 20) + '...')
        } else {
          console.warn('[API Client] No auth token found in localStorage')
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.error('[API Client] 401 Unauthorized:', {
            url: error.config?.url,
            message: error.response?.data?.message || error.response?.data?.error,
            hasToken: !!this.getAuthToken()
          })
          // Handle unauthorized - redirect to login
          this.clearAuthToken()
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login"
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("authToken")
  }

  private setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("authToken", token)
    }
  }

  private clearAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
      deleteCookie("authToken")
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: any }> {
    const response = await this.post<{ token: string; user: any }>("/auth/login", credentials)
    this.setAuthToken(response.token)
    return response
  }

  async logout(): Promise<void> {
    this.clearAuthToken()
  }

  async getCurrentUser(): Promise<any> {
    return this.get("/auth/me")
  }

  // File upload
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; ipfsHash?: string }> {
    const formData = new FormData()
    formData.append("file", file)

    return this.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
