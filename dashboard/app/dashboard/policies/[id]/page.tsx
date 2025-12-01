"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePolicy } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  User,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { PolicyStatus, ClaimStatus } from "@/types"

interface PolicyDetailPageProps {
  params: {
    id: string
  }
}

export default function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const router = useRouter()
  const { data: policy, isLoading, error } = usePolicy(params.id)
  const [activeTab, setActiveTab] = useState("overview")

  const getStatusBadgeVariant = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return "success"
      case PolicyStatus.PENDING_PAYMENT:
        return "warning"
      case PolicyStatus.EXPIRED:
        return "secondary"
      case PolicyStatus.CLAIMED:
        return "info"
      case PolicyStatus.CANCELLED:
        return "destructive"
      default:
        return "default"
    }
  }

  const getClaimStatusBadgeVariant = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.APPROVED:
        return "success"
      case ClaimStatus.PENDING:
        return "warning"
      case ClaimStatus.REJECTED:
        return "destructive"
      case ClaimStatus.PAID:
        return "success"
      default:
        return "default"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading policy details...</p>
        </div>
      </div>
    )
  }

  if (error || !policy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Policy not found"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const coveragePercentage = (policy.premium / policy.sumInsured) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {policy.policyNumber}
            </h1>
            <p className="text-muted-foreground">Policy Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(policy.status)}>
            {policy.status}
          </Badge>
        </div>
      </div>

      {/* Alert for expiring policies */}
      {policy.status === PolicyStatus.ACTIVE &&
        new Date(policy.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Policy Expiring Soon</AlertTitle>
            <AlertDescription>
              This policy will expire on {formatDate(policy.endDate)}. Consider renewal.
            </AlertDescription>
          </Alert>
        )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sum Insured</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(policy.sumInsured)}
            </div>
            <p className="text-xs text-muted-foreground">
              Coverage amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(policy.premium)}
            </div>
            <p className="text-xs text-muted-foreground">
              {coveragePercentage.toFixed(2)}% of sum insured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(policy.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(policy.startDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.ceil(
                (new Date(policy.endDate).getTime() -
                  new Date(policy.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              days
            </div>
            <p className="text-xs text-muted-foreground">
              Until {formatDate(policy.endDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Policy Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Policy Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Policy Number</div>
                  <div className="text-sm font-medium">{policy.policyNumber}</div>

                  <div className="text-sm text-muted-foreground">Coverage Type</div>
                  <div className="text-sm font-medium">{policy.coverageType}</div>

                  <div className="text-sm text-muted-foreground">Crop Type</div>
                  <div className="text-sm font-medium capitalize">{policy.cropType}</div>

                  <div className="text-sm text-muted-foreground">Season</div>
                  <div className="text-sm font-medium">{policy.season}</div>

                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>
                    <Badge variant={getStatusBadgeVariant(policy.status)}>
                      {policy.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Financial Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Sum Insured</div>
                  <div className="text-sm font-medium">
                    {formatCurrency(policy.sumInsured)}
                  </div>

                  <div className="text-sm text-muted-foreground">Total Premium</div>
                  <div className="text-sm font-medium">
                    {formatCurrency(policy.premium)}
                  </div>

                  <div className="text-sm text-muted-foreground">Farmer Contribution</div>
                  <div className="text-sm font-medium">
                    {formatCurrency(policy.farmerContribution)}
                  </div>

                  <div className="text-sm text-muted-foreground">Subsidy Amount</div>
                  <div className="text-sm font-medium">
                    {formatCurrency(policy.subsidyAmount)}
                  </div>

                  {policy.cooperativeSubsidy && (
                    <>
                      <div className="text-sm text-muted-foreground">Cooperative Subsidy</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(policy.cooperativeSubsidy)}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Farmer & Plot Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Farmer & Plot</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Farmer ID</div>
                  <div className="text-sm font-medium">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => router.push(`/dashboard/farmers/${policy.farmerId}`)}
                    >
                      {policy.farmerId.slice(0, 8)}...
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">Cooperative ID</div>
                  <div className="text-sm font-medium">{policy.cooperativeId.slice(0, 8)}...</div>

                  <div className="text-sm text-muted-foreground">Plot ID</div>
                  <div className="text-sm font-medium">{policy.plotId.slice(0, 8)}...</div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Timeline</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Start Date</div>
                  <div className="text-sm font-medium">{formatDate(policy.startDate)}</div>

                  <div className="text-sm text-muted-foreground">End Date</div>
                  <div className="text-sm font-medium">{formatDate(policy.endDate)}</div>

                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-sm font-medium">{formatDate(policy.createdAt)}</div>

                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="text-sm font-medium">{formatDate(policy.updatedAt)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Coverage Details Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Details</CardTitle>
              <CardDescription>Detailed information about policy coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert variant="info">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Coverage Type: {policy.coverageType}</AlertTitle>
                  <AlertDescription>
                    {policy.coverageType === "WEATHER" && "Weather-based parametric insurance"}
                    {policy.coverageType === "SATELLITE" && "Satellite-based index insurance"}
                    {policy.coverageType === "COMPREHENSIVE" && "Comprehensive crop insurance"}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Crop Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Crop Type:</span>
                        <span className="font-medium capitalize">{policy.cropType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Season:</span>
                        <span className="font-medium">{policy.season}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Coverage Amount</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sum Insured:</span>
                        <span className="font-medium">{formatCurrency(policy.sumInsured)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Premium Rate:</span>
                        <span className="font-medium">{coveragePercentage.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>Premium payment history and schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {policy.paymentSchedule ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Payment schedule details will be displayed here
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payment schedule available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims History</CardTitle>
              <CardDescription>All claims associated with this policy</CardDescription>
            </CardHeader>
            <CardContent>
              {policy.claims && policy.claims.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policy.claims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">
                            {claim.claimNumber}
                          </TableCell>
                          <TableCell className="capitalize">{claim.type}</TableCell>
                          <TableCell>{formatDate(claim.submittedAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getClaimStatusBadgeVariant(claim.status)}>
                              {claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(claim.calculatedPayout)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No claims yet</h3>
                  <p className="text-muted-foreground">
                    No claims have been filed for this policy
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blockchain Tab */}
        <TabsContent value="blockchain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Information</CardTitle>
              <CardDescription>Smart contract and transaction details</CardDescription>
            </CardHeader>
            <CardContent>
              {policy.contractAddress || policy.transactionHash ? (
                <div className="space-y-4">
                  {policy.contractAddress && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Contract Address</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {policy.contractAddress}
                        </code>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {policy.transactionHash && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {policy.transactionHash}
                        </code>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No blockchain information available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
