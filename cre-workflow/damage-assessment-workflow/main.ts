/**
 * ============================================================================
 * MicroCrop Automated Damage Assessment Workflow
 * ============================================================================
 * 
 * This CRE workflow replaces the on-chain oracle system with an automated
 * off-chain damage assessment pipeline that:
 * 
 * 1. MONIT  // Calculate damage scores
  const weatherDamage = calculateWeatherDamage(weatherData, policy.cropType, policy.coverageType)
  const biomassDamage = calculateBiomassDamage(biomassData)

  // Combined damage (60% weather + 40% biomass)
  const totalDamage = Math.floor(weatherDamage * 0.6 + biomassDamage * 0.4)

  // Calculate payout amount
  const payoutAmount = calculatePayout(policy.sumInsured, totalDamage)

  return {
    policyId: policy.policyId,
    weatherDamage,
    satelliteDamage: biomassDamage,  // Keep field name for contract compatibility
    totalDamage,
    payoutAmount,
  }
}tive policies daily via cron trigger
 * 2. FETCHES: Gets weather data from WeatherXM API
 * 3. FETCHES: Gets satellite NDVI data from Planet Labs API  
 * 4. COMPUTES: Calculates damage using 60% weather + 40% satellite formula
 * 5. SUBMITS: Sends signed reports on-chain when damage detected
 * 6. TRIGGERS: Automatic payouts through PayoutReceiver.sol
 * 
 * KEY FEATURES:
 * - No manual claim filing required (automatic detection)
 * - Privacy-preserving (GPS coordinates never go on-chain)
 * - Decentralized consensus (multiple DON nodes validate each step)
 * - Cryptographically signed reports (verified by KeystoneForwarder)
 * 
 * ============================================================================
 */

import {
  cre,
  Runner,
  type Runtime,
  type NodeRuntime,
  getNetwork,
  hexToBase64,
  bytesToHex,
  encodeCallMsg,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusMedianAggregation,
  TxStatus,
} from "@chainlink/cre-sdk"

import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  zeroAddress,
  type Address,
} from "viem"

import { z } from "zod"

import { 
  PolicyManagerABI, 
  type Policy, 
  CropType,
  CoverageType,
  DamageReportParams, 
  type DamageReport 
} from "../contracts/abi"

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

const configSchema = z.object({
  // Cron schedule (e.g., "0 0 * * *" for daily at midnight UTC)
  cronSchedule: z.string(),
  
  // Blockchain configuration
  chainSelectorName: z.string(),
  policyManagerAddress: z.string(),
  payoutReceiverAddress: z.string(),
  gasLimit: z.string(),
  
  // API endpoints
  weatherxmApiUrl: z.string(),
  planetApiUrl: z.string(),
  backendApiUrl: z.string(),  // MicroCrop backend API for GPS coordinates
  
  // Assessment parameters
  minDamageThreshold: z.number().min(0).max(10000), // Minimum damage to trigger payout (bps)
  lookbackDays: z.number().min(7).max(90), // Days of historical data to analyze
})

type Config = z.infer<typeof configSchema>

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Weather data from WeatherXM API
 */
interface WeatherData {
  totalRainfall: number      // mm
  avgTemperature: number     // °C
  maxTemperature: number     // °C
  dryDays: number           // count
  floodDays: number         // count
  heatStressDays: number    // count
}

/**
 * Crop Biomass data from Planet Labs Subscriptions API
 * Using BIOMASS-PROXY_V4.0_10 (Planet's Crop Biomass Proxy)
 */
interface CropBiomassData {
  currentBiomass: number     // Latest biomass proxy value (0-1 scale)
  baselineBiomass: number    // Historical baseline for this field
  minBiomass: number         // Minimum biomass during assessment period
  biomassTrend: number       // Trend over assessment period (-1 to +1)
  deviationPercent: number   // Percent deviation from baseline
  lastUpdated: string        // ISO timestamp of latest satellite pass
  dataQuality: 'high' | 'medium' | 'low'  // Based on cloud cover and data availability
}

/**
 * Combined damage assessment result
 */
interface DamageAssessment {
  policyId: bigint
  weatherDamage: number     // 0-10000 bps
  satelliteDamage: number   // 0-10000 bps
  totalDamage: number       // 0-10000 bps
  payoutAmount: bigint      // USDC (6 decimals)
}

// ============================================================================
// MAIN WORKFLOW LOGIC
// ============================================================================

/**
 * Entry point for the workflow
 * Called by CRE when initializing the workflow
 */
const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability()

  return [
    cre.handler(
      cron.trigger({ schedule: config.cronSchedule }),
      onCronTrigger
    ),
  ]
}

/**
 * Main cron trigger handler
 * Runs daily to check all active policies
 */
const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("🚀 MicroCrop Damage Assessment Workflow Started")
  runtime.log(`📅 Timestamp: ${runtime.now().toISOString()}`)

  try {
    // Step 1: Get network configuration
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: runtime.config.chainSelectorName,
      isTestnet: runtime.config.chainSelectorName.includes("testnet"),
    })

    if (!network) {
      throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
    }

    runtime.log(`🌐 Network: ${network.chainSelector.name}`)

    // Step 2: Read active policies from PolicyManager
    const activePolicies = getActivePolicies(runtime, network.chainSelector.selector)
    runtime.log(`📋 Found ${activePolicies.length} active policies to assess`)

    if (activePolicies.length === 0) {
      runtime.log("✅ No active policies to assess. Workflow complete.")
      return "No policies to assess"
    }

    // Step 3: Assess each policy
    let assessmentsSubmitted = 0
    let totalDamageDetected = 0

    for (const policy of activePolicies) {
      runtime.log(`\n🔍 Assessing Policy #${policy.policyId}`)
      runtime.log(`   Farmer: ${policy.farmer}`)
      runtime.log(`   Coverage: $${Number(policy.sumInsured) / 1e6} USDC`)
      runtime.log(`   Plot ID: ${policy.plotId}`)
      runtime.log(`   Crop: ${CropType[policy.cropType]} | Coverage: ${CoverageType[policy.coverageType]}`)

      try {
        // Check if policy is nearing end date (within lookback period)
        const now = BigInt(Math.floor(runtime.now().getTime() / 1000))
        const daysUntilEnd = Number(policy.endTime - now) / 86400

        if (daysUntilEnd > runtime.config.lookbackDays) {
          runtime.log(`   ⏭️  Skipping: ${daysUntilEnd.toFixed(0)} days until coverage ends`)
          continue
        }

        // Assess damage
        const assessment = assessPolicyDamage(runtime, policy)

        if (assessment.totalDamage >= runtime.config.minDamageThreshold) {
          runtime.log(`   🚨 DAMAGE DETECTED: ${assessment.totalDamage / 100}%`)
          runtime.log(`      Weather Damage: ${assessment.weatherDamage / 100}%`)
          runtime.log(`      Satellite Damage: ${assessment.satelliteDamage / 100}%`)
          runtime.log(`      Payout: $${Number(assessment.payoutAmount) / 1e6} USDC`)

          // Submit report on-chain
          submitDamageReport(runtime, network.chainSelector.selector, assessment)
          assessmentsSubmitted++
          totalDamageDetected += assessment.totalDamage
        } else {
          runtime.log(`   ✅ No significant damage (${assessment.totalDamage / 100}%)`)
        }
      } catch (error) {
        runtime.log(`   ❌ Error assessing policy: ${error}`)
        // Continue to next policy instead of failing entire workflow
        continue
      }
    }

    // Summary
    runtime.log(`\n${"=".repeat(60)}`)
    runtime.log(`📊 WORKFLOW SUMMARY`)
    runtime.log(`   Policies Assessed: ${activePolicies.length}`)
    runtime.log(`   Reports Submitted: ${assessmentsSubmitted}`)
    runtime.log(`   Avg Damage: ${assessmentsSubmitted > 0 ? (totalDamageDetected / assessmentsSubmitted / 100).toFixed(2) : 0}%`)
    runtime.log(`${"=".repeat(60)}`)

    return `Assessed ${activePolicies.length} policies, submitted ${assessmentsSubmitted} reports`
  } catch (error) {
    runtime.log(`❌ Workflow failed: ${error}`)
    throw error
  }
}

// ============================================================================
// POLICY READING
// ============================================================================

/**
 * Read active policies from PolicyManager contract
 */
function getActivePolicies(runtime: Runtime<Config>, chainSelector: bigint): Policy[] {
  runtime.log("📖 Reading active policies from PolicyManager...")

  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  // Encode the function call
  const callData = encodeFunctionData({
    abi: PolicyManagerABI,
    functionName: "getActivePolicies",
  })

  // Call the contract
  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.policyManagerAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  // Decode the result (array of policy IDs)
  const policyIds = decodeFunctionResult({
    abi: PolicyManagerABI,
    functionName: "getActivePolicies",
    data: bytesToHex(result.data),
  }) as bigint[]

  // Fetch details for each policy
  const policies: Policy[] = []
  for (const policyId of policyIds) {
    const policyDetails = getPolicyDetails(runtime, evmClient, policyId)
    if (policyDetails) {
      policies.push({ policyId, ...policyDetails })
    }
  }

  return policies
}

/**
 * Get detailed information for a specific policy
 */
function getPolicyDetails(
  runtime: Runtime<Config>,
  evmClient: any,
  policyId: bigint
): Omit<Policy, "policyId"> | null {
  try {
    const callData = encodeFunctionData({
      abi: PolicyManagerABI,
      functionName: "getPolicyDetails",
      args: [policyId],
    })

    const result = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: runtime.config.policyManagerAddress as Address,
          data: callData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    const [farmer, sumInsured, startTime, endTime, cropType, coverageType, plotId] =
      decodeFunctionResult({
        abi: PolicyManagerABI,
        functionName: "getPolicyDetails",
        data: bytesToHex(result.data),
      }) as [string, bigint, bigint, bigint, number, number, bigint]

    return {
      farmer,
      sumInsured,
      startTime,
      endTime,
      cropType: cropType as CropType,
      coverageType: coverageType as CoverageType,
      plotId,
    }
  } catch (error) {
    runtime.log(`   ⚠️  Failed to get details for policy ${policyId}: ${error}`)
    return null
  }
}

// ============================================================================
// DAMAGE ASSESSMENT
// ============================================================================

/**
 * Assess damage for a policy by combining weather and satellite data
 */
function assessPolicyDamage(runtime: Runtime<Config>, policy: Policy): DamageAssessment {
  // Fetch weather data (with consensus)
  const weatherData = runtime
    .runInNodeMode<Config, WeatherData>(
      (nodeRuntime: NodeRuntime<Config>) => fetchWeatherData(nodeRuntime, policy),
      consensusMedianAggregation()
    )()
    .result()

  // Fetch crop biomass data (with consensus)
  const biomassData = runtime
    .runInNodeMode<Config, CropBiomassData>(
      (nodeRuntime: NodeRuntime<Config>) => fetchCropBiomassData(nodeRuntime, policy),
      consensusMedianAggregation()
    )()
    .result()

  // Calculate damage scores
  const weatherDamage = calculateWeatherDamage(weatherData, policy.cropType, policy.coverageType)
  const biomassDamage = calculateBiomassDamage(biomassData)

  // Combined damage (60% weather + 40% biomass)
  const totalDamage = Math.floor(weatherDamage * 0.6 + biomassDamage * 0.4)

  // Calculate payout amount
  const payoutAmount = calculatePayout(policy.sumInsured, totalDamage)

  return {
    policyId: policy.policyId,
    weatherDamage,
    satelliteDamage: biomassDamage,  // Keep field name for contract compatibility
    totalDamage,
    payoutAmount,
  }
}

// ============================================================================
// WEATHER DATA FETCHING
// ============================================================================

/**
 * Fetch weather data from WeatherXM API
 * Runs on individual nodes with consensus aggregation
 */
function fetchWeatherData(nodeRuntime: NodeRuntime<Config>, policy: Policy): WeatherData {
  const httpClient = new cre.capabilities.HTTPClient()

  // Get API key from secrets
  const apiKey = nodeRuntime.getSecret({ id: "WEATHERXM_API_KEY" }).result().value

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - nodeRuntime.config.lookbackDays)

  // Convert GPS coordinates (stored as integers with 6 decimal places)
  const lat = Number(policy.latitude) / 1e6
  const lon = Number(policy.longitude) / 1e6

  // Find nearest WeatherXM device
  // NOTE: You'll need to implement device discovery or pre-map devices to regions
  const deviceId = findNearestWeatherXMDevice(lat, lon)

  // Fetch historical weather data
  const response = httpClient
    .sendRequest(nodeRuntime, {
      url: `${nodeRuntime.config.weatherxmApiUrl}/devices/${deviceId}/history`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      params: {
        fromDate: startDate.toISOString().split("T")[0],
        toDate: endDate.toISOString().split("T")[0],
      },
    })
    .result()

  // Parse response
  const data = JSON.parse(new TextDecoder().decode(response.body))

  // Aggregate weather metrics
  return aggregateWeatherMetrics(data, nodeRuntime.config.lookbackDays)
}

/**
 * Find nearest WeatherXM device
 * TODO: Implement actual device discovery logic
 */
function findNearestWeatherXMDevice(lat: number, lon: number): string {
  // For now, return a placeholder
  // In production, you'd query WeatherXM's device registry
  return "DEVICE_ID_PLACEHOLDER"
}

/**
 * Aggregate weather metrics from API response
 */
function aggregateWeatherMetrics(data: any, lookbackDays: number): WeatherData {
  let totalRainfall = 0
  let tempSum = 0
  let maxTemp = -Infinity
  let dryDays = 0
  let floodDays = 0
  let heatStressDays = 0

  for (const day of data) {
    const rainfall = day.precipitation || 0
    const temp = day.temperature || 0

    totalRainfall += rainfall
    tempSum += temp
    maxTemp = Math.max(maxTemp, temp)

    // Dry day: < 1mm rain
    if (rainfall < 1) dryDays++

    // Flood day: > 50mm rain
    if (rainfall > 50) floodDays++

    // Heat stress day: > 35°C
    if (temp > 35) heatStressDays++
  }

  return {
    totalRainfall,
    avgTemperature: tempSum / lookbackDays,
    maxTemperature: maxTemp,
    dryDays,
    floodDays,
    heatStressDays,
  }
}

// ============================================================================
// SATELLITE DATA FETCHING
// ============================================================================

/**
 * Fetch Crop Biomass data from MicroCrop backend API
 * Backend queries Planet Labs Crop Biomass subscriptions
 * Runs on individual nodes with consensus aggregation
 * 
 * @see PLANET_LABS_INTEGRATION.md for backend implementation details
 */
function fetchCropBiomassData(
  nodeRuntime: NodeRuntime<Config>, 
  policy: Policy
): CropBiomassData {
  const httpClient = new cre.capabilities.HTTPClient()

  // Get backend API token from secrets
  const apiToken = nodeRuntime.getSecret({ id: "BACKEND_API_TOKEN" }).result().value

  nodeRuntime.log(`   📡 Fetching Crop Biomass data for plot ${policy.plotId}...`)

  // Fetch biomass data from backend API (which queries Planet subscriptions)
  const response = httpClient
    .sendRequest(nodeRuntime, {
      url: `${nodeRuntime.config.backendApiUrl}/api/planet/biomass/${policy.plotId}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
      },
    })
    .result()

  // Parse response
  const data = JSON.parse(new TextDecoder().decode(response.body))

  // Validate response structure
  if (!data.current || data.current < 0 || data.current > 1) {
    throw new Error(`Invalid biomass data for plot ${policy.plotId}: current=${data.current}`)
  }

  if (!data.baseline || data.baseline < 0 || data.baseline > 1) {
    throw new Error(`Invalid baseline data for plot ${policy.plotId}: baseline=${data.baseline}`)
  }

  // Calculate biomass statistics
  const timeseries = data.timeseries || []
  const biomassValues = timeseries.map((t: any) => t.value).filter((v: number) => v !== null)
  
  const minBiomass = biomassValues.length > 0 
    ? Math.min(...biomassValues) 
    : data.current

  const biomassTrend = biomassValues.length > 1
    ? calculateTrend(biomassValues)
    : 0

  const deviationPercent = data.baseline > 0
    ? Math.abs(data.baseline - data.current) / data.baseline
    : 0

  // Assess data quality based on update recency and data points
  const lastUpdatedDate = new Date(data.lastUpdated || Date.now())
  const daysSinceUpdate = (Date.now() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24)
  
  let dataQuality: 'high' | 'medium' | 'low'
  if (daysSinceUpdate <= 7 && biomassValues.length >= 4) {
    dataQuality = 'high'
  } else if (daysSinceUpdate <= 14 && biomassValues.length >= 2) {
    dataQuality = 'medium'
  } else {
    dataQuality = 'low'
  }

  nodeRuntime.log(`   ✅ Biomass data retrieved: current=${data.current.toFixed(3)}, baseline=${data.baseline.toFixed(3)}, quality=${dataQuality}`)

  return {
    currentBiomass: data.current,
    baselineBiomass: data.baseline,
    minBiomass,
    biomassTrend,
    deviationPercent,
    lastUpdated: data.lastUpdated || new Date().toISOString(),
    dataQuality,
  }
}

/**
 * Calculate trend from time series data
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0

  const n = values.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  return slope
}

// ============================================================================
// DAMAGE CALCULATION
// ============================================================================

/**
 * Calculate weather damage score (0-10000 bps)
 * Based on crop type and coverage type (from PolicyManager)
 * 
 * @param weather Weather data from WeatherXM
 * @param cropType Type of crop (MAIZE, BEANS, WHEAT, etc.)
 * @param coverageType Type of coverage (DROUGHT=0, FLOOD=1, MULTI_PERIL=2)
 * @returns Damage score in basis points (0-10000)
 */
function calculateWeatherDamage(
  weather: WeatherData,
  cropType: CropType,
  coverageType: CoverageType
): number {
  let damage = 0

  // Drought damage
  if (coverageType === CoverageType.DROUGHT || coverageType === CoverageType.MULTI_PERIL) {
    const droughtScore = Math.min((weather.dryDays / 30) * 10000, 10000)
    damage = Math.max(damage, droughtScore)
  }

  // Flood damage
  if (coverageType === CoverageType.FLOOD || coverageType === CoverageType.MULTI_PERIL) {
    const floodScore = Math.min((weather.floodDays / 5) * 10000, 10000)
    damage = Math.max(damage, floodScore)
  }

  // Heat stress damage (applies to all coverage types)
  const heatScore = Math.min((weather.heatStressDays / 10) * 10000, 10000)
  damage = Math.max(damage, heatScore)

  return Math.floor(damage)
}

/**
 * Calculate biomass damage score (0-10000 bps) using Planet Crop Biomass Proxy
 * Based on industry-standard thresholds for agricultural insurance
 * 
 * Thresholds based on Planet Labs crop insurance research:
 * - <15% biomass loss: Minor damage (0-30%)
 * - 15-30% biomass loss: Moderate damage (30-70%)
 * - 30-50% biomass loss: Severe damage (70-100%)
 * - 50%+ biomass loss: Total loss (100%)
 * 
 * @param biomass Crop biomass data from Planet subscriptions
 * @returns Damage score in basis points (0-10000)
 */
function calculateBiomassDamage(biomass: CropBiomassData): number {
  // If data quality is low, be conservative (return lower damage estimate)
  if (biomass.dataQuality === 'low') {
    return Math.floor(Math.max(0, biomass.deviationPercent - 0.1) * 5000) // Reduce sensitivity by 50%
  }

  // Calculate biomass loss as a percentage
  const biomassLoss = biomass.baselineBiomass > 0
    ? (biomass.baselineBiomass - biomass.currentBiomass) / biomass.baselineBiomass
    : 0

  // No damage if biomass increased or stayed the same
  if (biomassLoss <= 0) return 0

  // Apply industry-standard damage thresholds
  if (biomassLoss < 0.15) {
    // <15% loss: Linear scale 0-30% damage (0-3000 bps)
    return Math.floor((biomassLoss / 0.15) * 3000)
  } else if (biomassLoss < 0.30) {
    // 15-30% loss: Linear scale 30-70% damage (3000-7000 bps)
    const excessLoss = biomassLoss - 0.15
    return Math.floor(3000 + (excessLoss / 0.15) * 4000)
  } else if (biomassLoss < 0.50) {
    // 30-50% loss: Linear scale 70-100% damage (7000-10000 bps)
    const excessLoss = biomassLoss - 0.30
    return Math.floor(7000 + (excessLoss / 0.20) * 3000)
  } else {
    // 50%+ loss: Total loss (100% = 10000 bps)
    return 10000
  }
}

/**
 * Calculate payout amount based on coverage and damage
 */
function calculatePayout(coverageAmount: bigint, damagePercentage: number): bigint {
  // Payout = Coverage × (Damage% / 100%)
  const payoutRatio = BigInt(damagePercentage) * 100n / 10000n
  return (coverageAmount * payoutRatio) / 100n
}

// ============================================================================
// ON-CHAIN SUBMISSION
// ============================================================================

/**
 * Submit damage report on-chain via PayoutReceiver contract
 */
function submitDamageReport(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  assessment: DamageAssessment
): void {
  runtime.log(`📤 Submitting damage report for Policy #${assessment.policyId}...`)

  const evmClient = new cre.capabilities.EVMClient(chainSelector)

  // Encode the damage report struct
  const reportData = encodeAbiParameters(DamageReportParams, [
    assessment.policyId,
    BigInt(assessment.totalDamage),
    BigInt(assessment.weatherDamage),
    BigInt(assessment.satelliteDamage),
    assessment.payoutAmount,
    BigInt(Math.floor(runtime.now().getTime() / 1000)), // assessedAt
  ])

  // Generate signed report
  const report = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // Submit to blockchain
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.payoutReceiverAddress as Address,
      report: report,
      gasConfig: {
        gasLimit: runtime.config.gasLimit,
      },
    })
    .result()

  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
    runtime.log(`✅ Report submitted successfully!`)
    runtime.log(`   Transaction: ${txHash}`)
  } else {
    throw new Error(`Transaction failed with status: ${writeResult.txStatus}`)
  }
}

// ============================================================================
// WORKFLOW ENTRY POINT
// ============================================================================

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

main()
