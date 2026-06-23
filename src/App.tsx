import { useEffect, useRef, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import { LoginPage } from "@/components/auth/LoginPage";
import { useAuthStore } from "@/store/authStore";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import PDV from "./pages/PDV";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Caixa from "./pages/Caixa";
import Vendas from "./pages/Vendas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const fetchAll = useStore(s => s.fetchAll);
  const loading = useStore(s => s.loading);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Debounced fetchAll to avoid rapid re-fetches when multiple tables change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetchAll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAll(), 500);
  }, [fetchAll]);

  // Real-time subscriptions — refetch on any change
  useEffect(() => {
    const channel = supabase
      .channel('realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_registers' }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borders' }, debouncedFetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'soda_products' }, debouncedFetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debouncedFetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        <TopNav />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<PDV />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

const App = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner position="bottom-right" />
        {isAuthenticated ? <AuthenticatedApp /> : <LoginPage />}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
