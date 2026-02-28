import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Search, Loader2, Megaphone, Coins } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [vatPct, setVatPct] = useState("24");
  const [defaultProfit, setDefaultProfit] = useState("0.90");
  const [wholesalePrices, setWholesalePrices] = useState({});
  const [overridePrices, setOverridePrices] = useState({});
  const [coinsMap, setCoinsMap] = useState({});
  const [adEnabledMap, setAdEnabledMap] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/products/all`).then((r) => {
      setProducts(r.data);
      setLoading(false);
    }).catch(() => { setLoading(false); toast.error("Σφάλμα φόρτωσης προϊόντων"); });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!filter) return products;
    const q = filter.toLowerCase();
    return products.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.ean || "").includes(q) ||
      (p.uid || "").includes(q)
    );
  }, [products, filter]);

  const COIN_COST = 0.0015; // € per coin

  // Forward calculation: wholesale → FBS final price
  const calcFinal = useCallback((cost, mpPct, fbsFee, coinsQty, adPct) => {
    const profit = parseFloat(defaultProfit) || 0;
    const vat = parseFloat(vatPct) / 100;
    const mp = (mpPct || 0) / 100;
    const ad = (adPct || 0) / 100;
    const coinsEur = (coinsQty || 0) * COIN_COST;
    const fixed = (fbsFee || 0) + 0.12 + coinsEur;
    const denom = 1 - mp - ad - (1 - 1 / (1 + vat));
    if (denom <= 0) return null;
    return (cost + profit + fixed) / denom;
  }, [vatPct, defaultProfit]);

  // Reverse calculation: custom final price → profit
  const calcReverseProfit = useCallback((finalPrice, cost, mpPct, fbsFee, coinsQty, adPct) => {
    const vat = parseFloat(vatPct) / 100;
    const mp = (mpPct || 0) / 100;
    const ad = (adPct || 0) / 100;
    const commission = finalPrice * mp;
    const adAmount = finalPrice * ad;
    const vatAmount = finalPrice * (1 - 1 / (1 + vat));
    const coinsEur = (coinsQty || 0) * COIN_COST;
    const fixed = (fbsFee || 0) + 0.12 + coinsEur;
    return finalPrice - commission - adAmount - vatAmount - fixed - cost;
  }, [vatPct]);

  const setWholesale = (uid, val) => {
    setWholesalePrices((prev) => ({ ...prev, [uid]: val }));
    setOverridePrices((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const setOverride = (uid, val) => {
    setOverridePrices((prev) => ({ ...prev, [uid]: val }));
  };

  const setCoins = (uid, val) => {
    setCoinsMap((prev) => ({ ...prev, [uid]: val }));
    setOverridePrices((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const toggleAd = (uid, adPct) => {
    setAdEnabledMap((prev) => ({ ...prev, [uid]: !prev[uid] }));
    setOverridePrices((prev) => { const n = { ...prev }; delete n[uid]; return n; });
  };

  const productsWithPrices = useMemo(() => {
    return filteredProducts.map((p) => {
      const wp = parseFloat(wholesalePrices[p.uid]);
      const hasWholesale = !isNaN(wp) && wp > 0;
      const coins = parseFloat(coinsMap[p.uid]) || 0;
      const adEnabled = !!adEnabledMap[p.uid];
      const adPct = adEnabled ? (p.advertising_commission_pct || 0) : 0;

      const calcPrice = hasWholesale ? calcFinal(wp, p.marketplace_commission_pct, p.fbs_fee, coins, adPct) : null;

      const overrideVal = parseFloat(overridePrices[p.uid]);
      const hasOverride = !isNaN(overrideVal) && overrideVal > 0;

      let reverseProfit = null;
      if (hasWholesale && hasOverride) {
        reverseProfit = calcReverseProfit(overrideVal, wp, p.marketplace_commission_pct, p.fbs_fee, coins, adPct);
      }

      return {
        ...p,
        wholesalePrice: hasWholesale ? wp : null,
        calculatedPrice: calcPrice ? Math.round(calcPrice * 100) / 100 : null,
        overridePrice: hasOverride ? overrideVal : null,
        reverseProfit: reverseProfit !== null ? Math.round(reverseProfit * 100) / 100 : null,
        coins,
        adEnabled,
        adPct,
      };
    });
  }, [filteredProducts, wholesalePrices, overridePrices, coinsMap, adEnabledMap, calcFinal, calcReverseProfit]);

  const handleExport = async () => {
    const toExport = productsWithPrices.filter((p) => p.wholesalePrice);
    if (toExport.length === 0) {
      toast.error("Βάλτε χονδρικές τιμές πρώτα");
      return;
    }
    setExporting(true);
    try {
      const res = await axios.post(`${API}/export-excel`, {
        products: toExport.map((p) => ({ uid: p.uid, wholesale_price: p.wholesalePrice })),
        vat_pct: parseFloat(vatPct),
        profit: parseFloat(defaultProfit) || 0,
        mgmt_cost: 0,
      }, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "skroutz_pricing.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Εξαγωγή ${toExport.length} προϊόντων σε Excel`);
    } catch (e) {
      toast.error("Σφάλμα εξαγωγής");
    } finally {
      setExporting(false);
    }
  };

  const filledCount = Object.values(wholesalePrices).filter((v) => parseFloat(v) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[var(--accent-orange)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors" data-testid="back-btn">
            <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Λίστα Προϊόντων</h1>
            <p className="text-xs text-[var(--text-muted)]">{products.length} προϊόντα αλφαβητικά</p>
          </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || filledCount === 0}
          className="bg-[var(--accent-green)] hover:bg-green-600 text-white"
          data-testid="export-btn"
        >
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Export Excel {filledCount > 0 && `(${filledCount})`}
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 mb-4 p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
        <div className="flex-1">
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Φίλτρο</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              data-testid="product-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Αναζήτηση ονόματος, EAN, UID..."
              className="pl-10 bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="w-24">
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">ΦΠΑ</Label>
          <Select value={vatPct} onValueChange={setVatPct}>
            <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
              <SelectItem value="24">24%</SelectItem>
              <SelectItem value="13">13%</SelectItem>
              <SelectItem value="6">6%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Κέρδος (€)</Label>
          <Input
            data-testid="default-profit"
            type="number"
            step="0.01"
            value={defaultProfit}
            onChange={(e) => setDefaultProfit(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
          />
        </div>
        <div className="text-xs text-[var(--text-muted)] pb-2">
          {filteredProducts.length} / {products.length}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="products-table">
            <thead>
              <tr className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                <th className="text-left text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 min-w-[250px]">Προϊόν</th>
                <th className="text-left text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[100px]">EAN</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[50px]">MP%</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[50px]">FBS€</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[90px]">Χονδρική</th>
                <th className="text-center text-xs font-medium text-yellow-500 px-3 py-2.5 w-[70px]" title="Αριθμός Coins (1 coin = 0.0015€)">
                  <div className="flex items-center justify-center gap-1"><Coins size={12} />Qty</div>
                </th>
                <th className="text-center text-xs font-medium text-[var(--accent-purple)] px-3 py-2.5 w-[65px]" title="Διαφήμιση % — κλικ για ενεργοποίηση">
                  <div className="flex items-center justify-center gap-1"><Megaphone size={12} />%</div>
                </th>
                <th className="text-center text-xs font-medium text-[var(--accent-orange)] px-3 py-2.5 w-[80px]">FBS Τιμή</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[100px]">Δική σου Τιμή</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[70px]">Κέρδος</th>
              </tr>
            </thead>
            <tbody>
              {productsWithPrices.map((p) => (
                <ProductRow
                  key={p.uid}
                  product={p}
                  wholesaleValue={wholesalePrices[p.uid] || ""}
                  overrideValue={overridePrices[p.uid] || ""}
                  coinsValue={coinsMap[p.uid] || ""}
                  onWholesaleChange={(val) => setWholesale(p.uid, val)}
                  onOverrideChange={(val) => setOverride(p.uid, val)}
                  onCoinsChange={(val) => setCoins(p.uid, val)}
                  onToggleAd={() => toggleAd(p.uid)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product, wholesaleValue, overrideValue, coinsValue, onWholesaleChange, onOverrideChange, onCoinsChange, onToggleAd }) {
  const p = product;
  
  let profitDisplay = null;
  let profitColor = "text-[var(--text-muted)]";
  
  if (p.reverseProfit !== null) {
    profitDisplay = p.reverseProfit;
    profitColor = p.reverseProfit >= 0 ? "text-[var(--accent-green)]" : "text-red-400";
  }

  return (
    <tr className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors">
      <td className="px-3 py-2">
        <p className="text-xs text-[var(--text-primary)] truncate max-w-[240px]" title={p.name}>{p.name}</p>
        <span className="text-[10px] text-[var(--text-muted)]">{p.category}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-[10px] mono text-[var(--text-secondary)]">{p.ean || "-"}</span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className="text-xs mono text-[var(--accent-orange)]">{p.marketplace_commission_pct != null ? `${p.marketplace_commission_pct}` : "-"}</span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className="text-xs mono text-[var(--accent-blue)]">{p.fbs_fee != null ? `${p.fbs_fee}` : "-"}</span>
      </td>
      {/* Wholesale price */}
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={wholesaleValue}
          onChange={(e) => onWholesaleChange(e.target.value)}
          placeholder="—"
          className="w-full px-2 py-1 text-xs mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent-orange)] focus:outline-none"
          data-testid={`wholesale-${p.uid}`}
        />
      </td>
      {/* Coins */}
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={coinsValue}
          onChange={(e) => onCoinsChange(e.target.value)}
          placeholder="0"
          className="w-full px-2 py-1 text-xs mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-yellow-500 focus:border-yellow-500 focus:outline-none"
          data-testid={`coins-${p.uid}`}
        />
      </td>
      {/* Advertising toggle */}
      <td className="px-3 py-2 text-center">
        {p.advertising_commission_pct ? (
          <button
            onClick={onToggleAd}
            className={`px-2 py-1 text-xs mono rounded transition-all ${
              p.adEnabled
                ? "bg-[var(--accent-purple)] text-white font-semibold"
                : "bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-purple)]"
            }`}
            title={p.adEnabled ? `Διαφήμιση ενεργή: ${p.advertising_commission_pct}%` : `Κλικ για διαφήμιση ${p.advertising_commission_pct}%`}
            data-testid={`ad-toggle-${p.uid}`}
          >
            {p.advertising_commission_pct}
          </button>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>
      {/* FBS calculated price */}
      <td className="px-3 py-2 text-center">
        {p.calculatedPrice ? (
          <span className="text-xs mono font-semibold text-[var(--accent-orange)]">{p.calculatedPrice.toFixed(2)}€</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>
      {/* Custom override price */}
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={overrideValue}
          onChange={(e) => onOverrideChange(e.target.value)}
          placeholder={p.calculatedPrice ? p.calculatedPrice.toFixed(2) : "-"}
          disabled={!p.calculatedPrice}
          className="w-full px-2 py-1 text-xs mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent-purple)] focus:outline-none disabled:opacity-30"
          data-testid={`override-${p.uid}`}
        />
      </td>
      {/* Profit */}
      <td className="px-3 py-2 text-center">
        {profitDisplay !== null ? (
          <span className={`text-xs mono font-semibold ${profitColor}`}>
            {profitDisplay >= 0 ? "+" : ""}{profitDisplay.toFixed(2)}€
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )}
      </td>
    </tr>
  );
}
