import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Declarações de tipo para Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || '429683C4C977415CAAFCCE10F7D57E11';
const evolutionServerUrl = Deno.env.get('EVOLUTION_SERVER_URL') || 'https://api.yamone.com.br';

// Para desenvolvimento local, vamos simular uma resposta de sucesso
const isDevelopment = evolutionApiKey === 'demo-key';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { action, instanceName, settings } = requestData;
    
    console.log(`WhatsApp Instance Manager - Action: ${action}, Instance: ${instanceName || 'N/A'}`);

    switch (action) {
      case 'create':
        return await createInstance(instanceName);
      case 'connect':
        return await connectInstance(instanceName);
      case 'status':
        return await getInstanceStatus(instanceName);
      case 'disconnect':
        return await disconnectInstance(instanceName);
      case 'delete':
        return await deleteInstance(instanceName);
      case 'fetchInstances':
        return await fetchInstances();
      case 'getSettings':
        return await getSettings(instanceName);
      case 'updateSettings':
        return await updateSettings(instanceName, settings);
      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Erro na função WhatsApp Instance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createInstance(instanceName: string) {
  try {
    // Modo de desenvolvimento - simular criação de instância
    if (isDevelopment) {
      console.log('Modo de desenvolvimento: Simulando criação de instância:', instanceName);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            instanceName: instanceName,
            instanceId: `dev_${Date.now()}`,
            status: 'close',
            message: 'Instância criada em modo de desenvolvimento'
          },
          message: 'Instância criada com sucesso (modo desenvolvimento)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${evolutionServerUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: true,
        msgCall: 'Desculpe, não aceito chamadas.',
        groupsIgnore: false,
        alwaysOnline: true,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao criar instância');
    }

    console.log('Instância criada com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Instância criada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function connectInstance(instanceName: string) {
  try {
    const response = await fetch(`${evolutionServerUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao conectar instância');
    }

    console.log('Instância conectada com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'QR Code gerado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getInstanceStatus(instanceName: string) {
  try {
    const response = await fetch(`${evolutionServerUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    console.log('Status da instância:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        connected: response.ok
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao verificar status da instância:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        connected: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function disconnectInstance(instanceName: string) {
  try {
    const response = await fetch(`${evolutionServerUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao desconectar instância');
    }

    console.log('Instância desconectada com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Instância desconectada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function deleteInstance(instanceName: string) {
  try {
    // Modo de desenvolvimento - simular deleção
    if (isDevelopment) {
      console.log('Modo de desenvolvimento: Simulando deleção de instância:', instanceName);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            instanceName: instanceName,
            message: 'Instância deletada em modo de desenvolvimento'
          },
          message: 'Instância deletada com sucesso (modo desenvolvimento)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${evolutionServerUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao deletar instância');
    }

    console.log('Instância deletada com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Instância deletada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchInstances() {
  try {
    // Modo de desenvolvimento - simular lista de instâncias
    if (isDevelopment) {
      console.log('Modo de desenvolvimento: Simulando busca de instâncias');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: [],
          message: 'Instâncias recuperadas com sucesso (modo desenvolvimento)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${evolutionServerUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    console.log('Instâncias encontradas:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Instâncias recuperadas com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar instâncias:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getSettings(instanceName: string) {
  try {
    const response = await fetch(`${evolutionServerUrl}/settings/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    console.log('Configurações da instância:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Configurações recuperadas com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function updateSettings(instanceName: string, settings: any) {
  try {
    const response = await fetch(`${evolutionServerUrl}/settings/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao atualizar configurações');
    }

    console.log('Configurações atualizadas com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Configurações atualizadas com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}