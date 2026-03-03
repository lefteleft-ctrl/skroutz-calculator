# Skroutz Price Calculator - PRD

## Original Problem Statement
Comprehensive price calculator for the Skroutz e-commerce platform handling Marketplace and FBS pricing with wholesale cost, VAT, profit, commissions, FBS fees, packaging, advertising, and Coins.

## User Language: Greek (Ελληνικά)

## Architecture
- **Backend**: FastAPI (server.py) + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Database**: MongoDB `products` collection

## Pricing Formula
`Final Price = (Wholesale + Profit + FixedFees) / (1 - Marketplace% - Ads% - (1 - 1/(1+VAT%)))`

## Key API Endpoints
- `POST /api/upload/report-listed` - Marketplace data
- `POST /api/upload/fbs-products` - FBS data
- `POST /api/upload/wholesale` - Wholesale prices (by EAN)
- `POST /api/upload/orders` - Orders Excel for profit calculation
- `POST /api/calculate-manual-profit` - Manual profit calculation by EAN+qty
- `GET /api/upload-status` - Upload counts
- `GET /api/products/search?q=` - Product search
- `POST /api/calculate` - Price calculation
- `POST /api/save-product-settings` - Save settings
- `GET /api/products/all` - All products for table
- `POST /api/reverse-calculate` - Reverse profit calc
- `POST /api/export-excel` - Excel export

## What's Been Implemented
- [x] Full FastAPI backend with all endpoints
- [x] Excel uploads: report_listed, fbs_products, wholesale prices
- [x] Quick Calculator, Product Search, Detailed Calculator
- [x] Interactive Product List with reverse calculation
- [x] Coins & Advertising integration
- [x] Per-product VAT% and Profit columns
- [x] Pre-fill "Δική σου Τιμή" with Skroutz prices
- [x] Auto profit/loss with color coding
- [x] Excel export, settings persistence
- [x] **Profit Calculator page (/profit) - Mar 2026**
  - Upload Skroutz orders Excel (.xls)
  - Match by EAN, calculate profit per product
  - Price mismatch warning (Excel vs stored price)
  - Summary cards + total profit
  - Manual entry by barcode + quantity

## Changelog
- Feb 28: Bulk wholesale price upload via Excel (matched by EAN)
- Mar 1: Pre-filled Skroutz prices, auto profit/loss calculation
- Mar 1: Per-product VAT and Profit (default 24%, 0.90€, editable per row)
- Mar 1: Bigger fonts in product table for readability
- Mar 3: Profit Calculator page with orders upload + manual entry

## Backlog
- Refactor server.py into separate routes/services/models files
