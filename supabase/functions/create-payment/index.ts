import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de pagamento");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token de autorização necessário");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Usuário não autenticado");
    
    logStep("Usuário autenticado", { userId: user.id, email: user.email });

    // Parse request body
    const { concursoId, quantidadeCotas } = await req.json();
    if (!concursoId || !quantidadeCotas) {
      throw new Error("concursoId e quantidadeCotas são obrigatórios");
    }

    logStep("Dados recebidos", { concursoId, quantidadeCotas });

    // Get contest details
    const { data: concurso, error: concursoError } = await supabaseClient
      .from('concursos')
      .select('*')
      .eq('id', concursoId)
      .single();

    if (concursoError || !concurso) {
      throw new Error("Concurso não encontrado");
    }

    if (concurso.status !== 'aberto') {
      throw new Error("Concurso não está aberto para participação");
    }

    // Check if there are enough quotas available
    const cotasDisponiveis = concurso.max_cotas - concurso.cotas_vendidas;
    if (quantidadeCotas > cotasDisponiveis) {
      throw new Error(`Apenas ${cotasDisponiveis} cotas disponíveis`);
    }

    const valorTotal = Number(concurso.valor_cota) * quantidadeCotas;
    logStep("Valor calculado", { valorCota: concurso.valor_cota, quantidadeCotas, valorTotal });

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

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Cliente Stripe encontrado", { customerId });
    } else {
      logStep("Criando novo cliente Stripe");
    }

    // Create payment record in database
    const { data: pagamento, error: pagamentoError } = await supabaseClient
      .from('pagamentos')
      .insert({
        user_id: user.id,
        concurso_id: concursoId,
        quantidade_cotas: quantidadeCotas,
        valor_total: valorTotal,
        status: 'pendente',
        forma_pagamento: 'stripe'
      })
      .select()
      .single();

    if (pagamentoError || !pagamento) {
      throw new Error(`Erro ao criar registro de pagamento: ${pagamentoError?.message}`);
    }

    logStep("Registro de pagamento criado", { pagamentoId: pagamento.id });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'], // Usar cartão para testes, PIX requer conta brasileira verificada
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${concurso.nome} - ${quantidadeCotas} cota(s)`,
              description: `Participação no concurso ${concurso.nome} com ${quantidadeCotas} cota(s)`,
            },
            unit_amount: Math.round(Number(concurso.valor_cota) * 100), // Convert to cents
          },
          quantity: quantidadeCotas,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/concursos`,
      metadata: {
        pagamento_id: pagamento.id,
        concurso_id: concursoId,
        user_id: user.id,
      },
    });

    // Update payment record with Stripe session ID
    await supabaseClient
      .from('pagamentos')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', pagamento.id);

    logStep("Sessão Stripe criada", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, pagamentoId: pagamento.id }), {
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