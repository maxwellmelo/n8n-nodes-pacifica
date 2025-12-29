import { ethers } from 'ethers';
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
  SigningOperationType,
} from '../types';

export class PacificaClient {
  private wallet: ethers.Wallet;
  private baseUrl: string;
  private accountAddress: string;
  private agentWalletAddress: string;

  constructor(
    agentPrivateKey: string,
    accountAddress: string,
    agentWalletAddress: string,
    isMainnet: boolean = true
  ) {
    this.wallet = new ethers.Wallet(agentPrivateKey);
    this.accountAddress = accountAddress;
    this.agentWalletAddress = agentWalletAddress;
    this.baseUrl = isMainnet
      ? 'https://api.pacifica.fi'
      : 'https://test-api.pacifica.fi';
  }

  // ========== Signing Methods ==========

  /**
   * Create signature for authenticated requests
   */
  private async signRequest(
    payload: Record<string, unknown>,
    operationType: SigningOperationType
  ): Promise<string> {
    // Create the message to sign based on Pacifica's signing requirements
    const timestamp = Date.now();
    const message = JSON.stringify({
      ...payload,
      timestamp,
      operation_type: operationType,
    });

    // Sign the message
    const signature = await this.wallet.signMessage(message);
    return signature;
  }

  /**
   * Create signed request body
   */
  private async createSignedRequest(
    payload: Record<string, unknown>,
    operationType: SigningOperationType
  ): Promise<Record<string, unknown>> {
    const timestamp = Date.now();
    const dataToSign = {
      ...payload,
      timestamp,
      account: this.accountAddress,
    };

    const signature = await this.signRequest(dataToSign, operationType);

    return {
      ...dataToSign,
      signature,
      agent_wallet: this.agentWalletAddress,
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
      headers['agent_wallet'] = this.agentWalletAddress;
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

    return this.post('/api/v1/orders/create', payload, true, 'create_limit_order');
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
  async cancelAllOrders(symbols?: string[]): Promise<{ success: boolean }> {
    const payload: Record<string, unknown> = {};
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
    leverage: number,
    marginMode: 'cross' | 'isolated'
  ): Promise<{ success: boolean }> {
    const payload = {
      symbol,
      leverage,
      margin_mode: marginMode,
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
      'transfer_funds'
    );
  }

  // ========== Getters ==========

  get address(): string {
    return this.accountAddress;
  }

  get agentAddress(): string {
    return this.agentWalletAddress;
  }

  get signerAddress(): string {
    return this.wallet.address;
  }
}
