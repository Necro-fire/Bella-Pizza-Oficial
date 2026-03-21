import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import PDV from "./pages/PDV";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Caixa from "./pages/Caixa";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col h-screen">
          <TopNav />
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<PDV />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/caixa" element={<Caixa />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
