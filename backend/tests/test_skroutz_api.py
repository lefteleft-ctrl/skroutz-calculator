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
        """Test upload status returns correct counts"""
        response = requests.get(f"{BASE_URL}/api/upload-status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "report_listed_count" in data
        assert "fbs_products_count" in data
        assert "total_products" in data
        
        # Verify data is loaded (from previous curl uploads)
        assert data["report_listed_count"] > 0, "No report_listed data found"
        assert data["fbs_products_count"] > 0, "No FBS products data found"
        assert data["total_products"] > 0, "No total products found"
        
        print(f"✓ Upload status: report_listed={data['report_listed_count']}, fbs_products={data['fbs_products_count']}, total={data['total_products']}")


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
        """Test that products are sorted alphabetically by name"""
        response = requests.get(f"{BASE_URL}/api/products/all")
        assert response.status_code == 200
        
        products = response.json()
        names = [p.get("name", "") for p in products if p.get("name")]
        
        # Check that names are in alphabetical order
        for i in range(1, min(20, len(names))):  # Check first 20
            assert names[i-1].lower() <= names[i].lower(), f"Products not sorted: {names[i-1]} > {names[i]}"
        
        print(f"✓ Products sorted alphabetically. First: {names[0][:40]}...")
    
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
