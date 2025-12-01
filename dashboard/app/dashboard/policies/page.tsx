"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePolicies } from "@/hooks/use-data"
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
  Plus,
  Download,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  ShieldCheck,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { PolicyStatus } from "@/types"

export default function PoliciesPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | "all">("all")
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = usePolicies({
    page,
    pageSize: limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const policies = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

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

  const stats = [
    {
      title: "Total Policies",
      value: total.toString(),
      icon: FileText,
      description: "All time policies",
    },
    {
      title: "Active Policies",
      value: policies.filter((p) => p.status === PolicyStatus.ACTIVE).length.toString(),
      icon: ShieldCheck,
      description: "Currently active",
    },
    {
      title: "Total Coverage",
      value: formatCurrency(
        policies
          .filter((p) => p.status === PolicyStatus.ACTIVE)
          .reduce((sum, p) => sum + p.sumInsured, 0)
      ),
      icon: DollarSign,
      description: "Active coverage value",
    },
    {
      title: "Pending Claims",
      value: policies.filter((p) => p.status === PolicyStatus.CLAIMED).length.toString(),
      icon: Calendar,
      description: "Claims in process",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground">
            Manage insurance policies and coverage
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/policies/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
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
          <CardTitle>All Policies</CardTitle>
          <CardDescription>
            View and manage all insurance policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by policy number, farmer name..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PolicyStatus | "all")}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={PolicyStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={PolicyStatus.PENDING_PAYMENT}>Pending Payment</SelectItem>
                <SelectItem value={PolicyStatus.EXPIRED}>Expired</SelectItem>
                <SelectItem value={PolicyStatus.CLAIMED}>Claimed</SelectItem>
                <SelectItem value={PolicyStatus.CANCELLED}>Cancelled</SelectItem>
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
                <p className="text-muted-foreground">Loading policies...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading policies</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No policies found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating a new policy"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  className="mt-4"
                  onClick={() => router.push("/dashboard/policies/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Policy
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Crop Type</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">
                          {policy.policyNumber}
                        </TableCell>
                        <TableCell>
                          Farmer #{policy.farmerId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {policy.cropType}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(policy.sumInsured)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(policy.premium)}
                        </TableCell>
                        <TableCell>
                          {formatDate(policy.startDate)}
                        </TableCell>
                        <TableCell>
                          {formatDate(policy.endDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(policy.status)}>
                            {policy.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/policies/${policy.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} policies
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
