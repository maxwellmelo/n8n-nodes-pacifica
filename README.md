# n8n-nodes-pacifica

This is an n8n community node that integrates with **Pacifica**, a next-generation derivatives trading platform offering perpetual futures trading with AI-powered features.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Pacifica](https://pacifica.fi/) is a perpetual futures DEX with advanced trading features.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

```bash
npm install n8n-nodes-pacifica
```

## Operations

### Market Data (Public)
- **Get Market Info** - Get specifications for all trading pairs
- **Get Prices** - Get current prices, funding rates, and stats for all symbols
- **Get Symbol Price** - Get price for a specific symbol
- **Get Orderbook** - Get order book depth for a symbol
- **Get Candles** - Get historical OHLCV candlestick data
- **Get Recent Trades** - Get recent trades for a symbol
- **Get Historical Funding** - Get historical funding rate data

### Account (Authenticated)
- **Get Account Info** - Get account balance, equity, margin details
- **Get Trade History** - Get historical trade records
- **Get Equity History** - Get historical equity data
- **Get Balance History** - Get historical balance data
- **Get Account Funding** - Get funding payments history
- **Request Withdrawal** - Request a withdrawal from the account

### Orders (Authenticated + Signing)
- **Create Market Order** - Place immediate market orders with slippage control
- **Create Limit Order** - Place limit orders with GTC, IOC, ALO, or TOB time-in-force
- **Create Stop Market Order** - Place stop market orders triggered at a price
- **Create Stop Limit Order** - Place stop limit orders with trigger and limit prices
- **Create Position TP/SL** - Set take profit and stop loss for an existing position
- **Create Multi TP/SL** - Create multiple take profit levels with a single stop loss
- **Cancel Order** - Cancel a specific order by ID or client order ID
- **Cancel Stop Order** - Cancel a stop order by ID or client order ID
- **Cancel All Orders** - Cancel all open orders (optionally filtered by symbols)
- **Batch Orders** - Submit multiple orders in a single request
- **Get Open Orders** - Get all currently open orders
- **Get Order History** - Get historical order records
- **Get Order By ID** - Get a specific order by its ID

### Positions (Authenticated)
- **Get Positions** - Get all open positions
- **Update Leverage** - Update leverage for a symbol
- **Update Margin Mode** - Switch between cross and isolated margin
- **Close Position** - Close a position with a market order

## Credentials

To use this node, you need to set up API credentials:

1. Go to [https://app.pacifica.fi/apikey](https://app.pacifica.fi/apikey) to generate an Agent Wallet
2. In n8n, create new Pacifica API credentials with:
   - **Network**: Mainnet or Testnet
   - **Account Address**: Your main wallet public address
   - **Agent Wallet Address**: The generated agent wallet public address
   - **Agent Private Key**: The agent wallet private key (used for signing)

The Agent Wallet can only execute trades and cannot withdraw funds, making it safe for automated trading.

## Compatibility

- n8n version: >= 1.0.0
- Node.js version: >= 20.15

## Resources

- [Pacifica Documentation](https://docs.pacifica.fi/)
- [Pacifica API Reference](https://docs.pacifica.fi/api-documentation/api)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Pacifica Python SDK](https://github.com/pacifica-fi/python-sdk)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes
npm run dev

# Lint code
npm run lint
```

## License

[MIT](LICENSE)
