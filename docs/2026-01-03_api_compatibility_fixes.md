# API Compatibility Fixes - 2026-01-03

## Summary
Major fixes to ensure all API calls match the official Pacifica API documentation.

---

## Version 0.4.1

### Fixed: Cancel All Orders - Field Name

**File:** `nodes/Pacifica/transport/pacificaClient.ts`

**Before:**
```typescript
async cancelAllOrders(symbols?: string[], excludeReduceOnly: boolean = false) {
  const payload = {
    all_symbols: !symbols || symbols.length === 0,
    exclude_reduce_only: excludeReduceOnly,
  };
  if (symbols && symbols.length > 0) {
    payload.symbols = symbols;  // ❌ Wrong: array field
  }
}
```

**After:**
```typescript
async cancelAllOrders(symbol?: string, excludeReduceOnly: boolean = false) {
  const payload = {
    all_symbols: !symbol,
    exclude_reduce_only: excludeReduceOnly,
  };
  if (symbol) {
    payload.symbol = symbol;  // ✓ Correct: singular string
  }
}
```

**Why:** API expects `symbol` (singular string), not `symbols` (array).

---

## Version 0.4.0

### Breaking Change: Subaccount Operations Removed

**Reason:** Pacifica API requires dual-signature authentication for subaccount operations:
- `main_signature` - Signed by main account
- `sub_signature` - Signed by subaccount

This is incompatible with n8n's single credential model which only has one private key (agent wallet).

**Removed Operations:**
- Create Subaccount
- List Subaccounts
- Transfer Funds

---

### Fixed: Update Margin Mode

**File:** `nodes/Pacifica/transport/pacificaClient.ts`

**Before:**
```typescript
async updateMarginMode(symbol: string, marginMode: 'cross' | 'isolated') {
  const payload = {
    symbol,
    margin_mode: marginMode,  // ❌ Wrong field name
  };
  return this.post('/api/v1/account/margin_mode', ...);  // ❌ Wrong endpoint
}
```

**After:**
```typescript
async updateMarginMode(symbol: string, isIsolated: boolean) {
  const payload = {
    symbol,
    is_isolated: isIsolated,  // ✓ Correct: boolean field
  };
  return this.post('/api/v1/account/margin', ...);  // ✓ Correct endpoint
}
```

**Why:**
- API uses `is_isolated` (boolean), not `margin_mode` (string)
- Endpoint is `/api/v1/account/margin`, not `/api/v1/account/margin_mode`

---

### Fixed: Cancel Stop Order

**File:** `nodes/Pacifica/transport/pacificaClient.ts`

**Before:**
```typescript
if (stopOrderId) payload.stop_order_id = stopOrderId;  // ❌ Wrong field
```

**After:**
```typescript
if (orderId) payload.order_id = orderId;  // ✓ Correct field
```

**Why:** API uses `order_id` for all order cancellations, including stop orders.

---

### Fixed: Position TP/SL

**File:** `nodes/Pacifica/transport/pacificaClient.ts`

**Before:**
```typescript
return this.post('/api/v1/orders/tp_sl', payload, true, 'set_tp_sl');
// ❌ Wrong endpoint and signing type
```

**After:**
```typescript
return this.post('/api/v1/positions/tpsl', payload, true, 'set_position_tpsl');
// ✓ Correct endpoint and signing type
```

**Why:**
- Endpoint is `/api/v1/positions/tpsl`, not `/api/v1/orders/tp_sl`
- Signing type is `set_position_tpsl`, not `set_tp_sl`

---

## Version 0.3.7

### Fixed: Stop Limit Orders - TIF Parameter

**File:** `nodes/Pacifica/transport/pacificaClient.ts`

**Before:**
```typescript
const stopOrder = {
  stop_price: stopPrice,
  limit_price: limitPrice,
  amount,
  tif,  // ❌ Not supported for stop orders
};
```

**After:**
```typescript
const stopOrder = {
  stop_price: stopPrice,
  limit_price: limitPrice,
  amount,
  // tif removed - not supported for stop orders
};
```

**Why:** Stop orders do not support TIF (time-in-force) parameter. Including it caused signature verification failure.

---

## Version 0.3.6

### Fixed: Close Position - Side Detection

**File:** `nodes/Pacifica/Pacifica.node.ts`

**Before:**
```typescript
const positionSize = parseFloat(position.amount);
const isLong = positionSize > 0;  // ❌ Wrong: amount is always positive
```

**After:**
```typescript
const isLong = position.side === 'long';  // ✓ Correct: use side field
```

**Why:** Position `amount` is always positive. The `side` field indicates direction ('long' or 'short').

---

## Files Modified

| Version | File | Changes |
|---------|------|---------|
| 0.4.1 | `pacificaClient.ts` | Cancel all orders: symbols → symbol |
| 0.4.1 | `Pacifica.node.ts` | UI updated for single symbol |
| 0.4.0 | `pacificaClient.ts` | Margin mode, cancel stop order, TP/SL fixes |
| 0.4.0 | `Pacifica.node.ts` | Subaccounts removed, margin mode UI |
| 0.4.0 | `types/index.ts` | Signing types updated |
| 0.3.7 | `pacificaClient.ts` | TIF removed from stop orders |
| 0.3.6 | `Pacifica.node.ts` | Close position side fix |

---

## API Documentation Reference

All fixes verified against official documentation:
- https://docs.pacifica.fi/api-documentation/api/rest-api/orders/cancel-all-orders
- https://docs.pacifica.fi/api-documentation/api/rest-api/account/update-margin-mode
- https://docs.pacifica.fi/api-documentation/api/rest-api/orders/cancel-stop-order
- https://docs.pacifica.fi/api-documentation/api/rest-api/orders/create-stop-order
- https://docs.pacifica.fi/api-documentation/api/signing/operation-types
