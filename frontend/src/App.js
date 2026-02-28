import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Calculator from "@/pages/Calculator";
import ProductList from "@/pages/ProductList";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/products" element={<ProductList />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
