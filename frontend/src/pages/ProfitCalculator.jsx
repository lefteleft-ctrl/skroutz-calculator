import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Loader2, Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProfitCalculator() {
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [manualItems, setManualItems] = useState([{ search: "", ean: "", name: "", quantity: 1 }]);
  const [manualResults, setManualResults] = useState(null);
  const [calculatingManual, setCalculatingManual] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const fileRef = useRef(null);
  const searchTimers = useRef({});

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/upload/orders`, formData);
      setResults(res.data.results);
      setSummary(res.data.summary);
      toast.success(`${res.data.summary.matched} προϊόντα αντιστοιχήθηκαν`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Σφάλμα φόρτωσης");
    } finally {
      setUploading(false);
    }
  };

  const handleManualCalc = async () => {
    const valid = manualItems.filter((i) => i.ean.trim());
    if (!valid.length) { toast.error("Επιλέξτε τουλάχιστον ένα προϊόν"); return; }
    setCalculatingManual(true);
    try {
      const res = await axios.post(`${API}/calculate-manual-profit`, valid.map(i => ({ ean: i.ean, quantity: i.quantity })));
      setManualResults(res.data);
      toast.success("Υπολογισμός ολοκληρώθηκε");
    } catch (e) {
      toast.error("Σφάλμα υπολογισμού");
    } finally {
      setCalculatingManual(false);
    }
  };

  const addManualRow = () => setManualItems([...manualItems, { search: "", ean: "", name: "", quantity: 1 }]);
  const removeManualRow = (i) => {
    setManualItems(manualItems.filter((_, idx) => idx !== i));
    setSuggestions((prev) => { const n = { ...prev }; delete n[i]; return n; });
  };
  const updateManualQty = (i, val) => {
    const copy = [...manualItems];
    copy[i].quantity = parseInt(val) || 1;
    setManualItems(copy);
  };

  const handleSearch = (i, val) => {
    const copy = [...manualItems];
    copy[i].search = val;
    copy[i].ean = "";
    copy[i].name = "";
    setManualItems(copy);

    if (searchTimers.current[i]) clearTimeout(searchTimers.current[i]);
    if (val.length < 2) { setSuggestions((prev) => ({ ...prev, [i]: [] })); return; }

    searchTimers.current[i] = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/products/search`, { params: { q: val, limit: 8 } });
        setSuggestions((prev) => ({ ...prev, [i]: res.data }));
      } catch { setSuggestions((prev) => ({ ...prev, [i]: [] })); }
    }, 300);
  };

  const selectProduct = (i, product) => {
    const copy = [...manualItems];
    copy[i].search = product.name;
    copy[i].ean = product.ean;
    copy[i].name = product.name;
    setManualItems(copy);
    setSuggestions((prev) => ({ ...prev, [i]: [] }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors" data-testid="back-btn">
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Υπολογισμός Κέρδους</h1>
          <p className="text-xs text-[var(--text-muted)]">Ανεβάστε Excel πωλήσεων ή προσθέστε χειροκίνητα</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Excel Παραγγελιών Skroutz</h2>
        <div
          className="dropzone cursor-pointer"
          onClick={() => fileRef.current?.click()}
          data-testid="orders-upload"
        >
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
          {uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 text-[var(--accent-orange)] animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Επεξεργασία...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[var(--accent-orange)]" />
              <span className="text-sm text-[var(--text-secondary)]">Σύρετε ή κλικ για upload (.xls)</span>
            </div>
          )}
        </div>
      </div>

      {/* Excel Results */}
      {results && summary && (
        <div className="mb-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Πωλήσεις" value={summary.total_quantity} />
            <SummaryCard label="Έσοδα" value={`${summary.total_revenue.toFixed(2)}€`} />
            <SummaryCard
              label="Κέρδος"
              value={`${summary.total_profit >= 0 ? "+" : ""}${summary.total_profit.toFixed(2)}€`}
              color={summary.total_profit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}
            />
            <SummaryCard label="Μη αντιστοιχ." value={summary.unmatched_count} color={summary.unmatched_count > 0 ? "text-yellow-500" : ""} />
          </div>

          {/* Unmatched warning */}
          {summary.unmatched_count > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500">{summary.unmatched_count} προϊόντα δεν αντιστοιχήθηκαν</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{summary.unmatched_names.join(", ")}</p>
            </div>
          )}

          {/* Results Table */}
          <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="profit-results-table">
                <thead>
                  <tr className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                    <th className="text-left text-xs font-medium text-[var(--text-muted)] px-3 py-2.5 w-[250px]">Προϊόν</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[50px]">Qty</th>
                    <th className="text-center text-xs font-medium text-sky-400 px-2 py-2.5 w-[80px]">Τιμή μου</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[80px]">Τιμή Excel</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[75px]">Χονδρική</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[65px]">Προμ.</th>
                    <th className="text-center text-xs font-medium text-[var(--text-muted)] px-2 py-2.5 w-[55px]">ΦΠΑ</th>
                    <th className="text-center text-xs font-medium text-emerald-400 px-2 py-2.5 w-[80px]">Κέρδος/τμχ</th>
                    <th className="text-center text-xs font-medium text-[var(--accent-orange)] px-2 py-2.5 w-[85px]">Σύνολο</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors">
                      <td className="px-3 py-2">
                        <p className="text-sm text-[var(--text-primary)] truncate max-w-[240px]" title={r.name}>{r.name}</p>
                        <span className="text-[11px] mono text-[var(--text-muted)]">{r.ean}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm mono text-[var(--text-primary)]">{r.quantity}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm mono font-semibold text-sky-400">{r.my_price.toFixed(2)}€</span>
                      </td>
                      <td className="px-2 py-2 text-center" data-testid={`excel-price-${i}`}>
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-sm mono ${r.price_mismatch ? "text-red-500 font-bold" : "text-[var(--text-secondary)]"}`}>
                            {r.skroutz_price.toFixed(2)}€
                          </span>
                          {r.price_mismatch && <AlertTriangle size={12} className="text-red-500" title="Διαφορά τιμής!" />}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm mono text-[var(--text-secondary)]">{r.wholesale.toFixed(2)}€</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm mono text-[var(--text-secondary)]">{r.commission.toFixed(2)}€</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm mono text-[var(--text-secondary)]">{r.vat_amount.toFixed(2)}€</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-sm mono font-semibold ${r.profit_per_unit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}`}>
                          {r.profit_per_unit >= 0 ? "+" : ""}{r.profit_per_unit.toFixed(2)}€
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-sm mono font-bold ${r.total_profit >= 0 ? "text-[var(--accent-orange)]" : "text-red-500"}`}>
                          {r.total_profit >= 0 ? "+" : ""}{r.total_profit.toFixed(2)}€
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--bg-card)] border-t-2 border-[var(--accent-orange)]">
                    <td colSpan={7} className="px-3 py-3 text-right">
                      <span className="text-sm font-bold text-[var(--text-primary)]">ΣΥΝΟΛΟ ΚΕΡΔΟΥΣ:</span>
                    </td>
                    <td colSpan={2} className="px-2 py-3 text-center">
                      <span className={`text-lg mono font-bold ${summary.total_profit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}`}>
                        {summary.total_profit >= 0 ? "+" : ""}{summary.total_profit.toFixed(2)}€
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Section */}
      <div className="p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Χειροκίνητος Υπολογισμός</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">Αναζητήστε με όνομα ή barcode</p>
        <div className="space-y-2 mb-4">
          {manualItems.map((item, i) => (
            <div key={i} className="relative" data-testid={`manual-row-${i}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={item.search}
                    onChange={(e) => handleSearch(i, e.target.value)}
                    placeholder="Αναζήτηση ονόματος ή EAN..."
                    className="bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] text-sm"
                    data-testid={`manual-search-${i}`}
                  />
                  {item.ean && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] mono text-[var(--accent-green)]">
                      {item.ean}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateManualQty(i, e.target.value)}
                  placeholder="Qty"
                  className="w-20 bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] text-sm text-center"
                  data-testid={`manual-qty-${i}`}
                />
                {manualItems.length > 1 && (
                  <button onClick={() => removeManualRow(i)} className="p-2 text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {/* Autocomplete dropdown */}
              {suggestions[i]?.length > 0 && (
                <div className="absolute z-50 left-0 right-20 mt-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg max-h-48 overflow-y-auto">
                  {suggestions[i].map((p) => (
                    <button
                      key={p.uid || p.ean}
                      onClick={() => selectProduct(i, p)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--bg-card)] transition-colors border-b border-[var(--border-color)] last:border-b-0"
                      data-testid={`suggestion-${p.ean}`}
                    >
                      <p className="text-sm text-[var(--text-primary)] truncate">{p.name}</p>
                      <span className="text-[10px] mono text-[var(--text-muted)]">{p.ean}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={addManualRow} variant="outline" size="sm" className="border-[var(--border-color)] text-[var(--text-secondary)]">
            <Plus size={14} className="mr-1" /> Προσθήκη
          </Button>
          <Button onClick={handleManualCalc} disabled={calculatingManual} size="sm" className="bg-[var(--accent-orange)] hover:bg-orange-600 text-white">
            {calculatingManual ? <Loader2 size={14} className="mr-1 animate-spin" /> : <TrendingUp size={14} className="mr-1" />}
            Υπολογισμός
          </Button>
        </div>

        {/* Manual Results */}
        {manualResults && (
          <div className="mt-4 space-y-3">
            {manualResults.results.map((r, i) => (
              <div key={i} className={`p-4 rounded-lg border ${!r.matched ? "border-red-500/30 bg-red-500/5" : r.missing_wholesale ? "border-yellow-500/30 bg-yellow-500/5" : "border-[var(--border-color)]"}`}>
                {!r.matched ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{r.ean}</span>
                    <span className="text-xs text-red-400">Δεν βρέθηκε</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{r.name}</p>
                        <span className="text-xs mono text-[var(--text-muted)]">{r.ean}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl mono font-bold ${r.total_profit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}`}>
                          {r.total_profit >= 0 ? "+" : ""}{r.total_profit.toFixed(2)}€
                        </span>
                        <p className="text-sm mono text-[var(--text-secondary)]">
                          {r.profit_per_unit >= 0 ? "+" : ""}{r.profit_per_unit.toFixed(2)}€ × {r.quantity} τμχ
                        </p>
                      </div>
                    </div>
                    {r.missing_wholesale && (
                      <div className="flex items-center gap-2 mb-3 p-2.5 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
                        <span className="text-sm text-yellow-500 font-semibold">Λείπει η χονδρική τιμή! Το κέρδος δεν είναι ακριβές.</span>
                      </div>
                    )}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
                      <BreakdownItem label="Τιμή" value={`${r.my_price.toFixed(2)}€`} color="text-sky-400" />
                      <BreakdownItem label="Χονδρική" value={`${r.wholesale.toFixed(2)}€`} color={r.missing_wholesale ? "text-yellow-500" : "text-[var(--text-secondary)]"} />
                      <BreakdownItem label={`Προμ. ${r.mp_pct}%`} value={`-${r.commission.toFixed(2)}€`} color="text-red-400" />
                      <BreakdownItem label={`ΦΠΑ ${r.vat_pct}%`} value={`-${r.vat_amount.toFixed(2)}€`} color="text-red-400" />
                      <BreakdownItem label="FBS" value={`-${r.fbs_fee.toFixed(2)}€`} color="text-red-400" />
                      <BreakdownItem label="Μετ/κά" value="-0.12€" color="text-red-400" />
                      <BreakdownItem label={`Ads ${r.ad_pct}%`} value={r.ad_cost > 0 ? `-${r.ad_cost.toFixed(2)}€` : "—"} color={r.ad_cost > 0 ? "text-red-400" : "text-[var(--text-muted)]"} />
                      <BreakdownItem label={`Coins (${r.coins_qty})`} value={r.coins_cost > 0 ? `-${r.coins_cost.toFixed(2)}€` : "—"} color={r.coins_cost > 0 ? "text-red-400" : "text-[var(--text-muted)]"} />
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30">
              <span className="text-sm font-bold text-[var(--text-primary)]">ΣΥΝΟΛΟ:</span>
              <span className={`text-lg mono font-bold ${manualResults.total_profit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}`}>
                {manualResults.total_profit >= 0 ? "+" : ""}{manualResults.total_profit.toFixed(2)}€
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
      <p className="text-[11px] text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-bold mono ${color || "text-[var(--text-primary)]"}`}>{value}</p>
    </div>
  );
}

function BreakdownItem({ label, value, color }) {
  return (
    <div className="p-2 rounded bg-[var(--bg-primary)]">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-sm mono font-semibold ${color}`}>{value}</p>
    </div>
  );
}
