/**
 * MeteredEscrow contract config — Arc Testnet
 * Deployed: 2026-10-17
 */
import artifact from '../contracts/out/MeteredEscrow.sol/MeteredEscrow.json'

const escrowAddress = (import.meta.env.VITE_METERED_ESCROW_ADDRESS ?? '') as `0x${string}`
if (!escrowAddress) throw new Error('VITE_METERED_ESCROW_ADDRESS is not set')

export const METERED_ESCROW = {
  address: escrowAddress,
  abi: artifact.abi,
} as const

export const ARC_TESTNET_CHAIN_ID = 5042002
export const ARC_TESTNET_EXPLORER = 'https://explorer.testnet.arc.io'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

export type DealStatus = 0 | 1 | 2 // None, Funded, Closed

export interface OnchainDeal {
  buyer: string
  seller: string
  payee: string
  buyerRefundTo: string
  termsHash: string
  deposit: bigint
  settled: bigint
  refunded: bigint
  acceptedNonce: bigint
  acceptedUnits: bigint
  maxUnits: bigint
  end: bigint
  grace: bigint
  sellerClosed: boolean
  status: DealStatus
}
