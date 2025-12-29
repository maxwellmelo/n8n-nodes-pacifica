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
- **Get Orderbook** - Get order book depth for a symbol
- **Get Candles** - Get historical OHLCV candlestick data
- **Get Recent Trades** - Get recent trades for a symbol
- **Get Historical Funding** - Get historical funding rate data

### Account (Authenticated)
- **Get Account Info** - Get account balance, equity, margin details
- **Get Trade History** - Get historical trade records

### Orders (Authenticated + Signing)
- **Create Market Order** - Place immediate market orders with slippage control
- **Create Limit Order** - Place limit orders with GTC, IOC, ALO, or TOB time-in-force
- **Cancel Order** - Cancel a specific order by ID or client order ID
- **Cancel All Orders** - Cancel all open orders (optionally filtered by symbols)
- **Get Open Orders** - Get all currently open orders

### Positions (Authenticated)
- **Get Positions** - Get all open positions
- **Update Leverage** - Update leverage for a symbol
- **Update Margin Mode** - Switch between cross and isolated margin
- **Close Position** - Close a position with a market order

### Subaccounts (Authenticated)
- **Create Subaccount** - Create a new subaccount
- **List Subaccounts** - List all subaccounts
- **Transfer Funds** - Transfer funds between subaccounts

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
