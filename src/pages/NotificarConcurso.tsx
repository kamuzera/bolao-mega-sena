import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, DollarSign, Trophy, Send, Loader2, Users } from 'lucide-react';

interface Concurso {
  id: string;
  nome: string;
  numero: number;
  descricao: string | null;
  data_sorteio: string;
  valor_cota: number;
  max_cotas: number;
  premio_total: number;
}

const NotificarConcurso = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [concurso, setConcurso] = useState<Concurso | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    selectedInstance: '',
    caption: '',
    image: '',
    delay: 1000,
    excludedNumbers: ''
  });

  useEffect(() => {
    if (profile && profile.tipo !== 'admin') {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar a tela de notificações.',
        variant: 'destructive',
      });
      navigate('/concursos');
    }
  }, [profile, navigate, toast]);

  useEffect(() => {
    if (!id) return;

    const initialize = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchConcurso(id), fetchInstances()]);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [id]);

  useEffect(() => {
    if (!concurso) return;

    const dataFormatada = new Date(concurso.data_sorteio).toLocaleDateString('pt-BR');
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(concurso.valor_cota));

    const defaultMessage = `🎲 *CONCURSO DISPONÍVEL!* 🎲\n\n📋 *${concurso.nome.toUpperCase()} - ${concurso.numero}*\n\n📅 Data do Sorteio: ${dataFormatada}\n💰 Valor por Cota: ${valorFormatado}\n🎯 Máximo de Cotas: ${concurso.max_cotas}\n\nParticipe já e concorra a grandes prêmios! 🏆\n\n_Acesse o sistema para fazer sua aposta!_`;

    setFormData((prev) => ({
      ...prev,
      caption: prev.caption || defaultMessage,
    }));
  }, [concurso]);

  useEffect(() => {
    if (instances.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      selectedInstance: prev.selectedInstance || instances[0]?.name || '',
    }));
  }, [instances]);

  const fetchConcurso = async (concursoId: string) => {
    const { data, error } = await supabase
      .from('concursos')
      .select('id, nome, numero, descricao, data_sorteio, valor_cota, max_cotas, premio_total')
      .eq('id', concursoId)
      .single();

    if (error) {
      console.error('Erro ao carregar concurso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do concurso.',
        variant: 'destructive',
      });
      return;
    }

    setConcurso(data as Concurso);
  };

  const fetchInstances = async () => {
    try {
      const { data: instancesResponse } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'fetchInstances', instanceName: '' },
      });

      const connectedInstances = instancesResponse?.data?.filter((instance: any) => instance.connectionStatus === 'open') || [];
      setInstances(connectedInstances);

      if (connectedInstances.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhuma instância WhatsApp conectada foi encontrada.',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as instâncias conectadas.',
        variant: 'destructive',
      });
    }
  };

  const excludedNumbersSet = useMemo(() => {
    return new Set(
      formData.excludedNumbers
        .split(/[,;\s]+/)
        .map((numero) => numero.trim())
        .map((numero) => numero.replace(/\D/g, ''))
        .filter((numero) => numero.length > 0)
    );
  }, [formData.excludedNumbers]);

  const handleSendNotifications = async () => {
    if (!concurso) {
      toast({ title: 'Erro', description: 'Concurso não carregado.', variant: 'destructive' });
      return;
    }

    if (!formData.selectedInstance) {
      toast({ title: 'Erro', description: 'Selecione uma instância WhatsApp.', variant: 'destructive' });
      return;
    }

    const selectedInstance = instances.find((instance) => instance.name === formData.selectedInstance);

    if (!selectedInstance) {
      toast({ title: 'Erro', description: 'Instância selecionada não encontrada.', variant: 'destructive' });
      return;
    }

    setSending(true);

    try {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('profiles')
        .select('nome, telefone, user_id')
        .eq('ativo', true)
        .eq('tipo', 'participante');

      if (usuariosError) throw usuariosError;

      if (!usuarios || usuarios.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhum participante ativo encontrado para notificar.',
        });
        return;
      }

      const usuariosComTelefone = usuarios.filter((usuario) => usuario.telefone && usuario.telefone.trim() !== '');

      if (usuariosComTelefone.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhum participante ativo possui telefone cadastrado para receber notificações.',
        });
        return;
      }

      const usuariosParaNotificar = usuariosComTelefone.filter((usuario) => {
        const telefoneNormalizado = usuario.telefone.replace(/\D/g, '');
        return !excludedNumbersSet.has(telefoneNormalizado);
      });

      if (usuariosParaNotificar.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Todos os números cadastrados estão na lista de exclusão.',
        });
        return;
      }

      toast({
        title: 'Iniciando envios',
        description: `Enviando notificações para ${usuariosParaNotificar.length} participantes via "${selectedInstance.name}"...`,
      });

      let sucessos = 0;
      let erros = 0;

      for (let i = 0; i < usuariosParaNotificar.length; i++) {
        const usuario = usuariosParaNotificar[i];
        const numero = usuario.telefone.replace(/\D/g, '');

        try {
          const requestBody: any = {
            number: numero,
            caption: formData.caption,
            delay: formData.delay,
          };

          if (formData.image) {
            requestBody.mediatype = 'image';
            requestBody.media = formData.image;
          }

          const response = await fetch(`https://api.yamone.com.br/message/sendMedia/${selectedInstance.name}`, {
            method: 'POST',
            headers: {
              apikey: selectedInstance.token || 'evolution-api-key',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            sucessos++;
          } else {
            erros++;
            console.error(`Erro ao enviar mensagem para ${usuario.nome} (${numero}):`, await response.text());
          }

          if (i < usuariosParaNotificar.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, formData.delay));
          }
        } catch (error) {
          erros++;
          console.error(`Erro ao enviar mensagem para ${usuario.nome} (${numero}):`, error);
        }
      }

      toast({
        title: 'Notificações processadas',
        description: `${sucessos} sucesso(s), ${erros} erro(s) via "${selectedInstance.name}"`,
      });
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar notificações.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando informações do concurso...</span>
      </div>
    );
  }

  if (!concurso) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Trophy className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Concurso não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/concursos')}>
          Voltar para concursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Notificar Participantes</h1>
            <p className="text-muted-foreground">
              Envie notificações sobre o concurso {concurso.nome} - #{concurso.numero}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {concurso.nome}
          </CardTitle>
          <CardDescription>Resumo do concurso selecionado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {concurso.descricao && <p className="text-sm text-muted-foreground">{concurso.descricao}</p>}

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">{new Date(concurso.data_sorteio).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Valor da cota:</span>
              <span className="font-medium">R$ {concurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Limite:</span>
              <span className="font-medium">{concurso.max_cotas} cotas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Configurações de envio
          </CardTitle>
          <CardDescription>Configure a mensagem e selecione a instância para envio pelo WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Instância WhatsApp</Label>
              <Select
                value={formData.selectedInstance}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, selectedInstance: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id ?? instance.name} value={instance.name}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>{instance.name}</span>
                        {instance.profileName && (
                          <span className="text-muted-foreground text-xs">({instance.profileName})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {instances.length} instância(s) conectada(s) disponível(eis)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay">Delay entre mensagens (ms)</Label>
              <Input
                id="delay"
                type="number"
                min={500}
                max={10000}
                step={100}
                value={formData.delay}
                onChange={(e) => setFormData((prev) => ({ ...prev, delay: Number(e.target.value) || 1000 }))}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 1000ms para evitar bloqueios.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Mensagem</Label>
            <Textarea
              id="caption"
              rows={10}
              value={formData.caption}
              onChange={(e) => setFormData((prev) => ({ ...prev, caption: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">URL da Imagem (opcional)</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <p className="text-xs text-muted-foreground">A imagem será enviada junto com a mensagem, se informada.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excludedNumbers">Números a excluir do envio</Label>
            <Textarea
              id="excludedNumbers"
              rows={4}
              placeholder="Informe os números separados por vírgula, ponto e vírgula ou quebra de linha"
              value={formData.excludedNumbers}
              onChange={(e) => setFormData((prev) => ({ ...prev, excludedNumbers: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Apenas dígitos são considerados. Números informados aqui não receberão a notificação.
            </p>
            {excludedNumbersSet.size > 0 && (
              <p className="text-xs text-muted-foreground">{excludedNumbersSet.size} número(s) serão excluídos do envio.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/concursos')}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendNotifications}
              disabled={sending || instances.length === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar notificações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificarConcurso;
