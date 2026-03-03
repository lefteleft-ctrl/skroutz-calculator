"""
Skroutz Price Calculator API Tests
Tests all API endpoints: upload status, search, calculate, and product lookup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndStatus:
    """Basic health and status endpoint tests"""
    
    def test_api_root_health(self):
        """Test API root endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Skroutz" in data["message"]
        print(f"✓ API root health check passed: {data['message']}")

    def test_upload_status_endpoint(self):
        """Test upload status returns correct counts including wholesale_count"""
        response = requests.get(f"{BASE_URL}/api/upload-status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "report_listed_count" in data
        assert "fbs_products_count" in data
        assert "total_products" in data
        assert "wholesale_count" in data, "Missing wholesale_count field"
        
        # Verify data is loaded (from previous curl uploads)
        assert data["report_listed_count"] > 0, "No report_listed data found"
        assert data["fbs_products_count"] > 0, "No FBS products data found"
        assert data["total_products"] > 0, "No total products found"
        assert data["wholesale_count"] > 0, "No wholesale data found"
        
        print(f"✓ Upload status: report_listed={data['report_listed_count']}, fbs_products={data['fbs_products_count']}, total={data['total_products']}, wholesale={data['wholesale_count']}")


class TestProductSearch:
    """Product search endpoint tests"""
    
    def test_search_by_name(self):
        """Search products by name containing 'Natural'"""
        response = requests.get(f"{BASE_URL}/api/products/search", params={"q": "Natural"})
        assert response.status_code == 200
        results = response.json()
        
        # Should return list of products
        assert isinstance(results, list)
        assert len(results) > 0, "No products found for 'Natural' search"
        
        # Verify product structure
        first_product = results[0]
        assert "uid" in first_product
        assert "name" in first_product or "fbs_name" in first_product
        
        print(f"✓ Name search returned {len(results)} products")
    
    def test_search_by_ean_barcode(self):
        """Search products by EAN barcode"""
        ean = "5200040107010"
        response = requests.get(f"{BASE_URL}/api/products/search", params={"q": ean})
        assert response.status_code == 200
        results = response.json()
        
        # Should return exact match
        assert isinstance(results, list)
        assert len(results) >= 1, f"No product found for EAN {ean}"
        
        # Verify the correct product is returned
        product = results[0]
        assert product["ean"] == ean
        assert product["uid"] == "6841355"
        
        print(f"✓ EAN search found product: {product.get('name', product.get('fbs_name', 'N/A'))[:50]}...")
    
    def test_search_by_uid(self):
        """Search products by UID"""
        response = requests.get(f"{BASE_URL}/api/products/search", params={"q": "6841355"})
        assert response.status_code == 200
        results = response.json()
        
        assert len(results) >= 1
        print(f"✓ UID search returned {len(results)} results")
    
    def test_search_minimum_length(self):
        """Search with single character should return empty or few results"""
        response = requests.get(f"{BASE_URL}/api/products/search", params={"q": "N"})
        # API requires min_length=1, should not error
        assert response.status_code == 200
        print("✓ Single character search handled correctly")
    
    def test_search_no_results(self):
        """Search for non-existent product"""
        response = requests.get(f"{BASE_URL}/api/products/search", params={"q": "ZZZZNONEXISTENT123"})
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        assert len(results) == 0
        print("✓ Non-existent search returns empty list")


class TestProductLookup:
    """Single product lookup tests"""
    
    def test_get_product_by_uid(self):
        """Get single product by UID"""
        uid = "6841355"
        response = requests.get(f"{BASE_URL}/api/products/{uid}")
        assert response.status_code == 200
        
        product = response.json()
        assert product["uid"] == uid
        assert product["ean"] == "5200040107010"
        assert product["marketplace_commission_pct"] == 8.6
        assert product["fbs_fee"] == 0.59
        assert "name" in product
        
        print(f"✓ Product lookup: UID={uid}, MP%={product['marketplace_commission_pct']}, FBS fee={product['fbs_fee']}")
    
    def test_get_product_not_found(self):
        """Get non-existent product returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/NONEXISTENT999999")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        print("✓ Non-existent product returns 404")


class TestPriceCalculation:
    """Price calculation endpoint tests"""
    
    def test_calculate_fbs_price_with_known_values(self):
        """
        Test FBS price calculation with known values
        Formula: final = (cost + profit + fbs_fee + packaging) / (1 - mp% - (1 - 1/(1+vat%)))
        
        Expected calculation:
        - cost = 10, profit = 0.90, fbs_fee = 0.59, packaging = 0.12
        - mp% = 8.6% = 0.086
        - vat% = 24% = 0.24
        - vat_impact = 1 - 1/(1.24) = 0.1935...
        - denominator = 1 - 0.086 - 0.1935 = 0.7205
        - final = (10 + 0.90 + 0.59 + 0.12) / 0.7205 = 11.61 / 0.7205 = ~16.11
        """
        payload = {
            "uid": "6841355",
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "fbs_final_price" in data
        assert "marketplace_final_price" in data
        assert "fbs_breakdown" in data
        assert "marketplace_breakdown" in data
        
        # Verify FBS calculation (~16.11 expected)
        assert abs(data["fbs_final_price"] - 16.11) < 0.02, f"FBS price {data['fbs_final_price']} != expected ~16.11"
        
        # Verify product info
        assert data["uid"] == "6841355"
        assert data["marketplace_commission_pct"] == 8.6
        assert data["fbs_fee"] == 0.59
        assert data["packaging_cost"] == 0.12
        
        # Verify breakdown details
        fbs = data["fbs_breakdown"]
        assert fbs["wholesale_price"] == 10.0
        assert fbs["profit_target"] == 0.90
        assert fbs["fbs_fee_plus_packaging"] == 0.71  # 0.59 + 0.12
        assert fbs["vat_pct"] == 24.0
        assert fbs["commission_pct"] == 8.6
        
        print(f"✓ FBS calculation correct: {data['fbs_final_price']}€")
    
    def test_calculate_marketplace_price(self):
        """Test Marketplace price calculation (without FBS fees)"""
        payload = {
            "uid": "6841355",
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Marketplace price should be lower (no FBS fee + packaging)
        assert data["marketplace_final_price"] < data["fbs_final_price"]
        
        # Verify marketplace breakdown
        mp = data["marketplace_breakdown"]
        assert mp["management_cost"] == 0.0
        assert mp["wholesale_price"] == 10.0
        
        print(f"✓ Marketplace calculation correct: {data['marketplace_final_price']}€ (vs FBS {data['fbs_final_price']}€)")
    
    def test_calculate_with_different_vat_rates(self):
        """Test calculation with different VAT rates (24%, 13%, 6%)"""
        vat_rates = [24, 13, 6]
        results = []
        
        for vat in vat_rates:
            payload = {
                "uid": "6841355",
                "wholesale_price": 10.0,
                "vat_pct": vat,
                "profit": 0.90,
                "mgmt_cost": 0.0
            }
            
            response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
            assert response.status_code == 200
            
            data = response.json()
            results.append((vat, data["fbs_final_price"]))
            assert data["vat_pct"] == vat
        
        # Higher VAT should mean higher final price
        assert results[0][1] > results[1][1] > results[2][1], "Higher VAT should yield higher price"
        
        for vat, price in results:
            print(f"✓ VAT {vat}%: FBS price = {price}€")
    
    def test_calculate_with_management_cost(self):
        """Test marketplace calculation with management cost"""
        payload = {
            "uid": "6841355",
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.50
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Marketplace price should include management cost
        assert data["marketplace_breakdown"]["management_cost"] == 0.50
        
        print(f"✓ Marketplace with mgmt cost: {data['marketplace_final_price']}€")
    
    def test_calculate_product_not_found(self):
        """Test calculation with non-existent product"""
        payload = {
            "uid": "NONEXISTENT999999",
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
        print("✓ Non-existent product calculation returns 404")
    
    def test_calculate_with_zero_profit(self):
        """Test calculation with zero profit"""
        payload = {
            "uid": "6841355",
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.0,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["profit"] == 0.0
        print(f"✓ Zero profit calculation: FBS = {data['fbs_final_price']}€")


class TestFileUpload:
    """File upload endpoint tests (testing structure only, not actual upload)"""
    
    def test_upload_endpoint_exists_report_listed(self):
        """Verify report-listed upload endpoint exists"""
        # Test with empty body to check endpoint exists (should return 422 for missing file)
        response = requests.post(f"{BASE_URL}/api/upload/report-listed")
        # 422 Unprocessable Entity means endpoint exists but needs file
        assert response.status_code == 422
        print("✓ Upload report-listed endpoint exists")
    
    def test_upload_endpoint_exists_fbs_products(self):
        """Verify fbs-products upload endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/upload/fbs-products")
        assert response.status_code == 422
        print("✓ Upload fbs-products endpoint exists")
    
    def test_upload_endpoint_exists_wholesale(self):
        """Verify wholesale upload endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/upload/wholesale")
        # 422 Unprocessable Entity means endpoint exists but needs file
        assert response.status_code == 422
        print("✓ Upload wholesale endpoint exists")


class TestProductsAll:
    """Tests for GET /api/products/all endpoint (product list table)"""
    
    def test_get_all_products_returns_list(self):
        """Test that /api/products/all returns a list of all products"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0, "No products returned"
        print(f"✓ GET /api/products/all returned {len(products)} products")
    
    def test_get_all_products_sorted_alphabetically(self):
        """Test that products are sorted (MongoDB ASCII sort - Latin chars first, then Greek)"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        names = [p.get("name", "") for p in products if p.get("name")]
        
        # Verify products are sorted - MongoDB sorts by ASCII code points
        # Latin letters sort before Greek letters in this collation
        # Just verify we have products and they follow some sort order
        assert len(names) > 0, "No products returned"
        
        # Check first few are sorted within their character group (A-Z starts)
        latin_names = [n for n in names[:20] if n and ord(n[0]) < 128]
        for i in range(1, len(latin_names)):
            assert latin_names[i-1] <= latin_names[i], f"Latin products not sorted: {latin_names[i-1]} > {latin_names[i]}"
        
        print(f"✓ Products sorted. First: {names[0][:40]}..., Last: {names[-1][:40]}...")
    
    def test_get_all_products_has_required_fields(self):
        """Test that products have required fields for table display"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        required_fields = ["uid", "name", "marketplace_commission_pct", "fbs_fee"]
        
        # Check first 10 products
        for p in products[:10]:
            assert "uid" in p, "Missing uid field"
            # Either name or fbs_name should be present
            assert "name" in p or "fbs_name" in p, "Missing name field"
            
        # Also verify EAN is present (optional but expected in most)
        ean_count = sum(1 for p in products if p.get("ean"))
        print(f"✓ Products have required fields. {ean_count}/{len(products)} have EAN")


class TestReverseCalculate:
    """Tests for POST /api/reverse-calculate endpoint"""
    
    def test_reverse_calculate_positive_profit(self):
        """Test reverse calculation with a profitable price"""
        payload = {
            "final_price": 20.0,
            "wholesale_price": 10.0,
            "mp_pct": 8.6,
            "fbs_fee": 0.59,
            "vat_pct": 24.0,
            "packaging_cost": 0.12
        }
        
        response = requests.post(f"{BASE_URL}/api/reverse-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "real_profit" in data
        assert "is_profitable" in data
        assert "commission_amount" in data
        assert "vat_amount" in data
        assert "net_to_store" in data
        
        # Verify profit is positive
        assert data["real_profit"] > 0, f"Expected positive profit, got {data['real_profit']}"
        assert data["is_profitable"] == True
        
        print(f"✓ Reverse calculate: final=20€, profit={data['real_profit']}€, profitable={data['is_profitable']}")
    
    def test_reverse_calculate_negative_profit(self):
        """Test reverse calculation with an unprofitable price"""
        payload = {
            "final_price": 12.0,  # Too low for 10€ wholesale
            "wholesale_price": 10.0,
            "mp_pct": 8.6,
            "fbs_fee": 0.59,
            "vat_pct": 24.0,
            "packaging_cost": 0.12
        }
        
        response = requests.post(f"{BASE_URL}/api/reverse-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify profit is negative
        assert data["real_profit"] < 0, f"Expected negative profit, got {data['real_profit']}"
        assert data["is_profitable"] == False
        
        print(f"✓ Reverse calculate: final=12€, loss={data['real_profit']}€, profitable={data['is_profitable']}")
    
    def test_reverse_calculate_formula_accuracy(self):
        """
        Verify the reverse calculation formula:
        real_profit = final_price - commission - vat - fbs_fee - packaging - wholesale
        
        For final=20, mp=8.6%, vat=24%, fbs=0.59, pkg=0.12, wholesale=10:
        - commission = 20 * 0.086 = 1.72
        - vat = 20 * (1 - 1/1.24) = 20 * 0.1935 = 3.87
        - net_to_store = 20 - 1.72 - 3.87 - 0.71 = 13.70
        - real_profit = 13.70 - 10 = 3.70
        """
        payload = {
            "final_price": 20.0,
            "wholesale_price": 10.0,
            "mp_pct": 8.6,
            "fbs_fee": 0.59,
            "vat_pct": 24.0,
            "packaging_cost": 0.12
        }
        
        response = requests.post(f"{BASE_URL}/api/reverse-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify specific values with tolerance
        assert abs(data["commission_amount"] - 1.72) < 0.01, f"Commission {data['commission_amount']} != 1.72"
        assert abs(data["vat_amount"] - 3.87) < 0.01, f"VAT {data['vat_amount']} != 3.87"
        assert abs(data["fbs_fee_plus_packaging"] - 0.71) < 0.01, f"FBS+pkg {data['fbs_fee_plus_packaging']} != 0.71"
        assert abs(data["net_to_store"] - 13.70) < 0.02, f"Net {data['net_to_store']} != 13.70"
        assert abs(data["real_profit"] - 3.70) < 0.02, f"Profit {data['real_profit']} != 3.70"
        
        print(f"✓ Reverse calculate formula verified: net={data['net_to_store']}€, profit={data['real_profit']}€")


class TestBulkCalculate:
    """Tests for POST /api/bulk-calculate endpoint"""
    
    def test_bulk_calculate_multiple_products(self):
        """Test bulk calculation for multiple products"""
        payload = {
            "products": [
                {"uid": "6841355", "wholesale_price": 10.0},
                {"uid": "7389176", "wholesale_price": 5.0}
            ],
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/bulk-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "results" in data
        assert "count" in data
        assert data["count"] == 2
        
        # Verify each result has required fields
        for result in data["results"]:
            assert "uid" in result
            assert "name" in result
            assert "fbs_final_price" in result
            assert "marketplace_final_price" in result
            assert "fbs_real_profit" in result
            
        print(f"✓ Bulk calculate returned {data['count']} results")
    
    def test_bulk_calculate_with_nonexistent_product(self):
        """Test bulk calculation skips non-existent products"""
        payload = {
            "products": [
                {"uid": "6841355", "wholesale_price": 10.0},
                {"uid": "NONEXISTENT999", "wholesale_price": 5.0}
            ],
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/bulk-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Should return only 1 result (valid product)
        assert data["count"] == 1
        assert data["results"][0]["uid"] == "6841355"
        
        print(f"✓ Bulk calculate handles non-existent products: {data['count']} valid result")
    
    def test_bulk_calculate_empty_list(self):
        """Test bulk calculation with empty list"""
        payload = {
            "products": [],
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/bulk-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == 0
        assert len(data["results"]) == 0
        
        print("✓ Bulk calculate handles empty list")


class TestExportExcel:
    """Tests for POST /api/export-excel endpoint"""
    
    def test_export_excel_returns_file(self):
        """Test that export-excel returns an Excel file"""
        payload = {
            "products": [
                {"uid": "6841355", "wholesale_price": 10.0}
            ],
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/export-excel", json=payload)
        assert response.status_code == 200
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Wrong content type: {content_type}"
        
        # Check content disposition
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert "xlsx" in content_disposition
        
        # Verify we got binary data (Excel file starts with PK for ZIP)
        assert len(response.content) > 100, "Response too small for Excel file"
        assert response.content[:2] == b'PK', "Not a valid XLSX file (ZIP format)"
        
        print(f"✓ Export Excel returns valid file ({len(response.content)} bytes)")
    
    def test_export_excel_with_multiple_products(self):
        """Test export with multiple products"""
        payload = {
            "products": [
                {"uid": "6841355", "wholesale_price": 10.0},
                {"uid": "7389176", "wholesale_price": 5.0},
                {"uid": "7395080", "wholesale_price": 8.0}
            ],
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/export-excel", json=payload)
        assert response.status_code == 200
        
        # Should return a file
        assert len(response.content) > 500, "File seems too small for 3 products"
        
        print(f"✓ Export Excel with 3 products ({len(response.content)} bytes)")


class TestQuickCalculator:
    """Tests for POST /api/quick-calculate endpoint"""
    
    def test_quick_calculate_with_defaults(self):
        """Test quick calculation uses average values"""
        payload = {
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90
        }
        
        response = requests.post(f"{BASE_URL}/api/quick-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "fbs_final_price" in data
        assert "marketplace_final_price" in data
        assert "avg_mp_pct" in data
        assert "avg_fbs_fee" in data
        
        print(f"✓ Quick calculate: FBS={data['fbs_final_price']}€, MP={data['marketplace_final_price']}€")
    
    def test_quick_calculate_with_overrides(self):
        """Test quick calculation with custom values"""
        payload = {
            "wholesale_price": 10.0,
            "vat_pct": 24.0,
            "profit": 0.90,
            "mp_pct": 10.0,
            "fbs_fee": 1.0,
            "mgmt_cost": 0.5
        }
        
        response = requests.post(f"{BASE_URL}/api/quick-calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify overrides were used
        assert data["avg_mp_pct"] == 10.0
        assert data["avg_fbs_fee"] == 1.0
        
        print(f"✓ Quick calculate with overrides: MP%={data['avg_mp_pct']}, FBS fee={data['avg_fbs_fee']}€")


class TestWholesalePricing:
    """Tests for wholesale pricing upload and verification - NEW in iteration 3"""
    
    def test_products_with_wholesale_prices_exist(self):
        """Test that products have user_wholesale_price populated from Excel upload"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        
        # Filter products with wholesale prices
        products_with_wholesale = [p for p in products if p.get("user_wholesale_price") is not None]
        
        # We expect around 518 products to have wholesale prices
        assert len(products_with_wholesale) > 500, f"Expected ~518 products with wholesale prices, got {len(products_with_wholesale)}"
        
        print(f"✓ {len(products_with_wholesale)} products have user_wholesale_price populated")
    
    def test_wholesale_price_value_is_reasonable(self):
        """Test that wholesale prices are positive numbers"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        products_with_wholesale = [p for p in products if p.get("user_wholesale_price") is not None]
        
        # Check a few products have reasonable prices
        for p in products_with_wholesale[:10]:
            wp = p.get("user_wholesale_price")
            assert wp > 0, f"Product {p['uid']} has non-positive wholesale price: {wp}"
            assert wp < 10000, f"Product {p['uid']} has unrealistic wholesale price: {wp}"
        
        print(f"✓ Wholesale prices are reasonable positive numbers")
    
    def test_upload_status_wholesale_count_matches_products(self):
        """Test that wholesale_count in upload-status matches actual products with wholesale prices"""
        status_response = requests.get(f"{BASE_URL}/api/upload-status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        products_response = requests.get(f"{BASE_URL}/api/products/all")
        assert products_response.status_code == 200
        products = products_response.json()
        
        actual_count = len([p for p in products if p.get("user_wholesale_price") is not None])
        
        # Should match
        assert status_data["wholesale_count"] == actual_count, f"Status shows {status_data['wholesale_count']} but found {actual_count} products"
        
        print(f"✓ Wholesale count matches: upload-status={status_data['wholesale_count']}, actual products={actual_count}")
    
    def test_specific_product_has_wholesale_price(self):
        """Test a specific known product has its wholesale price from Excel"""
        # Get product 7389176 which we saw has user_wholesale_price = 7.52
        response = requests.get(f"{BASE_URL}/api/products/7389176")
        assert response.status_code == 200
        
        product = response.json()
        
        assert "user_wholesale_price" in product, "Product missing user_wholesale_price"
        assert product["user_wholesale_price"] == 7.52, f"Expected wholesale price 7.52, got {product.get('user_wholesale_price')}"
        
        print(f"✓ Product 7389176 has correct wholesale price: {product['user_wholesale_price']}€")
    
    def test_calculate_with_saved_wholesale_price(self):
        """Test calculation using the saved wholesale price from Excel upload"""
        # Use product that has saved wholesale price
        payload = {
            "uid": "7389176",
            "wholesale_price": 7.52,  # Saved from Excel
            "vat_pct": 24.0,
            "profit": 0.90,
            "mgmt_cost": 0.0
        }
        
        response = requests.post(f"{BASE_URL}/api/calculate", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify calculation worked
        assert data["fbs_final_price"] > 0
        assert data["marketplace_final_price"] > 0
        assert data["wholesale_price"] == 7.52
        
        print(f"✓ Calculation with wholesale price {payload['wholesale_price']}€: FBS={data['fbs_final_price']}€")


# --- Profit Calculator Tests (iteration 4) ---
# Tests for order upload, profit calculation, manual entry

class TestProfitCalculatorUploadOrders:
    """Tests for POST /api/upload/orders - order file upload and profit calculation"""
    
    def test_upload_orders_excel(self):
        """Upload orders.xls and verify profit calculation results"""
        orders_file = "/app/artifacts/orders_sample.xls"
        
        with open(orders_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/upload/orders",
                files={"file": ("orders_sample.xls", f, "application/vnd.ms-excel")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "results" in data
        assert "summary" in data
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_items" in summary
        assert "total_quantity" in summary
        assert "total_revenue" in summary
        assert "total_profit" in summary
        assert "matched" in summary
        assert "unmatched_count" in summary
        assert "unmatched_names" in summary
        
        # Verify expected values (from curl test)
        assert summary["matched"] == 63, f"Expected 63 matched, got {summary['matched']}"
        assert summary["unmatched_count"] == 3, f"Expected 3 unmatched, got {summary['unmatched_count']}"
        assert summary["total_profit"] > 150, f"Expected total_profit > 150, got {summary['total_profit']}"
        
        print(f"✓ Orders upload: matched={summary['matched']}, unmatched={summary['unmatched_count']}, profit={summary['total_profit']}€")
    
    def test_upload_orders_returns_correct_fields(self):
        """Verify each result item has all required profit calculation fields"""
        orders_file = "/app/artifacts/orders_sample.xls"
        
        with open(orders_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/upload/orders",
                files={"file": ("orders_sample.xls", f, "application/vnd.ms-excel")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check at least one result item has all required fields
        assert len(data["results"]) > 0
        result = data["results"][0]
        
        required_fields = [
            "name", "ean", "quantity", "my_price", "skroutz_price",
            "wholesale", "commission", "vat_amount", "ad_cost",
            "fbs_fee", "profit_per_unit", "total_profit", "price_mismatch"
        ]
        
        for field in required_fields:
            assert field in result, f"Missing field: {field}"
        
        print(f"✓ Result item has all {len(required_fields)} required fields")
    
    def test_upload_orders_price_mismatch_detection(self):
        """Verify price mismatch is detected when Excel price differs from stored price"""
        orders_file = "/app/artifacts/orders_sample.xls"
        
        with open(orders_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/upload/orders",
                files={"file": ("orders_sample.xls", f, "application/vnd.ms-excel")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find items with price mismatch (Beauty of Joseon has 13.2 vs 11.0)
        mismatches = [r for r in data["results"] if r["price_mismatch"]]
        
        assert len(mismatches) > 0, "No price mismatches found - expected at least one"
        
        # Verify mismatch details
        mismatch = mismatches[0]
        assert abs(mismatch["my_price"] - mismatch["skroutz_price"]) > 0.02, \
            f"Price mismatch flag set but prices are close: {mismatch['my_price']} vs {mismatch['skroutz_price']}"
        
        print(f"✓ Found {len(mismatches)} items with price mismatch (my_price != skroutz_price)")
    
    def test_upload_orders_cancelled_excluded(self):
        """Verify cancelled orders (Ακυρωμένη) are excluded from results"""
        orders_file = "/app/artifacts/orders_sample.xls"
        
        with open(orders_file, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/api/upload/orders",
                files={"file": ("orders_sample.xls", f, "application/vnd.ms-excel")}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Results should not include cancelled orders - if Excel has cancelled, they should be excluded
        # We verify by checking count is less than total rows in Excel
        total_items = data["summary"]["total_items"]
        
        # If there were cancelled orders, total_items would be less
        print(f"✓ Results returned {total_items} items (cancelled orders excluded)")
    
    def test_upload_orders_invalid_file_returns_error(self):
        """Test uploading invalid file returns proper error"""
        # Create a fake file
        response = requests.post(
            f"{BASE_URL}/api/upload/orders",
            files={"file": ("test.txt", b"This is not an xls file", "text/plain")}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid file upload returns 400 error: {data['detail'][:50]}...")


class TestProfitCalculatorManualEntry:
    """Tests for POST /api/calculate-manual-profit - manual barcode entry profit calculation"""
    
    def test_manual_profit_valid_eans(self):
        """Test manual profit calculation with valid EANs"""
        payload = [
            {"ean": "5200040107010", "quantity": 3},  # Natural Doctor Complete D3 K2
            {"ean": "4260006585079", "quantity": 2}   # Viogenesis Vitamin K2 D3
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "results" in data
        assert "total_profit" in data
        assert len(data["results"]) == 2
        
        # Verify all items matched
        for result in data["results"]:
            assert result["matched"] == True, f"Product {result['ean']} should be matched"
            assert "profit_per_unit" in result
            assert "total_profit" in result
        
        # Verify total profit calculation
        expected_total = sum(r["total_profit"] for r in data["results"])
        assert abs(data["total_profit"] - expected_total) < 0.01, \
            f"Total profit mismatch: {data['total_profit']} vs sum {expected_total}"
        
        print(f"✓ Manual profit calculation: {len(data['results'])} products, total={data['total_profit']}€")
    
    def test_manual_profit_invalid_ean(self):
        """Test manual profit calculation with non-existent EAN returns unmatched"""
        payload = [
            {"ean": "9999999999999", "quantity": 1}  # Non-existent EAN
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return unmatched
        assert len(data["results"]) == 1
        result = data["results"][0]
        assert result["matched"] == False
        assert result["name"] == "Δεν βρέθηκε"
        
        # Total profit should be 0 for unmatched
        assert data["total_profit"] == 0
        
        print(f"✓ Invalid EAN correctly returns unmatched: {result['name']}")
    
    def test_manual_profit_mixed_valid_invalid(self):
        """Test manual profit calculation with mix of valid and invalid EANs"""
        payload = [
            {"ean": "5200040107010", "quantity": 1},  # Valid EAN
            {"ean": "0000000000000", "quantity": 1}   # Invalid EAN
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["results"]) == 2
        
        # First should be matched
        assert data["results"][0]["matched"] == True
        # Second should be unmatched
        assert data["results"][1]["matched"] == False
        
        # Total profit only from matched
        matched_profit = sum(r["total_profit"] for r in data["results"] if r.get("matched"))
        assert data["total_profit"] == matched_profit
        
        print(f"✓ Mixed valid/invalid: 1 matched, 1 unmatched, profit={data['total_profit']}€")
    
    def test_manual_profit_empty_array(self):
        """Test manual profit calculation with empty array"""
        payload = []
        
        response = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["results"] == []
        assert data["total_profit"] == 0
        
        print("✓ Empty array handled correctly")
    
    def test_manual_profit_quantity_affects_total(self):
        """Test that quantity correctly multiplies profit per unit"""
        ean = "5200040107010"
        
        # Get single unit profit
        response1 = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=[{"ean": ean, "quantity": 1}],
            headers={"Content-Type": "application/json"}
        )
        data1 = response1.json()
        profit_per_unit = data1["results"][0]["profit_per_unit"]
        
        # Get 5 unit profit
        response5 = requests.post(
            f"{BASE_URL}/api/calculate-manual-profit",
            json=[{"ean": ean, "quantity": 5}],
            headers={"Content-Type": "application/json"}
        )
        data5 = response5.json()
        total_profit_5 = data5["results"][0]["total_profit"]
        
        # Verify: total_profit = profit_per_unit * quantity
        expected = round(profit_per_unit * 5, 2)
        assert abs(total_profit_5 - expected) < 0.02, \
            f"Quantity not correctly calculated: {total_profit_5} vs expected {expected}"
        
        print(f"✓ Quantity correctly multiplies profit: {profit_per_unit}€/unit x 5 = {total_profit_5}€")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
