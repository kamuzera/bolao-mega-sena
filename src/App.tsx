import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Concursos from "./pages/Concursos";
import Participacoes from "./pages/Participacoes";
import Pagamentos from "./pages/Pagamentos";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import Resultados from "./pages/Resultados";
import Usuarios from "./pages/Usuarios";
import ConfiguracoesAdmin from "./pages/ConfiguracoesAdmin";
import IntegracaoWhatsApp from "./pages/IntegracaoWhatsApp";
import ParticipantesConcurso from "./pages/ParticipantesConcurso";
import NotificarConcurso from "./pages/NotificarConcurso";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/concursos" element={<Layout><Concursos /></Layout>} />
            <Route path="/participacoes" element={<Layout><Participacoes /></Layout>} />
            <Route path="/pagamentos" element={<Layout><Pagamentos /></Layout>} />
            <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
            <Route path="/resultados" element={<Layout><Resultados /></Layout>} />
            <Route path="/usuarios" element={<Layout><Usuarios /></Layout>} />
            <Route path="/integracao-whatsapp" element={<Layout><IntegracaoWhatsApp /></Layout>} />
            <Route path="/configuracoes-admin" element={<Layout><ConfiguracoesAdmin /></Layout>} />
            <Route path="/concursos/:id/participantes" element={<Layout><ParticipantesConcurso /></Layout>} />
            <Route path="/concursos/:id/notificar" element={<Layout><NotificarConcurso /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
