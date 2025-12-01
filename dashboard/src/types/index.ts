// Core domain types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  cooperativeId?: string
  createdAt: Date
  lastLogin?: Date
}

export enum UserRole {
  ADMIN = "ADMIN",
  COOPERATIVE = "COOPERATIVE",
  COOPERATIVE_STAFF = "COOPERATIVE_STAFF",
  // FARMER role exists in backend DB but is NOT allowed to access web dashboard
  // Farmers access the system via mobile app (USSD) only
  FARMER = "FARMER",
}

export interface Cooperative {
  id: string
  name: string
  registrationNumber: string
  email: string
  phoneNumber: string
  address: string
  location: GeoLocation
  memberCount: number
  activePolicies: number
  totalPremiumCollected: number
  totalPayoutsDistributed: number
  commissionRate: number
  status: CooperativeStatus
  createdAt: Date
  updatedAt: Date
}

export enum CooperativeStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
}

export interface Farmer {
  id: string
  farmerId: string // Unique farmer identifier
  cooperativeId: string
  nationalId: string
  firstName: string
  lastName: string
  phoneNumber: string
  alternatePhone?: string
  email?: string
  dateOfBirth: Date
  gender: "MALE" | "FEMALE" | "OTHER"
  address: string
  location: GeoLocation
  plots: Plot[]
  policies: Policy[]
  creditStatus: CreditStatus
  paymentHistory: Payment[]
  memberSince: Date
  farmerGroup?: string // Group name/identifier
  group?: FarmerGroup
  kycStatus: KYCStatus
  documents: Document[]
  status: FarmerStatus
  createdAt: Date
  updatedAt: Date
}

export enum FarmerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface Plot {
  id: string
  farmerId: string
  plotNumber: string
  size: number // in hectares
  cropType: CropType
  plantingDate: Date
  expectedHarvestDate: Date
  boundaries: GeoCoordinates[]
  soilType?: string
  irrigationType?: IrrigationType
  previousYield?: number
  images?: string[]
}

export interface Policy {
  id: string
  policyNumber: string
  farmerId: string
  cooperativeId: string
  plotId: string
  coverageType: CoverageType
  cropType: CropType
  season: string
  startDate: Date
  endDate: Date
  sumInsured: number
  premium: number
  farmerContribution: number
  subsidyAmount: number
  cooperativeSubsidy?: number
  status: PolicyStatus
  paymentSchedule: PaymentSchedule
  claims: Claim[]
  contractAddress?: string
  transactionHash?: string
  createdAt: Date
  updatedAt: Date
}

export enum PolicyStatus {
  ACTIVE = "ACTIVE",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  CLAIMED = "CLAIMED",
}

export enum CoverageType {
  WEATHER = "WEATHER",
  SATELLITE = "SATELLITE",
  COMPREHENSIVE = "COMPREHENSIVE",
}

export enum CropType {
  MAIZE = "MAIZE",
  WHEAT = "WHEAT",
  RICE = "RICE",
  SORGHUM = "SORGHUM",
  BEANS = "BEANS",
  GROUNDNUTS = "GROUNDNUTS",
  COFFEE = "COFFEE",
  TEA = "TEA",
}

export enum IrrigationType {
  RAINFED = "RAINFED",
  DRIP = "DRIP",
  SPRINKLER = "SPRINKLER",
  FLOOD = "FLOOD",
}

export interface Claim {
  id: string
  claimNumber: string
  policyId: string
  farmerId: string
  cooperativeId: string
  type: ClaimType
  triggerDate: Date
  submittedAt: Date
  status: ClaimStatus
  damageAssessment: DamageAssessment
  calculatedPayout: number
  actualPayout?: number
  payoutDate?: Date
  evidence: Evidence[]
  approvedBy?: string
  transactionHash?: string
  blockchainSubmitted: boolean
}

export enum ClaimType {
  AUTOMATIC = "AUTOMATIC",
  MANUAL = "MANUAL",
}

export enum ClaimStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAID = "PAID",
  DISPUTED = "DISPUTED",
}

export interface DamageAssessment {
  weatherData?: WeatherData
  satelliteData?: SatelliteData
  fieldInspection?: FieldInspection
  damagePercentage: number
  confidenceLevel: number
  methodology: string
  calculatedAt: Date
}

export interface WeatherData {
  stationId: string
  temperature: number
  rainfall: number
  humidity: number
  windSpeed: number
  soilMoisture?: number
  recordedAt: Date
}

export interface SatelliteData {
  ndvi: number
  ndmi: number
  evi: number
  healthScore: number
  capturedAt: Date
  imageUrl?: string
}

export interface FieldInspection {
  inspectorId: string
  inspectionDate: Date
  photos: string[]
  notes: string
  damageType: string[]
  severity: number
}

export interface Evidence {
  id: string
  type: "PHOTO" | "VIDEO" | "DOCUMENT" | "REPORT"
  url: string
  description?: string
  uploadedAt: Date
  ipfsHash?: string
}

export interface Payment {
  id: string
  reference: string
  type: PaymentType
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  initiatedAt: Date
  completedAt?: Date
  failureReason?: string
  metadata?: Record<string, any>
}

export enum PaymentType {
  PREMIUM = "PREMIUM",
  PAYOUT = "PAYOUT",
  REFUND = "REFUND",
  COMMISSION = "COMMISSION",
}

export enum PaymentMethod {
  MOBILE_MONEY = "MOBILE_MONEY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CRYPTO = "CRYPTO",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export interface PaymentSchedule {
  installments: Installment[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
}

export interface Installment {
  id: string
  amount: number
  dueDate: Date
  paidDate?: Date
  status: "PENDING" | "PAID" | "OVERDUE"
}

export interface CreditStatus {
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  outstandingBalance: number
  paymentDue?: Date
  defaultStatus: boolean
}

export interface FarmerGroup {
  id: string
  name: string
  cooperativeId: string
  leaderId: string
  members: string[] // Farmer IDs
  createdAt: Date
}

export enum KYCStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  INCOMPLETE = "INCOMPLETE",
}

export interface Document {
  id: string
  type: DocumentType
  name: string
  url: string
  uploadedAt: Date
  expiryDate?: Date
  verified: boolean
}

export enum DocumentType {
  NATIONAL_ID = "NATIONAL_ID",
  LAND_TITLE = "LAND_TITLE",
  LEASE_AGREEMENT = "LEASE_AGREEMENT",
  BANK_STATEMENT = "BANK_STATEMENT",
  PHOTO = "PHOTO",
  OTHER = "OTHER",
}

export interface GeoLocation {
  latitude: number
  longitude: number
  address?: string
  region?: string
  district?: string
}

export interface GeoCoordinates {
  latitude: number
  longitude: number
}

// Blockchain types
export interface BlockchainTransaction {
  hash: string
  from: string
  to: string
  value: string
  gasUsed: string
  gasPrice: string
  blockNumber: number
  timestamp: Date
  status: "SUCCESS" | "FAILED" | "PENDING"
}

export interface OracleSubmission {
  id: string
  submissionType: "WEATHER" | "SATELLITE" | "DAMAGE"
  plotId: string
  data: any
  submittedAt: Date
  transactionHash: string
  confirmed: boolean
  blockNumber?: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Dashboard analytics types
export interface DashboardStats {
  totalFarmers: number
  activePolicies: number
  totalPremiumCollected: number
  pendingPayouts: number
  claimsThisMonth: number
  coverageArea: number // hectares
  trends: {
    farmersGrowth: number // percentage
    premiumGrowth: number
    claimsGrowth: number
  }
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}
