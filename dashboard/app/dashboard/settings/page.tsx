"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Mail,
  Key,
  Save,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { useNotificationStore } from "@/store/ui.store"
import { authService } from "@/services/auth.service"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const [loading, setLoading] = useState(false)

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: "",
    organization: "",
    role: user?.role || "",
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    claimAlerts: true,
    policyUpdates: true,
    paymentReminders: true,
    weeklyReports: true,
  })

  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
  })

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
    timezone: "Africa/Nairobi",
    dateFormat: "DD/MM/YYYY",
  })

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      await authService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      })
      
      addNotification({
        title: "Success",
        message: "Profile updated successfully",
        type: "success",
      })
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message || "Failed to update profile",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      addNotification({
        title: "Success",
        message: "Notification preferences updated",
        type: "success",
      })
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to update preferences",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      addNotification({
        title: "Error",
        message: "Passwords do not match",
        type: "error",
      })
      return
    }

    setLoading(true)
    try {
      await authService.changePassword({
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword,
      })
      
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        twoFactorEnabled: securityData.twoFactorEnabled,
      })
      
      addNotification({
        title: "Success",
        message: "Password changed successfully",
        type: "success",
      })
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message || "Failed to change password",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAppearance = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      addNotification({
        title: "Success",
        message: "Appearance settings updated",
        type: "success",
      })
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to update settings",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+254 712 345 678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={profileData.organization}
                  onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
                  placeholder="Your organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={profileData.role}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Notification Channels</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotif">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="emailNotif"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotif">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Receive browser push notifications</p>
                  </div>
                  <Switch
                    id="pushNotif"
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotif">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    id="smsNotif"
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, smsNotifications: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Notification Types</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="claimAlerts">Claim Alerts</Label>
                    <p className="text-sm text-gray-500">Updates on claim status and approvals</p>
                  </div>
                  <Switch
                    id="claimAlerts"
                    checked={notifications.claimAlerts}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, claimAlerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="policyUpdates">Policy Updates</Label>
                    <p className="text-sm text-gray-500">Changes to policies and renewals</p>
                  </div>
                  <Switch
                    id="policyUpdates"
                    checked={notifications.policyUpdates}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, policyUpdates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="paymentReminders">Payment Reminders</Label>
                    <p className="text-sm text-gray-500">Reminders for upcoming payments</p>
                  </div>
                  <Switch
                    id="paymentReminders"
                    checked={notifications.paymentReminders}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, paymentReminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyReports">Weekly Reports</Label>
                    <p className="text-sm text-gray-500">Summary of weekly activities</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked: boolean) =>
                      setNotifications({ ...notifications, weeklyReports: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password & Security</CardTitle>
              <CardDescription>Manage your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) =>
                      setSecurityData({ ...securityData, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) =>
                      setSecurityData({ ...securityData, newPassword: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) =>
                      setSecurityData({ ...securityData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                </div>

                <Button onClick={handleChangePassword} disabled={loading} variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  {loading ? "Changing..." : "Change Password"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactor">Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    id="twoFactor"
                    checked={securityData.twoFactorEnabled}
                    onCheckedChange={(checked: boolean) =>
                      setSecurityData({ ...securityData, twoFactorEnabled: checked })
                    }
                  />
                </div>

                {securityData.twoFactorEnabled && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900">
                          Two-Factor Authentication Enabled
                        </p>
                        <p className="text-sm text-blue-700">
                          You will need to enter a verification code from your authenticator app when signing in.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Localization</CardTitle>
              <CardDescription>Customize how the application looks and behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={appearance.theme} onValueChange={(value) => setAppearance({ ...appearance, theme: value })}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={appearance.language} onValueChange={(value) => setAppearance({ ...appearance, language: value })}>
                  <SelectTrigger id="language">
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={appearance.timezone} onValueChange={(value) => setAppearance({ ...appearance, timezone: value })}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Nairobi">East Africa Time (EAT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={appearance.dateFormat} onValueChange={(value) => setAppearance({ ...appearance, dateFormat: value })}>
                  <SelectTrigger id="dateFormat">
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveAppearance} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
