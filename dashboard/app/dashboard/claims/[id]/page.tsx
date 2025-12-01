"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useClaim, useApproveClaim, useRejectClaim } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Clock,
  TrendingUp,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ClaimStatus } from "@/types"

interface ClaimDetailPageProps {
  params: {
    id: string
  }
}

export default function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const router = useRouter()
  const { data: claim, isLoading, error } = useClaim(params.id)
  const approveMutation = useApproveClaim()
  const rejectMutation = useRejectClaim()
  const [activeTab, setActiveTab] = useState("overview")
  const [rejectReason, setRejectReason] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const getStatusBadgeVariant = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.APPROVED:
        return "success"
      case ClaimStatus.PENDING:
        return "warning"
      case ClaimStatus.UNDER_REVIEW:
        return "info"
      case ClaimStatus.REJECTED:
        return "destructive"
      case ClaimStatus.PAID:
        return "success"
      case ClaimStatus.DISPUTED:
        return "warning"
      default:
        return "default"
    }
  }

  const handleApprove = async () => {
    if (!claim) return
    
    try {
      setIsApproving(true)
      await approveMutation.mutateAsync({
        claimId: claim.id,
        payoutAmount: claim.calculatedPayout,
      })
      setShowApproveDialog(false)
      // Optionally refresh or redirect
    } catch (error) {
      console.error("Error approving claim:", error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!claim || !rejectReason.trim()) return
    
    try {
      setIsRejecting(true)
      await rejectMutation.mutateAsync({
        id: claim.id,
        reason: rejectReason,
      })
      setShowRejectDialog(false)
      setRejectReason("")
      // Optionally refresh or redirect
    } catch (error) {
      console.error("Error rejecting claim:", error)
    } finally {
      setIsRejecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading claim details...</p>
        </div>
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Claim not found"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const canApprove = claim.status === ClaimStatus.PENDING || claim.status === ClaimStatus.UNDER_REVIEW
  const canReject = claim.status === ClaimStatus.PENDING || claim.status === ClaimStatus.UNDER_REVIEW

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
              {claim.claimNumber}
            </h1>
            <p className="text-muted-foreground">Claim Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(claim.status)}>
            {claim.status}
          </Badge>
          {canApprove && (
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Claim</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to approve this claim? This will authorize the payout of{" "}
                    {formatCurrency(claim.calculatedPayout)}.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={isApproving}>
                    {isApproving ? "Approving..." : "Approve Claim"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {canReject && (
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Claim</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this claim.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isRejecting || !rejectReason.trim()}
                  >
                    {isRejecting ? "Rejecting..." : "Reject Claim"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calculated Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(claim.calculatedPayout)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Damage Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claim.damageAssessment.damagePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Confidence: {claim.damageAssessment.confidenceLevel.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trigger Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(claim.triggerDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(claim.triggerDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.ceil(
                (Date.now() - new Date(claim.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
              )}{" "}
              days ago
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(claim.submittedAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessment">Damage Assessment</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Claim Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Claim Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Claim Number</div>
                  <div className="text-sm font-medium">{claim.claimNumber}</div>

                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="text-sm font-medium capitalize">{claim.type}</div>

                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>
                    <Badge variant={getStatusBadgeVariant(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">Trigger Date</div>
                  <div className="text-sm font-medium">{formatDate(claim.triggerDate)}</div>

                  <div className="text-sm text-muted-foreground">Submitted</div>
                  <div className="text-sm font-medium">{formatDate(claim.submittedAt)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Payout Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Calculated Payout</div>
                  <div className="text-sm font-medium">
                    {formatCurrency(claim.calculatedPayout)}
                  </div>

                  {claim.actualPayout && (
                    <>
                      <div className="text-sm text-muted-foreground">Actual Payout</div>
                      <div className="text-sm font-medium">
                        {formatCurrency(claim.actualPayout)}
                      </div>
                    </>
                  )}

                  {claim.payoutDate && (
                    <>
                      <div className="text-sm text-muted-foreground">Payout Date</div>
                      <div className="text-sm font-medium">
                        {formatDate(claim.payoutDate)}
                      </div>
                    </>
                  )}

                  {claim.approvedBy && (
                    <>
                      <div className="text-sm text-muted-foreground">Approved By</div>
                      <div className="text-sm font-medium">{claim.approvedBy}</div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Entities */}
            <Card>
              <CardHeader>
                <CardTitle>Related Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Policy ID</div>
                  <div className="text-sm font-medium">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => router.push(`/dashboard/policies/${claim.policyId}`)}
                    >
                      {claim.policyId.slice(0, 8)}...
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">Farmer ID</div>
                  <div className="text-sm font-medium">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => router.push(`/dashboard/farmers/${claim.farmerId}`)}
                    >
                      {claim.farmerId.slice(0, 8)}...
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">Cooperative ID</div>
                  <div className="text-sm font-medium">{claim.cooperativeId.slice(0, 8)}...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Damage Assessment Tab */}
        <TabsContent value="assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Damage Assessment Details</CardTitle>
              <CardDescription>
                Comprehensive analysis of crop damage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assessment Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Damage Percentage</div>
                  <div className="text-3xl font-bold">
                    {claim.damageAssessment.damagePercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Confidence Level</div>
                  <div className="text-3xl font-bold">
                    {claim.damageAssessment.confidenceLevel.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Methodology</div>
                <div className="text-sm font-medium">{claim.damageAssessment.methodology}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Calculated At</div>
                <div className="text-sm font-medium">
                  {formatDate(claim.damageAssessment.calculatedAt)}
                </div>
              </div>

              {/* Weather Data */}
              {claim.damageAssessment.weatherData && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Weather Data</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Temperature</div>
                      <div className="font-medium">
                        {claim.damageAssessment.weatherData.temperature}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rainfall</div>
                      <div className="font-medium">
                        {claim.damageAssessment.weatherData.rainfall} mm
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Humidity</div>
                      <div className="font-medium">
                        {claim.damageAssessment.weatherData.humidity}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Wind Speed</div>
                      <div className="font-medium">
                        {claim.damageAssessment.weatherData.windSpeed} km/h
                      </div>
                    </div>
                    {claim.damageAssessment.weatherData.soilMoisture && (
                      <div>
                        <div className="text-muted-foreground">Soil Moisture</div>
                        <div className="font-medium">
                          {claim.damageAssessment.weatherData.soilMoisture}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supporting Evidence</CardTitle>
              <CardDescription>
                Documents and images submitted with the claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claim.evidence && claim.evidence.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {claim.evidence.map((evidence, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm font-medium">Evidence {index + 1}</div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No evidence files attached
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
              <CardDescription>
                On-chain verification and transaction details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Blockchain Submitted</div>
                  <div className="text-sm font-medium">
                    {claim.blockchainSubmitted ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </div>
                </div>

                {claim.transactionHash && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                        {claim.transactionHash}
                      </code>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
