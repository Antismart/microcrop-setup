import { useReadContract, useWriteContract, useWatchContractEvent } from "wagmi"
import { useAccount } from "wagmi"
import { getContractAddress } from "@/lib/wagmi/config"
import { useMutation, useQueryClient } from "@tanstack/react-query"

// MicroCropInsurance ABI (minimal for key functions)
const INSURANCE_ABI = [
  {
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "farmer", type: "address" },
      { name: "premium", type: "uint256" },
      { name: "sumInsured", type: "uint256" },
    ],
    name: "createPolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "policyId", type: "uint256" }],
    name: "getPolicy",
    outputs: [
      { name: "farmer", type: "address" },
      { name: "premium", type: "uint256" },
      { name: "sumInsured", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "claimId", type: "uint256" },
      { name: "policyId", type: "uint256" },
      { name: "damagePercentage", type: "uint256" },
    ],
    name: "submitClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "claimId", type: "uint256" },
      { name: "payoutAmount", type: "uint256" },
    ],
    name: "approveClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "policyId", type: "uint256" },
      { indexed: true, name: "farmer", type: "address" },
      { indexed: false, name: "premium", type: "uint256" },
    ],
    name: "PolicyCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "claimId", type: "uint256" },
      { indexed: true, name: "policyId", type: "uint256" },
      { indexed: false, name: "payoutAmount", type: "uint256" },
    ],
    name: "ClaimApproved",
    type: "event",
  },
] as const

// Hook to read policy data from blockchain
export function useReadPolicy(policyId: string) {
  const { chain } = useAccount()
  
  // Safely convert to BigInt, default to 0n if invalid/empty
  // The query will be disabled anyway if policyId is empty
  const safePolicyId = policyId && /^\d+$/.test(policyId) ? BigInt(policyId) : BigInt(0)

  return useReadContract({
    address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
    abi: INSURANCE_ABI,
    functionName: "getPolicy",
    args: [safePolicyId],
    query: {
      enabled: !!policyId && /^\d+$/.test(policyId) && !!chain,
    },
  })
}

// Hook to create policy on blockchain
export function useCreatePolicy() {
  const { chain } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      policyId,
      farmer,
      premium,
      sumInsured,
    }: {
      policyId: string
      farmer: string
      premium: string
      sumInsured: string
    }) => {
      const hash = await writeContractAsync({
        address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
        abi: INSURANCE_ABI,
        functionName: "createPolicy",
        args: [BigInt(policyId), farmer as `0x${string}`, BigInt(premium), BigInt(sumInsured)],
      })
      return hash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] })
    },
  })
}

// Hook to submit claim on blockchain
export function useSubmitClaim() {
  const { chain } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      policyId,
      damagePercentage,
    }: {
      claimId: string
      policyId: string
      damagePercentage: number
    }) => {
      const hash = await writeContractAsync({
        address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
        abi: INSURANCE_ABI,
        functionName: "submitClaim",
        args: [BigInt(claimId), BigInt(policyId), BigInt(damagePercentage * 100)],
      })
      return hash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] })
    },
  })
}

// Hook to approve claim on blockchain
export function useApproveClaimOnChain() {
  const { chain } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      payoutAmount,
    }: {
      claimId: string
      payoutAmount: string
    }) => {
      const hash = await writeContractAsync({
        address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
        abi: INSURANCE_ABI,
        functionName: "approveClaim",
        args: [BigInt(claimId), BigInt(payoutAmount)],
      })
      return hash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] })
    },
  })
}

// Hook to watch for PolicyCreated events
export function useWatchPolicyCreated(onPolicyCreated: (data: any) => void) {
  const { chain } = useAccount()

  useWatchContractEvent({
    address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
    abi: INSURANCE_ABI,
    eventName: "PolicyCreated",
    onLogs: (logs) => {
      logs.forEach((log) => {
        onPolicyCreated(log.args)
      })
    },
  })
}

// Hook to watch for ClaimApproved events
export function useWatchClaimApproved(onClaimApproved: (data: any) => void) {
  const { chain } = useAccount()

  useWatchContractEvent({
    address: getContractAddress(chain?.id || 8453, "microCropInsurance") as `0x${string}`,
    abi: INSURANCE_ABI,
    eventName: "ClaimApproved",
    onLogs: (logs) => {
      logs.forEach((log) => {
        onClaimApproved(log.args)
      })
    },
  })
}
