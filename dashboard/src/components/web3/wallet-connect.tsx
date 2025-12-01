"use client"

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet, Power, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { base, baseSepolia } from "wagmi/chains"

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { data: balance } = useBalance({
    address,
  })

  const isWrongNetwork = isConnected && chain && chain.id !== base.id && chain.id !== baseSepolia.id

  const handleConnect = () => {
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }

  const handleSwitchToBase = () => {
    if (switchChain) {
      switchChain({ chainId: base.id })
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your wallet to interact with blockchain features
              </p>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {isWrongNetwork && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Base network to use blockchain features.
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSwitchToBase}
                className="ml-2"
              >
                Switch to Base
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wallet Address</span>
            <span className="text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>

          {chain && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm font-medium">{chain.name}</span>
            </div>
          )}

          {balance && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className="text-sm font-medium">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </span>
            </div>
          )}
        </div>

        <Button 
          variant="destructive" 
          onClick={() => disconnect()}
          className="w-full"
        >
          <Power className="mr-2 h-4 w-4" />
          Disconnect Wallet
        </Button>
      </CardContent>
    </Card>
  )
}
