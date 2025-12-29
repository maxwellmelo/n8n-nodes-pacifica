# n8n-nodes-pacifica - Project Plan

## Overview

This document outlines the planned structure and implementation for the Pacifica n8n community node, based on the n8n-nodes-hyperliquid project as a reference.

## Project Structure

```
n8n-nodes-pacifica/
├── credentials/
│   └── PacificaApi.credentials.ts       # API credentials definition
├── nodes/
│   └── Pacifica/
│       ├── Pacifica.node.ts             # Main node implementation
│       ├── Pacifica.node.json           # Node metadata
│       ├── pacifica.svg                 # Node icon
│       ├── transport/
│       │   └── pacificaClient.ts        # API client
│       └── types/
│           └── index.ts                 # TypeScript interfaces
├── docs/
│   ├── PACIFICA_API_DOCUMENTATION.md    # API documentation
│   └── PROJECT_PLAN.md                  # This file
├── .eslintrc.js                         # ESLint configuration
├── .gitignore                           # Git ignore rules
├── gulpfile.js                          # Gulp tasks for icons
├── package.json                         # NPM configuration
├── tsconfig.json                        # TypeScript configuration
├── README.md                            # Project documentation
├── CHANGELOG.md                         # Version history
├── LICENSE                              # MIT License
└── index.js                             # Entry point
```

## Credential Fields

### PacificaApi.credentials.ts

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| network | options | Yes | Mainnet / Testnet |
| accountAddress | string | Yes | User's wallet public key |
| agentWalletAddress | string | Yes | API Agent public key |
| agentPrivateKey | string (password) | Yes | API Agent private key for signing |

## Node Resources & Operations

### 1. Market Data Resource (Public)

| Operation | API Endpoint | Description |
|-----------|--------------|-------------|
| getMarketInfo | GET /api/v1/info | Get all market specifications |
| getPrices | GET /api/v1/info/prices | Get price info for all symbols |
| getOrderbook | GET /api/v1/book | Get orderbook for a symbol |
| getCandles | GET /api/v1/kline | Get historical candles |
| getRecentTrades | GET /api/v1/trades | Get recent trades |
| getHistoricalFunding | GET /api/v1/funding_rate/history | Get funding history |

### 2. Account Resource (Authenticated)

| Operation | API Endpoint | Description |
|-----------|--------------|-------------|
| getAccountInfo | GET /api/v1/account | Get account details |
| getPositions | GET /api/v1/positions | Get open positions |
| getTradeHistory | GET /api/v1/trades/history | Get trade history |

### 3. Order Resource (Authenticated + Signing)

| Operation | API Endpoint | Description |
|-----------|--------------|-------------|
| createMarketOrder | POST /api/v1/orders/create_market | Place market order |
| createLimitOrder | POST /api/v1/orders/create | Place limit order |
| cancelOrder | POST /api/v1/orders/cancel | Cancel specific order |
| cancelAllOrders | POST /api/v1/orders/cancel_all | Cancel all orders |
| getOpenOrders | GET /api/v1/orders | Get open orders |
| getOrderHistory | GET /api/v1/orders/history | Get order history |

### 4. Subaccount Resource (Authenticated)

| Operation | API Endpoint | Description |
|-----------|--------------|-------------|
| createSubaccount | POST /api/v1/subaccounts/create | Create subaccount |
| listSubaccounts | GET /api/v1/subaccounts | List subaccounts |
| transferFunds | POST /api/v1/subaccounts/transfer | Transfer between subaccounts |

## Implementation Phases

### Phase 1: Project Setup
- [x] Create folder structure
- [x] Document API
- [ ] Setup package.json with n8n configuration
- [ ] Setup tsconfig.json
- [ ] Setup build tools (gulp, eslint)

### Phase 2: Credentials
- [ ] Implement PacificaApi.credentials.ts
- [ ] Network selection (mainnet/testnet)
- [ ] Wallet address fields
- [ ] Private key handling

### Phase 3: Transport Layer
- [ ] Implement pacificaClient.ts
- [ ] REST API methods
- [ ] Request signing logic
- [ ] Error handling

### Phase 4: Types
- [ ] Define all API request/response interfaces
- [ ] Order types
- [ ] Position types
- [ ] Market data types

### Phase 5: Node Implementation
- [ ] Implement Pacifica.node.ts
- [ ] All resource/operation combinations
- [ ] Input/output handling
- [ ] Error handling with NodeOperationError

### Phase 6: Metadata & Polish
- [ ] Create Pacifica.node.json
- [ ] Create pacifica.svg icon
- [ ] README.md
- [ ] CHANGELOG.md

## Key Differences from Hyperliquid

| Aspect | Hyperliquid | Pacifica |
|--------|-------------|----------|
| Auth | Private key + wallet type | Agent wallet + private key |
| Signing | EIP-712 typed data | Similar but different operation types |
| Order TIF | GTC, ALO, IOC | GTC, IOC, ALO, TOB |
| API Base | api.hyperliquid.xyz | api.pacifica.fi |
| WebSocket | wss://api.hyperliquid.xyz/ws | wss://ws.pacifica.fi/ws |
| Subaccounts | Not supported | Supported |
| Order Sides | Buy/Sell | Bid/Ask |

## Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.9.0"
  },
  "devDependencies": {
    "n8n-workflow": "*",
    "typescript": "~5.4.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "gulp": "^4.0.2",
    "@types/node": "^22.0.0"
  }
}
```

## API Authentication Flow

1. User creates Agent Wallet at https://app.pacifica.fi/apikey
2. User configures credentials in n8n:
   - Account Address (main wallet)
   - Agent Wallet Address (API agent public key)
   - Agent Private Key (for signing)
3. For authenticated requests:
   - Sign payload with Agent Private Key
   - Include `account` parameter (main wallet)
   - Include `agent_wallet` header (agent public key)
   - Include `signature` in request body

## Request Signing Implementation

```typescript
// Pseudo-code for signing
async function signRequest(
  agentPrivateKey: string,
  payload: object,
  operationType: string
): Promise<string> {
  const wallet = new ethers.Wallet(agentPrivateKey);
  const message = createSigningMessage(payload, operationType);
  const signature = await wallet.signMessage(message);
  return signature;
}
```

## Testing Recommendations

1. Use Testnet first (https://test-api.pacifica.fi)
2. Test public endpoints without authentication
3. Generate test Agent Wallet keys
4. Test order operations with small amounts
5. Verify all error handling paths

---

*Plan created on December 29, 2025*
