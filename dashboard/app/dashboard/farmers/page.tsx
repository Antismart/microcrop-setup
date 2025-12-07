"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useFarmers, useBulkExportFarmers, useBulkUploadFarmers } from "@/hooks/use-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Upload, Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Loader2, Users, UserCheck, UserMinus, UserX } from "lucide-react"
import { Farmer, FarmerStatus } from "@/types"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ListPageSkeleton, StatsSkeleton } from "@/components/ui/skeleton-loaders"

export default function FarmersPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FarmerStatus | "all">("all")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch farmers with filters
  const { data: farmersData, isLoading } = useFarmers({
    page,
    pageSize,
    search: searchQuery,
  })

  const exportMutation = useBulkExportFarmers()
  const bulkUploadMutation = useBulkUploadFarmers()

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset to first page on search
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as FarmerStatus | "all")
    setPage(1)
  }

  const handleGroupFilterChange = (value: string) => {
    setGroupFilter(value)
    setPage(1)
  }

  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync(undefined)
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const handleBulkUpload = () => {
    setShowBulkUploadDialog(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) return
    
    try {
      await bulkUploadMutation.mutateAsync(selectedFile)
      setShowBulkUploadDialog(false)
      setSelectedFile(null)
    } catch (error) {
      console.error("Upload failed:", error)
    }
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

  // Show loading state
  if (isLoading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farmers</h1>
          <p className="text-muted-foreground">
            Manage farmer registrations and information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBulkUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
          <Button asChild>
            <Link href="/dashboard/farmers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Farmer
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-200 border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Farmers</CardTitle>
            <div className="p-2 bg-blue-50 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{farmersData?.total || 0}</div>
            <p className="text-xs text-gray-400 mt-1">
              Across all cooperatives
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
            <div className="p-2 bg-green-50 rounded-full">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {farmersData?.data?.filter((f: any) => f.status === "active").length || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              With active policies
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inactive</CardTitle>
            <div className="p-2 bg-yellow-50 rounded-full">
              <UserMinus className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {farmersData?.data?.filter((f: any) => f.status === "inactive").length || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              No active policies
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all duration-200 border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Suspended</CardTitle>
            <div className="p-2 bg-red-50 rounded-full">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {farmersData?.data?.filter((f: any) => f.status === "suspended").length || 0}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find farmers by name, ID, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Farmer Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="group-a">Group A</SelectItem>
                <SelectItem value="group-b">Group B</SelectItem>
                <SelectItem value="group-c">Group C</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Farmers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Farmer Directory</CardTitle>
          <CardDescription>
            {farmersData?.total || 0} total farmers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading farmers...</div>
            </div>
          ) : farmersData?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No farmers found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Farmer Group</TableHead>
                    <TableHead>Plots</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmersData?.data?.map((farmer: any) => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-medium">{farmer.farmerId}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {farmer.firstName} {farmer.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {farmer.nationalId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{farmer.phoneNumber}</TableCell>
                      <TableCell>{farmer.farmerGroup || "-"}</TableCell>
                      <TableCell>
                        {farmer.plots?.length || 0} plot{farmer.plots?.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(farmer.status)}>
                          {farmer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(farmer.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/farmers/${farmer.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/farmers/${farmer.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to{" "}
                  {Math.min(page * pageSize, farmersData?.total || 0)} of{" "}
                  {farmersData?.total || 0} farmers
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {page} of {Math.ceil((farmersData?.total || 0) / pageSize)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil((farmersData?.total || 0) / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Farmers</DialogTitle>
            <DialogDescription>
              Upload a CSV file with farmer information. Download the template to see the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Button variant="outline" className="w-full" asChild>
                <a href="/templates/farmers-template.csv" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </a>
              </Button>
            </div>
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} disabled={!selectedFile || bulkUploadMutation.isPending}>
              {bulkUploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
