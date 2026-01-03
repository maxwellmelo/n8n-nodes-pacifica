# Documentation Update - 2026-01-03

## Summary
Updated project documentation and fixed unused parameter in pacificaClient.ts.

---

## 1. Fixed: Parameter `tif` not used in `createStopLimitOrder`

### File: `nodes/Pacifica/transport/pacificaClient.ts`

### Before:
```typescript
async createStopLimitOrder(
  symbol: string,
  side: 'bid' | 'ask',
  amount: string,
  stopPrice: string,
  limitPrice: string,
  tif: 'GTC' | 'IOC' | 'ALO' | 'TOB',  // Parameter received but not used
  reduceOnly: boolean = false,
  clientOrderId?: string
): Promise<StopOrderResponse> {
  const stopOrder: Record<string, unknown> = {
    stop_price: stopPrice,
    limit_price: limitPrice,
    amount,
    // tif was missing here!
  };
  // ...
}
```

### After:
```typescript
async createStopLimitOrder(
  symbol: string,
  side: 'bid' | 'ask',
  amount: string,
  stopPrice: string,
  limitPrice: string,
  tif: 'GTC' | 'IOC' | 'ALO' | 'TOB',
  reduceOnly: boolean = false,
  clientOrderId?: string
): Promise<StopOrderResponse> {
  const stopOrder: Record<string, unknown> = {
    stop_price: stopPrice,
    limit_price: limitPrice,
    amount,
    tif,  // Now included in payload
  };
  // ...
}
```

### Why:
The `tif` (Time In Force) parameter was being accepted by the function and passed from the node but was never included in the API payload. This meant stop limit orders were always using the API's default TIF instead of the user's selection.

---

## 2. Updated: README.md

### Added Operations:

**Market Data:**
- Get Symbol Price

**Account:**
- Get Equity History
- Get Balance History
- Get Account Funding
- Request Withdrawal

**Orders:**
- Create Stop Market Order
- Create Stop Limit Order
- Create Position TP/SL
- Create Multi TP/SL
- Cancel Stop Order
- Batch Orders
- Get Order History
- Get Order By ID

### Why:
The README only listed 22 operations from version 0.1.0, but the project now has 30+ operations after versions 0.2.0 through 0.3.4.

---

## 3. Updated: CHANGELOG.md

### Added Versions:
- **0.3.4** - exclude_reduce_only and all_symbols for Cancel All Orders
- **0.3.3** - Stop order side conversion fix (bid/ask)
- **0.3.2** - Stop order position side fix (long/short)
- **0.3.1** - Multi TP/SL operation
- **0.3.0** - Multiple API fixes
- **0.2.1** - Get Symbol Price operation
- **0.2.0** - Major trading features (stop orders, batch, history)
- **0.1.1** - Authentication fix (Solana-style Ed25519 + Base58)

### Why:
The CHANGELOG only documented version 0.1.0, but the project is at version 0.3.4. All intermediate versions needed to be documented for proper version tracking.

---

## Files Modified

| File | Change |
|------|--------|
| `nodes/Pacifica/transport/pacificaClient.ts` | Added `tif` to stop order payload |
| `README.md` | Added 12 missing operations |
| `CHANGELOG.md` | Added versions 0.1.1 through 0.3.4 |
