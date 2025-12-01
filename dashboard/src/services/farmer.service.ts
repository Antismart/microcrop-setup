import { apiClient } from "./api-client"
import type { Farmer, Policy, Claim, Payment, ApiResponse, PaginatedResponse } from "../types"

export const farmerService = {
  // Farmer CRUD operations
  async list(params?: {
    page?: number
    pageSize?: number
    cooperativeId?: string
    search?: string
  }): Promise<PaginatedResponse<Farmer>> {
    return apiClient.get("/farmers", { params })
  },

  async getById(id: string): Promise<Farmer> {
    return apiClient.get(`/farmers/${id}`)
  },

  async create(data: Partial<Farmer>): Promise<Farmer> {
    return apiClient.post("/farmers", data)
  },

  async update(id: string, data: Partial<Farmer>): Promise<Farmer> {
    return apiClient.put(`/farmers/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/farmers/${id}`)
  },

  // Bulk operations
  async bulkUpload(file: File): Promise<{
    success: number
    failed: number
    errors: Array<{ row: number; error: string }>
  }> {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post("/farmers/bulk-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },

  async bulkExport(farmerIds?: string[]): Promise<Blob> {
    return apiClient.post("/farmers/export", { farmerIds }, {
      responseType: "blob",
    })
  },

  // Farmer policies
  async getPolicies(farmerId: string): Promise<Policy[]> {
    return apiClient.get(`/farmers/${farmerId}/policies`)
  },

  // Farmer claims
  async getClaims(farmerId: string): Promise<Claim[]> {
    return apiClient.get(`/farmers/${farmerId}/claims`)
  },

  // Farmer payments
  async getPayments(farmerId: string): Promise<Payment[]> {
    return apiClient.get(`/farmers/${farmerId}/payments`)
  },
}

export const policyService = {
  async list(params?: {
    page?: number
    pageSize?: number
    cooperativeId?: string
    farmerId?: string
    status?: string
  }): Promise<PaginatedResponse<Policy>> {
    return apiClient.get("/policies", { params })
  },

  async getById(id: string): Promise<Policy> {
    return apiClient.get(`/policies/${id}`)
  },

  async create(data: Partial<Policy>): Promise<Policy> {
    return apiClient.post("/policies", data)
  },

  async bulkCreate(policies: Partial<Policy>[]): Promise<{
    success: number
    failed: number
    policies: Policy[]
  }> {
    return apiClient.post("/policies/bulk", { policies })
  },

  async calculatePremium(data: {
    cropType: string
    plotSize: number
    coverageType: string
    sumInsured: number
  }): Promise<{ premium: number; breakdown: any }> {
    return apiClient.post("/policies/calculate-premium", data)
  },

  async renew(policyId: string): Promise<Policy> {
    return apiClient.post(`/policies/${policyId}/renew`)
  },

  async cancel(policyId: string, reason: string): Promise<void> {
    return apiClient.post(`/policies/${policyId}/cancel`, { reason })
  },
}

export const claimService = {
  async list(params?: {
    page?: number
    pageSize?: number
    cooperativeId?: string
    status?: string
  }): Promise<PaginatedResponse<Claim>> {
    return apiClient.get("/claims", { params })
  },

  async getById(id: string): Promise<Claim> {
    return apiClient.get(`/claims/${id}`)
  },

  async submit(data: {
    policyId: string
    type: string
    evidence: any[]
  }): Promise<Claim> {
    return apiClient.post("/claims", data)
  },

  async approve(claimId: string, payoutAmount: number): Promise<Claim> {
    return apiClient.post(`/claims/${claimId}/approve`, { payoutAmount })
  },

  async reject(claimId: string, reason: string): Promise<Claim> {
    return apiClient.post(`/claims/${claimId}/reject`, { reason })
  },

  async processPayout(claimId: string): Promise<void> {
    return apiClient.post(`/claims/${claimId}/payout`)
  },
}

export const paymentService = {
  async list(params?: {
    page?: number
    pageSize?: number
    type?: string
    status?: string
  }): Promise<PaginatedResponse<Payment>> {
    return apiClient.get("/payments", { params })
  },

  async initiate(data: {
    type: string
    amount: number
    method: string
    recipientId?: string
    policyId?: string
  }): Promise<Payment> {
    return apiClient.post("/payments", data)
  },

  async verifyPayment(reference: string): Promise<Payment> {
    return apiClient.get(`/payments/${reference}/verify`)
  },

  async processRefund(paymentId: string): Promise<void> {
    return apiClient.post(`/payments/${paymentId}/refund`)
  },
}

export const cooperativeService = {
  // Cooperative CRUD operations
  async list(params?: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
  }): Promise<PaginatedResponse<any>> {
    return apiClient.get("/cooperatives", { params })
  },

  async getById(id: string): Promise<any> {
    return apiClient.get(`/cooperatives/${id}`)
  },

  async create(data: any): Promise<any> {
    return apiClient.post("/cooperatives", data)
  },

  async update(id: string, data: any): Promise<any> {
    return apiClient.put(`/cooperatives/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/cooperatives/${id}`)
  },

  async getDashboardStats(): Promise<{
    totalFarmers: number
    activePolicies: number
    totalPremiumCollected: number
    pendingPayouts: number
    claimsThisMonth: number
    coverageArea: number
    trends?: {
      farmersGrowth?: number
      premiumGrowth?: number
      claimsGrowth?: number
    }
  }> {
    return apiClient.get("/cooperative/stats")
  },

  async getRevenueChart(period: "7d" | "30d" | "90d" | "1y"): Promise<{
    labels: string[]
    premiums: number[]
    payouts: number[]
  }> {
    return apiClient.get("/cooperative/revenue-chart", { params: { period } })
  },

  async getClaimsAnalytics(): Promise<any> {
    return apiClient.get("/cooperative/claims-analytics")
  },
}

export const analyticsService = {
  async getOverview(cooperativeId?: string): Promise<any> {
    return apiClient.get("/analytics/overview", { params: { cooperativeId } })
  },

  async getPerformanceMetrics(startDate: string, endDate: string): Promise<any> {
    return apiClient.get("/analytics/performance", {
      params: { startDate, endDate },
    })
  },

  async generateReport(type: string, params: any): Promise<Blob> {
    return apiClient.post(`/analytics/reports/${type}`, params, {
      responseType: "blob",
    })
  },
}
