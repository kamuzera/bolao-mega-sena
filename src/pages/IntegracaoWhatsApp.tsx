import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Smartphone, Trash2, Power, PowerOff, Eye, Settings } from 'lucide-react';
import QRCode from 'qrcode';

interface WhatsAppInstance {
  instanceName: string;
  instanceId: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  profileStatus?: string;
  status: 'open' | 'close';
  serverUrl: string;
  apikey: string;
}

interface ConnectionData {
  pairingCode?: string;
  code?: string;
  count?: number;
}

interface InstanceSettings {
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
}

const IntegracaoWhatsApp = () => {
  const [instanceName, setInstanceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<InstanceSettings>({
    rejectCall: false,
    msgCall: '',
    groupsIgnore: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false
  });
  const [settingsInstanceName, setSettingsInstanceName] = useState<string>('');

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

  const fetchInstances = async () => {
    try {
      const result = await callInstanceFunction('fetchInstances');
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Filtrar instâncias do sistema (excluir instâncias genéricas como "WhatsApp")
        const systemInstances = result.data
          .map((item: any) => ({
            instanceName: item.name || item.instance?.instanceName || '',
            instanceId: item.id || item.instance?.instanceId || '',
            owner: item.ownerJid || item.instance?.owner || '',
            profileName: item.profileName || item.instance?.profileName || null,
            profilePictureUrl: item.profilePicUrl || item.instance?.profilePictureUrl || null,
            profileStatus: item.profileStatus || item.instance?.profileStatus || null,
            status: item.connectionStatus || item.instance?.status || 'close',
            serverUrl: item.serverUrl || item.instance?.serverUrl || '',
            apikey: item.token || item.instance?.apikey || ''
          }))
          .filter((inst: WhatsAppInstance) => 
            inst.instanceName && 
            inst.instanceName !== 'WhatsApp' && // Excluir instância genérica
            inst.instanceName.length > 0
          );
        
        setInstances(systemInstances);
      } else {
        setInstances([]);
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      toast.error('Erro ao buscar instâncias');
      setInstances([]);
    }
  };

  useEffect(() => {
    fetchInstances();
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
        toast.success('Instância criada com sucesso!');
        setInstanceName('');
        await fetchInstances();
      } else {
        toast.error(result.error || 'Erro ao criar instância');
      }
    } catch (error) {
      toast.error('Erro ao criar instância');
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async (instName: string) => {
    setLoading(true);
    setSelectedInstance(instName);
    try {
      const result = await callInstanceFunction('connect', instName);
      
      if (result.success) {
        setConnectionData(result.data);
        
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
      setSelectedInstance(null);
    }
  };

  const disconnectInstance = async (instName: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta instância?')) {
      return;
    }

    setLoading(true);
    setSelectedInstance(instName);
    try {
      const result = await callInstanceFunction('disconnect', instName);
      
      if (result.success) {
        setConnectionData(null);
        setQrCodeUrl(null);
        toast.success('Instância desconectada com sucesso!');
        await fetchInstances();
      } else {
        toast.error(result.error || 'Erro ao desconectar instância');
      }
    } catch (error) {
      toast.error('Erro ao desconectar instância');
    } finally {
      setLoading(false);
      setSelectedInstance(null);
    }
  };

  const deleteInstance = async (instName: string) => {
    if (!confirm('Tem certeza que deseja deletar esta instância?')) {
      return;
    }

    setLoading(true);
    setSelectedInstance(instName);
    try {
      const result = await callInstanceFunction('delete', instName);
      
      if (result.success) {
        toast.success('Instância deletada com sucesso!');
        await fetchInstances();
      } else {
        toast.error(result.error || 'Erro ao deletar instância');
      }
    } catch (error) {
      toast.error('Erro ao deletar instância');
    } finally {
      setLoading(false);
      setSelectedInstance(null);
    }
  };

  const checkStatus = async (instName: string) => {
    setLoading(true);
    setSelectedInstance(instName);
    try {
      const result = await callInstanceFunction('status', instName);
      
      if (result.connected) {
        toast.success('Instância conectada!');
      } else {
        toast.warning('Instância não conectada');
      }
      
      await fetchInstances();
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setLoading(false);
      setSelectedInstance(null);
    }
  };

  const openSettings = async (instName: string) => {
    setSettingsInstanceName(instName);
    setSettingsLoading(true);
    setSettingsOpen(true);
    
    try {
      const result = await callInstanceFunction('getSettings', instName);
      
      if (result.success && result.data) {
        setCurrentSettings({
          rejectCall: result.data.rejectCall || false,
          msgCall: result.data.msgCall || '',
          groupsIgnore: result.data.groupsIgnore || false,
          alwaysOnline: result.data.alwaysOnline || false,
          readMessages: result.data.readMessages || false,
          readStatus: result.data.readStatus || false,
          syncFullHistory: result.data.syncFullHistory || false
        });
      }
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      const result = await supabase.functions.invoke('whatsapp-instance', {
        body: { 
          action: 'updateSettings',
          instanceName: settingsInstanceName,
          settings: currentSettings
        }
      });

      if (result.error) throw result.error;

      if (result.data.success) {
        toast.success('Configurações salvas com sucesso!');
        setSettingsOpen(false);
        await fetchInstances();
      } else {
        toast.error(result.data.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integração WhatsApp</h1>
        <p className="text-muted-foreground">
          Gerencie as conexões WhatsApp para notificações automáticas
        </p>
      </div>

      {/* Criar Nova Instância - Compacto */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">Nova Instância:</span>
            </div>
            <Input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Nome da instância"
              className="flex-1"
            />
            <Button 
              onClick={createInstance} 
              disabled={loading || !instanceName.trim()}
              size="sm"
              className="whitespace-nowrap"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Instâncias */}
      {instances.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Instâncias Ativas</h2>
          <div className="grid gap-4">
            {instances.map((instance) => (
              <Card key={instance.instanceId} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={instance.profilePictureUrl || undefined} />
                      <AvatarFallback>
                        <Smartphone className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-medium">{instance.instanceName}</h3>
                      {instance.profileName && (
                        <p className="text-sm text-muted-foreground">{instance.profileName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={instance.status === 'open' ? 'default' : 'secondary'}>
                          {instance.status === 'open' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                        {instance.owner && (
                          <span className="text-xs text-muted-foreground">
                            {instance.owner.replace('@s.whatsapp.net', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openSettings(instance.instanceName)}
                      disabled={loading && selectedInstance === instance.instanceName}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkStatus(instance.instanceName)}
                      disabled={loading && selectedInstance === instance.instanceName}
                    >
                      {loading && selectedInstance === instance.instanceName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>

                    {instance.status === 'open' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disconnectInstance(instance.instanceName)}
                        disabled={loading && selectedInstance === instance.instanceName}
                      >
                        {loading && selectedInstance === instance.instanceName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectInstance(instance.instanceName)}
                        disabled={loading && selectedInstance === instance.instanceName}
                      >
                        {loading && selectedInstance === instance.instanceName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteInstance(instance.instanceName)}
                      disabled={loading && selectedInstance === instance.instanceName}
                    >
                      {loading && selectedInstance === instance.instanceName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {connectionData && qrCodeUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Conectar WhatsApp</CardTitle>
            <CardDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border inline-block">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog de Configurações */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurações da Instância</DialogTitle>
            <DialogDescription>
              Configure as opções da instância {settingsInstanceName}
            </DialogDescription>
          </DialogHeader>
          
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rejectCall">Rejeitar Chamadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Rejeitar automaticamente chamadas recebidas
                  </p>
                </div>
                <Switch
                  id="rejectCall"
                  checked={currentSettings.rejectCall}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, rejectCall: checked})
                  }
                />
              </div>

              {currentSettings.rejectCall && (
                <div className="space-y-2">
                  <Label htmlFor="msgCall">Mensagem de Rejeição</Label>
                  <Input
                    id="msgCall"
                    value={currentSettings.msgCall}
                    onChange={(e) => 
                      setCurrentSettings({...currentSettings, msgCall: e.target.value})
                    }
                    placeholder="Mensagem enviada quando rejeitar chamada"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alwaysOnline">Sempre Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Manter status sempre online
                  </p>
                </div>
                <Switch
                  id="alwaysOnline"
                  checked={currentSettings.alwaysOnline}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, alwaysOnline: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="groupsIgnore">Ignorar Grupos</Label>
                  <p className="text-sm text-muted-foreground">
                    Não processar mensagens de grupos
                  </p>
                </div>
                <Switch
                  id="groupsIgnore"
                  checked={currentSettings.groupsIgnore}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, groupsIgnore: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="readMessages">Ler Mensagens</Label>
                  <p className="text-sm text-muted-foreground">
                    Marcar mensagens como lidas automaticamente
                  </p>
                </div>
                <Switch
                  id="readMessages"
                  checked={currentSettings.readMessages}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, readMessages: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="readStatus">Status de Leitura</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar confirmação de leitura (tique azul)
                  </p>
                </div>
                <Switch
                  id="readStatus"
                  checked={currentSettings.readStatus}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, readStatus: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="syncFullHistory">Sincronizar Histórico</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar histórico completo de mensagens
                  </p>
                </div>
                <Switch
                  id="syncFullHistory"
                  checked={currentSettings.syncFullHistory}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({...currentSettings, syncFullHistory: checked})
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSettings} disabled={settingsLoading}>
              {settingsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegracaoWhatsApp;