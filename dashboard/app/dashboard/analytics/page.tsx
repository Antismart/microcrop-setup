"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Activity,
  Download,
  Calendar
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatsSkeleton, ChartSkeleton } from "@/components/ui/skeleton-loaders"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [selectedMetric, setSelectedMetric] = useState("overview")
  const [isLoading, setIsLoading] = useState(false) // Can be connected to real data fetching

  // Mock analytics data
  const analyticsData = {
    overview: {
      totalFarmers: 1247,
      farmerGrowth: 12.5,
      activePolicies: 892,
      policyGrowth: 8.3,
      totalClaims: 143,
      claimGrowth: -5.2,
      payoutAmount: 12500000,
      payoutGrowth: 15.7,
    },
    performance: {
      claimSettlementRate: 89.5,
      averageSettlementTime: 4.2,
      customerSatisfaction: 4.6,
      policyRenewalRate: 76.3,
    },
    regional: [
      { region: "Nakuru", farmers: 345, policies: 278, claims: 42 },
      { region: "Kiambu", farmers: 298, policies: 241, claims: 38 },
      { region: "Meru", farmers: 267, policies: 189, claims: 31 },
      { region: "Uasin Gishu", farmers: 189, policies: 123, claims: 19 },
      { region: "Others", farmers: 148, policies: 61, claims: 13 },
    ],
    topPolicies: [
      { type: "Drought Protection", count: 456, premium: 6840000 },
      { type: "Crop Failure", count: 289, premium: 4335000 },
      { type: "Flood Insurance", count: 147, premium: 2205000 },
    ],
  }

  const getMetricTrendColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600"
  }

  const getMetricTrendIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Show loading skeleton */}
      {isLoading && (
        <>
          <StatsSkeleton count={4} />
          <div className="grid gap-6 md:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </>
      )}

      {/* Overview Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Farmers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalFarmers.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getMetricTrendColor(analyticsData.overview.farmerGrowth)}`}>
              {getMetricTrendIcon(analyticsData.overview.farmerGrowth)}
              <span>{Math.abs(analyticsData.overview.farmerGrowth)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Policies</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.activePolicies.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getMetricTrendColor(analyticsData.overview.policyGrowth)}`}>
              {getMetricTrendIcon(analyticsData.overview.policyGrowth)}
              <span>{Math.abs(analyticsData.overview.policyGrowth)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Claims</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalClaims.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getMetricTrendColor(analyticsData.overview.claimGrowth)}`}>
              {getMetricTrendIcon(analyticsData.overview.claimGrowth)}
              <span>{Math.abs(analyticsData.overview.claimGrowth)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payout Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.overview.payoutAmount, "KES")}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${getMetricTrendColor(analyticsData.overview.payoutGrowth)}`}>
              {getMetricTrendIcon(analyticsData.overview.payoutGrowth)}
              <span>{Math.abs(analyticsData.overview.payoutGrowth)}% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Performance Metrics */}
      {!isLoading && (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators and operational efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Claim Settlement Rate</span>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.performance.claimSettlementRate}%
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${analyticsData.performance.claimSettlementRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg. Settlement Time</span>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.performance.averageSettlementTime} days
              </div>
              <p className="text-xs text-gray-500">Target: &lt; 5 days</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {analyticsData.performance.customerSatisfaction}/5.0
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${(analyticsData.performance.customerSatisfaction / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Policy Renewal Rate</span>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.performance.policyRenewalRate}%
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${analyticsData.performance.policyRenewalRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Two Column Layout */}
      {!isLoading && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Distribution</CardTitle>
            <CardDescription>Farmers, policies, and claims by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.regional.map((region, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{region.region}</span>
                    <span className="text-sm text-gray-500">{region.farmers} farmers</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                      <span className="text-gray-600">Policies</span>
                      <span className="font-semibold text-green-700">{region.policies}</span>
                    </div>
                    <div className="flex items-center justify-between bg-orange-50 p-2 rounded">
                      <span className="text-gray-600">Claims</span>
                      <span className="font-semibold text-orange-700">{region.claims}</span>
                    </div>
                  </div>
                  {index < analyticsData.regional.length - 1 && (
                    <div className="border-t pt-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Top Policy Types</CardTitle>
            <CardDescription>Most popular insurance products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topPolicies.map((policy, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{policy.type}</span>
                    <Badge variant="outline">{policy.count} active</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Premium</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(policy.premium, "KES")}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{
                        width: `${(policy.count / analyticsData.topPolicies[0].count) * 100}%`,
                      }}
                    />
                  </div>
                  {index < analyticsData.topPolicies.length - 1 && (
                    <div className="border-t pt-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Charts Placeholder */}
      {!isLoading && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
          <CardDescription>Historical data and forecasting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-gray-50">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-gray-500 font-medium">Charts Coming Soon</p>
              <p className="text-sm text-gray-400">Interactive charts and visualizations will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
