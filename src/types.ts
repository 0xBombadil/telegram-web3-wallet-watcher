import { Address } from "viem"
import { NETWORKS } from "./networks"

export type State = {
  chatId: number
  wallets: { name: string; address: Address }[]
  networks: (typeof NETWORKS)[number]["name"][]
}
