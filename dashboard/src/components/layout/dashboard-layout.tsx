"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  Network,
  Shield,
} from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { useUIStore } from "../../store/ui.store"
import { useAuthStore } from "../../store/auth.store"
import { useNotificationStore } from "../../store/ui.store"
import { useSubdomain } from "../../hooks/use-subdomain"

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Cooperatives", href: "/dashboard/cooperatives", icon: Network },
  { name: "Farmers", href: "/dashboard/farmers", icon: Users },
  { name: "Policies", href: "/dashboard/policies", icon: FileText },
  { name: "Claims", href: "/dashboard/claims", icon: AlertCircle },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

const cooperativeNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Farmers", href: "/dashboard/farmers", icon: Users },
  { name: "Policies", href: "/dashboard/policies", icon: FileText },
  { name: "Claims", href: "/dashboard/claims", icon: AlertCircle },
  { name: "Payments", href: "/dashboard/payments", icon: DollarSign },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Get subdomain-specific branding
function getSubdomainBranding(subdomain: string) {
  switch (subdomain) {
    case 'network':
      return {
        title: 'MicroCrop Network',
        subtitle: 'Cooperative Portal',
        icon: Network,
        color: 'text-blue-600',
        bgColor: 'bg-blue-600',
      }
    case 'portal':
      return {
        title: 'MicroCrop Portal',
        subtitle: 'Admin Dashboard',
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-purple-600',
      }
    default:
      return {
        title: 'MicroCrop',
        subtitle: 'Insurance Platform',
        icon: Home,
        color: 'text-green-600',
        bgColor: 'bg-green-600',
      }
  }
}

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { subdomain, isCooperative, isAdmin } = useSubdomain()
  
  const branding = getSubdomainBranding(subdomain)
  const BrandIcon = branding.icon

  const navigation = isAdmin ? adminNavigation : cooperativeNavigation

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo with Subdomain Branding */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                branding.bgColor
              )}>
                <BrandIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">{branding.title}</span>
                <span className="text-xs text-gray-500">{branding.subtitle}</span>
              </div>
            </Link>
            <button
              onClick={toggleSidebar}
              className="lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("lg:pl-64", "transition-all duration-200")}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={toggleSidebar}
              className="lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4 ml-auto">
              {/* Subdomain Indicator */}
              {(isCooperative || isAdmin) && (
                <div className={cn(
                  "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  isCooperative ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                )}>
                  <BrandIcon className="w-3.5 h-3.5" />
                  {isCooperative ? "Cooperative Network" : "Admin Portal"}
                </div>
              )}

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  )
}
