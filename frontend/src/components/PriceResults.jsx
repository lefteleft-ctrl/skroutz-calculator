import { Truck, Store, Coins, Megaphone } from "lucide-react";

export default function PriceResults({ result }) {
  if (!result) return null;

  return (
    <div>
      {/* Product info */}
      <div className="mb-4 px-1">
        <p className="text-sm text-[var(--text-secondary)]">
          {result.product_name}
        </p>
        <div className="flex gap-3 mt-1 flex-wrap">
          {result.ean && <span className="text-xs text-[var(--text-muted)] mono">EAN: {result.ean}</span>}
          <span className="text-xs text-[var(--text-muted)]">{result.category}</span>
          {result.coins_quantity > 0 && (
            <span className="text-xs text-yellow-500 mono flex items-center gap-1">
              <Coins size={10} /> {result.coins_quantity} coins ({result.coins_eur}€)
            </span>
          )}
          {result.ads_enabled && (
            <span className="text-xs text-[var(--accent-purple)] mono flex items-center gap-1">
              <Megaphone size={10} /> Ads {result.advertising_commission_pct}%
            </span>
          )}
        </div>
      </div>

      {/* Two price cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PriceCard
          type="fbs"
          icon={<Truck size={16} />}
          label="FBS (Fulfilled by Skroutz)"
          finalPrice={result.fbs_final_price}
          breakdown={result.fbs_breakdown}
          feeLabel="FBS Fee + Συσκ. + Coins"
          feeKey="fbs_fee_plus_packaging"
        />
        <PriceCard
          type="mp"
          icon={<Store size={16} />}
          label="Marketplace"
          finalPrice={result.marketplace_final_price}
          breakdown={result.marketplace_breakdown}
          feeLabel="Κόστος Διαχ. + Coins"
          feeKey="management_cost"
        />
      </div>
    </div>
  );
}

function PriceCard({ type, icon, label, finalPrice, breakdown, feeLabel, feeKey }) {
  const accentClass = type === "fbs" ? "text-[var(--accent-orange)]" : "text-[var(--accent-blue)]";
  const borderClass = type === "fbs" ? "result-fbs" : "result-mp";

  return (
    <div
      className={`${borderClass} p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]`}
      data-testid={`result-${type}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className={accentClass}>{icon}</span>
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
      </div>

      {/* Final Price */}
      <div className="mb-4">
        <p className="text-3xl font-bold mono tracking-tight text-[var(--text-primary)]" data-testid={`final-price-${type}`}>
          {finalPrice.toFixed(2)}€
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Τελική τιμή πώλησης (με ΦΠΑ)</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 pt-3 border-t border-[var(--border-color)]">
        <Row label="Χονδρική" value={breakdown.wholesale_price} />
        <Row label="Κέρδος" value={breakdown.profit_target} accent="green" />
        <Row label={feeLabel} value={breakdown[feeKey]} />
        <Row label={`Προμήθεια MP (${breakdown.commission_pct}%)`} value={breakdown.commission_amount} accent="orange" />
        {breakdown.ads_pct > 0 && (
          <Row label={`Διαφήμιση (${breakdown.ads_pct}%)`} value={breakdown.ads_amount} accent="purple" />
        )}
        <Row label={`ΦΠΑ (${breakdown.vat_pct}%)`} value={breakdown.vat_amount} />
        <div className="pt-2 border-t border-[var(--border-color)]">
          <Row label="Καθαρό στο κατάστημα" value={breakdown.net_to_store} bold />
          <Row label="Πραγματικό κέρδος" value={breakdown.real_profit} accent="green" bold />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent, bold }) {
  const colorMap = {
    green: "text-[var(--accent-green)]",
    orange: "text-[var(--accent-orange)]",
    blue: "text-[var(--accent-blue)]",
    purple: "text-[var(--accent-purple)]",
  };
  const valueColor = accent ? colorMap[accent] : "text-[var(--text-primary)]";

  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${bold ? "font-medium text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
        {label}
      </span>
      <span className={`text-xs mono ${bold ? "font-semibold" : ""} ${valueColor}`}>
        {typeof value === "number" ? value.toFixed(2) : value}€
      </span>
    </div>
  );
}
