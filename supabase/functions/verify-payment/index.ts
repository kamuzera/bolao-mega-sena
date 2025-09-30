import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando verificação de pagamento");

    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("sessionId é obrigatório");
    }

    logStep("Session ID recebido", { sessionId });

    // Get Stripe configuration using secure RPC function
    const { data: stripeConfig, error: configError } = await supabaseClient
      .rpc('get_stripe_config_for_edge_functions');

    if (configError || !stripeConfig || stripeConfig.length === 0 || !stripeConfig[0].secret_key) {
      logStep("Erro: Chaves do Stripe não configuradas", { configError });
      throw new Error("Chaves do Stripe não configuradas no sistema. Configure nas configurações administrativas.");
    }

    // Initialize Stripe with configured key
    const stripe = new Stripe(stripeConfig[0].secret_key, {
      apiVersion: "2025-08-27.basil",
    });
    
    logStep("Stripe inicializado com chave configurada");

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Sessão Stripe recuperada", { 
      sessionId: session.id, 
      paymentStatus: session.payment_status,
      metadata: session.metadata 
    });

    // Find payment record in database
    const { data: pagamento, error: pagamentoError } = await supabaseClient
      .from('pagamentos')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (pagamentoError || !pagamento) {
      throw new Error("Registro de pagamento não encontrado");
    }

    logStep("Registro de pagamento encontrado", { pagamentoId: pagamento.id, status: pagamento.status });

    // Update payment status based on Stripe session
    let newStatus = pagamento.status;
    let shouldCreateParticipacao = false;

    if (session.payment_status === 'paid' && pagamento.status === 'pendente') {
      newStatus = 'pago';
      shouldCreateParticipacao = true;
      logStep("Pagamento confirmado, atualizando status");
    } else if (session.payment_status === 'unpaid') {
      newStatus = 'pendente';
    }

    // Update payment record
    const { error: updateError } = await supabaseClient
      .from('pagamentos')
      .update({ 
        status: newStatus,
        stripe_payment_intent_id: session.payment_intent 
      })
      .eq('id', pagamento.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`);
    }

    // If payment is confirmed, create or update participation record
    if (shouldCreateParticipacao) {
      logStep("Processando participação para pagamento confirmado");

      // Get contest details
      const { data: concurso } = await supabaseClient
        .from('concursos')
        .select('*')
        .eq('id', pagamento.concurso_id)
        .single();

      if (concurso) {
        // Check if user already has a participation in this contest
        const { data: participacaoExistente } = await supabaseClient
          .from('participacoes')
          .select('*')
          .eq('user_id', pagamento.user_id)
          .eq('concurso_id', pagamento.concurso_id)
          .single();

        if (participacaoExistente) {
          // Update existing participation - add cotas and valor
          const novaQuantidadeCotas = participacaoExistente.quantidade_cotas + pagamento.quantidade_cotas;
          const novoValorTotal = participacaoExistente.valor_total + pagamento.valor_total;

          const { error: updateError } = await supabaseClient
            .from('participacoes')
            .update({
              quantidade_cotas: novaQuantidadeCotas,
              valor_total: novoValorTotal
            })
            .eq('id', participacaoExistente.id);

          if (updateError) {
            logStep("Erro ao atualizar participação existente", { error: updateError.message });
          } else {
            logStep("Participação existente atualizada com sucesso", { 
              cotasAntigas: participacaoExistente.quantidade_cotas,
              cotasNovas: novaQuantidadeCotas,
              valorAntigo: participacaoExistente.valor_total,
              valorNovo: novoValorTotal
            });
          }
        } else {
          // Create new participation record
          // Generate random numbers for participation (1-60 for lottery)
          const numerosEscolhidos: number[] = [];
          for (let i = 0; i < 6; i++) {
            let numero;
            do {
              numero = Math.floor(Math.random() * 60) + 1;
            } while (numerosEscolhidos.includes(numero));
            numerosEscolhidos.push(numero);
          }
          
          numerosEscolhidos.sort((a, b) => a - b);

          const { error: participacaoError } = await supabaseClient
            .from('participacoes')
            .insert({
              user_id: pagamento.user_id,
              concurso_id: pagamento.concurso_id,
              numeros_escolhidos: numerosEscolhidos,
              quantidade_cotas: pagamento.quantidade_cotas,
              valor_total: pagamento.valor_total,
              data_participacao: new Date().toISOString()
            });

          if (participacaoError) {
            logStep("Erro ao criar nova participação", { error: participacaoError.message });
          } else {
            logStep("Nova participação criada com sucesso", { numerosEscolhidos, cotas: pagamento.quantidade_cotas });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      paymentStatus: session.payment_status,
      pagamentoStatus: newStatus,
      pagamentoId: pagamento.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});