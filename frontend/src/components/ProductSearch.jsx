import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Search, X, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductSearch({ onSelect, selectedProduct, disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API}/products/search`, { params: { q: value } });
        setResults(res.data);
        setShowResults(true);
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelect = (product) => {
    onSelect(product);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setQuery("");
  };

  if (disabled) {
    return (
      <div className="relative">
        <Input placeholder="Πρώτα φορτώστε τα Excel..." disabled className="bg-[var(--bg-input)] border-[var(--border-color)]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedProduct ? (
        <div
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]"
          data-testid="selected-product"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Package className="w-5 h-5 text-[var(--accent-orange)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {selectedProduct.name || selectedProduct.fbs_name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {selectedProduct.ean && (
                  <span className="text-xs text-[var(--text-muted)] mono">EAN: {selectedProduct.ean}</span>
                )}
                {selectedProduct.category && (
                  <span className="text-xs text-[var(--text-muted)]">{selectedProduct.category}</span>
                )}
                {selectedProduct.marketplace_commission_pct && (
                  <span className="text-xs text-[var(--accent-orange)] mono">MP: {selectedProduct.marketplace_commission_pct}%</span>
                )}
                {selectedProduct.fbs_fee != null && (
                  <span className="text-xs text-[var(--accent-blue)] mono">FBS: {selectedProduct.fbs_fee}€</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="shrink-0 p-1 rounded hover:bg-[var(--border-color)] transition-colors"
            data-testid="clear-product-btn"
          >
            <X size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              data-testid="product-search-input"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Αναζήτηση με όνομα ή EAN barcode..."
              className="pl-10 bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[var(--accent-orange)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {showResults && results.length > 0 && (
            <div
              className="absolute z-50 w-full mt-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl max-h-72 overflow-y-auto"
              data-testid="search-results-dropdown"
            >
              {results.map((p) => (
                <button
                  key={p.uid}
                  onClick={() => handleSelect(p)}
                  className="search-result-item w-full text-left px-4 py-3 border-b border-[var(--border-color)] last:border-b-0"
                  data-testid={`search-result-${p.uid}`}
                >
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {p.name || p.fbs_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-muted)] mono">UID: {p.uid}</span>
                    {p.ean && <span className="text-xs text-[var(--text-muted)] mono">EAN: {p.ean}</span>}
                    {p.marketplace_commission_pct != null && (
                      <span className="text-xs text-[var(--accent-orange)] mono">MP: {p.marketplace_commission_pct}%</span>
                    )}
                    {p.fbs_fee != null && (
                      <span className="text-xs text-[var(--accent-blue)] mono">FBS: {p.fbs_fee}€</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && results.length === 0 && query.length >= 2 && !searching && (
            <div className="absolute z-50 w-full mt-1 p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-center">
              <p className="text-sm text-[var(--text-muted)]">Δεν βρέθηκαν αποτελέσματα</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
