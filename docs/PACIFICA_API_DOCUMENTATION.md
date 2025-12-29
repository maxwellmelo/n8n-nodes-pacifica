# Pacifica API Documentation

## Overview

Pacifica is a next-generation derivatives trading platform offering perpetual futures trading with AI-powered features. Founded in January 2025, it provides comprehensive REST and WebSocket APIs for programmatic trading.

**Official Documentation:** https://docs.pacifica.fi/

---

## API Base URLs

| Environment | REST API | WebSocket |
|------------|----------|-----------|
| Mainnet | `https://api.pacifica.fi` | `wss://ws.pacifica.fi/ws` |
| Testnet | `https://test-api.pacifica.fi` | `wss://test-ws.pacifica.fi/ws` |

---

## Authentication

### API Agent Keys (Agent Wallets)

Pacifica uses a signature verification system that allows users to trade programmatically without exposing their private keys.

**Key Generation Methods:**
1. Frontend interface: https://app.pacifica.fi/apikey
2. Python SDK: https://github.com/pacifica-fi/python-sdk

**Authentication Requirements for POST Requests:**
1. Use the original wallet's public key for the `account` parameter
2. Use the API Agent Private Key to sign the payload and generate a `signature`
3. Include `agent_wallet: [AGENT_WALLET_PUBLIC_KEY]` in the request header

**Signing Types (by operation):**
- `create_market_order` - For market orders
- `create_limit_order` - For limit orders
- `cancel_order` - For order cancellation
- `create_stop_order` - For stop orders

---

## REST API Endpoints

### Markets Endpoints

#### GET `/api/v1/info` - Get Market Info
Get exchange information including market specifications for all trading pairs.

**Authentication:** Not required

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Trading pair identifier (e.g., "ETH", "BTC") |
| tick_size | decimal | Price increment denominator |
| min_tick | decimal | Floor price boundary |
| max_tick | decimal | Ceiling price boundary |
| lot_size | decimal | Order size increment |
| max_leverage | integer | Maximum leverage allowed |
| isolated_only | boolean | Isolated-only margin mode |
| min_order_size | decimal | Minimum order size (USD) |
| max_order_size | decimal | Maximum order size (USD) |
| funding_rate | decimal | Current hourly funding rate |
| next_funding_rate | decimal | Projected next-period rate |
| created_at | ISO 8601 | Market listing timestamp |

---

#### GET `/api/v1/info/prices` - Get Prices
Get price information for all symbols.

**Authentication:** Not required

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Trading pair identifier |
| mark | decimal | Current mark price |
| mid | decimal | Average of best bid/ask |
| oracle | decimal | Oracle price value |
| funding | decimal | Funding rate paid in past epoch |
| next_funding | decimal | Estimated next funding rate |
| open_interest | decimal | Current open interest (USD) |
| volume_24h | decimal | 24h volume (USD) |
| yesterday_price | decimal | Oracle price 24h ago |
| timestamp | integer | Time in milliseconds |

---

#### GET `/api/v1/book` - Get Orderbook
Get current orderbook (bid/ask levels) for a symbol.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Trading pair symbol |
| agg_level | integer | No | Aggregation level (default: 1) |

**Response Structure:**
- `s`: Symbol
- `l`: 2D array with bids (index 0) and asks (index 1), up to 10 levels each
- `t`: Timestamp in milliseconds

Each level contains:
- `p`: Price level
- `a`: Amount at price level
- `n`: Number of orders at level

---

#### GET `/api/v1/kline` - Get Candle Data
Get historical price candles.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Trading pair symbol |
| interval | string | Yes | 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d |
| start_time | integer | Yes | Start time (ms) |
| end_time | integer | No | End time (ms), defaults to now |

**Candle Object Fields:**
| Field | Type | Description |
|-------|------|-------------|
| t | number | Candle start time |
| T | number | Candle end time |
| s | string | Symbol |
| i | string | Interval |
| o | decimal | Open price |
| c | decimal | Close price |
| h | decimal | High price |
| l | decimal | Low price |
| v | decimal | Volume |
| n | number | Number of trades |

---

#### GET `/api/v1/trades` - Get Recent Trades
Get recent trades for a specific market.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| symbol | string | Yes |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| event_type | string | "fulfill_taker" or "fulfill_maker" |
| price | decimal | Trade price (USD) |
| amount | decimal | Trade amount |
| side | string | "open_long", "open_short", "close_long", "close_short" |
| cause | string | "normal", "market_liquidation", "backstop_liquidation", "settlement" |
| created_at | integer | Timestamp (ms) |

---

#### GET `/api/v1/funding_rate/history` - Get Historical Funding
Get historical funding rates for a symbol.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Market symbol |
| limit | integer | No | Max records (default: 100, max: 4000) |
| cursor | string | No | Pagination cursor |

**Response Fields:**
- oracle_price, bid_impact_price, ask_impact_price
- funding_rate, next_funding_rate
- created_at
- next_cursor, has_more

---

### Account Endpoints

#### GET `/api/v1/account` - Get Account Info
Get high-level account information.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| account | string | Yes |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| balance | decimal | Current balance (USD before settlement) |
| fee_level | integer | Current fee tier |
| account_equity | decimal | Balance + unrealized PnL |
| available_to_spend | decimal | Available for margin |
| available_to_withdraw | decimal | Available to withdraw |
| pending_balance | decimal | Pending deposits |
| total_margin_used | decimal | Margin in use |
| cross_mmr | decimal | Cross mode maintenance margin |
| positions_count | integer | Open positions count |
| orders_count | integer | Open orders count |
| stop_orders_count | integer | Stop orders count |
| updated_at | integer | Last update (ms) |
| use_ltp_for_stop_orders | boolean | Use last traded price for stops |

---

#### GET `/api/v1/positions` - Get Positions
Get current positions.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| account | string | Yes |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| symbol | string | Trading pair |
| side | string | Position direction |
| amount | decimal | Position size |
| entry_price | decimal | Entry price (VWAP) |
| margin | decimal | Isolated margin |
| funding | decimal | Cumulative funding |
| isolated | boolean | Isolated margin mode |
| created_at | integer | Creation time (ms) |
| updated_at | integer | Last update (ms) |

---

#### GET `/api/v1/trades/history` - Get Trade History
Get historical trades.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | string | Yes | Wallet address |
| symbol | string | No | Filter by symbol |
| start_time | integer | No | Start time (ms) |
| end_time | integer | No | End time (ms) |
| limit | integer | No | Max records (default: 100) |
| cursor | integer | No | Pagination cursor |

**Response includes:** history_id, order_id, client_order_id, symbol, amount, price, entry_price, fee, pnl, event_type, side, cause, created_at

---

### Order Endpoints

#### POST `/api/v1/orders/create_market` - Create Market Order
Create a new market order.

**Request Body:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | string | Yes | Wallet address |
| signature | string | Yes | Cryptographic signature |
| timestamp | integer | Yes | Current time (ms) |
| symbol | string | Yes | Trading pair |
| amount | string | Yes | Order amount |
| side | string | Yes | "bid" or "ask" |
| slippage_percent | string | Yes | Max slippage (e.g., "0.5" = 0.5%) |
| reduce_only | boolean | Yes | Reduce-only flag |
| client_order_id | string | No | Client UUID |
| take_profit | object | No | TP config |
| stop_loss | object | No | SL config |
| agent_wallet | string | No | Agent wallet address |
| expiry_window | integer | No | Signature expiry (ms) |

**Note:** ~200ms delay applies to protect liquidity providers.

---

#### POST `/api/v1/orders/create` - Create Limit Order
Create a new limit order.

**Additional Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| price | string | Yes | Order price |
| tif | string | Yes | Time in force |

**Time-In-Force Options:**
- **GTC** - Good Till Cancelled (~200ms delay)
- **IOC** - Immediate Or Cancel (~200ms delay)
- **ALO** - Post-Only (no delay)
- **TOB** - Time on Book (no delay)

---

#### POST `/api/v1/orders/cancel` - Cancel Order
Cancel a specific order.

**Request Body:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | string | Yes | Wallet address |
| signature | string | Yes | Signature |
| timestamp | integer | Yes | Time (ms) |
| symbol | string | Yes | Trading pair |
| order_id | integer | Conditional | Exchange order ID |
| client_order_id | string | Conditional | Client UUID |

**Note:** Either order_id OR client_order_id required.

---

#### GET `/api/v1/orders` - Get Open Orders
Get all open orders.

**Query Parameters:**
| Parameter | Type | Required |
|-----------|------|----------|
| account | string | Yes |

**Order Types:** limit, market, stop_limit, stop_market, take_profit_limit, stop_loss_limit, take_profit_market, stop_loss_market

---

#### POST `/api/v1/orders/batch` - Batch Orders
Submit multiple orders in one request.

**Request Body:**
```json
{
  "actions": [
    {
      "type": "Create" | "Cancel",
      "data": { /* signed request */ }
    }
  ]
}
```

**Constraints:**
- Maximum 10 actions per batch
- Each action individually signed
- ~200ms delay for market/GTC/IOC orders

---

### Subaccount Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v1/subaccounts/create | POST | Create subaccount |
| /api/v1/subaccounts | GET | List subaccounts |
| /api/v1/subaccounts/transfer | POST | Transfer funds |

---

## WebSocket API

### Connection
- **Mainnet:** `wss://ws.pacifica.fi/ws`
- **Testnet:** `wss://test-ws.pacifica.fi/ws`

### Connection Limits
- Closes after 60 seconds of inactivity
- Closes after 24 hours alive

### Message Types

**Subscribe:**
```json
{
  "method": "subscribe",
  "params": { ... }
}
```

**Unsubscribe:**
```json
{
  "method": "unsubscribe",
  "params": { ... }
}
```

**Ping/Pong (Heartbeat):**
```json
{ "method": "ping" }
// Response:
{ "channel": "pong" }
```

### Available Subscriptions
- Prices
- Orderbook
- BBO (Best Bid/Offer)
- Trades
- Candles
- Account balance
- Account margin
- Account leverage
- Account info
- Account positions
- Account orders
- Account order updates
- Account trades

### Trading Operations
- Market orders
- Limit orders
- Batch orders
- Order cancellation
- Edit order (cancels and recreates)

---

## Error Codes

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Business Logic Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

### Business Logic Errors (422)
| Code | Error |
|------|-------|
| 0 | UNKNOWN |
| 1 | ACCOUNT_NOT_FOUND |
| 2 | BOOK_NOT_FOUND |
| 3 | INVALID_TICK_LEVEL |
| 4 | INSUFFICIENT_BALANCE |
| 5 | ORDER_NOT_FOUND |
| 6 | OVER_WITHDRAWAL |
| 7 | INVALID_LEVERAGE |
| 8 | CANNOT_UPDATE_MARGIN |
| 9 | POSITION_NOT_FOUND |
| 10 | POSITION_TPSL_LIMIT_EXCEEDED |

### WebSocket Error Codes
| Code | Error |
|------|-------|
| 200 | SUCCESS |
| 400 | INVALID_REQUEST |
| 401 | INVALID_SIGNATURE |
| 402 | INVALID_SIGNER |
| 403 | UNAUTHORIZED_REQUEST |
| 420 | ENGINE_ERROR |
| 429 | RATE_LIMIT_EXCEEDED |
| 500 | UNKNOWN_ERROR |

---

## Rate Limiting

- API Config Keys can be generated for rate limit management
- Each account can have up to 5 API Config Keys
- Key format: `{8_char_prefix}_{base58_encoded_uuid}`

---

## Python SDK

Official SDK: https://github.com/pacifica-fi/python-sdk

Provides examples for:
- API key generation
- Market order placement
- Order management
- Account operations

---

## n8n Integration Notes

### Recommended Resources for n8n Node

1. **Market Data** (Public - no auth)
   - Get Market Info
   - Get Prices
   - Get Orderbook
   - Get Candles
   - Get Recent Trades
   - Get Historical Funding

2. **Account** (Auth required)
   - Get Account Info
   - Get Positions
   - Get Trade History
   - Get Funding History

3. **Orders** (Auth required with signing)
   - Create Market Order
   - Create Limit Order
   - Create Stop Order
   - Cancel Order
   - Cancel All Orders
   - Get Open Orders
   - Get Order History

4. **Subaccounts** (Auth required)
   - Create Subaccount
   - List Subaccounts
   - Transfer Funds

### Credentials Required
- **Account Address** (Wallet public key)
- **Agent Wallet Address** (API Agent public key)
- **Agent Private Key** (For signing requests)
- **Network** (Mainnet/Testnet selector)

---

*Documentation compiled from https://docs.pacifica.fi/ on December 29, 2025*
