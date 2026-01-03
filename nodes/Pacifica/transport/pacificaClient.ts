import * as crypto from 'crypto';
import {
  PacificaResponse,
  PaginatedResponse,
  MarketInfo,
  PriceInfo,
  OrderbookData,
  Candle,
  RecentTrade,
  FundingHistory,
  AccountInfo,
  Position,
  TradeHistoryEntry,
  OpenOrder,
  OrderResponse,
  StopOrderResponse,
  OrderHistoryEntry,
  EquityHistoryEntry,
  BalanceHistoryEntry,
  AccountFundingEntry,
  WithdrawalResponse,
  SigningOperationType,
} from '../types';

// Base58 alphabet (Bitcoin/Solana style)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to base58 string
 */
function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  // Handle leading zeros
  for (const byte of bytes) {
    if (byte === 0) digits.push(0);
    else break;
  }
  return digits.reverse().map(d => BASE58_ALPHABET[d]).join('');
}

/**
 * Decode base58 string to bytes
 */
function base58Decode(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58 character: ${char}`);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Handle leading '1's (zeros)
  for (const char of str) {
    if (char === '1') bytes.push(0);
    else break;
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * Sort JSON keys recursively (alphabetically)
 */
function sortJsonKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  }
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortJsonKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Ed25519 signing using Node.js crypto
 */
async function ed25519Sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  // Ed25519 private key is 64 bytes (32 bytes seed + 32 bytes public key)
  // or 32 bytes (just the seed)
  let seed: Uint8Array;
  if (privateKey.length === 64) {
    seed = privateKey.slice(0, 32);
  } else if (privateKey.length === 32) {
    seed = privateKey;
  } else {
    throw new Error(`Invalid private key length: ${privateKey.length}. Expected 32 or 64 bytes.`);
  }

  // Create key object from seed
  const keyObject = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'), // Ed25519 private key ASN.1 prefix
      Buffer.from(seed),
    ]),
    format: 'der',
    type: 'pkcs8',
  });

  // Sign the message
  const signature = crypto.sign(null, Buffer.from(message), keyObject);
  return new Uint8Array(signature);
}

/**
 * Derive Ed25519 public key from private key
 */
function derivePublicKey(privateKey: Uint8Array): Uint8Array {
  let seed: Uint8Array;
  if (privateKey.length === 64) {
    // Full keypair: first 32 bytes are seed, last 32 are public key
    return privateKey.slice(32);
  } else if (privateKey.length === 32) {
    seed = privateKey;
  } else {
    throw new Error(`Invalid private key length: ${privateKey.length}`);
  }

  // Create key object and derive public key
  const keyObject = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      Buffer.from(seed),
    ]),
    format: 'der',
    type: 'pkcs8',
  });

  const publicKeyObject = crypto.createPublicKey(keyObject);
  const publicKeyDer = publicKeyObject.export({ format: 'der', type: 'spki' });
  // Ed25519 public key is the last 32 bytes of the SPKI DER encoding
  return new Uint8Array(publicKeyDer.slice(-32));
}

export class PacificaClient {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;
  private baseUrl: string;
  private accountAddress: string;
  private agentWalletAddress: string;

  constructor(
    agentPrivateKeyBase58: string,
    accountAddress: string,
    agentWalletAddress: string,
    isMainnet: boolean = true
  ) {
    // Decode base58 private key
    this.privateKey = base58Decode(agentPrivateKeyBase58);
    this.publicKey = derivePublicKey(this.privateKey);
    this.accountAddress = accountAddress;
    this.agentWalletAddress = agentWalletAddress;
    this.baseUrl = isMainnet
      ? 'https://api.pacifica.fi'
      : 'https://test-api.pacifica.fi';
  }

  // ========== Signing Methods ==========

  /**
   * Prepare message for signing (Pacifica format)
   */
  private prepareMessage(
    operationType: SigningOperationType,
    payload: Record<string, unknown>,
    timestamp: number,
    expiryWindow: number
  ): string {
    const data = {
      type: operationType,
      timestamp,
      expiry_window: expiryWindow,
      data: payload,
    };

    // Sort keys recursively and stringify with compact format
    const sorted = sortJsonKeys(data);
    return JSON.stringify(sorted, null, 0).replace(/\n/g, '');
  }

  /**
   * Sign a message with the agent private key
   */
  private async signMessage(message: string): Promise<string> {
    const messageBytes = new TextEncoder().encode(message);
    const signature = await ed25519Sign(messageBytes, this.privateKey);
    return base58Encode(signature);
  }

  /**
   * Create signed request body
   */
  private async createSignedRequest(
    payload: Record<string, unknown>,
    operationType: SigningOperationType
  ): Promise<Record<string, unknown>> {
    const timestamp = Date.now();
    const expiryWindow = 5000; // 5 seconds

    const message = this.prepareMessage(operationType, payload, timestamp, expiryWindow);
    const signature = await this.signMessage(message);

    return {
      account: this.accountAddress,
      signature,
      timestamp,
      expiry_window: expiryWindow,
      agent_wallet: this.agentWalletAddress,
      ...payload,
    };
  }

  // ========== HTTP Methods ==========

  private async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.append(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GET ${endpoint} failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    requiresAuth: boolean = false,
    operationType?: SigningOperationType
  ): Promise<T> {
    let requestBody = body;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth && operationType) {
      requestBody = await this.createSignedRequest(body, operationType);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`POST ${endpoint} failed: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ========== Market Data Methods (Public) ==========

  /**
   * Get market info for all trading pairs
   */
  async getMarketInfo(): Promise<PacificaResponse<MarketInfo[]>> {
    return this.get('/api/v1/info');
  }

  /**
   * Get price information for all symbols
   */
  async getPrices(): Promise<PacificaResponse<PriceInfo[]>> {
    return this.get('/api/v1/info/prices');
  }

  /**
   * Get orderbook for a symbol
   */
  async getOrderbook(symbol: string, aggLevel: number = 1): Promise<PacificaResponse<OrderbookData>> {
    return this.get('/api/v1/book', {
      symbol,
      agg_level: aggLevel.toString(),
    });
  }

  /**
   * Get historical candles
   */
  async getCandles(
    symbol: string,
    interval: string,
    startTime: number,
    endTime?: number
  ): Promise<PacificaResponse<Candle[]>> {
    const params: Record<string, string> = {
      symbol,
      interval,
      start_time: startTime.toString(),
    };
    if (endTime) {
      params.end_time = endTime.toString();
    }
    return this.get('/api/v1/kline', params);
  }

  /**
   * Get recent trades for a symbol
   */
  async getRecentTrades(symbol: string): Promise<PacificaResponse<RecentTrade[]>> {
    return this.get('/api/v1/trades', { symbol });
  }

  /**
   * Get historical funding rates
   */
  async getHistoricalFunding(
    symbol: string,
    limit: number = 100,
    cursor?: string
  ): Promise<PaginatedResponse<FundingHistory[]>> {
    const params: Record<string, string> = {
      symbol,
      limit: limit.toString(),
    };
    if (cursor) {
      params.cursor = cursor;
    }
    return this.get('/api/v1/funding_rate/history', params);
  }

  // ========== Account Methods (Authenticated) ==========

  /**
   * Get account info
   */
  async getAccountInfo(): Promise<PacificaResponse<AccountInfo>> {
    return this.get('/api/v1/account', {
      account: this.accountAddress,
    });
  }

  /**
   * Get open positions
   */
  async getPositions(): Promise<PacificaResponse<Position[]>> {
    return this.get('/api/v1/positions', {
      account: this.accountAddress,
    });
  }

  /**
   * Get trade history
   */
  async getTradeHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100,
    cursor?: number
  ): Promise<PaginatedResponse<TradeHistoryEntry[]>> {
    const params: Record<string, string> = {
      account: this.accountAddress,
      limit: limit.toString(),
    };
    if (symbol) params.symbol = symbol;
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();
    if (cursor) params.cursor = cursor.toString();

    return this.get('/api/v1/trades/history', params);
  }

  // ========== Order Methods (Authenticated + Signing) ==========

  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<PacificaResponse<OpenOrder[]>> {
    return this.get('/api/v1/orders', {
      account: this.accountAddress,
    });
  }

  /**
   * Create a market order
   */
  async createMarketOrder(
    symbol: string,
    side: 'bid' | 'ask',
    amount: string,
    slippagePercent: string,
    reduceOnly: boolean = false,
    clientOrderId?: string,
    takeProfit?: { stop_price: string; limit_price?: string },
    stopLoss?: { stop_price: string; limit_price?: string }
  ): Promise<OrderResponse> {
    const payload: Record<string, unknown> = {
      symbol,
      side,
      amount,
      slippage_percent: slippagePercent,
      reduce_only: reduceOnly,
    };

    if (clientOrderId) payload.client_order_id = clientOrderId;
    if (takeProfit) payload.take_profit = takeProfit;
    if (stopLoss) payload.stop_loss = stopLoss;

    return this.post('/api/v1/orders/create_market', payload, true, 'create_market_order');
  }

  /**
   * Create a limit order
   */
  async createLimitOrder(
    symbol: string,
    side: 'bid' | 'ask',
    price: string,
    amount: string,
    tif: 'GTC' | 'IOC' | 'ALO' | 'TOB',
    reduceOnly: boolean = false,
    clientOrderId?: string,
    takeProfit?: { stop_price: string; limit_price?: string },
    stopLoss?: { stop_price: string; limit_price?: string }
  ): Promise<OrderResponse> {
    const payload: Record<string, unknown> = {
      symbol,
      side,
      price,
      amount,
      tif,
      reduce_only: reduceOnly,
    };

    if (clientOrderId) payload.client_order_id = clientOrderId;
    if (takeProfit) payload.take_profit = takeProfit;
    if (stopLoss) payload.stop_loss = stopLoss;

    return this.post('/api/v1/orders/create', payload, true, 'create_order');
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    symbol: string,
    orderId?: number,
    clientOrderId?: string
  ): Promise<{ success: boolean }> {
    const payload: Record<string, unknown> = {
      symbol,
    };

    if (orderId) payload.order_id = orderId;
    if (clientOrderId) payload.client_order_id = clientOrderId;

    return this.post('/api/v1/orders/cancel', payload, true, 'cancel_order');
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(symbols?: string[], excludeReduceOnly: boolean = false): Promise<{ success: boolean }> {
    const payload: Record<string, unknown> = {
      all_symbols: !symbols || symbols.length === 0,
      exclude_reduce_only: excludeReduceOnly,
    };
    if (symbols && symbols.length > 0) {
      payload.symbols = symbols;
    }

    return this.post('/api/v1/orders/cancel_all', payload, true, 'cancel_all_orders');
  }

  // ========== Position Management ==========

  /**
   * Update leverage for a symbol
   */
  async updateLeverage(
    symbol: string,
    leverage: number
  ): Promise<{ success: boolean }> {
    const payload = {
      symbol,
      leverage,
    };

    return this.post('/api/v1/account/leverage', payload, true, 'update_leverage');
  }

  /**
   * Update margin mode
   */
  async updateMarginMode(
    symbol: string,
    marginMode: 'cross' | 'isolated'
  ): Promise<{ success: boolean }> {
    const payload = {
      symbol,
      margin_mode: marginMode,
    };

    return this.post('/api/v1/account/margin_mode', payload, true, 'update_margin_mode');
  }

  // ========== Subaccount Methods ==========

  /**
   * Create a subaccount
   */
  async createSubaccount(name: string): Promise<{ subaccount_id: string }> {
    return this.post('/api/v1/subaccounts/create', { name }, true, 'create_subaccount');
  }

  /**
   * List subaccounts
   */
  async listSubaccounts(): Promise<PacificaResponse<Array<{ id: string; name: string }>>> {
    return this.get('/api/v1/subaccounts', {
      account: this.accountAddress,
    });
  }

  /**
   * Transfer funds between subaccounts
   */
  async transferFunds(
    fromAccount: string,
    toAccount: string,
    amount: string
  ): Promise<{ success: boolean }> {
    return this.post(
      '/api/v1/subaccounts/transfer',
      {
        from_account: fromAccount,
        to_account: toAccount,
        amount,
      },
      true,
      'transfer'
    );
  }

  // ========== Stop Orders ==========

  /**
   * Create a stop market order
   */
  async createStopMarketOrder(
    symbol: string,
    side: 'bid' | 'ask',
    amount: string,
    stopPrice: string,
    slippagePercent: string,
    reduceOnly: boolean = false,
    clientOrderId?: string
  ): Promise<StopOrderResponse> {
    const stopOrder: Record<string, unknown> = {
      stop_price: stopPrice,
      amount,
      slippage_percent: slippagePercent,
    };

    if (clientOrderId) stopOrder.client_order_id = clientOrderId;

    const payload: Record<string, unknown> = {
      symbol,
      side,
      reduce_only: reduceOnly,
      stop_order: stopOrder,
    };

    return this.post('/api/v1/orders/stop/create', payload, true, 'create_stop_order');
  }

  /**
   * Create a stop limit order
   */
  async createStopLimitOrder(
    symbol: string,
    side: 'bid' | 'ask',
    amount: string,
    stopPrice: string,
    limitPrice: string,
    reduceOnly: boolean = false,
    clientOrderId?: string
  ): Promise<StopOrderResponse> {
    // Note: Stop orders do not support TIF (time-in-force) parameter
    const stopOrder: Record<string, unknown> = {
      stop_price: stopPrice,
      limit_price: limitPrice,
      amount,
    };

    if (clientOrderId) stopOrder.client_order_id = clientOrderId;

    const payload: Record<string, unknown> = {
      symbol,
      side,
      reduce_only: reduceOnly,
      stop_order: stopOrder,
    };

    return this.post('/api/v1/orders/stop/create', payload, true, 'create_stop_order');
  }

  /**
   * Create TP/SL for an existing position
   */
  async createPositionTpSl(
    symbol: string,
    takeProfit?: { stop_price: string; limit_price?: string },
    stopLoss?: { stop_price: string; limit_price?: string }
  ): Promise<{ success: boolean }> {
    const payload: Record<string, unknown> = {
      symbol,
    };

    if (takeProfit) payload.take_profit = takeProfit;
    if (stopLoss) payload.stop_loss = stopLoss;

    return this.post('/api/v1/orders/tp_sl', payload, true, 'set_tp_sl');
  }

  /**
   * Cancel a stop order
   */
  async cancelStopOrder(
    symbol: string,
    stopOrderId?: number,
    clientOrderId?: string
  ): Promise<{ success: boolean }> {
    const payload: Record<string, unknown> = {
      symbol,
    };

    if (stopOrderId) payload.stop_order_id = stopOrderId;
    if (clientOrderId) payload.client_order_id = clientOrderId;

    return this.post('/api/v1/orders/stop/cancel', payload, true, 'cancel_stop_order');
  }

  // ========== Order History ==========

  /**
   * Get order history
   */
  async getOrderHistory(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100,
    cursor?: number
  ): Promise<PaginatedResponse<OrderHistoryEntry[]>> {
    const params: Record<string, string> = {
      account: this.accountAddress,
      limit: limit.toString(),
    };
    if (symbol) params.symbol = symbol;
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();
    if (cursor) params.cursor = cursor.toString();

    return this.get('/api/v1/orders/history', params);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number): Promise<PacificaResponse<OrderHistoryEntry>> {
    return this.get(`/api/v1/orders/${orderId}`, {
      account: this.accountAddress,
    });
  }

  // ========== Batch Orders ==========

  /**
   * Submit batch orders (up to 10 actions)
   */
  async batchOrders(
    actions: Array<{
      type: 'create_limit' | 'create_market' | 'cancel';
      symbol: string;
      side?: 'bid' | 'ask';
      amount?: string;
      price?: string;
      slippage_percent?: string;
      tif?: 'GTC' | 'IOC' | 'ALO' | 'TOB';
      reduce_only?: boolean;
      order_id?: number;
      client_order_id?: string;
    }>
  ): Promise<{ results: Array<{ success: boolean; order_id?: number; error?: string }> }> {
    // Build signed actions
    const signedActions = await Promise.all(
      actions.map(async (action) => {
        const payload: Record<string, unknown> = {
          symbol: action.symbol,
        };

        if (action.type === 'create_limit') {
          payload.side = action.side;
          payload.amount = action.amount;
          payload.price = action.price;
          payload.tif = action.tif || 'GTC';
          payload.reduce_only = action.reduce_only || false;
          if (action.client_order_id) payload.client_order_id = action.client_order_id;

          return {
            type: 'Create',
            data: await this.createSignedRequest(payload, 'create_order'),
          };
        } else if (action.type === 'create_market') {
          payload.side = action.side;
          payload.amount = action.amount;
          payload.slippage_percent = action.slippage_percent || '0.5';
          payload.reduce_only = action.reduce_only || false;
          if (action.client_order_id) payload.client_order_id = action.client_order_id;

          return {
            type: 'Create',
            data: await this.createSignedRequest(payload, 'create_market_order'),
          };
        } else {
          // Cancel
          if (action.order_id) payload.order_id = action.order_id;
          if (action.client_order_id) payload.client_order_id = action.client_order_id;

          return {
            type: 'Cancel',
            data: await this.createSignedRequest(payload, 'cancel_order'),
          };
        }
      })
    );

    return this.post('/api/v1/orders/batch', { actions: signedActions }, false);
  }

  // ========== Withdrawal ==========

  /**
   * Request a withdrawal
   */
  async requestWithdrawal(amount: string): Promise<WithdrawalResponse> {
    const payload = {
      amount,
    };

    return this.post('/api/v1/account/withdraw', payload, true, 'withdraw');
  }

  // ========== Account Histories ==========

  /**
   * Get equity history
   */
  async getEquityHistory(
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<PaginatedResponse<EquityHistoryEntry[]>> {
    const params: Record<string, string> = {
      account: this.accountAddress,
      limit: limit.toString(),
    };
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();

    return this.get('/api/v1/account/equity_history', params);
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<PaginatedResponse<BalanceHistoryEntry[]>> {
    const params: Record<string, string> = {
      account: this.accountAddress,
      limit: limit.toString(),
    };
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();

    return this.get('/api/v1/account/balance_history', params);
  }

  /**
   * Get account funding history
   */
  async getAccountFunding(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<PaginatedResponse<AccountFundingEntry[]>> {
    const params: Record<string, string> = {
      account: this.accountAddress,
      limit: limit.toString(),
    };
    if (symbol) params.symbol = symbol;
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();

    return this.get('/api/v1/account/funding', params);
  }

  // ========== Getters ==========

  get address(): string {
    return this.accountAddress;
  }

  get agentAddress(): string {
    return this.agentWalletAddress;
  }

  get signerPublicKey(): string {
    return base58Encode(this.publicKey);
  }
}
