import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Calculator />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
