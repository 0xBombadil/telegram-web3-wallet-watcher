import "dotenv/config"
import TelegramBot from "node-telegram-bot-api"
import { Address, erc20Abi, formatEther, formatUnits, getContract, isAddress } from "viem"
import { readFile, writeFile } from "fs/promises"
import { NETWORKS } from "./networks"
import { addWallet, prettyAddress, removeWallet } from "./utils"
import { State } from "./types"

const botToken = process.env.BOT_ACCESS_TOKEN
if (!botToken) throw Error("BOT_ACCESS_TOKEN in .env is invalid.")

export const bot = new TelegramBot(botToken, { polling: true })

const state: State = {
  chatId: -1,
  wallets: [],
  networks: [],
}

async function main() {
  try {
    const content = await readFile("./data.json", { encoding: "utf-8" })
    const storedData = JSON.parse(content)
    state.wallets = storedData.wallets
    state.networks = storedData.networks
    console.log(state)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("Creating data.json.")
      await writeFile(
        "./data.json",
        JSON.stringify({
          wallets: [],
          networks: [],
        })
      )
    } else {
      console.error(error)
      return
    }
  }

  console.log("Waiting for bonding...")

  bot.onText(/^\/start$/, async (msg, match) => {
    if (state.chatId !== -1) {
      if (state.chatId === msg.chat.id) {
        bot.sendMessage(state.chatId, `You have already bonded with frank.`)
      } else {
        bot.sendMessage(state.chatId, `Someone else already has bonded with frank.`)
      }
    } else {
      state.chatId = msg.chat.id

      bot.onText(/\/wallets/, (msg, match) => {
        console.log(`Showing all wallets.`)
        console.log(state.wallets)
        if (state.wallets.length === 0) {
          bot.sendMessage(state.chatId, `Wallets: None. Add one with \/addwallet [wallet_address] [wallet_name]`)
          return
        }

        const text = state.wallets.map(v => `${v.name}   \t ${v.address}`)
        bot.sendMessage(state.chatId, `Wallets:\n${text.join("\n")}`)
      })

      bot.onText(/^\/addwallet$/, async (msg, match) => {
        const chatId = msg.chat.id
        console.log(`Adding wallet to ${chatId}.`)
        bot.sendMessage(chatId, `To add a wallet, write \/addwallet [wallet_address] [wallet_name]`)
      })

      bot.onText(/^\/addwallet\s(.+)\s(.+)/, async (msg, match) => {
        if (!match) return
        const wallet = { address: match[1] as Address, name: match[2] }
        if (!isAddress(wallet.address)) {
          await bot.sendMessage(state.chatId, `The wallet address you provided is not an EVM address.`)
          return
        }
        console.log(`Adding wallet ${wallet.address} with name "${wallet.name}".`)

        console.log(wallet)
        if (wallet.address) {
          addWallet(wallet, state)
          console.log(state.wallets)
          bot.sendMessage(state.chatId, `Wallet added: ${wallet.address} (${wallet.name})`)
        } else {
          bot.sendMessage(state.chatId, `To add a wallet, write \/addwallet [wallet_address] [wallet_name]`)
        }
      })

      bot.onText(/^\/removewallet\s(.+)/, async (msg, match) => {
        if (!match) return
        const walletAddress = match[1] as Address
        if (!walletAddress) {
          bot.sendMessage(state.chatId, `To remove a wallet, write \/removewallet [wallet_address]`)
          return
        }
        if (!isAddress(walletAddress)) {
          await bot.sendMessage(state.chatId, `The wallet address you provided is not an EVM address.`)
          return
        }
        console.log(`Removing wallet.`)

        removeWallet(walletAddress, state)
        console.log(state.wallets)
        bot.sendMessage(state.chatId, `Wallet removed.`)
      })

      bot.onText(/\/networks/, (msg, match) => {
        const chatId = msg.chat.id
        console.log("CALLED /networks")
        bot.sendMessage(chatId, `Monitored networks:\n${NETWORKS.map(v => "  * " + v.name).join("\n")}`)
      })

      await bot.setMyCommands(
        [
          {
            command: "/wallets",
            description: "See stored wallets.",
          },
          {
            command: "/addwallet",
            description: "Add new wallet.",
          },
          {
            command: "/removewallet",
            description: "Remove wallet.",
          },
          {
            command: "/networks",
            description: "Lists all available networks.",
          },
        ],
        {
          scope: {
            type: "chat",
            chat_id: state.chatId,
          },
        }
      )

      for (let i = 0; i < NETWORKS.length; i++) {
        const network = NETWORKS[i]
        network.client.watchBlocks({
          includeTransactions: true,
          emitMissed: true,

          onBlock: block => {
            console.log(`${network.name}     \t Block number: ${block.number}\t Transactions:${block.transactions.length}`)
            console.log(state.wallets)
            for (let i = 0; i < block.transactions.length; i++) {
              const { number: blockNumber } = block
              const { from, to, value, hash } = block.transactions[i]
              if (from === null) return
              if (to === null) return
              const txExplorerLink = network.chain.blockExplorers.default.url + "/tx/" + hash
              const fromExplorerLink = network.chain.blockExplorers.default.url + "/address/" + from
              const toExplorerLink = network.chain.blockExplorers.default.url + "/address/" + to

              state.wallets.forEach(wallet => {
                if (from.toLowerCase() === wallet.address.toLowerCase()) {
                  let message = [
                    `<strong>🟥 OUTGOING</strong> · ${network.name}`,
                    `From: <a href="${fromExplorerLink}">${wallet.name}</a>`,
                    `To:   <a href="${toExplorerLink}">${prettyAddress(to)}</a>`,
                    `Amount: ${formatEther(value)} ETH`,
                    `<a href="${txExplorerLink}">Tx Hash</a>`,
                  ].join("\n")
                  bot.sendMessage(state.chatId, message, { parse_mode: "HTML", disable_web_page_preview: true })
                } else if (to && to.toLowerCase() === wallet.address.toLowerCase()) {
                  let message = [
                    `<strong>🟩 INCOMING</strong> · ${network.name}`,
                    `From: <a href="${fromExplorerLink}">${prettyAddress(from)}</a>`,
                    `To:   <a href="${toExplorerLink}">${wallet.name}</a>`,
                    `Amount: ${formatEther(value)} ETH`,
                    `<a href="${txExplorerLink}">Tx Hash</a>`,
                  ].join("\n")
                  bot.sendMessage(state.chatId, message, { parse_mode: "HTML", disable_web_page_preview: true })
                }
              })
            }
          },
        })
      }
      let lastBlockNumbers = await Promise.all(NETWORKS.map(async v => await v.client.getBlockNumber()))

      setInterval(async () => {
        console.log("ERC20 Wallets", state.wallets)

        const currentBlockNumbers = await Promise.all(NETWORKS.map(async v => await v.client.getBlockNumber()))

        for (let i = 0; i < NETWORKS.length; i++) {
          const network = NETWORKS[i]

          for (let j = 0; j < state.wallets.length; j++) {
            const wallet = state.wallets[j]

            const incomingPromises = network.client.getContractEvents({
              abi: erc20Abi,
              eventName: "Transfer",
              args: {
                to: wallet.address,
              },
              fromBlock: lastBlockNumbers[i],
              toBlock: currentBlockNumbers[i],
            })

            const outgoingPromises = network.client.getContractEvents({
              abi: erc20Abi,
              eventName: "Transfer",
              args: {
                from: wallet.address,
              },
              fromBlock: lastBlockNumbers[i],
              toBlock: currentBlockNumbers[i],
            })

            const [incomingLogs, outgoingLogs] = await Promise.all([incomingPromises, outgoingPromises])
            lastBlockNumbers = currentBlockNumbers

            incomingLogs.forEach(async log => {
              const { transactionHash: hash, address, blockNumber } = log
              const { to, from, value } = log.args
              if (to === undefined) return
              if (from === undefined) return
              if (value === undefined) return
              const txExplorerLink = network.chain.blockExplorers.default.url + "/tx/" + hash
              const fromExplorerLink = network.chain.blockExplorers.default.url + "/address/" + from
              const toExplorerLink = network.chain.blockExplorers.default.url + "/address/" + to
              const tokenExplorerLink = network.chain.blockExplorers.default.url + "/token/" + address
              const contract = getContract({ address, abi: erc20Abi, client: network.client })
              const [symbol, decimals] = await Promise.all([contract.read.symbol(), contract.read.decimals()])

              let message = [
                `<strong>🟩 INCOMING</strong> · ${network.name}`,
                `<a href="${toExplorerLink}">${wallet.name}</a>`,
                `received ${formatUnits(value, decimals)} <a href="${tokenExplorerLink}">${symbol}</a>`,
                `from <a href="${fromExplorerLink}">${prettyAddress(from)}</a>.`,
                `<a href="${txExplorerLink}">Tx Hash</a>`,
              ].join("\n")

              bot.sendMessage(state.chatId, message, { parse_mode: "HTML", disable_web_page_preview: true })
            })

            outgoingLogs.forEach(async log => {
              const { transactionHash: hash, address, blockNumber } = log
              const { from, to, value } = log.args
              if (to === undefined) return
              if (from === undefined) return
              if (value === undefined) return
              const txExplorerLink = network.chain.blockExplorers.default.url + "/tx/" + hash
              const fromExplorerLink = network.chain.blockExplorers.default.url + "/address/" + from
              const toExplorerLink = network.chain.blockExplorers.default.url + "/address/" + to
              const tokenExplorerLink = network.chain.blockExplorers.default.url + "/token/" + address
              const contract = getContract({ address, abi: erc20Abi, client: network.client })
              const [symbol, decimals] = await Promise.all([contract.read.symbol(), contract.read.decimals()])

              let message = [
                `<strong>🟥 OUTGOING</strong> · ${network.name}`,
                `<a href="${fromExplorerLink}">${wallet.name}</a>`,
                `sent ${formatUnits(value, decimals)} <a href="${tokenExplorerLink}">${symbol}</a>`,
                `to <a href="${toExplorerLink}">${prettyAddress(to)}</a>.`,
                `<a href="${txExplorerLink}">Tx Hash</a>`,
              ].join("\n")

              bot.sendMessage(state.chatId, message, { parse_mode: "HTML", disable_web_page_preview: true })
            })
          }
        }
      }, 5000)

      await bot.sendMessage(state.chatId, `You've successfully bonded with frank. No one will be able to bond with him again.`)
      console.log(`Bonded with ${msg.chat.first_name}.`)
    }
  })
}

main()
