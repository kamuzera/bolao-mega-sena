import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;
const evolutionServerUrl = 'https://api.yamone.com.br';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConcursoData {
  id: string;
  nome: string;
  numero: number;
  data_sorteio: string;
  valor_cota: number;
  max_cotas: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { concurso }: { concurso: ConcursoData } = await req.json();
    
    console.log('Processing WhatsApp notifications for contest:', concurso.nome, concurso.numero);

    // Buscar todos os usuários participantes ativos
    const { data: participantes, error: participantesError } = await supabase
      .from('profiles')
      .select('nome, user_id')
      .eq('tipo', 'participante')
      .eq('ativo', true);

    if (participantesError) {
      console.error('Erro ao buscar participantes:', participantesError);
      throw new Error('Erro ao buscar participantes');
    }

    if (!participantes || participantes.length === 0) {
      console.log('Nenhum participante encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum participante para notificar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar instância no EvolutionAPI se não existir
    const instanceName = 'loteria_notifications';
    
    try {
      // Verificar se a instância já existe
      const checkInstance = await fetch(
        `${evolutionServerUrl}/instance/connectionState/${instanceName}`,
        {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('Instance check response status:', checkInstance.status);

      // Se a instância não existe ou não está conectada, criar/conectar
      if (!checkInstance.ok) {
        console.log('Creating new instance...');
        
        // Criar instância
        const createResponse = await fetch(`${evolutionServerUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });

        if (!createResponse.ok) {
          console.error('Erro ao criar instância:', await createResponse.text());
        } else {
          console.log('Instance created successfully');
        }

        // Conectar instância
        const connectResponse = await fetch(
          `${evolutionServerUrl}/instance/connect/${instanceName}`,
          {
            method: 'GET',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!connectResponse.ok) {
          console.error('Erro ao conectar instância:', await connectResponse.text());
        } else {
          console.log('Instance connected successfully');
        }
      }

    } catch (instanceError) {
      console.error('Erro ao gerenciar instância:', instanceError);
      // Continuar mesmo se houver erro na instância
    }

    // Preparar mensagem
    const dataFormatada = new Date(concurso.data_sorteio).toLocaleDateString('pt-BR');
    const valorFormatado = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(Number(concurso.valor_cota));

    const mensagem = `🎲 *NOVO CONCURSO DISPONÍVEL!* 🎲

📋 *${concurso.nome.toUpperCase()} - ${concurso.numero}*

📅 Data do Sorteio: ${dataFormatada}
💰 Valor por Cota: ${valorFormatado}
🎯 Máximo de Cotas: ${concurso.max_cotas}

Participe já e concorra a grandes prêmios! 🏆

_Acesse o sistema para fazer sua aposta!_`;

    let sucessos = 0;
    let erros = 0;

    // Simular números de WhatsApp (você deve ter os números reais dos usuários)
    // Para demonstração, vamos usar números fictícios
    const numerosDemo = [
      '5511999999999',
      '5511888888888',
      '5511777777777'
    ];

    // Enviar mensagens para números de demonstração
    for (const numero of numerosDemo.slice(0, participantes.length)) {
      try {
        console.log(`Enviando mensagem para ${numero}`);

        const sendResponse = await fetch(
          `${evolutionServerUrl}/message/sendText/${instanceName}`,
          {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: numero,
              textMessage: {
                text: mensagem
              }
            })
          }
        );

        if (sendResponse.ok) {
          sucessos++;
          console.log(`Mensagem enviada com sucesso para ${numero}`);
        } else {
          erros++;
          console.error(`Erro ao enviar mensagem para ${numero}:`, await sendResponse.text());
        }

        // Pequeno delay entre envios
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        erros++;
        console.error(`Erro ao enviar mensagem para ${numero}:`, error);
      }
    }

    console.log(`Notificações processadas: ${sucessos} sucessos, ${erros} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificações enviadas: ${sucessos} sucessos, ${erros} erros`,
        participantes: participantes.length,
        sucessos,
        erros
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na função WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});