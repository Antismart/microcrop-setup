"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useClaims } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ClaimStatus } from "@/types"

export default function ClaimsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all")
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useClaims({
    page,
    pageSize: limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const claims = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

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

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.APPROVED:
        return CheckCircle
      case ClaimStatus.PENDING:
        return Clock
      case ClaimStatus.UNDER_REVIEW:
        return Clock
      case ClaimStatus.REJECTED:
        return XCircle
      case ClaimStatus.PAID:
        return DollarSign
      case ClaimStatus.DISPUTED:
        return AlertCircle
      default:
        return AlertCircle
    }
  }

  const stats = [
    {
      title: "Total Claims",
      value: total.toString(),
      icon: FileText,
      description: "All time claims",
    },
    {
      title: "Pending Review",
      value: claims.filter((c) => c.status === ClaimStatus.PENDING).length.toString(),
      icon: Clock,
      description: "Awaiting approval",
    },
    {
      title: "Approved",
      value: claims.filter((c) => c.status === ClaimStatus.APPROVED).length.toString(),
      icon: CheckCircle,
      description: "Ready for payout",
    },
    {
      title: "Total Payouts",
      value: formatCurrency(
        claims
          .filter((c) => c.status === ClaimStatus.PAID)
          .reduce((sum, c) => sum + c.calculatedPayout, 0)
      ),
      icon: DollarSign,
      description: "Processed payments",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claims</h1>
          <p className="text-muted-foreground">
            Manage and process insurance claims
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>All Claims</CardTitle>
          <CardDescription>
            View and manage all insurance claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by claim number, farmer..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ClaimStatus | "all")}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ClaimStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ClaimStatus.UNDER_REVIEW}>Under Review</SelectItem>
                <SelectItem value={ClaimStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ClaimStatus.REJECTED}>Rejected</SelectItem>
                <SelectItem value={ClaimStatus.PAID}>Paid</SelectItem>
                <SelectItem value={ClaimStatus.DISPUTED}>Disputed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading claims...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading claims</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No claims found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No claims have been submitted yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim Number</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Trigger Date</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => {
                      const StatusIcon = getStatusIcon(claim.status)
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">
                            {claim.claimNumber}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              className="h-auto p-0 text-sm"
                              onClick={() => router.push(`/dashboard/policies/${claim.policyId}`)}
                            >
                              {claim.policyId.slice(0, 8)}...
                            </Button>
                          </TableCell>
                          <TableCell className="capitalize">
                            {claim.type}
                          </TableCell>
                          <TableCell>
                            {formatDate(claim.triggerDate)}
                          </TableCell>
                          <TableCell>
                            {formatDate(claim.submittedAt)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(claim.calculatedPayout)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <Badge variant={getStatusBadgeVariant(claim.status)}>
                                {claim.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/dashboard/claims/${claim.id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} claims
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
