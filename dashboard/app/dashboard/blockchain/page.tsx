"use client"

import { useState } from "react"
import { WalletConnect } from "@/components/web3/wallet-connect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, FileCheck, Coins, Search, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useReadPolicy } from "@/hooks/use-contract"
import { formatCurrency } from "@/lib/utils"

export default function BlockchainPage() {
  const [policyId, setPolicyId] = useState("")
  const [searchId, setSearchId] = useState("")
  
  const { data: policyData, isLoading: isPolicyLoading, isError } = useReadPolicy(searchId)

  const handleSearch = () => {
    if (policyId) {
      setSearchId(policyId)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blockchain Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your wallet and interact with smart contracts on Base network
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <WalletConnect />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Blockchain Features</CardTitle>
            <CardDescription>
              Available smart contract interactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Policy Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage insurance policies on-chain with transparent records
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Claims Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Submit and approve claims with automated payout processing
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 p-2 h-fit">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">USDC Payments</h3>
                <p className="text-sm text-muted-foreground">
                  Handle premium payments and claim payouts using USDC stablecoin
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Verification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Policy On-Chain</CardTitle>
          <CardDescription>
            Check the status and details of an insurance policy directly from the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Enter Policy ID (e.g. 1001)"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSearch} disabled={!policyId || isPolicyLoading}>
              {isPolicyLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
          </div>

          {searchId && (
            <div className="rounded-lg border p-4">
              {isPolicyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span>Failed to fetch policy. Please check the ID and try again.</span>
                </div>
              ) : policyData ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Policy Found on Blockchain</span>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Farmer Address</p>
                      <p className="font-mono text-sm break-all">
                        {policyData[0] as string}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={policyData[3] ? "success" : "secondary"}>
                        {policyData[3] ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Premium Paid</p>
                      <p className="font-medium">
                        {formatCurrency(Number(policyData[1]) / 1000000)} USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sum Insured</p>
                      <p className="font-medium">
                        {formatCurrency(Number(policyData[2]) / 1000000)} USDC
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No policy found with this ID
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart Contracts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Insurance Contract</p>
              <p className="font-mono text-xs break-all">
                {process.env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS || "Not configured"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">USDC Token</p>
              <p className="font-mono text-xs break-all">
                0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primary Network</span>
              <span className="font-medium">Base</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chain ID</span>
              <span className="font-medium">8453</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Network</span>
              <span className="font-medium">Base Sepolia</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <a 
              href="https://basescan.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Block Explorer →
            </a>
            <a 
              href="https://docs.base.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Base Documentation →
            </a>
            <a 
              href="https://bridge.base.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Base Bridge →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
