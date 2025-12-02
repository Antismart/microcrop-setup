import { apiClient } from "@/lib/api-client"

export interface AdminDashboardStats {
  success: boolean
  role: string
  platformStats: {
    totalCooperatives: number
    activeCooperatives: number
    totalFarmers: number
    activePolicies: number
    totalPremiumCollected: number
    totalPayoutsDistributed: number
    totalClaims: number
    pendingClaims: number
    pendingKycFarmers: number
    coverageArea: number
    lossRatio: number
  }
  trends: {
    cooperativeGrowth: number
    farmerGrowth: number
    policyGrowth: number
    premiumGrowth: number
    claimGrowth: number
  }
  topCooperatives: Array<{
    id: string
    name: string
    totalFarmers: number
    totalPremium: number
  }>
}

export interface AdminRevenueChart {
  success: boolean
  role: string
  period: string
  labels: string[]
  premiums: number[]
  payouts: number[]
  activeCooperatives: number[]
}

export interface SystemHealth {
  success: boolean
  role: string
  systemHealth: {
    database: {
      status: string
      latency?: number
      error?: string
    }
    recentErrors: number
    processingQueue: number
    timestamp: string
  }
}

export const adminService = {
  /**
   * Get admin platform-wide dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return apiClient.get("/admin/dashboard/stats")
  },

  /**
   * Get admin platform-wide revenue chart
   */
  async getRevenueChart(period: "7d" | "30d" | "90d" | "1y" = "30d"): Promise<AdminRevenueChart> {
    return apiClient.get("/admin/dashboard/revenue-chart", { params: { period } })
  },

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return apiClient.get("/admin/dashboard/system-health")
  },

  /**
   * Simulate weather event for testing
   */
  async simulateWeatherEvent(data: {
    policyId: string
    eventType: "DROUGHT" | "FLOOD" | "HEAT"
    weatherStressIndex?: number
    vegetationIndex?: number
    triggerDate?: string
  }): Promise<any> {
    return apiClient.post("/admin/weather/simulate", data)
  },

  /**
   * Approve or reject a payout
   */
  async approvePayout(data: {
    payoutId: string
    approve: boolean
    transactionHash?: string
    mpesaRef?: string
    rejectionReason?: string
  }): Promise<any> {
    return apiClient.post("/admin/payout/approve", data)
  },

  /**
   * Bulk approve KYC for farmers
   */
  async bulkApproveKyc(farmerIds: string[]): Promise<any> {
    return apiClient.post("/admin/kyc/bulk-approve", { farmerIds })
  },

  /**
   * Get comprehensive dashboard metrics (existing endpoint)
   */
  async getComprehensiveDashboard(period: string = "30"): Promise<any> {
    return apiClient.get("/admin/dashboard", { params: { period } })
  },

  /**
   * Get system statistics (existing endpoint)
   */
  async getSystemStats(): Promise<any> {
    return apiClient.get("/admin/stats")
  },
}
