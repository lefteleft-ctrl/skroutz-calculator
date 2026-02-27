import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Truck, Store } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuickCalculator() {
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [vatPct, setVatPct] = useState("24");
  const [profit, setProfit] = useState("0.90");
  const [averages, setAverages] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/averages`).then((r) => setAverages(r.data)).catch(() => {});
  }, []);

  const handleCalculate = useCallback(async () => {
    const wp = parseFloat(wholesalePrice);
    if (isNaN(wp) || wp <= 0) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/quick-calculate`, {
        wholesale_price: wp,
        vat_pct: parseFloat(vatPct),
        profit: parseFloat(profit) || 0,
      });
      setResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [wholesalePrice, vatPct, profit]);

  // Auto-calculate on input change
  useEffect(() => {
    const wp = parseFloat(wholesalePrice);
    if (!isNaN(wp) && wp > 0) {
      const timer = setTimeout(handleCalculate, 400);
      return () => clearTimeout(timer);
    } else {
      setResult(null);
    }
  }, [wholesalePrice, vatPct, profit, handleCalculate]);

  return (
    <div className="p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
      {/* Inputs row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            Χονδρική Τιμή (€)
          </Label>
          <Input
            data-testid="quick-wholesale-input"
            type="number"
            step="0.01"
            min="0"
            value={wholesalePrice}
            onChange={(e) => setWholesalePrice(e.target.value)}
            placeholder="0.00"
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono text-lg"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">ΦΠΑ</Label>
          <Select value={vatPct} onValueChange={setVatPct}>
            <SelectTrigger data-testid="quick-vat-select" className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
              <SelectItem value="24">24%</SelectItem>
              <SelectItem value="13">13%</SelectItem>
              <SelectItem value="6">6%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">Κέρδος (€)</Label>
          <Input
            data-testid="quick-profit-input"
            type="number"
            step="0.01"
            min="0"
            value={profit}
            onChange={(e) => setProfit(e.target.value)}
            className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] mono"
          />
        </div>
      </div>

      {/* Averages info */}
      {averages && averages.products_count > 0 && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          <span>Μ.Ο. Προμήθεια MP: <span className="mono text-[var(--accent-orange)]">{averages.avg_marketplace_commission_pct}%</span></span>
          <span>Μ.Ο. FBS Fee: <span className="mono text-[var(--accent-blue)]">{averages.avg_fbs_fee}€</span></span>
          <span>Συσκευασία: <span className="mono">{averages.packaging_cost}€</span></span>
          <span className="text-[var(--text-muted)]">({averages.products_count} προϊόντα)</span>
        </div>
      )}

      {/* Results - inline */}
      {result && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
          <QuickResultCard
            type="fbs"
            icon={<Truck size={14} />}
            label="FBS"
            price={result.fbs_final_price}
            breakdown={result.fbs_breakdown}
          />
          <QuickResultCard
            type="mp"
            icon={<Store size={14} />}
            label="Marketplace"
            price={result.marketplace_final_price}
            breakdown={result.marketplace_breakdown}
          />
        </div>
      )}
    </div>
  );
}

function QuickResultCard({ type, icon, label, price, breakdown }) {
  const accent = type === "fbs" ? "var(--accent-orange)" : "var(--accent-blue)";
  const borderClass = type === "fbs" ? "result-fbs" : "result-mp";

  return (
    <div className={`${borderClass} p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]`} data-testid={`quick-result-${type}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: accent }}>{icon}</span>
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase">{label}</span>
        </div>
        <p className="text-2xl font-bold mono text-[var(--text-primary)]" data-testid={`quick-price-${type}`}>
          {price.toFixed(2)}€
        </p>
      </div>
      <div className="mt-3 space-y-1">
        <MiniRow label="Προμήθεια" value={`${breakdown.commission_amount.toFixed(2)}€ (${breakdown.commission_pct}%)`} />
        <MiniRow label="ΦΠΑ" value={`${breakdown.vat_amount.toFixed(2)}€`} />
        <MiniRow label="Καθαρό" value={`${breakdown.net_to_store.toFixed(2)}€`} />
        <MiniRow label="Κέρδος" value={`${breakdown.real_profit.toFixed(2)}€`} accent />
      </div>
    </div>
  );
}

function MiniRow({ label, value, accent }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`mono ${accent ? "text-[var(--accent-green)] font-medium" : "text-[var(--text-secondary)]"}`}>{value}</span>
    </div>
  );
}
