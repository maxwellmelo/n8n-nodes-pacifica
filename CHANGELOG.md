# Changelog

All notable changes to this project will be documented in this file.

## [0.3.6] - 2026-01-03

### Fixed
- Close Position now uses `position.side` field instead of amount sign to determine order side
- Fixes "Invalid reduce-only order side: must be opposite to position side" error

## [0.3.5] - 2026-01-03

### Fixed
- Include `tif` parameter in stop limit order payload (was being ignored)

### Documentation
- Update README.md with all 30+ operations
- Update CHANGELOG.md with complete version history

## [0.3.4] - 2026-01-03

### Fixed
- Add `exclude_reduce_only` parameter to Cancel All Orders operation
- Add `all_symbols` field to Cancel All Orders for broader cancellation support

## [0.3.3] - 2026-01-02

### Fixed
- Stop orders now correctly use bid/ask with position side conversion
- Fixed stop order side logic: long positions close with ask, short with bid

## [0.3.2] - 2026-01-01

### Fixed
- Stop orders now properly use position side (long/short) instead of bid/ask directly

## [0.3.1] - 2025-12-31

### Added
- **Multi TP/SL Operation** - Create multiple take profit levels with a single stop loss order

## [0.3.0] - 2025-12-31

### Fixed
- Correct stop order endpoint and payload format
- Fix operation types for API signing
- Ensure numeric values are sent as strings to API
- Remove margin_mode from updateLeverage endpoint

## [0.2.1] - 2025-12-30

### Added
- **Get Symbol Price** - Get price for a specific trading symbol

## [0.2.0] - 2025-12-30

### Added
- **Stop Market Order** - Place stop market orders triggered at a price
- **Stop Limit Order** - Place stop limit orders with trigger and limit prices
- **Create Position TP/SL** - Set take profit and stop loss for existing positions
- **Cancel Stop Order** - Cancel stop orders by ID or client order ID
- **Batch Orders** - Submit multiple orders in a single request
- **Get Order History** - Get historical order records with pagination
- **Get Order By ID** - Get a specific order by its ID
- **Get Equity History** - Get historical equity data
- **Get Balance History** - Get historical balance data
- **Get Account Funding** - Get funding payments history
- **Request Withdrawal** - Request withdrawals from the account

## [0.1.1] - 2025-12-29

### Fixed
- Correct authentication to use Solana-style Ed25519 + Base58 signing

## [0.1.0] - 2025-12-29

### Added
- Initial release
- **Market Data Operations**
  - Get Market Info
  - Get Prices
  - Get Orderbook
  - Get Candles (OHLCV)
  - Get Recent Trades
  - Get Historical Funding
- **Account Operations**
  - Get Account Info
  - Get Trade History
- **Order Operations**
  - Create Market Order
  - Create Limit Order
  - Cancel Order
  - Cancel All Orders
  - Get Open Orders
- **Position Operations**
  - Get Positions
  - Update Leverage
  - Update Margin Mode
  - Close Position
- **Subaccount Operations**
  - Create Subaccount
  - List Subaccounts
  - Transfer Funds
- Mainnet and Testnet support
- Agent Wallet authentication (secure API trading without withdrawal access)
- Full TypeScript implementation
