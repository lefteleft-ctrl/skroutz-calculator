# Skroutz Price Calculator - PRD

## Original Problem Statement
Build a price calculator for the Skroutz e-commerce platform that calculates final selling prices based on wholesale cost, commissions, fees, VAT, and desired profit margin. The app serves a Greek pharmacy owner selling through Skroutz Marketplace and FBS (Fulfilled by Skroutz).

## User Persona
- Greek pharmacy owner selling products on Skroutz
- Needs to calculate optimal selling prices to maintain profitability
- Works with two Skroutz Excel exports: report_listed (commissions) and fbs_products_active (FBS fees)

## Core Requirements
1. Upload 2 Excel files from Skroutz (report_listed + fbs_products_active)
2. Search products by name or EAN barcode
3. Input wholesale price, VAT (24%/13%/6%), profit target (default 0.90€), management cost
4. Calculate and display final selling prices for BOTH FBS and Marketplace
5. Show detailed cost breakdown for each channel

## Pricing Formula (Verified with User)
```
Final Price = (Wholesale + Profit + Fixed Fee) / (1 - MP% - (1 - 1/(1+VAT%)))
```
- Commission is calculated on GROSS price (with VAT) - this is how Skroutz works
- FBS: Fixed Fee = FBS fee + packaging (0.12€)
- Marketplace: Fixed Fee = Management cost (default 0€)

## Implemented Features (Feb 2026)
- [x] Excel upload & parsing (report_listed + fbs_products_active)
- [x] Product search by name or EAN barcode
- [x] Price calculation with correct Skroutz formula
- [x] Dual results: FBS and Marketplace final prices
- [x] Adjustable VAT (24%/13%/6%), profit, management cost
- [x] Detailed cost breakdown display
- [x] **Quick Calculator** - instant pricing with average values from uploaded data
- [x] Dark theme UI in Greek language

## Tech Stack
- Backend: FastAPI + MongoDB (Motor) + openpyxl
- Frontend: React + Tailwind CSS + Shadcn/UI
- Data: Uploaded Excel files parsed and stored in MongoDB

## API Endpoints
- POST /api/upload/report-listed - Upload Marketplace commissions Excel
- POST /api/upload/fbs-products - Upload FBS products Excel
- GET /api/upload-status - Check loaded data counts
- GET /api/products/search?q= - Search products
- GET /api/products/{uid} - Get single product
- POST /api/calculate - Calculate prices

## Backlog
- P1: Batch/bulk calculation for all products at once
- P1: Export results to Excel
- P2: Include Coins in calculation
- P2: Dynamic Margin % (instead of fixed € amount)
- P2: Price comparison with current Skroutz price
- P3: Historical price tracking
