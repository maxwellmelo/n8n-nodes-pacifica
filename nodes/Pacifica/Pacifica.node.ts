import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { PacificaClient } from './transport/pacificaClient';
import {
  PacificaResponse,
  MarketInfo,
  PriceInfo,
  Position,
  AccountInfo,
} from './types';

export class Pacifica implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pacifica',
    name: 'pacifica',
    icon: 'file:pacifica.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Trade perpetuals and query data on Pacifica DEX',
    defaults: {
      name: 'Pacifica',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'pacificaApi',
        required: true,
      },
    ],
    properties: [
      // ========== RESOURCE SELECTOR ==========
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Market Data', value: 'marketData' },
          { name: 'Account', value: 'account' },
          { name: 'Order', value: 'order' },
          { name: 'Position', value: 'position' },
          // Note: Subaccount operations removed - Pacifica API requires dual-signature system not compatible with n8n
        ],
        default: 'marketData',
      },

      // ========== MARKET DATA OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['marketData'] } },
        options: [
          { name: 'Get Market Info', value: 'getMarketInfo', action: 'Get market info for all trading pairs' },
          { name: 'Get Prices', value: 'getPrices', action: 'Get price info for all symbols' },
          { name: 'Get Symbol Price', value: 'getSymbolPrice', action: 'Get price for a specific symbol' },
          { name: 'Get Orderbook', value: 'getOrderbook', action: 'Get orderbook for a symbol' },
          { name: 'Get Candles', value: 'getCandles', action: 'Get historical candle data' },
          { name: 'Get Recent Trades', value: 'getRecentTrades', action: 'Get recent trades for a symbol' },
          { name: 'Get Historical Funding', value: 'getHistoricalFunding', action: 'Get historical funding rates' },
        ],
        default: 'getMarketInfo',
      },

      // Market Data Parameters
      {
        displayName: 'Symbol',
        name: 'symbol',
        type: 'string',
        default: 'BTC',
        placeholder: 'BTC, ETH, SOL...',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getSymbolPrice', 'getOrderbook', 'getCandles', 'getRecentTrades', 'getHistoricalFunding'],
          },
        },
        description: 'Trading pair symbol',
      },
      {
        displayName: 'Interval',
        name: 'interval',
        type: 'options',
        options: [
          { name: '1 Minute', value: '1m' },
          { name: '3 Minutes', value: '3m' },
          { name: '5 Minutes', value: '5m' },
          { name: '15 Minutes', value: '15m' },
          { name: '30 Minutes', value: '30m' },
          { name: '1 Hour', value: '1h' },
          { name: '2 Hours', value: '2h' },
          { name: '4 Hours', value: '4h' },
          { name: '8 Hours', value: '8h' },
          { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' },
        ],
        default: '1h',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'Candle interval',
      },
      {
        displayName: 'Start Time (ms)',
        name: 'startTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'Start timestamp in milliseconds',
      },
      {
        displayName: 'End Time (ms)',
        name: 'endTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandles'],
          },
        },
        description: 'End timestamp in milliseconds (0 = now)',
      },
      {
        displayName: 'Aggregation Level',
        name: 'aggLevel',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getOrderbook'],
          },
        },
        description: 'Price aggregation level for orderbook',
      },
      {
        displayName: 'Limit',
        name: 'fundingLimit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 4000 },
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getHistoricalFunding'],
          },
        },
        description: 'Max number of funding records to return',
      },

      // ========== ACCOUNT OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [
          { name: 'Get Account Info', value: 'getAccountInfo', action: 'Get account info' },
          { name: 'Get Trade History', value: 'getTradeHistory', action: 'Get trade history' },
          { name: 'Get Equity History', value: 'getEquityHistory', action: 'Get account equity history' },
          { name: 'Get Balance History', value: 'getBalanceHistory', action: 'Get account balance history' },
          { name: 'Get Account Funding', value: 'getAccountFunding', action: 'Get account funding payments' },
          { name: 'Request Withdrawal', value: 'requestWithdrawal', action: 'Request a withdrawal' },
        ],
        default: 'getAccountInfo',
      },

      // Account History Parameters
      {
        displayName: 'Symbol (Optional)',
        name: 'tradeSymbol',
        type: 'string',
        default: '',
        placeholder: 'BTC (leave empty for all)',
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory', 'getAccountFunding'],
          },
        },
        description: 'Filter by symbol (optional)',
      },
      {
        displayName: 'Start Time (ms)',
        name: 'tradeStartTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory', 'getEquityHistory', 'getBalanceHistory', 'getAccountFunding'],
          },
        },
        description: 'Start timestamp in milliseconds (0 = no filter)',
      },
      {
        displayName: 'End Time (ms)',
        name: 'tradeEndTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory', 'getEquityHistory', 'getBalanceHistory', 'getAccountFunding'],
          },
        },
        description: 'End timestamp in milliseconds (0 = now)',
      },
      {
        displayName: 'Limit',
        name: 'tradeLimit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 1000 },
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getTradeHistory', 'getEquityHistory', 'getBalanceHistory', 'getAccountFunding'],
          },
        },
        description: 'Maximum number of records to return',
      },
      {
        displayName: 'Withdrawal Amount',
        name: 'withdrawalAmount',
        type: 'string',
        default: '0',
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['requestWithdrawal'],
          },
        },
        description: 'Amount to withdraw in USD',
      },

      // ========== ORDER OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['order'] } },
        options: [
          { name: 'Create Market Order', value: 'createMarketOrder', action: 'Create market order' },
          { name: 'Create Limit Order', value: 'createLimitOrder', action: 'Create limit order' },
          { name: 'Create Stop Market Order', value: 'createStopMarketOrder', action: 'Create stop market order' },
          { name: 'Create Stop Limit Order', value: 'createStopLimitOrder', action: 'Create stop limit order' },
          { name: 'Create Position TP/SL', value: 'createPositionTpSl', action: 'Set take profit and stop loss for position' },
          { name: 'Create Multi TP/SL', value: 'createMultiTpSl', action: 'Create multiple take profits and stop loss orders' },
          { name: 'Cancel Order', value: 'cancelOrder', action: 'Cancel order' },
          { name: 'Cancel Stop Order', value: 'cancelStopOrder', action: 'Cancel stop order' },
          { name: 'Cancel All Orders', value: 'cancelAllOrders', action: 'Cancel all orders' },
          { name: 'Batch Orders', value: 'batchOrders', action: 'Submit multiple orders at once' },
          { name: 'Get Open Orders', value: 'getOpenOrders', action: 'Get open orders' },
          { name: 'Get Order History', value: 'getOrderHistory', action: 'Get order history' },
          { name: 'Get Order By ID', value: 'getOrderById', action: 'Get specific order by ID' },
        ],
        default: 'getOpenOrders',
      },

      // Order Parameters
      {
        displayName: 'Symbol',
        name: 'orderSymbol',
        type: 'string',
        default: 'BTC',
        placeholder: 'BTC, ETH, SOL...',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'createStopMarketOrder', 'createStopLimitOrder', 'createPositionTpSl', 'createMultiTpSl', 'cancelOrder', 'cancelStopOrder', 'getOrderHistory'],
          },
        },
        description: 'Trading pair symbol',
      },
      {
        displayName: 'Side',
        name: 'side',
        type: 'options',
        options: [
          { name: 'Buy / Long', value: 'bid' },
          { name: 'Sell / Short', value: 'ask' },
        ],
        default: 'bid',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder'],
          },
        },
      },
      {
        displayName: 'Position Side',
        name: 'stopOrderSide',
        type: 'options',
        options: [
          { name: 'Long (close long position)', value: 'long' },
          { name: 'Short (close short position)', value: 'short' },
        ],
        default: 'long',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createStopMarketOrder', 'createStopLimitOrder'],
          },
        },
        description: 'Position side this stop order is for',
      },
      {
        displayName: 'Amount',
        name: 'amount',
        type: 'string',
        default: '0.001',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'createStopMarketOrder', 'createStopLimitOrder'],
          },
        },
        description: 'Order amount in base asset units',
      },
      {
        displayName: 'Stop Price',
        name: 'stopPrice',
        type: 'string',
        default: '0',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createStopMarketOrder', 'createStopLimitOrder'],
          },
        },
        description: 'Trigger price for stop order',
      },
      {
        displayName: 'Price',
        name: 'price',
        type: 'string',
        default: '0',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createLimitOrder', 'createStopLimitOrder'],
          },
        },
        description: 'Limit price for the order',
      },
      {
        displayName: 'Slippage %',
        name: 'slippagePercent',
        type: 'string',
        default: '0.5',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createStopMarketOrder'],
          },
        },
        description: 'Maximum slippage tolerance (e.g., 0.5 = 0.5%)',
      },
      {
        displayName: 'Time In Force',
        name: 'tif',
        type: 'options',
        options: [
          { name: 'Good Til Canceled (GTC)', value: 'GTC' },
          { name: 'Immediate Or Cancel (IOC)', value: 'IOC' },
          { name: 'Post Only (ALO)', value: 'ALO' },
          { name: 'Time on Book (TOB)', value: 'TOB' },
        ],
        default: 'GTC',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createLimitOrder'],
          },
        },
        description: 'Time in force (only for limit orders, not stop orders)',
      },
      {
        displayName: 'Reduce Only',
        name: 'reduceOnly',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'createStopMarketOrder', 'createStopLimitOrder'],
          },
        },
        description: 'Whether order can only reduce an existing position',
      },
      {
        displayName: 'Client Order ID',
        name: 'clientOrderId',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMarketOrder', 'createLimitOrder', 'createStopMarketOrder', 'createStopLimitOrder', 'cancelOrder', 'cancelStopOrder'],
          },
        },
        description: 'Optional client-defined order identifier (UUID)',
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelOrder', 'getOrderById'],
          },
        },
        description: 'Exchange order ID',
      },
      {
        displayName: 'Order ID',
        name: 'stopOrderId',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelStopOrder'],
          },
        },
        description: 'Order ID of the stop order to cancel (uses order_id field)',
      },
      {
        displayName: 'Symbols to Cancel',
        name: 'cancelSymbols',
        type: 'string',
        default: '',
        placeholder: 'BTC,ETH,SOL (leave empty for all)',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelAllOrders'],
          },
        },
        description: 'Comma-separated list of symbols to cancel orders for (empty = all)',
      },
      // TP/SL Parameters
      {
        displayName: 'Take Profit Price',
        name: 'takeProfitPrice',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createPositionTpSl'],
          },
        },
        description: 'Take profit trigger price (leave empty to skip)',
      },
      {
        displayName: 'Take Profit Limit Price',
        name: 'takeProfitLimitPrice',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createPositionTpSl'],
          },
        },
        description: 'Limit price for take profit (optional, market if empty)',
      },
      {
        displayName: 'Stop Loss Price',
        name: 'stopLossPrice',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createPositionTpSl'],
          },
        },
        description: 'Stop loss trigger price (leave empty to skip)',
      },
      {
        displayName: 'Stop Loss Limit Price',
        name: 'stopLossLimitPrice',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createPositionTpSl'],
          },
        },
        description: 'Limit price for stop loss (optional, market if empty)',
      },
      // Order History Parameters
      {
        displayName: 'Limit',
        name: 'orderHistoryLimit',
        type: 'number',
        default: 100,
        typeOptions: { minValue: 1, maxValue: 1000 },
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['getOrderHistory'],
          },
        },
        description: 'Maximum number of orders to return',
      },
      // Batch Orders Parameters
      {
        displayName: 'Batch Actions (JSON)',
        name: 'batchActionsJson',
        type: 'json',
        default: '[]',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['batchOrders'],
          },
        },
        description: 'Array of order actions. Each action: {type: "create_limit"|"create_market"|"cancel", symbol, side?, amount?, price?, slippage_percent?, tif?, reduce_only?, order_id?, client_order_id?}. Max 10 actions.',
      },
      // Multi TP/SL Parameters
      {
        displayName: 'Position Side',
        name: 'positionSide',
        type: 'options',
        options: [
          { name: 'Long (close with Sell)', value: 'long' },
          { name: 'Short (close with Buy)', value: 'short' },
        ],
        default: 'long',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMultiTpSl'],
          },
        },
        description: 'Position side to close (determines order direction for TP/SL)',
      },
      {
        displayName: 'Take Profits (JSON)',
        name: 'takeProfitsJson',
        type: 'json',
        default: '[\n  {"price": "100000", "amount": "0.01"},\n  {"price": "105000", "amount": "0.01"},\n  {"price": "110000", "amount": "0.01"}\n]',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMultiTpSl'],
          },
        },
        description: 'Array of take profit orders. Each: {price: "trigger price", amount: "size to close", limit_price?: "optional limit"}',
      },
      {
        displayName: 'Stop Loss (JSON)',
        name: 'stopLossJson',
        type: 'json',
        default: '{"price": "90000", "amount": "0.03"}',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMultiTpSl'],
          },
        },
        description: 'Stop loss order: {price: "trigger price", amount: "size to close", limit_price?: "optional limit"}. Leave empty {} to skip SL.',
      },
      {
        displayName: 'Slippage % (for market orders)',
        name: 'multiSlippage',
        type: 'string',
        default: '0.5',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['createMultiTpSl'],
          },
        },
        description: 'Slippage tolerance for stop market orders (when limit_price is not set)',
      },

      // ========== POSITION OPERATIONS ==========
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['position'] } },
        options: [
          { name: 'Get Positions', value: 'getPositions', action: 'Get open positions' },
          { name: 'Update Leverage', value: 'updateLeverage', action: 'Update leverage' },
          { name: 'Update Margin Mode', value: 'updateMarginMode', action: 'Update margin mode' },
          { name: 'Close Position', value: 'closePosition', action: 'Close position with market order' },
        ],
        default: 'getPositions',
      },

      // Position Parameters
      {
        displayName: 'Symbol',
        name: 'positionSymbol',
        type: 'string',
        default: 'BTC',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage', 'updateMarginMode', 'closePosition'],
          },
        },
      },
      {
        displayName: 'Leverage',
        name: 'leverage',
        type: 'number',
        default: 10,
        typeOptions: { minValue: 1, maxValue: 100 },
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage'],
          },
        },
      },
      {
        displayName: 'Margin Mode',
        name: 'marginMode',
        type: 'options',
        options: [
          { name: 'Cross', value: 'false' },
          { name: 'Isolated', value: 'true' },
        ],
        default: 'false',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateMarginMode'],
          },
        },
        description: 'Cross margin shares margin across positions, Isolated uses dedicated margin per position',
      },
      {
        displayName: 'Slippage %',
        name: 'closeSlippage',
        type: 'string',
        default: '0.5',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['closePosition'],
          },
        },
        description: 'Maximum slippage for close position market order',
      },
      // Note: Subaccount operations removed - Pacifica API requires dual-signature system not compatible with n8n credentials
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('pacificaApi');
    const network = credentials.network as string;
    const accountAddress = credentials.accountAddress as string;
    const agentWalletAddress = credentials.agentWalletAddress as string;
    const agentPrivateKey = credentials.agentPrivateKey as string;

    // Validate private key format (Base58 Solana-style)
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    if (!agentPrivateKey.match(/^[1-9A-HJ-NP-Za-km-z]{32,88}$/)) {
      throw new NodeOperationError(
        this.getNode(),
        'Invalid agent private key format. Must be a Base58 encoded Solana-style key.'
      );
    }

    // Initialize client
    const client = new PacificaClient(
      agentPrivateKey,
      accountAddress,
      agentWalletAddress,
      network === 'mainnet'
    );

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        let result: unknown;

        // ========== MARKET DATA OPERATIONS ==========
        if (resource === 'marketData') {
          if (operation === 'getMarketInfo') {
            const response = await client.getMarketInfo() as PacificaResponse<MarketInfo[]>;
            result = response.data;
          }

          if (operation === 'getPrices') {
            const response = await client.getPrices() as PacificaResponse<PriceInfo[]>;
            result = response.data;
          }

          if (operation === 'getSymbolPrice') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const response = await client.getPrices() as PacificaResponse<PriceInfo[]>;
            const symbolPrice = response.data.find(
              (p: PriceInfo) => p.symbol.toUpperCase() === symbol.toUpperCase()
            );
            if (!symbolPrice) {
              throw new NodeOperationError(this.getNode(), `Symbol ${symbol} not found`);
            }
            result = symbolPrice;
          }

          if (operation === 'getOrderbook') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const aggLevel = this.getNodeParameter('aggLevel', i) as number;
            const response = await client.getOrderbook(symbol.toUpperCase(), aggLevel);
            result = response.data;
          }

          if (operation === 'getCandles') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const interval = this.getNodeParameter('interval', i) as string;
            const startTime = this.getNodeParameter('startTime', i) as number;
            const endTime = this.getNodeParameter('endTime', i) as number;
            const response = await client.getCandles(
              symbol.toUpperCase(),
              interval,
              startTime,
              endTime || undefined
            );
            result = response.data;
          }

          if (operation === 'getRecentTrades') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const response = await client.getRecentTrades(symbol.toUpperCase());
            result = response.data;
          }

          if (operation === 'getHistoricalFunding') {
            const symbol = this.getNodeParameter('symbol', i) as string;
            const limit = this.getNodeParameter('fundingLimit', i) as number;
            const response = await client.getHistoricalFunding(symbol.toUpperCase(), limit);
            result = response.data;
          }
        }

        // ========== ACCOUNT OPERATIONS ==========
        if (resource === 'account') {
          if (operation === 'getAccountInfo') {
            const response = await client.getAccountInfo() as PacificaResponse<AccountInfo>;
            result = response.data;
          }

          if (operation === 'getTradeHistory') {
            const symbol = this.getNodeParameter('tradeSymbol', i) as string;
            const startTime = this.getNodeParameter('tradeStartTime', i) as number;
            const endTime = this.getNodeParameter('tradeEndTime', i) as number;
            const limit = this.getNodeParameter('tradeLimit', i) as number;
            const response = await client.getTradeHistory(
              symbol || undefined,
              startTime || undefined,
              endTime || undefined,
              limit
            );
            result = response.data;
          }

          if (operation === 'getEquityHistory') {
            const startTime = this.getNodeParameter('tradeStartTime', i) as number;
            const endTime = this.getNodeParameter('tradeEndTime', i) as number;
            const limit = this.getNodeParameter('tradeLimit', i) as number;
            const response = await client.getEquityHistory(
              startTime || undefined,
              endTime || undefined,
              limit
            );
            result = response.data;
          }

          if (operation === 'getBalanceHistory') {
            const startTime = this.getNodeParameter('tradeStartTime', i) as number;
            const endTime = this.getNodeParameter('tradeEndTime', i) as number;
            const limit = this.getNodeParameter('tradeLimit', i) as number;
            const response = await client.getBalanceHistory(
              startTime || undefined,
              endTime || undefined,
              limit
            );
            result = response.data;
          }

          if (operation === 'getAccountFunding') {
            const symbol = this.getNodeParameter('tradeSymbol', i) as string;
            const startTime = this.getNodeParameter('tradeStartTime', i) as number;
            const endTime = this.getNodeParameter('tradeEndTime', i) as number;
            const limit = this.getNodeParameter('tradeLimit', i) as number;
            const response = await client.getAccountFunding(
              symbol || undefined,
              startTime || undefined,
              endTime || undefined,
              limit
            );
            result = response.data;
          }

          if (operation === 'requestWithdrawal') {
            const amount = this.getNodeParameter('withdrawalAmount', i) as string;
            result = await client.requestWithdrawal(amount);
          }
        }

        // ========== ORDER OPERATIONS ==========
        if (resource === 'order') {
          if (operation === 'getOpenOrders') {
            const response = await client.getOpenOrders();
            result = response.data;
          }

          if (operation === 'createMarketOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const side = this.getNodeParameter('side', i) as 'bid' | 'ask';
            const amount = String(this.getNodeParameter('amount', i));
            const slippage = String(this.getNodeParameter('slippagePercent', i));
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createMarketOrder(
              symbol.toUpperCase(),
              side,
              amount,
              slippage,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'createLimitOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const side = this.getNodeParameter('side', i) as 'bid' | 'ask';
            const price = String(this.getNodeParameter('price', i));
            const amount = String(this.getNodeParameter('amount', i));
            const tif = this.getNodeParameter('tif', i) as 'GTC' | 'IOC' | 'ALO' | 'TOB';
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createLimitOrder(
              symbol.toUpperCase(),
              side,
              price,
              amount,
              tif,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'cancelOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const orderId = this.getNodeParameter('orderId', i) as number;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.cancelOrder(
              symbol.toUpperCase(),
              orderId || undefined,
              clientOrderId || undefined
            );
          }

          if (operation === 'cancelAllOrders') {
            const cancelSymbolsStr = this.getNodeParameter('cancelSymbols', i) as string;
            const symbols = cancelSymbolsStr
              ? cancelSymbolsStr.split(',').map(s => s.trim().toUpperCase())
              : undefined;

            result = await client.cancelAllOrders(symbols);
          }

          if (operation === 'createStopMarketOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const positionSide = this.getNodeParameter('stopOrderSide', i) as 'long' | 'short';
            // Long position closes with ask (sell), Short position closes with bid (buy)
            const side: 'bid' | 'ask' = positionSide === 'long' ? 'ask' : 'bid';
            const amount = String(this.getNodeParameter('amount', i));
            const stopPrice = String(this.getNodeParameter('stopPrice', i));
            const slippage = String(this.getNodeParameter('slippagePercent', i));
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createStopMarketOrder(
              symbol.toUpperCase(),
              side,
              amount,
              stopPrice,
              slippage,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'createStopLimitOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const positionSide = this.getNodeParameter('stopOrderSide', i) as 'long' | 'short';
            // Long position closes with ask (sell), Short position closes with bid (buy)
            const side: 'bid' | 'ask' = positionSide === 'long' ? 'ask' : 'bid';
            const amount = String(this.getNodeParameter('amount', i));
            const stopPrice = String(this.getNodeParameter('stopPrice', i));
            const price = String(this.getNodeParameter('price', i));
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.createStopLimitOrder(
              symbol.toUpperCase(),
              side,
              amount,
              stopPrice,
              price,
              reduceOnly,
              clientOrderId || undefined
            );
          }

          if (operation === 'createPositionTpSl') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const tpPrice = this.getNodeParameter('takeProfitPrice', i) as string;
            const tpLimitPrice = this.getNodeParameter('takeProfitLimitPrice', i) as string;
            const slPrice = this.getNodeParameter('stopLossPrice', i) as string;
            const slLimitPrice = this.getNodeParameter('stopLossLimitPrice', i) as string;

            const takeProfit = tpPrice ? {
              stop_price: tpPrice,
              ...(tpLimitPrice ? { limit_price: tpLimitPrice } : {}),
            } : undefined;

            const stopLoss = slPrice ? {
              stop_price: slPrice,
              ...(slLimitPrice ? { limit_price: slLimitPrice } : {}),
            } : undefined;

            result = await client.createPositionTpSl(
              symbol.toUpperCase(),
              takeProfit,
              stopLoss
            );
          }

          if (operation === 'cancelStopOrder') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const stopOrderId = this.getNodeParameter('stopOrderId', i) as number;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.cancelStopOrder(
              symbol.toUpperCase(),
              stopOrderId || undefined,
              clientOrderId || undefined
            );
          }

          if (operation === 'getOrderHistory') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const limit = this.getNodeParameter('orderHistoryLimit', i) as number;
            const response = await client.getOrderHistory(
              symbol || undefined,
              undefined,
              undefined,
              limit
            );
            result = response.data;
          }

          if (operation === 'getOrderById') {
            const orderId = this.getNodeParameter('orderId', i) as number;
            const response = await client.getOrderById(orderId);
            result = response.data;
          }

          if (operation === 'batchOrders') {
            const actionsJson = this.getNodeParameter('batchActionsJson', i) as string;
            let actions: Array<{
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
            }>;

            try {
              actions = typeof actionsJson === 'string' ? JSON.parse(actionsJson) : actionsJson;
            } catch {
              throw new NodeOperationError(this.getNode(), 'Invalid JSON format for batch actions');
            }

            if (!Array.isArray(actions) || actions.length === 0) {
              throw new NodeOperationError(this.getNode(), 'Batch actions must be a non-empty array');
            }

            if (actions.length > 10) {
              throw new NodeOperationError(this.getNode(), 'Maximum 10 actions per batch');
            }

            result = await client.batchOrders(actions);
          }

          if (operation === 'createMultiTpSl') {
            const symbol = this.getNodeParameter('orderSymbol', i) as string;
            const positionSide = this.getNodeParameter('positionSide', i) as 'long' | 'short';
            const takeProfitsJson = this.getNodeParameter('takeProfitsJson', i) as string;
            const stopLossJson = this.getNodeParameter('stopLossJson', i) as string;
            const slippage = String(this.getNodeParameter('multiSlippage', i));

            // Long position closes with ask (sell), Short position closes with bid (buy)
            const orderSide: 'bid' | 'ask' = positionSide === 'long' ? 'ask' : 'bid';

            // Parse TPs
            let takeProfits: Array<{ price: string; amount: string; limit_price?: string }> = [];
            try {
              const parsed = typeof takeProfitsJson === 'string' ? JSON.parse(takeProfitsJson) : takeProfitsJson;
              takeProfits = Array.isArray(parsed) ? parsed : [];
            } catch {
              throw new NodeOperationError(this.getNode(), 'Invalid JSON format for Take Profits');
            }

            // Parse SL
            let stopLoss: { price: string; amount: string; limit_price?: string } | null = null;
            try {
              const parsed = typeof stopLossJson === 'string' ? JSON.parse(stopLossJson) : stopLossJson;
              if (parsed && parsed.price && parsed.amount) {
                stopLoss = parsed;
              }
            } catch {
              throw new NodeOperationError(this.getNode(), 'Invalid JSON format for Stop Loss');
            }

            const results: Array<{ type: string; success: boolean; stop_order_id?: number; error?: string }> = [];

            // Create TP orders
            for (let tpIndex = 0; tpIndex < takeProfits.length; tpIndex++) {
              const tp = takeProfits[tpIndex];
              try {
                if (tp.limit_price) {
                  // Stop limit order for TP
                  const response = await client.createStopLimitOrder(
                    symbol.toUpperCase(),
                    orderSide,
                    String(tp.amount),
                    String(tp.price),
                    String(tp.limit_price),
                    true // reduce_only
                  );
                  results.push({ type: `TP${tpIndex + 1}`, success: true, stop_order_id: response.stop_order_id });
                } else {
                  // Stop market order for TP
                  const response = await client.createStopMarketOrder(
                    symbol.toUpperCase(),
                    orderSide,
                    String(tp.amount),
                    String(tp.price),
                    slippage,
                    true // reduce_only
                  );
                  results.push({ type: `TP${tpIndex + 1}`, success: true, stop_order_id: response.stop_order_id });
                }
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                results.push({ type: `TP${tpIndex + 1}`, success: false, error: errMsg });
              }
            }

            // Create SL order
            if (stopLoss) {
              try {
                if (stopLoss.limit_price) {
                  const response = await client.createStopLimitOrder(
                    symbol.toUpperCase(),
                    orderSide,
                    String(stopLoss.amount),
                    String(stopLoss.price),
                    String(stopLoss.limit_price),
                    true // reduce_only
                  );
                  results.push({ type: 'SL', success: true, stop_order_id: response.stop_order_id });
                } else {
                  const response = await client.createStopMarketOrder(
                    symbol.toUpperCase(),
                    orderSide,
                    String(stopLoss.amount),
                    String(stopLoss.price),
                    slippage,
                    true // reduce_only
                  );
                  results.push({ type: 'SL', success: true, stop_order_id: response.stop_order_id });
                }
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                results.push({ type: 'SL', success: false, error: errMsg });
              }
            }

            result = {
              symbol: symbol.toUpperCase(),
              position_side: positionSide,
              order_side: orderSide,
              orders: results,
              summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
              },
            };
          }
        }

        // ========== POSITION OPERATIONS ==========
        if (resource === 'position') {
          if (operation === 'getPositions') {
            const response = await client.getPositions() as PacificaResponse<Position[]>;
            // Filter to only show positions with non-zero amounts
            result = response.data.filter(
              (pos: Position) => parseFloat(pos.amount) !== 0
            );
          }

          if (operation === 'updateLeverage') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const leverage = this.getNodeParameter('leverage', i) as number;

            result = await client.updateLeverage(symbol.toUpperCase(), leverage);
          }

          if (operation === 'updateMarginMode') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const marginModeValue = this.getNodeParameter('marginMode', i) as string;
            const isIsolated = marginModeValue === 'true';

            result = await client.updateMarginMode(symbol.toUpperCase(), isIsolated);
          }

          if (operation === 'closePosition') {
            const symbol = this.getNodeParameter('positionSymbol', i) as string;
            const slippage = String(this.getNodeParameter('closeSlippage', i));

            // Get current position
            const positionsResponse = await client.getPositions() as PacificaResponse<Position[]>;
            const position = positionsResponse.data.find(
              (pos: Position) => pos.symbol.toUpperCase() === symbol.toUpperCase()
            );

            if (!position || parseFloat(position.amount) === 0) {
              throw new NodeOperationError(this.getNode(), `No open position found for ${symbol}`);
            }

            const amount = position.amount;
            // Use position.side field to determine direction
            // Long positions are closed with 'ask' (sell), Short with 'bid' (buy)
            const isLong = position.side === 'long';
            const closeSide: 'bid' | 'ask' = isLong ? 'ask' : 'bid';

            result = await client.createMarketOrder(
              symbol.toUpperCase(),
              closeSide,
              amount,
              slippage,
              true // Always reduce only for close
            );
          }
        }
        // Note: Subaccount operations removed - Pacifica API requires dual-signature system

        returnData.push({
          json: result as INodeExecutionData['json'],
          pairedItem: { item: i },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: errorMessage },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
