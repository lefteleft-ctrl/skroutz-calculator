import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import ExcelUploader from "@/components/ExcelUploader";
import ProductSearch from "@/components/ProductSearch";
import PriceCalculator from "@/components/PriceCalculator";
import PriceResults from "@/components/PriceResults";
import QuickCalculator from "@/components/QuickCalculator";
import { Upload, Search, Calculator as CalcIcon, Zap, List, Save, Settings, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Calculator() {
  const [uploadStatus, setUploadStatus] = useState({ report_listed_count: 0, fbs_products_count: 0 });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

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
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-orange)] transition-colors text-sm text-[var(--text-secondary)] hover:text-[var(--accent-orange)]"
              data-testid="products-list-link"
            >
              <List size={16} />
              <span>Λίστα Προϊόντων</span>
            </Link>
            <Link
              to="/profit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 hover:border-[var(--accent-green)] transition-colors text-sm text-[var(--accent-green)]"
              data-testid="profit-calc-link"
            >
              <CalcIcon size={16} />
              <span>Υπολογισμός Κέρδους</span>
            </Link>
            <button
              onClick={() => setShowFormula(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 hover:border-[var(--accent-purple)] transition-colors text-sm text-[var(--accent-purple)]"
              data-testid="formula-btn"
            >
              <BookOpen size={16} />
              <span>Μαθηματικός Τύπος</span>
            </button>
          </div>
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
          Skroutz Price Calculator &mdash; Pharmaverse
        </p>
      </div>

      {/* Formula Modal */}
      {showFormula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFormula(false)}>
          <div className="max-w-2xl w-full mx-4 p-6 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--accent-purple)]">Μαθηματικός Τύπος</h2>
              <button onClick={() => setShowFormula(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">&times;</button>
            </div>

            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-purple)]/30">
                <p className="text-xs text-[var(--text-muted)] mb-2">Τύπος Τελικής Τιμής FBS:</p>
                <p className="text-base mono font-bold text-[var(--text-primary)] leading-relaxed">
                  Τελική Τιμή = (Χονδρική + Κέρδος + FBS Fee + 0.12 + Coins) / (1 - MP% - Ads% - (1 - 1/(1+ΦΠΑ%)))
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-sky-400 mb-2">Αριθμητής (σταθερά κόστη):</p>
                <div className="space-y-1.5 pl-3">
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">Χονδρική</span> = τιμή αγοράς προϊόντος</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">Κέρδος</span> = επιθυμητό κέρδος σε € (π.χ. 0.90€)</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">FBS Fee</span> = χρέωση Skroutz FBS ανά προϊόν</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">0.12€</span> = μεταφορικά/διαχείριση</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">Coins</span> = αριθμός coins × 0.0015€</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--accent-orange)] mb-2">Παρονομαστής (ποσοστιαία κόστη):</p>
                <div className="space-y-1.5 pl-3">
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">MP%</span> = προμήθεια Marketplace (π.χ. 8.6% = 0.086)</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">Ads%</span> = διαφήμιση (π.χ. 4.56% = 0.0456, ή 0 χωρίς ads)</p>
                  <p className="text-sm text-[var(--text-secondary)]"><span className="text-[var(--text-primary)] font-semibold">(1 - 1/(1+ΦΠΑ%))</span> = επίδραση ΦΠΑ (24% → 0.1935)</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400 mb-2">Παράδειγμα:</p>
                <div className="space-y-1 text-sm mono text-[var(--text-secondary)]">
                  <p>Χονδρική=11.28 + Κέρδος=0.90 + FBS=0.59 + 0.12 = <span className="text-[var(--text-primary)] font-semibold">12.89€</span></p>
                  <p>1 - 0.086 - 0 - 0.1935 = <span className="text-[var(--text-primary)] font-semibold">0.7205</span></p>
                  <p>Τελική Τιμή = 12.89 / 0.7205 = <span className="text-[var(--accent-orange)] font-bold">17.89€</span></p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-2">Υπολογισμός Κέρδους (αντίστροφος):</p>
                <p className="text-sm mono text-[var(--text-secondary)]">
                  Κέρδος = Τιμή Πώλησης - Προμήθεια - Ads - ΦΠΑ - FBS - 0.12 - Coins - Χονδρική
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
