import { Address } from "viem"
import { State } from "./types"
import { readFile, writeFile } from "fs/promises"

export async function addWallet(wallet: { address: Address; name: string }, state: State) {
  if (state.wallets.filter(v => v.address === wallet.address).length === 0) {
    state.wallets.push(wallet)
    await writeFile("./data.json", JSON.stringify(state))
  }
}

export async function removeWallet(walletAddress: Address, state: State) {
  state.wallets = state.wallets.filter(v => v.address !== walletAddress)
  await writeFile("./data.json", JSON.stringify(state))
}

export function prettyAddress(address: Address) {
  return address.slice(0, 6) + "..." + address.slice(-4)
}
