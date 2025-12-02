import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminService } from "@/services/admin.service"
import { useNotificationStore } from "@/store/ui.store"

// Admin Dashboard Stats
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminService.getDashboardStats(),
    refetchInterval: 60000, // Refetch every minute
  })
}

// Admin Revenue Chart
export function useAdminRevenueChart(period: "7d" | "30d" | "90d" | "1y") {
  return useQuery({
    queryKey: ["admin-revenue-chart", period],
    queryFn: () => adminService.getRevenueChart(period),
  })
}

// System Health
export function useSystemHealth() {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Simulate Weather Event
export function useSimulateWeatherEvent() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: {
      policyId: string
      eventType: "DROUGHT" | "FLOOD" | "HEAT"
      weatherStressIndex?: number
      vegetationIndex?: number
      triggerDate?: string
    }) => adminService.simulateWeatherEvent(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["policies"] })
      queryClient.invalidateQueries({ queryKey: ["claims"] })

      addNotification({
        title: "Weather Event Simulated",
        message: result.message || "Weather event simulated successfully",
        type: result.payout?.eligible ? "warning" : "info",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Simulation Failed",
        message: error.message || "Failed to simulate weather event",
        type: "error",
      })
    },
  })
}

// Approve Payout
export function useApprovePayout() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: {
      payoutId: string
      approve: boolean
      transactionHash?: string
      mpesaRef?: string
      rejectionReason?: string
    }) => adminService.approvePayout(data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })

      addNotification({
        title: variables.approve ? "Payout Approved" : "Payout Rejected",
        message: result.message || `Payout ${variables.approve ? "approved" : "rejected"} successfully`,
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Action Failed",
        message: error.message || "Failed to process payout",
        type: "error",
      })
    },
  })
}

// Bulk Approve KYC
export function useBulkApproveKyc() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (farmerIds: string[]) => adminService.bulkApproveKyc(farmerIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["farmers"] })
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] })

      addNotification({
        title: "KYC Approved",
        message: `Successfully approved ${result.approved} farmers`,
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Approval Failed",
        message: error.message || "Failed to approve KYC",
        type: "error",
      })
    },
  })
}
