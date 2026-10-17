import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { ARC_TESTNET_CHAIN_ID } from '@/contract'
import { NetworkTenet } from '@web3icons/react'

export function WalletBar() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const wrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID

  return (
    <div className="flex items-center gap-3">
      {wrongChain && (
        <button
          onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'rgba(186,43,76,0.12)', color: 'var(--danger)' }}
        >
          Switch to Arc Testnet
        </button>
      )}
      <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--surface-muted)' }}>
        <NetworkTenet variant="branded" size={16} />
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Arc Testnet</span>
      </div>
      <ConnectKitButton />
    </div>
  )
}
