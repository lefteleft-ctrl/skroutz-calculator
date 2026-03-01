# Skroutz Price Calculator - PRD

## Original Problem Statement
Comprehensive price calculator for the Skroutz e-commerce platform handling:
- Skroutz Marketplace pricing
- Skroutz Hub (Fulfilled by Skroutz - FBS) pricing
- Variables: wholesale cost, VAT, profit, commissions, FBS fees, packaging, advertising, Coins

## User Language
Greek (Ελληνικά)

## Core Requirements
1. Upload Excel files with Skroutz fee structures and product data
2. Upload wholesale prices Excel file for bulk price population
3. Quick Calculator with average fee values
4. Product Search by name/barcode
5. Detailed calculation page per product
6. Interactive Product List with reverse calculation, Coins/Ads, export
7. Save/persist settings per product
8. Pre-fill "Δική σου Τιμή" with current Skroutz prices and auto-calculate profit/loss

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
- `GET /api/upload-status` - Upload counts
- `GET /api/products/search?q=` - Product search
- `POST /api/calculate` - Price calculation
- `POST /api/save-product-settings` - Save settings
- `GET /api/products/all` - All products for table
- `POST /api/reverse-calculate` - Reverse profit calc
- `POST /api/export-excel` - Excel export
- `POST /api/quick-calculate` - Quick calc with averages

## What's Been Implemented
- [x] Full FastAPI backend with all endpoints
- [x] Excel upload for Marketplace data (report_listed)
- [x] Excel upload for FBS data (fbs_products)
- [x] Bulk wholesale price upload via Excel (matched by EAN)
- [x] Quick Calculator with averages
- [x] Product Search
- [x] Detailed price calculator per product
- [x] Interactive Product List table
- [x] Reverse calculation
- [x] Coins & Advertising cost integration
- [x] Separate Calculate/Save workflow
- [x] Excel export
- [x] Settings persistence per product
- [x] Pre-fill "Δική σου Τιμή" with Skroutz current prices (from report_listed/FBS)
- [x] Auto profit/loss calculation with color coding (green=profit, red=loss)

## Completed - Feb 28, 2026
- Implemented `POST /api/upload/wholesale` endpoint
- Parses multi-sheet Excel files (56 sheets, ~1460 products)
- Matches products by EAN barcode (518/589 matched)
- Added third DropZone "Χονδρικές Τιμές" in ExcelUploader

## Completed - Mar 1, 2026
- Pre-filled "Δική σου Τιμή" with current Skroutz prices (current_price / fbs_current_price)
- Automatic profit/loss calculation: green for positive, red for negative
- Override prices no longer cleared when changing wholesale/coins/ads

## Backlog
- Refactor server.py into separate routes/services/models files
