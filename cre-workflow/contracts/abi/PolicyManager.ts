import { parseAbi } from "viem"

/**
 * PolicyManager Contract ABI
 * Used to read active policies that need damage assessment
 */
export const PolicyManagerABI = parseAbi([
  // New functions for CRE integration (added to PolicyManager.sol)
  "function getActivePolicies() view returns (uint256[] memory)",
  "function getPolicyDetails(uint256 policyId) view returns (address farmer, uint256 sumInsured, uint256 startTime, uint256 endTime, uint8 cropType, uint8 coverageType, uint256 plotId)",
])

/**
 * Crop types enum matching PolicyManager.sol
 */
export enum CropType {
  MAIZE = 0,
  BEANS = 1,
  WHEAT = 2,
  SORGHUM = 3,
  MILLET = 4,
  RICE = 5,
}

/**
 * Coverage types enum matching PolicyManager.sol
 */
export enum CoverageType {
  DROUGHT = 0,
  FLOOD = 1,
  MULTI_PERIL = 2,
}

/**
 * Policy struct for TypeScript
 * Note: GPS coordinates (latitude/longitude) should be fetched from backend API using plotId
 * This keeps sensitive farm locations off-chain for privacy
 */
export interface Policy {
  policyId: bigint
  farmer: string
  sumInsured: bigint
  startTime: bigint
  endTime: bigint
  cropType: CropType
  coverageType: CoverageType
  plotId: bigint
  // GPS coordinates fetched separately via backend API
  latitude?: bigint
  longitude?: bigint
}

/**
 * Policy status enum
 */
export enum PolicyStatus {
  PENDING = 0,
  ACTIVE = 1,
  EXPIRED = 2,
  TRIGGERED = 3,
  PAID_OUT = 4,
  CANCELLED = 5,
}
