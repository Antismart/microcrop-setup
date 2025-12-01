import { parseAbiParameters } from "viem"

/**
 * DamageReport struct ABI parameters
 * This matches the struct in PayoutReceiver.sol
 */
export const DamageReportParams = parseAbiParameters([
  "uint256 policyId",
  "uint256 damagePercentage",
  "uint256 weatherDamage",
  "uint256 satelliteDamage",
  "uint256 payoutAmount",
  "uint256 assessedAt",
].join(", "))

/**
 * TypeScript interface matching the Solidity struct
 */
export interface DamageReport {
  policyId: bigint
  damagePercentage: bigint
  weatherDamage: bigint
  satelliteDamage: bigint
  payoutAmount: bigint
  assessedAt: bigint
}
