import { createPublicClient, formatEther, http } from "viem"
import { arbitrum, arbitrumNova, base, bsc, linea, mainnet, polygon, scroll, zkFair, zkSync } from "viem/chains"

export const NETWORKS = [
  { name: "mainnet", chain: mainnet, client: createPublicClient({ chain: mainnet, transport: http() }) },
  // { name: "base", chain: base, client: createPublicClient({ chain: base, transport: http() }) },
  // { name: "linea", chain: linea, client: createPublicClient({ chain: linea, transport: http() }) },
  // { name: "zkSync", chain: zkSync, client: createPublicClient({ chain: zkSync, transport: http() }) },
  // { name: "scroll", chain: scroll, client: createPublicClient({ chain: scroll, transport: http() }) },
  // { name: "bsc", chain: bsc, client: createPublicClient({ chain: bsc, transport: http() }) },
  // { name: "arbitrum", chain: arbitrum, client: createPublicClient({ chain: arbitrum, transport: http() }) },
  // { name: "arbitrumNova", chain: arbitrumNova, client: createPublicClient({ chain: arbitrumNova, transport: http() }) },
  // { name: "polygon", chain: polygon, client: createPublicClient({ chain: polygon, transport: http() }) },
  // { name: "zkFair", chain: zkFair, client: createPublicClient({ chain: zkFair, transport: http() }) },
] as const
