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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
