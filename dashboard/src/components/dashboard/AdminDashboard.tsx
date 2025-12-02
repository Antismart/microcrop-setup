"use client"

import {
  Building2,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminDashboardStats, useAdminRevenueChart, useSystemHealth } from "@/hooks/use-admin-data"
import { formatCurrency } from "@/lib/utils"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { CustomLineChart, CustomBarChart } from "@/components/charts"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
  suffix = "",
  color = "blue"
}: {
  title: string
  value: number | string
  change?: number
  icon: any
  prefix?: string
  suffix?: string
  color?: "blue" | "green" | "yellow" | "red" | "purple"
}) {
  const isPositive = change && change > 0
  const showChange = change !== undefined && change !== 0

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {prefix}
          {typeof value === "number" && prefix === "$"
            ? formatCurrency(value)
            : typeof value === "number"
            ? value.toLocaleString()
            : value}
          {suffix}
        </div>
        {showChange && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span className={isPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1 text-gray-400">from last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboardStats()
  const { data: revenueData } = useAdminRevenueChart("30d")
  const { data: healthData } = useSystemHealth()

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading platform dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const platformStats = stats?.platformStats
  const trends = stats?.trends
  const topCooperatives = stats?.topCooperatives || []
  const systemHealth = healthData?.systemHealth

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
            <p className="mt-2 text-gray-600">
              System-wide overview and administration
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            ADMIN VIEW
          </Badge>
        </div>

        {/* System Health Alert */}
        {systemHealth && (
          <Card className={`border-2 ${
            systemHealth.database.status === "healthy"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {systemHealth.database.status === "healthy" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <CardTitle className="text-base">System Health</CardTitle>
                </div>
                <Badge variant={systemHealth.database.status === "healthy" ? "default" : "destructive"}>
                  {systemHealth.database.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Database</p>
                  <p className="font-semibold">{systemHealth.database.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Recent Errors (24h)</p>
                  <p className="font-semibold">{systemHealth.recentErrors}</p>
                </div>
                <div>
                  <p className="text-gray-600">Processing Queue</p>
                  <p className="font-semibold">{systemHealth.processingQueue} pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Cooperatives"
            value={platformStats?.totalCooperatives || 0}
            change={trends?.cooperativeGrowth}
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Total Farmers"
            value={platformStats?.totalFarmers || 0}
            change={trends?.farmerGrowth}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Active Policies"
            value={platformStats?.activePolicies || 0}
            change={trends?.policyGrowth}
            icon={FileText}
            color="purple"
          />
          <StatCard
            title="Loss Ratio"
            value={platformStats?.lossRatio || 0}
            suffix="%"
            icon={Activity}
            color={
              (platformStats?.lossRatio || 0) > 80 ? "red" :
              (platformStats?.lossRatio || 0) > 60 ? "yellow" : "green"
            }
          />
        </div>

        {/* Financial Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Premiums Collected"
            value={platformStats?.totalPremiumCollected || 0}
            change={trends?.premiumGrowth}
            icon={DollarSign}
            prefix="$"
            color="green"
          />
          <StatCard
            title="Total Payouts Distributed"
            value={platformStats?.totalPayoutsDistributed || 0}
            icon={DollarSign}
            prefix="$"
            color="red"
          />
          <StatCard
            title="Coverage Area"
            value={platformStats?.coverageArea || 0}
            suffix=" ha"
            icon={Activity}
            color="blue"
          />
        </div>

        {/* Action Items */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span>Pending KYC</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-700">
                {platformStats?.pendingKycFarmers || 0}
              </p>
              <p className="text-sm text-yellow-600 mt-1">Farmers awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>Pending Claims</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-700">
                {platformStats?.pendingClaims || 0}
              </p>
              <p className="text-sm text-orange-600 mt-1">Claims to process</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Total Claims</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">
                {platformStats?.totalClaims || 0}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {trends?.claimGrowth && trends.claimGrowth > 0 ? "+" : ""}
                {trends?.claimGrowth?.toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Platform Revenue Overview
            </CardTitle>
            <CardDescription>
              Premium collection vs payouts across all cooperatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomLineChart
              data={
                revenueData?.labels?.map((label: string, index: number) => ({
                  name: label,
                  Premiums: revenueData.premiums?.[index] || 0,
                  Payouts: revenueData.payouts?.[index] || 0,
                  Cooperatives: revenueData.activeCooperatives?.[index] || 0,
                })) || []
              }
              lines={[
                { dataKey: "Premiums", stroke: "#16a34a", name: "Premium Collected" },
                { dataKey: "Payouts", stroke: "#dc2626", name: "Claims Paid" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Top Cooperatives Table */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Performing Cooperatives
            </CardTitle>
            <CardDescription>
              Cooperatives by premium collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cooperative Name</TableHead>
                  <TableHead className="text-right">Total Farmers</TableHead>
                  <TableHead className="text-right">Total Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCooperatives.length > 0 ? (
                  topCooperatives.map((coop) => (
                    <TableRow key={coop.id}>
                      <TableCell className="font-medium">{coop.name}</TableCell>
                      <TableCell className="text-right">{coop.totalFarmers}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(coop.totalPremium)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No cooperatives data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
