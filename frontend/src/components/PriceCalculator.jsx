import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Loader2, Coins, Megaphone } from "lucide-react";

export default function PriceCalculator({ product, onCalculate, calculating, disabled }) {
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [vatPct, setVatPct] = useState("24");
  const [profit, setProfit] = useState("0.90");
  const [mgmtCost, setMgmtCost] = useState("0");
  const [coinsQty, setCoinsQty] = useState("0");
  const [adsEnabled, setAdsEnabled] = useState(false);

  // Reset when product changes
  useEffect(() => {
    setAdsEnabled(false);
    setCoinsQty("0");
  }, [product?.uid]);

  const adsPct = product?.advertising_commission_pct || 0;
  const coinsEur = (parseInt(coinsQty) || 0) * 0.0015;

  const handleSubmit = (e) => {
    e.preventDefault();
    const wp = parseFloat(wholesalePrice);
    if (isNaN(wp) || wp <= 0) return;
    onCalculate({
      wholesalePrice: wp,
      vatPct: parseFloat(vatPct),
      profit: parseFloat(profit) || 0,
      mgmtCost: parseFloat(mgmtCost) || 0,
      coinsQuantity: parseInt(coinsQty) || 0,
      adsEnabled,
    });
  };

  if (disabled) {
    return (
      <div className="p-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
        <p className="text-sm text-[var(--text-muted)] text-center">Πρώτα επιλέξτε προϊόν</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        {/* Wholesale Price */}
        <div>
          <Label htmlFor="wholesale" className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            Χονδρική (€)
          </Label>
          <Input
            id="wholesale"
            data-testid="wholesale-price-input"
            type="number"
            step="0.01"
            min="0"
            value={wholesalePrice}
            onChange={(e) => setWholesalePrice(e.target.value)}
            placeholder="0.00"
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
            required
          />
        </div>

        {/* VAT */}
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">ΦΠΑ</Label>
          <Select value={vatPct} onValueChange={setVatPct}>
            <SelectTrigger data-testid="vat-select" className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
              <SelectItem value="24">24%</SelectItem>
              <SelectItem value="13">13%</SelectItem>
              <SelectItem value="6">6%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Profit */}
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Κέρδος (€)</Label>
          <Input
            data-testid="profit-input"
            type="number"
            step="0.01"
            min="0"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
          />
        </div>

        {/* Coins */}
        <div>
          <Label className="text-xs text-yellow-500 mb-1.5 flex items-center gap-1">
            <Coins size={12} /> Coins
          </Label>
          <Input
            data-testid="coins-input"
            type="number"
            step="1"
            min="0"
            value={coinsQty}
            onChange={(e) => setCoinsQty(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-yellow-500 mono"
            title={`${coinsEur.toFixed(4)}€`}
          />
          {parseInt(coinsQty) > 0 && (
            <span className="text-[10px] text-yellow-500/60 mono mt-0.5 block">{coinsEur.toFixed(4)}€</span>
          )}
        </div>

        {/* Advertising */}
        <div>
          <Label className="text-xs text-[var(--accent-purple)] mb-1.5 flex items-center gap-1">
            <Megaphone size={12} /> Διαφήμιση
          </Label>
          {adsPct > 0 ? (
            <button
              type="button"
              onClick={() => setAdsEnabled(!adsEnabled)}
              data-testid="ads-toggle"
              className={`w-full h-9 rounded-md text-sm mono font-medium transition-all ${
                adsEnabled
                  ? "bg-[var(--accent-purple)] text-white"
                  : "bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-purple)]"
              }`}
            >
              {adsPct}%
            </button>
          ) : (
            <div className="h-9 flex items-center justify-center text-xs text-[var(--text-muted)]">—</div>
          )}
        </div>

        {/* Management Cost */}
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Κόστος Διαχ.</Label>
          <Input
            data-testid="mgmt-cost-input"
            type="number"
            step="0.01"
            min="0"
            value={mgmtCost}
            onChange={(e) => setMgmtCost(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
          />
        </div>
      </div>

      <Button
        type="submit"
        data-testid="calculate-btn"
        disabled={calculating || !wholesalePrice}
        className="mt-4 w-full bg-[var(--accent-orange)] hover:bg-[#ea6c10] text-white font-semibold"
      >
        {calculating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Calculator className="w-4 h-4 mr-2" />
        )}
        Υπολογισμός & Αποθήκευση
      </Button>
    </form>
  );
}
