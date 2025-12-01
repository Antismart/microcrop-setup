"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { DollarSign, Download, Filter, Search, CreditCard, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import { usePayments } from "@/hooks/use-data"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Mock data for demonstration - replace with actual API call
  const { data: payments, isLoading } = usePayments()

  // Mock payment data
  const mockPayments: any[] = [
    {
      id: "1",
      reference: "PMT-2025-001",
      farmerName: "John Kamau",
      amount: 15000,
      currency: "KES",
      type: "PREMIUM",
      status: "COMPLETED",
      method: "MPESA",
      date: new Date("2025-11-15"),
      description: "Policy premium payment"
    },
    {
      id: "2",
      reference: "PMT-2025-002",
      farmerName: "Mary Wanjiru",
      amount: 50000,
      currency: "KES",
      type: "PAYOUT",
      status: "PENDING",
      method: "BANK_TRANSFER",
      date: new Date("2025-11-16"),
      description: "Claim payout"
    },
    {
      id: "3",
      reference: "PMT-2025-003",
      farmerName: "Peter Ochieng",
      amount: 12500,
      currency: "KES",
      type: "PREMIUM",
      status: "COMPLETED",
      method: "MPESA",
      date: new Date("2025-11-17"),
      description: "Policy renewal payment"
    },
    {
      id: "4",
      reference: "PMT-2025-004",
      farmerName: "Sarah Akinyi",
      amount: 75000,
      currency: "KES",
      type: "PAYOUT",
      status: "PROCESSING",
      method: "BANK_TRANSFER",
      date: new Date("2025-11-17"),
      description: "Drought claim payout"
    },
  ]

  const displayPayments: any[] = Array.isArray(payments) ? payments : mockPayments

  // Filter payments
  const filteredPayments = displayPayments.filter((payment: any) => {
    const matchesSearch = payment.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const totalPayments = filteredPayments.length
  const completedPayments = filteredPayments.filter((p: any) => p.status === "COMPLETED").length
  const pendingPayments = filteredPayments.filter((p: any) => p.status === "PENDING" || p.status === "PROCESSING").length
  const totalAmount = filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "PROCESSING":
        return "bg-blue-100 text-blue-800"
      case "FAILED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PREMIUM":
        return "bg-purple-100 text-purple-800"
      case "PAYOUT":
        return "bg-emerald-100 text-emerald-800"
      case "REFUND":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Track and manage all payment transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(totalAmount, "KES")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedPayments}</div>
            <p className="text-xs text-gray-500 mt-1">
              {((completedPayments / totalPayments) * 100).toFixed(0)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalAmount, "KES")}
            </div>
            <p className="text-xs text-gray-500 mt-1">All transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>View and manage all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by farmer name or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Payments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.reference}</TableCell>
                      <TableCell>{payment.farmerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(payment.type)}>
                          {payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{payment.method}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
