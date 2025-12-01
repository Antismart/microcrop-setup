"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFarmer } from "@/hooks/use-data"
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
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Landmark,
} from "lucide-react"
import { formatDate, formatCurrency, getInitials } from "@/lib/utils"
import { FarmerStatus, PolicyStatus, ClaimStatus } from "@/types"
import { DetailPageSkeleton } from "@/components/ui/skeleton-loaders"

interface FarmerDetailPageProps {
  params: {
    id: string
  }
}

export default function FarmerDetailPage({ params }: FarmerDetailPageProps) {
  const router = useRouter()
  const { data: farmer, isLoading, error } = useFarmer(params.id)
  const [activeTab, setActiveTab] = useState("overview")

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <DetailPageSkeleton />
      </div>
    )
  }

  const getStatusBadgeVariant = (status: FarmerStatus) => {
    switch (status) {
      case "active":
        return "success"
      case "inactive":
        return "secondary"
      case "suspended":
        return "destructive"
      default:
        return "default"
    }
  }

  const getPolicyStatusBadgeVariant = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return "success"
      case PolicyStatus.PENDING_PAYMENT:
        return "warning"
      case PolicyStatus.EXPIRED:
        return "secondary"
      case PolicyStatus.CANCELLED:
      case PolicyStatus.CLAIMED:
        return "destructive"
      default:
        return "default"
    }
  }

  const getClaimStatusBadgeVariant = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.APPROVED:
      case ClaimStatus.PAID:
        return "success"
      case ClaimStatus.PENDING:
      case ClaimStatus.UNDER_REVIEW:
        return "warning"
      case ClaimStatus.REJECTED:
      case ClaimStatus.DISPUTED:
        return "destructive"
      default:
        return "default"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading farmer details...</p>
        </div>
      </div>
    )
  }

  if (error || !farmer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Farmer not found"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
              {farmer.firstName} {farmer.lastName}
            </h1>
            <p className="text-muted-foreground">Farmer ID: {farmer.farmerId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/farmers/${params.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {getInitials(`${farmer.firstName} ${farmer.lastName}`)}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">National ID</p>
                  <p className="text-sm text-muted-foreground">{farmer.nationalId}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone Number</p>
                  <p className="text-sm text-muted-foreground">{farmer.phoneNumber}</p>
                  {farmer.alternatePhone && (
                    <p className="text-xs text-muted-foreground">{farmer.alternatePhone}</p>
                  )}
                </div>
              </div>

              {farmer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{farmer.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{farmer.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date of Birth</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(farmer.dateOfBirth)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(farmer.memberSince)}
                  </p>
                </div>
              </div>

              {farmer.farmerGroup && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Farmer Group</p>
                    <p className="text-sm text-muted-foreground">{farmer.farmerGroup}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={getStatusBadgeVariant(farmer.status)}>
                    {farmer.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">KYC Status</p>
                  <Badge variant={farmer.kycStatus === "VERIFIED" ? "success" : "warning"}>
                    {farmer.kycStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmer.plots?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Land parcels registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {farmer.policies?.filter((p) => p.status === PolicyStatus.ACTIVE).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently insured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                farmer.policies?.reduce((sum, p) => sum + (p.premium || 0), 0) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Paid</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                farmer.paymentHistory?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total payouts received</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plots">Plots ({farmer.plots?.length || 0})</TabsTrigger>
          <TabsTrigger value="policies">Policies ({farmer.policies?.length || 0})</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Farmer Overview</CardTitle>
              <CardDescription>
                Complete profile information and farming history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Gender</p>
                  <p className="text-sm text-muted-foreground">{farmer.gender}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Credit Status</p>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Available: {formatCurrency(farmer.creditStatus?.creditAvailable || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Outstanding: {formatCurrency(farmer.creditStatus?.outstandingBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {farmer.location && (
                <div>
                  <p className="text-sm font-medium mb-1">Location Coordinates</p>
                  <p className="text-sm text-muted-foreground">
                    Lat: {farmer.location.latitude}, Long: {farmer.location.longitude}
                  </p>
                </div>
              )}

              <Alert variant="info">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Farming Summary</AlertTitle>
                <AlertDescription>
                  This farmer has been a member since {formatDate(farmer.memberSince)} and
                  currently manages {farmer.plots?.length || 0} plot(s) with{" "}
                  {farmer.policies?.filter((p) => p.status === PolicyStatus.ACTIVE).length || 0}{" "}
                  active insurance polic{farmer.policies?.filter((p) => p.status === PolicyStatus.ACTIVE).length === 1 ? "y" : "ies"}.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plots Tab */}
        <TabsContent value="plots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Land Plots</CardTitle>
              <CardDescription>
                All registered land parcels for this farmer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!farmer.plots || farmer.plots.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No plots registered yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plot Number</TableHead>
                      <TableHead>Crop Type</TableHead>
                      <TableHead>Size (Ha)</TableHead>
                      <TableHead>Planting Date</TableHead>
                      <TableHead>Expected Harvest</TableHead>
                      <TableHead>Irrigation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.plots.map((plot) => (
                      <TableRow key={plot.id}>
                        <TableCell className="font-medium">{plot.plotNumber}</TableCell>
                        <TableCell>{plot.cropType}</TableCell>
                        <TableCell>{plot.size.toFixed(2)}</TableCell>
                        <TableCell>{formatDate(plot.plantingDate)}</TableCell>
                        <TableCell>{formatDate(plot.expectedHarvestDate)}</TableCell>
                        <TableCell>{plot.irrigationType || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>
                All insurance policies for this farmer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!farmer.policies || farmer.policies.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No policies purchased yet</p>
                  <Button className="mt-4" size="sm">
                    Purchase Policy
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Coverage Type</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Sum Insured</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.policyNumber}</TableCell>
                        <TableCell>{policy.coverageType}</TableCell>
                        <TableCell>{policy.season}</TableCell>
                        <TableCell>{formatCurrency(policy.premium)}</TableCell>
                        <TableCell>{formatCurrency(policy.sumInsured)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(policy.startDate)}</div>
                            <div className="text-muted-foreground text-xs">
                              to {formatDate(policy.endDate)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPolicyStatusBadgeVariant(policy.status)}>
                            {policy.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims History</CardTitle>
              <CardDescription>
                All insurance claims submitted by this farmer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Claims data will be loaded from policies
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All premium payments and claim payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!farmer.paymentHistory || farmer.paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No payment history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.initiatedAt)}</TableCell>
                        <TableCell>{payment.type}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "COMPLETED" ? "success" : "warning"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                KYC documents and farmer records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!farmer.documents || farmer.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                  <Button className="mt-4" size="sm">
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {farmer.documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader>
                        <CardTitle className="text-sm">{doc.type}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {formatDate(doc.uploadedAt)}
                          </p>
                          <Badge variant={doc.verified ? "success" : "warning"}>
                            {doc.verified ? "Verified" : "Pending Verification"}
                          </Badge>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
