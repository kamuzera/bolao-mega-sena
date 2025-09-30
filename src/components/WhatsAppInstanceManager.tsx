import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Smartphone, Trash2, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

interface InstanceData {
  instanceName: string;
  instanceId: string;
  status: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  profileStatus?: string;
}

interface ConnectionData {
  pairingCode?: string;
  code?: string;
  count?: number;
}

const WhatsAppInstanceManager = () => {
  const [instanceName, setInstanceName] = useState('loteria_notifications');
  const [loading, setLoading] = useState(false);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [instance, setInstance] = useState<InstanceData | null>(null);
  const [existingInstances, setExistingInstances] = useState<InstanceData[]>([]);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const generateQRCode = async (code: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(code, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
    }
  };

  const callInstanceFunction = useCallback(async (action: string, instanceNameParam?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { 
          action, 
          instanceName: instanceNameParam || instanceName 
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao executar ação ${action}:`, error);
      throw error;
    }
  }, [instanceName]);

  const fetchExistingInstances = async () => {
    setLoadingInstances(true);
    try {
      const result = await callInstanceFunction('fetchInstances');
      
      if (result.success && result.data && Array.isArray(result.data)) {
        const instances = result.data.map((item: any) => ({
          instanceName: item.instance?.instanceName || item.instanceName,
          instanceId: item.instance?.instanceId || item.instanceId,
          status: item.instance?.status || item.status,
          owner: item.instance?.owner || item.owner,
          profileName: item.instance?.profileName || item.profileName,
          profilePictureUrl: item.instance?.profilePictureUrl || item.profilePictureUrl,
          profileStatus: item.instance?.profileStatus || item.profileStatus
        }));
        setExistingInstances(instances.filter(inst => inst.instanceName)); // Remove invalid instances
        
        // Se encontrar a instância padrão, selecioná-la
        const defaultInstance = instances.find((inst: InstanceData) => inst.instanceName === instanceName);
        if (defaultInstance) {
          setInstance(defaultInstance);
        }
      } else {
        setExistingInstances([]);
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      toast.error('Erro ao buscar instâncias existentes');
      setExistingInstances([]);
    } finally {
      setLoadingInstances(false);
    }
  };

  useEffect(() => {
    fetchExistingInstances();
  }, []);

  const createInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    setLoading(true);
    try {
      const result = await callInstanceFunction('create');
      
      if (result.success) {
        setInstance(result.data.instance);
        toast.success('Instância criada com sucesso!');
        // Recarregar lista de instâncias após criar
        await fetchExistingInstances();
      } else {
        toast.error(result.error || 'Erro ao criar instância');
      }
    } catch (error) {
      toast.error('Erro ao criar instância');
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    setLoading(true);
    try {
      const result = await callInstanceFunction('connect');
      
      if (result.success) {
        setConnectionData(result.data);
        
        // Gerar QR code visual se houver código
        if (result.data.code) {
          await generateQRCode(result.data.code);
        }
        
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else {
        toast.error(result.error || 'Erro ao conectar instância');
      }
    } catch (error) {
      toast.error('Erro ao conectar instância');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    setLoading(true);
    try {
      const result = await callInstanceFunction('status');
      setInstanceStatus(result.data);
      
      if (result.connected) {
        toast.success('Instância conectada!');
      } else {
        toast.warning('Instância não conectada');
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    if (!confirm('Tem certeza que deseja desconectar esta instância?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await callInstanceFunction('disconnect');
      
      if (result.success) {
        setConnectionData(null);
        setInstanceStatus(null);
        setQrCodeUrl(null);
        toast.success('Instância desconectada com sucesso!');
        // Recarregar lista de instâncias após desconectar
        await fetchExistingInstances();
      } else {
        toast.error(result.error || 'Erro ao desconectar instância');
      }
    } catch (error) {
      toast.error('Erro ao desconectar instância');
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    if (!confirm('Tem certeza que deseja deletar esta instância?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await callInstanceFunction('delete');
      
      if (result.success) {
        setInstance(null);
        setConnectionData(null);
        setInstanceStatus(null);
        setQrCodeUrl(null);
        toast.success('Instância deletada com sucesso!');
        // Recarregar lista de instâncias após deletar
        await fetchExistingInstances();
      } else {
        toast.error(result.error || 'Erro ao deletar instância');
      }
    } catch (error) {
      toast.error('Erro ao deletar instância');
    } finally {
      setLoading(false);
    }
  };

  const currentInstance = existingInstances.find(inst => inst.instanceName === instanceName) || instance;

  return (
    <div className="space-y-6">
      {/* Card para Criar Instância */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Criar Nova Instância WhatsApp
          </CardTitle>
          <CardDescription>
            Crie uma nova instância do WhatsApp para envio de notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="instanceName">Nome da Instância</Label>
            <Input
              id="instanceName"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Ex: loteria_notifications"
              className="mt-1"
            />
          </div>

          <Button 
            onClick={createInstance} 
            disabled={loading}
            variant="default"
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Instância
          </Button>
        </CardContent>
      </Card>

      {/* Card para Gerenciar Instâncias Existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Gerenciar Instâncias Existentes
          </CardTitle>
          <CardDescription>
            Conecte, monitore e gerencie suas instâncias do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={connectInstance} 
              disabled={loading || !currentInstance}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conectar (QR Code)
            </Button>

            <Button 
              onClick={checkStatus} 
              disabled={loading || !currentInstance}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Verificar Status
            </Button>

            <Button 
              onClick={disconnectInstance} 
              disabled={loading || !currentInstance}
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Desconectar
            </Button>

            <Button 
              onClick={deleteInstance} 
              disabled={loading || !currentInstance}
              variant="destructive"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Deletar
            </Button>
          </div>

          {existingInstances.length > 0 && (
            <div className="mt-4">
              <Label>Instâncias Encontradas</Label>
              <div className="space-y-2 mt-2">
                {existingInstances.map((inst) => (
                  <div 
                    key={inst.instanceId} 
                    className={`p-3 rounded-lg border ${inst.instanceName === instanceName ? 'bg-primary/10 border-primary' : 'bg-muted'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{inst.instanceName}</p>
                        <p className="text-sm text-muted-foreground">ID: {inst.instanceId}</p>
                        <p className={`text-sm font-medium ${inst.status === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                          Status: {inst.status}
                        </p>
                        {inst.profileName && (
                          <p className="text-sm text-muted-foreground">Perfil: {inst.profileName}</p>
                        )}
                      </div>
                      {inst.instanceName !== instanceName && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInstanceName(inst.instanceName)}
                        >
                          Selecionar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {currentInstance && (
        <Card>
          <CardHeader>
            <CardTitle>Instância Selecionada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Nome:</strong> {currentInstance.instanceName}</p>
              <p><strong>ID:</strong> {currentInstance.instanceId}</p>
              <p><strong>Status:</strong> {currentInstance.status}</p>
              {currentInstance.profileName && (
                <p><strong>Perfil:</strong> {currentInstance.profileName}</p>
              )}
              {currentInstance.owner && (
                <p><strong>Proprietário:</strong> {currentInstance.owner}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {connectionData && (
        <Card>
          <CardHeader>
            <CardTitle>Dados de Conexão</CardTitle>
            <CardDescription>
              Use estes dados para conectar seu WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connectionData.pairingCode && (
                <div>
                  <Label>Código de Pareamento</Label>
                  <div className="bg-muted p-4 rounded-lg font-mono text-lg font-bold text-center">
                    {connectionData.pairingCode}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Digite este código no WhatsApp: Configurações → Aparelhos conectados → Conectar um aparelho
                  </p>
                </div>
              )}

              {connectionData.code && (
                <div>
                  <Label>QR Code</Label>
                  {qrCodeUrl ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="bg-white p-4 rounded-lg border">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Escaneie este QR Code com seu WhatsApp para conectar a instância
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-mono break-all">
                        {connectionData.code}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Escaneie este código com seu WhatsApp ou use o código de pareamento acima
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {instanceStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Status da Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(instanceStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppInstanceManager;