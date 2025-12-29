# New Features - v0.2.0

## Summary

Major feature release adding Stop Orders, Order History, Batch Orders, Withdrawals, and Account Histories.

---

## 1. Stop Orders + TP/SL

### Create Stop Market Order
Trigger a market order when price reaches stop level.

**Parameters:**
- `Symbol` - Trading pair (BTC, ETH, etc.)
- `Side` - Buy/Long or Sell/Short
- `Amount` - Order size
- `Stop Price` - Trigger price
- `Slippage %` - Max slippage tolerance
- `Reduce Only` - Only reduce existing position
- `Client Order ID` - Optional custom ID

### Create Stop Limit Order
Trigger a limit order when price reaches stop level.

**Parameters:**
- `Symbol`, `Side`, `Amount`, `Stop Price`
- `Price` - Limit price after trigger
- `Time In Force` - GTC, IOC, ALO, TOB
- `Reduce Only`, `Client Order ID`

### Create Position TP/SL
Set Take Profit and/or Stop Loss for an existing position.

**Parameters:**
- `Symbol` - Position symbol
- `Take Profit Price` - TP trigger price
- `Take Profit Limit Price` - Optional limit (market if empty)
- `Stop Loss Price` - SL trigger price
- `Stop Loss Limit Price` - Optional limit (market if empty)

### Cancel Stop Order
Cancel a pending stop order.

**Parameters:**
- `Symbol`
- `Stop Order ID` or `Client Order ID`

---

## 2. Order History

### Get Order History
Retrieve historical orders with filters.

**Parameters:**
- `Symbol` - Filter by trading pair (optional)
- `Limit` - Max records (default 100)

**Returns:** Array of orders with status, fills, timestamps.

### Get Order By ID
Get details for a specific order.

**Parameters:**
- `Order ID` - Exchange order ID

---

## 3. Batch Orders

### Batch Orders
Submit multiple orders in a single request (max 10).

**Parameter:**
- `Batch Actions (JSON)` - Array of action objects

**Action Format:**
```json
[
  {
    "type": "create_limit",
    "symbol": "BTC",
    "side": "bid",
    "amount": "0.01",
    "price": "85000",
    "tif": "GTC"
  },
  {
    "type": "create_market",
    "symbol": "ETH",
    "side": "ask",
    "amount": "0.1",
    "slippage_percent": "0.5"
  },
  {
    "type": "cancel",
    "symbol": "SOL",
    "order_id": 123456
  }
]
```

**Supported Types:**
- `create_limit` - Create limit order
- `create_market` - Create market order
- `cancel` - Cancel order

---

## 4. Withdrawal

### Request Withdrawal
Request a withdrawal from your account.

**Parameters:**
- `Withdrawal Amount` - Amount in USD to withdraw

**Note:** Withdrawal is processed on-chain and may take time.

---

## 5. Account Histories

### Get Equity History
Track account equity over time.

**Parameters:**
- `Start Time (ms)` - Filter start
- `End Time (ms)` - Filter end
- `Limit` - Max records

**Returns:** Array of equity snapshots with timestamps.

### Get Balance History
Track balance changes (deposits, withdrawals, PnL).

**Parameters:**
- `Start Time (ms)`, `End Time (ms)`, `Limit`

**Returns:** Array of balance changes with reasons.

### Get Account Funding
Track funding payments received/paid.

**Parameters:**
- `Symbol` - Filter by trading pair (optional)
- `Start Time (ms)`, `End Time (ms)`, `Limit`

**Returns:** Array of funding payments with rates and positions.

---

## Use Cases

### Automated Trading with Risk Management
```
1. Create Market Order (enter position)
2. Create Position TP/SL (set exit points)
3. Monitor via Get Open Orders
```

### Grid Trading with Batch Orders
```
1. Define grid levels
2. Submit all orders via Batch Orders
3. Monitor fills via Order History
```

### Portfolio Tracking
```
1. Get Equity History (performance over time)
2. Get Account Funding (funding impact)
3. Get Balance History (deposit/withdrawal tracking)
```

---

## Published

- **npm:** `n8n-nodes-pacifica@0.2.0`
- **GitHub:** https://github.com/maxwellmelo/n8n-nodes-pacifica
