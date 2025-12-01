import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { farmerService, policyService, claimService, paymentService, cooperativeService } from "../services/farmer.service"
import type { Farmer, Policy, Claim, Payment, PaginatedResponse } from "../types"
import { useNotificationStore } from "../store/ui.store"

// Farmers
export function useFarmers(params?: {
  page?: number
  pageSize?: number
  cooperativeId?: string
  search?: string
}) {
  return useQuery({
    queryKey: ["farmers", params],
    queryFn: () => farmerService.list(params),
  })
}

export function useFarmer(id: string | undefined, options?: UseQueryOptions<Farmer>) {
  return useQuery({
    queryKey: ["farmer", id],
    queryFn: () => farmerService.getById(id!),
    enabled: !!id,
    ...options,
  })
}

export function useCreateFarmer() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: Partial<Farmer>) => farmerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmers"] })
      addNotification({
        title: "Success",
        message: "Farmer created successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to create farmer",
        type: "error",
      })
    },
  })
}

export function useUpdateFarmer() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Farmer> }) =>
      farmerService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["farmer", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["farmers"] })
      addNotification({
        title: "Success",
        message: "Farmer updated successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to update farmer",
        type: "error",
      })
    },
  })
}

export function useBulkUploadFarmers() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (file: File) => farmerService.bulkUpload(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["farmers"] })
      addNotification({
        title: "Bulk Upload Complete",
        message: `Successfully uploaded ${result.success} farmers. ${result.failed} failed.`,
        type: result.failed > 0 ? "warning" : "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Upload Failed",
        message: error.message || "Failed to upload farmers",
        type: "error",
      })
    },
  })
}

export function useBulkExportFarmers() {
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (farmerIds?: string[]) => 
      farmerService.bulkExport(farmerIds),
    onSuccess: () => {
      addNotification({
        title: "Export Complete",
        message: "Farmers exported successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Export Failed",
        message: error.message || "Failed to export farmers",
        type: "error",
      })
    },
  })
}

// Policies
export function usePolicies(params?: {
  page?: number
  pageSize?: number
  cooperativeId?: string
  farmerId?: string
  status?: string
}) {
  return useQuery({
    queryKey: ["policies", params],
    queryFn: () => policyService.list(params),
  })
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ["policy", id],
    queryFn: () => policyService.getById(id!),
    enabled: !!id,
  })
}

export function useCreatePolicy() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: Partial<Policy>) => policyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] })
      addNotification({
        title: "Success",
        message: "Policy created successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to create policy",
        type: "error",
      })
    },
  })
}

export function useBulkCreatePolicies() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (policies: Partial<Policy>[]) => policyService.bulkCreate(policies),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] })
      addNotification({
        title: "Bulk Creation Complete",
        message: `Successfully created ${result.success} policies.`,
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to create policies",
        type: "error",
      })
    },
  })
}

export function useCalculatePremium() {
  return useMutation({
    mutationFn: (data: {
      cropType: string
      plotSize: number
      coverageType: string
      sumInsured: number
    }) => policyService.calculatePremium(data),
  })
}

// Claims
export function useClaims(params?: {
  page?: number
  pageSize?: number
  cooperativeId?: string
  status?: string
}) {
  return useQuery({
    queryKey: ["claims", params],
    queryFn: () => claimService.list(params),
  })
}

export function useClaim(id: string | undefined) {
  return useQuery({
    queryKey: ["claim", id],
    queryFn: () => claimService.getById(id!),
    enabled: !!id,
  })
}

export function useSubmitClaim() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: { policyId: string; type: string; evidence: any[] }) =>
      claimService.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] })
      addNotification({
        title: "Success",
        message: "Claim submitted successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to submit claim",
        type: "error",
      })
    },
  })
}

export function useApproveClaim() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: ({ claimId, payoutAmount }: { claimId: string; payoutAmount: number }) =>
      claimService.approve(claimId, payoutAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] })
      addNotification({
        title: "Claim Approved",
        message: "Claim has been approved successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to approve claim",
        type: "error",
      })
    },
  })
}

export function useRejectClaim() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      claimService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] })
      addNotification({
        title: "Claim Rejected",
        message: "Claim has been rejected",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to reject claim",
        type: "error",
      })
    },
  })
}

// Cooperatives
export function useCooperatives(params?: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}) {
  return useQuery({
    queryKey: ["cooperatives", params],
    queryFn: () => cooperativeService.list(params),
  })
}

export function useCooperative(id: string | undefined) {
  return useQuery({
    queryKey: ["cooperative", id],
    queryFn: () => cooperativeService.getById(id!),
    enabled: !!id,
  })
}

export function useCreateCooperative() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: any) => cooperativeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperatives"] })
      addNotification({
        title: "Success",
        message: "Cooperative created successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to create cooperative",
        type: "error",
      })
    },
  })
}

export function useUpdateCooperative() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      cooperativeService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cooperative", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["cooperatives"] })
      addNotification({
        title: "Success",
        message: "Cooperative updated successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Error",
        message: error.message || "Failed to update cooperative",
        type: "error",
      })
    },
  })
}

// Payments
export function usePayments(params?: {
  page?: number
  pageSize?: number
  type?: string
  status?: string
}) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => paymentService.list(params),
  })
}

export function useInitiatePayment() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()

  return useMutation({
    mutationFn: (data: {
      type: string
      amount: number
      method: string
      recipientId?: string
      policyId?: string
    }) => paymentService.initiate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      addNotification({
        title: "Payment Initiated",
        message: "Payment has been initiated successfully",
        type: "success",
      })
    },
    onError: (error: any) => {
      addNotification({
        title: "Payment Failed",
        message: error.message || "Failed to initiate payment",
        type: "error",
      })
    },
  })
}

// Dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => cooperativeService.getDashboardStats(),
    refetchInterval: 60000, // Refetch every minute
  })
}

export function useRevenueChart(period: "7d" | "30d" | "90d" | "1y") {
  return useQuery({
    queryKey: ["revenue-chart", period],
    queryFn: () => cooperativeService.getRevenueChart(period),
  })
}

export function useClaimsAnalytics() {
  return useQuery({
    queryKey: ["claims-analytics"],
    queryFn: () => cooperativeService.getClaimsAnalytics(),
  })
}
