# Skroutz Price Calculator - PRD

## Original Problem Statement
Comprehensive price calculator for the Skroutz e-commerce platform handling Marketplace and FBS pricing with wholesale cost, VAT, profit, commissions, FBS fees, packaging, advertising, and Coins.

## User Language: Greek (Ελληνικά)

## Architecture
- **Backend**: FastAPI (server.py) + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn/UI

## Pricing Formula
`Final Price = (Wholesale + Profit + FixedFees) / (1 - Marketplace% - Ads% - (1 - 1/(1+VAT%)))`

## What's Been Implemented
- [x] Full FastAPI backend with all endpoints
- [x] Excel uploads: report_listed, fbs_products, wholesale prices
- [x] Quick Calculator, Product Search, Detailed Calculator
- [x] Interactive Product List with reverse calculation
- [x] Coins & Advertising integration
- [x] Excel export, settings persistence
- [x] Pre-fill "Δική σου Τιμή" with Skroutz current prices
- [x] Auto profit/loss with color coding (green/red)
- [x] **Per-product ΦΠΑ% and Κέρδος€ columns (removed global controls) - Mar 2026**

## Changelog
- Feb 28: Bulk wholesale price upload via Excel (matched by EAN)
- Mar 1: Pre-filled Skroutz prices, auto profit/loss calculation
- Mar 1: Per-product ΦΠΑ and Κέρδος (default 24%, 0.90€, editable per row)

## Backlog
- Refactor server.py into separate routes/services/models files
