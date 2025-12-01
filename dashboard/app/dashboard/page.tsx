"use client"

import { Users, FileText, DollarSign, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardStats, useRevenueChart } from "@/hooks/use-data"
import { formatCurrency, calculatePercentageChange } from "@/lib/utils"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { CustomLineChart, CustomBarChart, CustomPieChart } from "@/components/charts"

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = "",
}: {
  title: string
  value: number
  change?: number
  icon: any
  prefix?: string
}) {
  const isPositive = change && change > 0
  const showChange = change !== undefined && change !== 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}
          {typeof value === "number" && prefix === "$"
            ? formatCurrency(value)
            : value.toLocaleString()}
        </div>
        {showChange && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1">from last month</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: revenueData } = useRevenueChart("30d")

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's an overview of your cooperative's performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Farmers"
            value={stats?.totalFarmers || 0}
            change={stats?.trends?.farmersGrowth}
            icon={Users}
          />
          <StatCard
            title="Active Policies"
            value={stats?.activePolicies || 0}
            icon={FileText}
          />
          <StatCard
            title="Premium Collected"
            value={stats?.totalPremiumCollected || 0}
            change={stats?.trends?.premiumGrowth}
            icon={DollarSign}
            prefix="$"
          />
          <StatCard
            title="Claims This Month"
            value={stats?.claimsThisMonth || 0}
            change={stats?.trends?.claimsGrowth}
            icon={AlertCircle}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Premium collection vs payouts over time</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomLineChart
                data={
                  revenueData?.labels?.map((label: string, index: number) => ({
                    name: label,
                    Premiums: revenueData.premiums?.[index] || 0,
                    Payouts: revenueData.payouts?.[index] || 0,
                  })) || []
                }
                lines={[
                  { dataKey: "Premiums", stroke: "#16a34a", name: "Premium Collected" },
                  { dataKey: "Payouts", stroke: "#dc2626", name: "Claims Paid" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy Distribution</CardTitle>
              <CardDescription>Policies by crop type</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomPieChart
                data={[
                  { name: "Maize", value: 45 },
                  { name: "Wheat", value: 25 },
                  { name: "Rice", value: 15 },
                  { name: "Sorghum", value: 10 },
                  { name: "Other", value: 5 },
                ]}
                colors={["#16a34a", "#eab308", "#3b82f6", "#f97316", "#8b5cf6"]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Additional Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Claims</CardTitle>
              <CardDescription>Claims submitted by status</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomBarChart
                data={
                  revenueData?.labels?.map((label: string, index: number) => ({
                    name: label,
                    Approved: Math.floor(Math.random() * 10) + 5,
                    Pending: Math.floor(Math.random() * 5) + 2,
                    Rejected: Math.floor(Math.random() * 3),
                  })) || []
                }
                bars={[
                  { dataKey: "Approved", fill: "#16a34a", name: "Approved" },
                  { dataKey: "Pending", fill: "#eab308", name: "Pending" },
                  { dataKey: "Rejected", fill: "#dc2626", name: "Rejected" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New farmer registered</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Policy issued</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Claim submitted</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment received</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coverage Map */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500">Interactive map coming soon</p>
                <p className="text-sm text-gray-400 mt-2">
                  Total Coverage Area: {stats?.coverageArea?.toLocaleString() || 0} hectares
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
