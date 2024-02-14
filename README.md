# Frank - The Telegram Bot that monitors web3 transactions and notifies you.

## How to use?

- Create a bot by speaking to the [BotFather](https://t.me/BotFather). He will give you a bot access token. Keep this private.
- Create .env in the root folder of this repo and create an enviroment variable with the name BOT_ACCESS_TOKEN and set it's value to the bot access token you received from the BotFather.
- Install dependencies with `yarn install`.
- Run the bot with `yarn dev`.
- Go to telegram and speak to your newly created bot. Say `/start` to bind with him. He will talk to no one else after that, unless you restart it.
- Add wallet with `/addwallet [wallet_address] [wallet_name]`.
- Your bot will send you a message each time that wallet sends or receives native currency or ERC20 tokens.

Other commands are available:

- `/wallets` shows all wallets. These are saved in the `data.json` file that gets created the first time you run the bot, and persists with restarts.
- `/removewallet [wallet_address]` removes wallets from `data.json`.
- `/networks` shows all networks being monitored. To add and remove these, you just have to modify the `/src/networks.ts` file.
