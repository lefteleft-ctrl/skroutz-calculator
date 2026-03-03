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
  const [manualItems, setManualItems] = useState([{ ean: "", quantity: 1 }]);
  const [manualResults, setManualResults] = useState(null);
  const [calculatingManual, setCalculatingManual] = useState(false);
  const fileRef = useRef(null);

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
    if (!valid.length) { toast.error("Βάλτε τουλάχιστον ένα barcode"); return; }
    setCalculatingManual(true);
    try {
      const res = await axios.post(`${API}/calculate-manual-profit`, valid);
      setManualResults(res.data);
      toast.success("Υπολογισμός ολοκληρώθηκε");
    } catch (e) {
      toast.error("Σφάλμα υπολογισμού");
    } finally {
      setCalculatingManual(false);
    }
  };

  const addManualRow = () => setManualItems([...manualItems, { ean: "", quantity: 1 }]);
  const removeManualRow = (i) => setManualItems(manualItems.filter((_, idx) => idx !== i));
  const updateManualRow = (i, field, val) => {
    const copy = [...manualItems];
    copy[i][field] = field === "quantity" ? parseInt(val) || 1 : val;
    setManualItems(copy);
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
        <div className="space-y-2 mb-4">
          {manualItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2" data-testid={`manual-row-${i}`}>
              <Input
                value={item.ean}
                onChange={(e) => updateManualRow(i, "ean", e.target.value)}
                placeholder="EAN / Barcode"
                className="flex-1 bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] text-sm"
              />
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateManualRow(i, "quantity", e.target.value)}
                placeholder="Qty"
                className="w-20 bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] text-sm text-center"
              />
              {manualItems.length > 1 && (
                <button onClick={() => removeManualRow(i)} className="p-2 text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
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
          <div className="mt-4 space-y-2">
            {manualResults.results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${r.matched ? "border-[var(--border-color)]" : "border-red-500/30 bg-red-500/5"}`}>
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{r.name}</p>
                  <span className="text-[11px] mono text-[var(--text-muted)]">{r.ean} x{r.quantity}</span>
                </div>
                {r.matched ? (
                  <div className="text-right">
                    <span className={`text-sm mono font-bold ${r.total_profit >= 0 ? "text-[var(--accent-green)]" : "text-red-500"}`}>
                      {r.total_profit >= 0 ? "+" : ""}{r.total_profit.toFixed(2)}€
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)]">{r.profit_per_unit.toFixed(2)}€/τμχ</p>
                  </div>
                ) : (
                  <span className="text-xs text-red-400">Δεν βρέθηκε</span>
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
