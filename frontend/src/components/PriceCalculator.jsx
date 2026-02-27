import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Loader2 } from "lucide-react";

export default function PriceCalculator({ product, onCalculate, calculating, disabled }) {
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [vatPct, setVatPct] = useState("24");
  const [profit, setProfit] = useState("0.90");
  const [mgmtCost, setMgmtCost] = useState("0");

  const handleSubmit = (e) => {
    e.preventDefault();
    const wp = parseFloat(wholesalePrice);
    if (isNaN(wp) || wp <= 0) return;
    onCalculate({
      wholesalePrice: wp,
      vatPct: parseFloat(vatPct),
      profit: parseFloat(profit) || 0,
      mgmtCost: parseFloat(mgmtCost) || 0,
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Wholesale Price */}
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="wholesale" className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            Χονδρική Τιμή (€)
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
          <Label htmlFor="vat" className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            ΦΠΑ %
          </Label>
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
          <Label htmlFor="profit" className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            Κέρδος (€)
          </Label>
          <Input
            id="profit"
            data-testid="profit-input"
            type="number"
            step="0.01"
            min="0"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
          />
        </div>

        {/* Management Cost */}
        <div>
          <Label htmlFor="mgmt" className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            Κόστος Διαχ. (€)
          </Label>
          <Input
            id="mgmt"
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
        Υπολογισμός
      </Button>
    </form>
  );
}
