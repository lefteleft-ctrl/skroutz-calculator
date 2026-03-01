import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Search, Loader2, Megaphone, Coins } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COIN_COST = 0.0015;
const DEFAULT_VAT = "24";
const DEFAULT_PROFIT = "0.90";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [wholesalePrices, setWholesalePrices] = useState({});
  const [overridePrices, setOverridePrices] = useState({});
  const [coinsMap, setCoinsMap] = useState({});
  const [adEnabledMap, setAdEnabledMap] = useState({});
  const [vatMap, setVatMap] = useState({});
  const [profitMap, setProfitMap] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    axios.get(`${API}/products/all`).then((r) => {
      setProducts(r.data);
      const wp = {}, coins = {}, ads = {}, overrides = {}, vats = {}, profits = {};
      for (const p of r.data) {
        if (p.user_wholesale_price) wp[p.uid] = String(p.user_wholesale_price);
        if (p.user_coins_quantity) coins[p.uid] = String(p.user_coins_quantity);
        if (p.user_ads_enabled) ads[p.uid] = true;
        if (p.user_vat_pct != null) vats[p.uid] = String(p.user_vat_pct);
        if (p.user_profit != null) profits[p.uid] = String(p.user_profit);
        const skroutzPrice = p.current_price || p.fbs_current_price;
        if (skroutzPrice) overrides[p.uid] = String(skroutzPrice);
      }
      setWholesalePrices(wp);
      setOverridePrices(overrides);
      setCoinsMap(coins);
      setAdEnabledMap(ads);
      setVatMap(vats);
      setProfitMap(profits);
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

  // Forward calculation: wholesale → FBS final price (per-product vat & profit)
  const calcFinal = useCallback((cost, mpPct, fbsFee, coinsQty, adPct, vatPctVal, profitVal) => {
    const profit = parseFloat(profitVal) || 0;
    const vat = parseFloat(vatPctVal) / 100;
    const mp = (mpPct || 0) / 100;
    const ad = (adPct || 0) / 100;
    const coinsEur = (coinsQty || 0) * COIN_COST;
    const fixed = (fbsFee || 0) + 0.12 + coinsEur;
    const denom = 1 - mp - ad - (1 - 1 / (1 + vat));
    if (denom <= 0) return null;
    return (cost + profit + fixed) / denom;
  }, []);

  // Reverse calculation: custom final price → profit (per-product vat)
  const calcReverseProfit = useCallback((finalPrice, cost, mpPct, fbsFee, coinsQty, adPct, vatPctVal) => {
    const vat = parseFloat(vatPctVal) / 100;
    const mp = (mpPct || 0) / 100;
    const ad = (adPct || 0) / 100;
    const commission = finalPrice * mp;
    const adAmount = finalPrice * ad;
    const vatAmount = finalPrice * (1 - 1 / (1 + vat));
    const coinsEur = (coinsQty || 0) * COIN_COST;
    const fixed = (fbsFee || 0) + 0.12 + coinsEur;
    return finalPrice - commission - adAmount - vatAmount - fixed - cost;
  }, []);

  const productsWithPrices = useMemo(() => {
    return filteredProducts.map((p) => {
      const wp = parseFloat(wholesalePrices[p.uid]);
      const hasWholesale = !isNaN(wp) && wp > 0;
      const coins = parseFloat(coinsMap[p.uid]) || 0;
      const adEnabled = !!adEnabledMap[p.uid];
      const adPct = adEnabled ? (p.advertising_commission_pct || 0) : 0;
      const vatVal = vatMap[p.uid] || DEFAULT_VAT;
      const profitVal = profitMap[p.uid] || DEFAULT_PROFIT;

      const calcPrice = hasWholesale ? calcFinal(wp, p.marketplace_commission_pct, p.fbs_fee, coins, adPct, vatVal, profitVal) : null;

      const overrideVal = parseFloat(overridePrices[p.uid]);
      const hasOverride = !isNaN(overrideVal) && overrideVal > 0;

      let reverseProfit = null;
      if (hasWholesale && hasOverride) {
        reverseProfit = calcReverseProfit(overrideVal, wp, p.marketplace_commission_pct, p.fbs_fee, coins, adPct, vatVal);
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
        vatVal,
        profitVal,
      };
    });
  }, [filteredProducts, wholesalePrices, overridePrices, coinsMap, adEnabledMap, vatMap, profitMap, calcFinal, calcReverseProfit]);

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
        vat_pct: 24,
        profit: 0.90,
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
    <div className="max-w-[1800px] mx-auto px-4 py-6">
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

      {/* Filter only */}
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
                <th className="text-left text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[260px]">Προϊόν</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[55px]">MP%</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[55px]">FBS€</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[95px]">Χονδρική</th>
                <th className="text-center text-xs font-medium text-emerald-400 px-2 py-2.5 w-[72px]">ΦΠΑ%</th>
                <th className="text-center text-xs font-medium text-sky-400 px-2 py-2.5 w-[85px]">Κέρδος€</th>
                <th className="text-center text-xs font-medium text-yellow-500 px-2 py-2.5 w-[72px]" title="Αριθμός Coins (1 coin = 0.0015€)">
                  <div className="flex items-center justify-center gap-1"><Coins size={13} />Qty</div>
                </th>
                <th className="text-center text-xs font-medium text-[var(--accent-purple)] px-2 py-2.5 w-[60px]" title="Διαφήμιση % — κλικ για ενεργοποίηση">
                  <div className="flex items-center justify-center gap-1"><Megaphone size={13} />%</div>
                </th>
                <th className="text-center text-xs font-medium text-[var(--accent-orange)] px-2 py-2.5 w-[90px]">FBS Τιμή</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[100px]">Δική σου Τιμή</th>
                <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[85px]">Κέρδος</th>
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
                  vatValue={vatMap[p.uid] || DEFAULT_VAT}
                  profitValue={profitMap[p.uid] || DEFAULT_PROFIT}
                  onWholesaleChange={(val) => setWholesalePrices((prev) => ({ ...prev, [p.uid]: val }))}
                  onOverrideChange={(val) => setOverridePrices((prev) => ({ ...prev, [p.uid]: val }))}
                  onCoinsChange={(val) => setCoinsMap((prev) => ({ ...prev, [p.uid]: val }))}
                  onToggleAd={() => setAdEnabledMap((prev) => ({ ...prev, [p.uid]: !prev[p.uid] }))}
                  onVatChange={(val) => setVatMap((prev) => ({ ...prev, [p.uid]: val }))}
                  onProfitChange={(val) => setProfitMap((prev) => ({ ...prev, [p.uid]: val }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ product, wholesaleValue, overrideValue, coinsValue, vatValue, profitValue, onWholesaleChange, onOverrideChange, onCoinsChange, onToggleAd, onVatChange, onProfitChange }) {
  const p = product;

  let profitDisplay = null;
  let profitColor = "text-[var(--text-muted)]";

  if (p.reverseProfit !== null) {
    profitDisplay = p.reverseProfit;
    profitColor = p.reverseProfit >= 0 ? "text-[var(--accent-green)]" : "text-red-500 font-bold";
  }

  return (
    <tr className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors">
      <td className="px-3 py-2">
        <p className="text-sm text-[var(--text-primary)] truncate max-w-[250px]" title={p.name}>{p.name}</p>
        <span className="text-[11px] text-[var(--text-muted)] mono">{p.ean || ""}</span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="text-sm mono text-[var(--accent-orange)]">{p.marketplace_commission_pct != null ? `${p.marketplace_commission_pct}` : "-"}</span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="text-sm mono text-[var(--accent-blue)]">{p.fbs_fee != null ? `${p.fbs_fee}` : "-"}</span>
      </td>
      {/* Wholesale price */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          min="0"
          value={wholesaleValue}
          onChange={(e) => onWholesaleChange(e.target.value)}
          placeholder="—"
          className="w-full px-2 py-1.5 text-sm mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent-orange)] focus:outline-none"
          data-testid={`wholesale-${p.uid}`}
        />
      </td>
      {/* VAT per product */}
      <td className="px-2 py-1.5">
        <select
          value={vatValue}
          onChange={(e) => onVatChange(e.target.value)}
          className="w-full px-1 py-1.5 text-sm mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-emerald-400 focus:border-emerald-400 focus:outline-none appearance-none cursor-pointer"
          data-testid={`vat-${p.uid}`}
        >
          <option value="24">24%</option>
          <option value="13">13%</option>
          <option value="6">6%</option>
        </select>
      </td>
      {/* Profit per product */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          min="0"
          value={profitValue}
          onChange={(e) => onProfitChange(e.target.value)}
          placeholder="0.90"
          className="w-full px-2 py-1.5 text-sm mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-sky-400 focus:border-sky-400 focus:outline-none"
          data-testid={`profit-${p.uid}`}
        />
      </td>
      {/* Coins (quantity) */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="1"
          min="0"
          value={coinsValue}
          onChange={(e) => onCoinsChange(e.target.value)}
          placeholder="0"
          className="w-full px-1 py-1.5 text-sm mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-yellow-500 focus:border-yellow-500 focus:outline-none"
          data-testid={`coins-${p.uid}`}
          title={coinsValue ? `${(parseFloat(coinsValue) * 0.0015).toFixed(4)}€` : "Αριθμός coins"}
        />
      </td>
      {/* Advertising toggle */}
      <td className="px-2 py-1.5 text-center">
        {p.advertising_commission_pct ? (
          <button
            onClick={onToggleAd}
            className={`px-2.5 py-1.5 text-sm mono rounded transition-all ${
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
          <span className="text-sm text-[var(--text-muted)]">-</span>
        )}
      </td>
      {/* FBS calculated price */}
      <td className="px-2 py-2 text-center">
        {p.calculatedPrice ? (
          <span className="text-sm mono font-semibold text-[var(--accent-orange)]">{p.calculatedPrice.toFixed(2)}€</span>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">-</span>
        )}
      </td>
      {/* Custom override price */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          min="0"
          value={overrideValue}
          onChange={(e) => onOverrideChange(e.target.value)}
          placeholder={p.calculatedPrice ? p.calculatedPrice.toFixed(2) : "-"}
          className="w-full px-2 py-1.5 text-sm mono text-center rounded bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent-purple)] focus:outline-none"
          data-testid={`override-${p.uid}`}
        />
      </td>
      {/* Profit */}
      <td className="px-2 py-2 text-center">
        {profitDisplay !== null ? (
          <span className={`text-sm mono font-semibold ${profitColor}`}>
            {profitDisplay >= 0 ? "+" : ""}{profitDisplay.toFixed(2)}€
          </span>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">-</span>
        )}
      </td>
    </tr>
  );
}
