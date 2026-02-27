import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import ExcelUploader from "@/components/ExcelUploader";
import ProductSearch from "@/components/ProductSearch";
import PriceCalculator from "@/components/PriceCalculator";
import PriceResults from "@/components/PriceResults";
import QuickCalculator from "@/components/QuickCalculator";
import { Upload, Search, Calculator as CalcIcon, Zap } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Calculator() {
  const [uploadStatus, setUploadStatus] = useState({ report_listed_count: 0, fbs_products_count: 0 });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/upload-status`);
      setUploadStatus(res.data);
    } catch (e) {
      console.error("Status check failed:", e);
    }
  }, []);

  const handleCalculate = async (params) => {
    if (!selectedProduct) return;
    setCalculating(true);
    try {
      const res = await axios.post(`${API}/calculate`, {
        uid: selectedProduct.uid,
        wholesale_price: params.wholesalePrice,
        vat_pct: params.vatPct,
        profit: params.profit,
        mgmt_cost: params.mgmtCost,
      });
      setCalcResult(res.data);
    } catch (e) {
      const msg = e.response?.data?.detail || "Σφάλμα υπολογισμού";
      toast.error(msg);
    } finally {
      setCalculating(false);
    }
  };

  const hasData = uploadStatus.report_listed_count > 0 || uploadStatus.fbs_products_count > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          Skroutz Price Calculator
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Υπολογισμός τελικών τιμών πώλησης για FBS & Marketplace
        </p>
      </div>

      {/* Quick Calculator */}
      <Section
        number={<Zap size={14} />}
        title="Γρήγορος Υπολογισμός"
        icon={<Zap size={16} />}
        subtitle="Βάλτε χονδρική τιμή → άμεσο αποτέλεσμα με μέσους όρους"
        isQuick
      >
        <QuickCalculator />
      </Section>

      {/* Divider */}
      <div className="relative my-10">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-color)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]">Ή υπολογισμός ανά προϊόν</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      <Section
        number="1"
        title="Φόρτωση Δεδομένων"
        icon={<Upload size={16} />}
        subtitle="Ανεβάστε τα Excel αρχεία από το Skroutz"
      >
        <ExcelUploader status={uploadStatus} onUploadComplete={refreshStatus} />
      </Section>

      {/* Step 2: Search */}
      <Section
        number="2"
        title="Αναζήτηση Προϊόντος"
        icon={<Search size={16} />}
        subtitle="Ψάξτε με όνομα ή barcode/EAN"
        disabled={!hasData}
      >
        <ProductSearch
          onSelect={(p) => { setSelectedProduct(p); setCalcResult(null); }}
          selectedProduct={selectedProduct}
          disabled={!hasData}
        />
      </Section>

      {/* Step 3: Calculate */}
      <Section
        number="3"
        title="Υπολογισμός Τιμής"
        icon={<CalcIcon size={16} />}
        subtitle="Βάλτε χονδρική τιμή και ρυθμίστε παραμέτρους"
        disabled={!selectedProduct}
      >
        <PriceCalculator
          product={selectedProduct}
          onCalculate={handleCalculate}
          calculating={calculating}
          disabled={!selectedProduct}
        />
      </Section>

      {/* Results */}
      {calcResult && (
        <div className="mt-8 fade-in">
          <PriceResults result={calcResult} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 pt-6 border-t border-[var(--border-color)] text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Τύπος: Τελική Τιμή = (Χονδρική + Κέρδος + Fee) &divide; (1 - MP% - (1 - 1/(1+ΦΠΑ%)))
        </p>
      </div>
    </div>
  );
}

function Section({ number, title, icon, subtitle, disabled, children }) {
  return (
    <div className={`mb-8 ${disabled ? "opacity-40 pointer-events-none" : ""}`} data-testid={`section-${number}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent-orange)] text-white text-xs font-bold">
          {number}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent-orange)]">{icon}</span>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {subtitle && (
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">&mdash; {subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}
