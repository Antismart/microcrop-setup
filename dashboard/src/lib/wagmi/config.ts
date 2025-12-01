import { createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"
import { env } from "@/lib/env"

// Get from validated environment variables
const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({
      target: "metaMask",
    }),
    walletConnect({
      projectId,
      showQrModal: true,
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

// Contract addresses
export const CONTRACT_ADDRESSES = {
  [base.id]: {
    microCropInsurance: env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS,
    usdcToken: env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS,
  },
  [baseSepolia.id]: {
    // TODO: Add testnet contract addresses to env validation if needed
    microCropInsurance: "",
    usdcToken: "",
  },
}

// Helper to get contract address for current chain
export function getContractAddress(chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES[typeof base.id]) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.[contractName] || ""
}
