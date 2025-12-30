// ========== API Response Types ==========

export interface PacificaResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
  code: number | null;
}

export interface PaginatedResponse<T = unknown> extends PacificaResponse<T> {
  next_cursor?: string;
  has_more?: boolean;
}

// ========== Market Data Types ==========

export interface MarketInfo {
  symbol: string;
  tick_size: string;
  min_tick: string;
  max_tick: string;
  lot_size: string;
  max_leverage: number;
  isolated_only: boolean;
  min_order_size: string;
  max_order_size: string;
  funding_rate: string;
  next_funding_rate: string;
  created_at: string;
}

export interface PriceInfo {
  symbol: string;
  mark: string;
  mid: string;
  oracle: string;
  funding: string;
  next_funding: string;
  open_interest: string;
  volume_24h: string;
  yesterday_price: string;
  timestamp: number;
}

export interface OrderbookLevel {
  p: string;  // Price
  a: string;  // Amount
  n: number;  // Number of orders
}

export interface OrderbookData {
  s: string;              // Symbol
  l: OrderbookLevel[][];  // [[bids], [asks]]
  t: string;              // Timestamp
}

export interface Candle {
  t: number;   // Candle start time
  T: number;   // Candle end time
  s: string;   // Symbol
  i: string;   // Interval
  o: string;   // Open price
  c: string;   // Close price
  h: string;   // High price
  l: string;   // Low price
  v: string;   // Volume
  n: number;   // Number of trades
}

export interface RecentTrade {
  event_type: 'fulfill_taker' | 'fulfill_maker';
  price: string;
  amount: string;
  side: 'open_long' | 'open_short' | 'close_long' | 'close_short';
  cause: 'normal' | 'market_liquidation' | 'backstop_liquidation' | 'settlement';
  created_at: number;
}

export interface FundingHistory {
  oracle_price: string;
  bid_impact_price: string;
  ask_impact_price: string;
  funding_rate: string;
  next_funding_rate: string;
  created_at: number;
}

// ========== Account Types ==========

export interface AccountInfo {
  balance: string;
  fee_level: number;
  account_equity: string;
  available_to_spend: string;
  available_to_withdraw: string;
  pending_balance: string;
  total_margin_used: string;
  cross_mmr: string;
  positions_count: number;
  orders_count: number;
  stop_orders_count: number;
  updated_at: number;
  use_ltp_for_stop_orders: boolean;
}

export interface Position {
  symbol: string;
  side: string;
  amount: string;
  entry_price: string;
  margin: string;
  funding: string;
  isolated: boolean;
  created_at: number;
  updated_at: number;
}

export interface TradeHistoryEntry {
  history_id: number;
  order_id: number;
  client_order_id?: string;
  symbol: string;
  amount: string;
  price: string;
  entry_price: string;
  fee: string;
  pnl: string;
  event_type: 'fulfill_taker' | 'fulfill_maker';
  side: 'open_long' | 'open_short' | 'close_long' | 'close_short';
  cause: 'normal' | 'market_liquidation' | 'backstop_liquidation' | 'settlement';
  created_at: number;
}

// ========== Order Types ==========

export type OrderSide = 'bid' | 'ask';
export type TimeInForce = 'GTC' | 'IOC' | 'ALO' | 'TOB';
export type OrderType = 'limit' | 'market' | 'stop_limit' | 'stop_market' |
  'take_profit_limit' | 'stop_loss_limit' | 'take_profit_market' | 'stop_loss_market';

export interface TakeProfitStopLoss {
  stop_price: string;
  limit_price?: string;
  client_order_id?: string;
}

export interface CreateMarketOrderRequest {
  account: string;
  signature: string;
  timestamp: number;
  symbol: string;
  amount: string;
  side: OrderSide;
  slippage_percent: string;
  reduce_only: boolean;
  client_order_id?: string;
  take_profit?: TakeProfitStopLoss;
  stop_loss?: TakeProfitStopLoss;
  agent_wallet?: string;
  expiry_window?: number;
}

export interface CreateLimitOrderRequest {
  account: string;
  signature: string;
  timestamp: number;
  symbol: string;
  price: string;
  amount: string;
  side: OrderSide;
  tif: TimeInForce;
  reduce_only: boolean;
  client_order_id?: string;
  take_profit?: TakeProfitStopLoss;
  stop_loss?: TakeProfitStopLoss;
  agent_wallet?: string;
  expiry_window?: number;
}

export interface CancelOrderRequest {
  account: string;
  signature: string;
  timestamp: number;
  symbol: string;
  order_id?: number;
  client_order_id?: string;
  agent_wallet?: string;
  expiry_window?: number;
}

export interface OpenOrder {
  order_id: number;
  client_order_id?: string;
  symbol: string;
  side: string;
  price: string;
  initial_amount: string;
  filled_amount: string;
  cancelled_amount: string;
  stop_price?: string;
  order_type: OrderType;
  stop_parent_order_id?: number;
  reduce_only: boolean;
  created_at: number;
  updated_at: number;
}

export interface OrderResponse {
  order_id: number;
}

export interface StopOrderResponse {
  stop_order_id: number;
}

export interface OrderHistoryEntry {
  order_id: number;
  client_order_id?: string;
  symbol: string;
  side: string;
  price: string;
  initial_amount: string;
  filled_amount: string;
  cancelled_amount: string;
  stop_price?: string;
  order_type: OrderType;
  reduce_only: boolean;
  status: 'open' | 'filled' | 'cancelled' | 'partially_filled';
  created_at: number;
  updated_at: number;
}

// ========== Account History Types ==========

export interface EquityHistoryEntry {
  equity: string;
  timestamp: number;
}

export interface BalanceHistoryEntry {
  balance: string;
  change: string;
  reason: string;
  timestamp: number;
}

export interface AccountFundingEntry {
  symbol: string;
  funding_rate: string;
  funding_payment: string;
  position_size: string;
  timestamp: number;
}

// ========== Withdrawal Types ==========

export interface WithdrawalResponse {
  withdrawal_id: string;
  amount: string;
  status: string;
  created_at: number;
}

export interface BatchAction {
  type: 'Create' | 'Cancel';
  data: CreateLimitOrderRequest | CreateMarketOrderRequest | CancelOrderRequest;
}

export interface BatchOrderRequest {
  actions: BatchAction[];
}

// ========== Subaccount Types ==========

export interface Subaccount {
  id: string;
  name: string;
  created_at: number;
}

export interface SubaccountTransferRequest {
  from_account: string;
  to_account: string;
  amount: string;
}

// ========== Signing Types ==========

export type SigningOperationType =
  | 'create_order'           // Limit orders → /api/v1/orders/create
  | 'create_market_order'    // Market orders → /api/v1/orders/create_market
  | 'create_stop_order'      // Stop orders → /api/v1/orders/stop
  | 'set_tp_sl'              // TP/SL → /api/v1/orders/tp_sl
  | 'cancel_order'           // Cancel → /api/v1/orders/cancel
  | 'cancel_stop_order'      // Cancel stop → /api/v1/orders/stop/cancel
  | 'cancel_all_orders'      // Cancel all → /api/v1/orders/cancel_all
  | 'update_leverage'        // Leverage → /api/v1/account/leverage
  | 'update_margin_mode'     // Margin mode → /api/v1/account/margin_mode
  | 'withdraw'               // Withdrawal → /api/v1/account/withdraw
  | 'create_subaccount'      // Subaccount → /api/v1/subaccounts/create
  | 'transfer'               // Transfer → /api/v1/subaccounts/transfer
  | 'batch_orders';          // Batch (individual ops signed separately)

export interface SignedRequest {
  account: string;
  signature: string;
  timestamp: number;
  agent_wallet?: string;
  expiry_window?: number;
}

// ========== Error Types ==========

export interface PacificaError {
  error: string;
  code: number;
}

export const ErrorCodes = {
  UNKNOWN: 0,
  ACCOUNT_NOT_FOUND: 1,
  BOOK_NOT_FOUND: 2,
  INVALID_TICK_LEVEL: 3,
  INSUFFICIENT_BALANCE: 4,
  ORDER_NOT_FOUND: 5,
  OVER_WITHDRAWAL: 6,
  INVALID_LEVERAGE: 7,
  CANNOT_UPDATE_MARGIN: 8,
  POSITION_NOT_FOUND: 9,
  POSITION_TPSL_LIMIT_EXCEEDED: 10,
} as const;

export const WebSocketErrorCodes = {
  SUCCESS: 200,
  INVALID_REQUEST: 400,
  INVALID_SIGNATURE: 401,
  INVALID_SIGNER: 402,
  UNAUTHORIZED_REQUEST: 403,
  ENGINE_ERROR: 420,
  RATE_LIMIT_EXCEEDED: 429,
  UNKNOWN_ERROR: 500,
} as const;
