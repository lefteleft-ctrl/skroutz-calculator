import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, CheckCircle, FileSpreadsheet, Loader2, DollarSign } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ExcelUploader({ status, onUploadComplete }) {
  const [uploading, setUploading] = useState({ listed: false, fbs: false, wholesale: false });
  const listedRef = useRef(null);
  const fbsRef = useRef(null);
  const wholesaleRef = useRef(null);

  useEffect(() => {
    onUploadComplete();
  }, [onUploadComplete]);

  const handleUpload = async (file, type) => {
    const key = type === "report-listed" ? "listed" : type === "fbs-products" ? "fbs" : "wholesale";
    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = type === "wholesale" ? "upload/wholesale" : `upload/${type}`;
      const res = await axios.post(`${API}/${endpoint}`, formData);
      toast.success(res.data.message);
      onUploadComplete();
    } catch (e) {
      const msg = e.response?.data?.detail || "Σφάλμα φόρτωσης";
      toast.error(msg);
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <DropZone
        inputRef={listedRef}
        label="Report Listed"
        description="Προμήθειες Marketplace %"
        loaded={status.report_listed_count > 0}
        count={status.report_listed_count}
        loading={uploading.listed}
        onFile={(f) => handleUpload(f, "report-listed")}
      />
      <DropZone
        inputRef={fbsRef}
        label="FBS Products"
        description="Προμήθειες FBS, βάρη, κόστη"
        loaded={status.fbs_products_count > 0}
        count={status.fbs_products_count}
        loading={uploading.fbs}
        onFile={(f) => handleUpload(f, "fbs-products")}
      />
      <DropZone
        inputRef={wholesaleRef}
        label="Χονδρικές Τιμές"
        description="Τιμές αγοράς ανά barcode"
        loaded={(status.wholesale_count || 0) > 0}
        count={status.wholesale_count || 0}
        loading={uploading.wholesale}
        onFile={(f) => handleUpload(f, "wholesale")}
        accent
      />
    </div>
  );
}

function DropZone({ inputRef, label, description, loaded, count, loading, onFile }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragOver ? "active" : ""} ${loaded ? "loaded" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      data-testid={`dropzone-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-[var(--accent-orange)] animate-spin" />
          <span className="text-sm text-[var(--text-secondary)]">Φόρτωση...</span>
        </div>
      ) : loaded ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-[var(--accent-green)]" />
          <span className="text-sm font-medium text-[var(--accent-green)]">{label}</span>
          <span className="text-xs text-[var(--text-muted)]">{count} προϊόντα φορτώθηκαν</span>
          <span className="text-xs text-[var(--text-muted)] mt-1">Κλικ για ενημέρωση</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-[var(--text-muted)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
          <span className="text-xs text-[var(--text-muted)]">{description}</span>
          <span className="text-xs text-[var(--text-muted)] mt-1">Σύρετε ή κάντε κλικ</span>
        </div>
      )}
    </div>
  );
}
