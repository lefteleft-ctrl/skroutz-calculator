import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import ExcelUploader from "@/components/ExcelUploader";
import ProductSearch from "@/components/ProductSearch";
import PriceCalculator from "@/components/PriceCalculator";
import PriceResults from "@/components/PriceResults";
import QuickCalculator from "@/components/QuickCalculator";
import { Upload, Search, Calculator as CalcIcon, Zap, List, Save, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

  const [lastCalcParams, setLastCalcParams] = useState(null);
  const [saving, setSaving] = useState(false);

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
        coins_quantity: params.coinsQuantity || 0,
        ads_enabled: params.adsEnabled || false,
      });
      setCalcResult(res.data);
      setLastCalcParams(params);
    } catch (e) {
      const msg = e.response?.data?.detail || "Σφάλμα υπολογισμού";
      toast.error(msg);
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProduct || !lastCalcParams) return;
    setSaving(true);
    try {
      await axios.post(`${API}/save-product-settings`, {
        uid: selectedProduct.uid,
        wholesale_price: lastCalcParams.wholesalePrice,
        coins_quantity: lastCalcParams.coinsQuantity || 0,
        ads_enabled: lastCalcParams.adsEnabled || false,
        profit: lastCalcParams.profit,
        vat_pct: lastCalcParams.vatPct,
      });
      toast.success("Αποθηκεύτηκε στη λίστα προϊόντων");
    } catch (e) {
      toast.error("Σφάλμα αποθήκευσης");
    } finally {
      setSaving(false);
    }
  };

  const hasData = uploadStatus.report_listed_count > 0 || uploadStatus.fbs_products_count > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Skroutz Price Calculator
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Υπολογισμός τελικών τιμών πώλησης για FBS & Marketplace
          </p>
        </div>
        {hasData && (
          <Link
            to="/products"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-orange)] transition-colors text-sm text-[var(--text-secondary)] hover:text-[var(--accent-orange)]"
            data-testid="products-list-link"
          >
            <List size={16} />
            <span>Λίστα Προϊόντων</span>
          </Link>
        )}
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

      {/* Step 1: Search */}
      <Section
        number="1"
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

      {/* Step 2: Calculate */}
      <Section
        number="2"
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
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              data-testid="save-btn"
              className="bg-[var(--accent-green)] hover:bg-green-600 text-white font-semibold px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Αποθήκευση..." : "Αποθήκευση στη Λίστα"}
            </Button>
          </div>
        </div>
      )}

      {/* Settings: Upload */}
      <div className="mt-16 pt-8 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--border-hover)] text-[var(--text-muted)] text-xs">
            <Settings size={14} />
          </span>
          <h2 className="text-base font-semibold text-[var(--text-secondary)]">Φόρτωση Δεδομένων</h2>
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">&mdash; Ανεβάστε τα Excel αρχεία από το Skroutz</span>
        </div>
        <ExcelUploader status={uploadStatus} onUploadComplete={refreshStatus} />
      </div>

      {/* Footer */}
      <div className="mt-16 pt-6 border-t border-[var(--border-color)] text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Τύπος: Τελική Τιμή = (Χονδρική + Κέρδος + Fee + Coins) &divide; (1 - MP% - Ads% - (1 - 1/(1+ΦΠΑ%)))
        </p>
      </div>
    </div>
  );
}

function Section({ number, title, icon, subtitle, disabled, isQuick, children }) {
  return (
    <div className={`mb-8 ${disabled ? "opacity-40 pointer-events-none" : ""}`} data-testid={isQuick ? "section-quick" : `section-${number}`}>
      <div className="flex items-center gap-3 mb-4">
        {isQuick ? (
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500 text-black text-xs font-bold">
            <Zap size={14} />
          </span>
        ) : (
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent-orange)] text-white text-xs font-bold">
            {number}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={isQuick ? "text-yellow-500" : "text-[var(--accent-orange)]"}>{icon}</span>
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
