import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trophy, Calendar, DollarSign, Users, Eye, Trash2, Send, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ParticipantesDialog from '@/components/ParticipantesDialog';
import { ComprarCotasDialog } from '@/components/ComprarCotasDialog';

interface Concurso {
  id: string;
  nome: string;
  numero: number;
  descricao: string;
  data_sorteio: string;
  valor_cota: number;
  max_cotas: number;
  cotas_vendidas: number;
  status: string;
  premio_total: number;
  numeros_sorteados: number[] | null;
  receitaSemAdmin?: number;
  totalCotasVendidas?: number;
  totalParaJogar?: number;
}

const Concursos = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);
  const [participantesDialogOpen, setParticipantesDialogOpen] = useState(false);
  const [selectedConcurso, setSelectedConcurso] = useState<Concurso | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyingConcurso, setNotifyingConcurso] = useState<Concurso | null>(null);
  const [notificationData, setNotificationData] = useState({
    caption: '',
    image: '',
    delay: 1000,
    selectedInstance: ''
  });
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    numero: '',
    descricao: '',
    data_sorteio: '',
    valor_cota: '10',
    max_cotas: '100',
    premio_total: '0'
  });

  useEffect(() => {
    fetchConcursos();
  }, []);

  const fetchConcursos = async () => {
    try {
      const { data, error } = await supabase
        .from('concursos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar participações para calcular valores corretos
      const concursosComValores = await Promise.all((data || []).map(async (concurso) => {
        // Buscar participações do concurso
        const { data: participacoes } = await supabase
          .from('participacoes')
          .select('valor_total, quantidade_cotas, user_id')
          .eq('concurso_id', concurso.id);

        const todasParticipacoes = participacoes || [];

        // Separar participações do admin
        const participacoesOutrosUsuarios = todasParticipacoes.filter(p => p.user_id !== profile?.user_id);
        
        // Calcular valores corretos
        const receitaSemAdmin = participacoesOutrosUsuarios.reduce((sum, p) => sum + Number(p.valor_total), 0);
        const totalCotasVendidas = todasParticipacoes.reduce((sum, p) => sum + Number(p.quantidade_cotas), 0);
        
        // Buscar configurações admin para calcular "Para Jogar"
        let totalParaJogar = 0;
        if (profile?.tipo === 'admin') {
          const { data: configAdmin } = await supabase
            .from('configuracoes_admin')
            .select('percentual_comissao, cotas_gratuitas')
            .single();
          
          const cotasDoAdmin = (configAdmin?.cotas_gratuitas || 3) * concurso.valor_cota;
          const comissaoAdmin = receitaSemAdmin * ((configAdmin?.percentual_comissao || 10) / 100);
          totalParaJogar = receitaSemAdmin - cotasDoAdmin - comissaoAdmin;
        }
        
        return {
          ...concurso,
          receitaSemAdmin,
          totalCotasVendidas,
          totalParaJogar
        };
      }));
      
      setConcursos(concursosComValores);
    } catch (error) {
      console.error('Erro ao buscar concursos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar concursos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const concursoData = {
        nome: formData.nome,
        numero: parseInt(formData.numero),
        descricao: formData.descricao,
        data_sorteio: formData.data_sorteio,
        valor_cota: parseFloat(formData.valor_cota),
        max_cotas: parseInt(formData.max_cotas),
        premio_total: parseFloat(formData.premio_total),
        status: 'aberto'
      };

      if (editingConcurso) {
        const { error } = await supabase
          .from('concursos')
          .update(concursoData)
          .eq('id', editingConcurso.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Concurso atualizado com sucesso!",
        });
      } else {
        const { data: newConcurso, error } = await supabase
          .from('concursos')
          .insert([concursoData])
          .select()
          .single();
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Concurso criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingConcurso(null);
      resetForm();
      fetchConcursos();
    } catch (error) {
      console.error('Erro ao salvar concurso:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar concurso",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      numero: '',
      descricao: '',
      data_sorteio: '',
      valor_cota: '10',
      max_cotas: '100',
      premio_total: '0'
    });
  };

  const handleEdit = (concurso: Concurso) => {
    setEditingConcurso(concurso);
    setFormData({
      nome: concurso.nome,
      numero: concurso.numero.toString(),
      descricao: concurso.descricao || '',
      data_sorteio: concurso.data_sorteio.split('T')[0],
      valor_cota: concurso.valor_cota.toString(),
      max_cotas: concurso.max_cotas.toString(),
      premio_total: concurso.premio_total.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (concurso: Concurso) => {
    if (!confirm('Tem certeza que deseja excluir este concurso?')) return;
    
    try {
      const { error } = await supabase
        .from('concursos')
        .delete()
        .eq('id', concurso.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Concurso excluído com sucesso!",
      });
      
      fetchConcursos();
    } catch (error) {
      console.error('Erro ao deletar concurso:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir concurso",
        variant: "destructive",
      });
    }
  };

  const handleViewParticipants = (concurso: Concurso) => {
    navigate(`/concursos/${concurso.id}/participantes`);
  };

  const handleNotifyUsers = async (concurso: Concurso) => {
    setNotifyingConcurso(concurso);
    
    // Buscar instâncias WhatsApp conectadas
    try {
      const { data: instancesResponse } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'fetchInstances', instanceName: '' }
      });

      const connectedInstances = instancesResponse?.data?.filter((instance: any) => 
        instance.connectionStatus === 'open'
      ) || [];

      setAvailableInstances(connectedInstances);

      if (connectedInstances.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhuma instância WhatsApp conectada encontrada.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao buscar instâncias:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar instâncias WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    
    // Pré-preencher com dados do concurso
    const dataFormatada = new Date(concurso.data_sorteio).toLocaleDateString('pt-BR');
    const valorFormatado = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(Number(concurso.valor_cota));

    const defaultMessage = `🎲 *CONCURSO DISPONÍVEL!* 🎲

📋 *${concurso.nome.toUpperCase()} - ${concurso.numero}*

📅 Data do Sorteio: ${dataFormatada}
💰 Valor por Cota: ${valorFormatado}
🎯 Máximo de Cotas: ${concurso.max_cotas}

Participe já e concorra a grandes prêmios! 🏆

_Acesse o sistema para fazer sua aposta!_`;

    setNotificationData({
      caption: defaultMessage,
      image: '',
      delay: 1000,
      selectedInstance: ''
    });
    
    setNotifyDialogOpen(true);
  };

  const handleSendNotifications = async () => {
    if (!notifyingConcurso || !notificationData.selectedInstance) {
      toast({
        title: "Erro",
        description: "Selecione uma instância WhatsApp para envio.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar todos os usuários ativos participantes (excluir admins)
      const { data: usuarios, error: usuariosError } = await supabase
        .from('profiles')
        .select('nome, email, telefone, user_id')
        .eq('ativo', true)
        .eq('tipo', 'participante'); // Apenas participantes, não admins

      if (usuariosError) throw usuariosError;

      if (!usuarios || usuarios.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum participante ativo encontrado para notificar.",
          variant: "default",
        });
        return;
      }

      // Filtrar usuários que têm telefone cadastrado
      const usuariosComTelefone = usuarios.filter(usuario => usuario.telefone && usuario.telefone.trim() !== '');

      if (usuariosComTelefone.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhum participante ativo possui telefone cadastrado para receber notificações.",
          variant: "default",
        });
        return;
      }

      const selectedInstance = availableInstances.find(instance => instance.name === notificationData.selectedInstance);
      
      if (!selectedInstance) {
        toast({
          title: "Erro",
          description: "Instância selecionada não encontrada.",
          variant: "destructive",
        });
        return;
      }

      let sucessos = 0;
      let erros = 0;

      toast({
        title: "Iniciando envios",
        description: `Enviando notificações para ${usuariosComTelefone.length} participantes via instância "${selectedInstance.name}"...`,
      });

      // Enviar mensagens com delay
      for (let i = 0; i < usuariosComTelefone.length; i++) {
        const usuario = usuariosComTelefone[i];
        const numero = usuario.telefone.replace(/\D/g, ''); // Remove caracteres não numéricos
        
        try {
          const requestBody: any = {
            number: numero,
            caption: notificationData.caption,
            delay: notificationData.delay
          };

          // Se tem imagem, adicionar campos de mídia
          if (notificationData.image) {
            requestBody.mediatype = 'image';
            requestBody.media = notificationData.image;
          }

          const response = await fetch(`https://api.yamone.com.br/message/sendMedia/${selectedInstance.name}`, {
            method: 'POST',
            headers: {
              'apikey': selectedInstance.token || 'evolution-api-key',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            sucessos++;
            console.log(`Mensagem enviada com sucesso para ${usuario.nome} (${numero}) via ${selectedInstance.name}`);
          } else {
            erros++;
            console.error(`Erro ao enviar mensagem para ${usuario.nome} (${numero}):`, await response.text());
          }

          // Delay entre envios
          if (i < usuariosComTelefone.length - 1) {
            await new Promise(resolve => setTimeout(resolve, notificationData.delay));
          }

        } catch (error) {
          erros++;
          console.error(`Erro ao enviar mensagem para ${usuario.nome} (${numero}):`, error);
        }
      }

      toast({
        title: "Notificações processadas",
        description: `${sucessos} sucessos, ${erros} erros via "${selectedInstance.name}"`,
      });

      setNotifyDialogOpen(false);
      setNotifyingConcurso(null);

    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar notificações",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aberto: "default",
      fechado: "secondary",
      sorteado: "outline",
      finalizado: "destructive"
    };
    
    const labels: Record<string, string> = {
      aberto: "Aberto",
      fechado: "Fechado",
      sorteado: "Sorteado",
      finalizado: "Finalizado"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Carregando concursos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Concursos</h1>
          <p className="text-muted-foreground">
            Gerencie os concursos da Mega-Sena
          </p>
        </div>
        
        <div className="flex gap-2">
          {profile?.tipo === 'admin' && concursos.length > 0 && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabela
              </Button>
            </div>
          )}
          
          {profile?.tipo === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingConcurso(null); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Concurso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingConcurso ? 'Editar Concurso' : 'Novo Concurso'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingConcurso ? 'Edite as informações do concurso' : 'Crie um novo concurso da Mega-Sena'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="nome" className="text-right">Nome</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="numero" className="text-right">Número</Label>
                      <Input
                        id="numero"
                        type="number"
                        value={formData.numero}
                        onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="descricao" className="text-right">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="data_sorteio" className="text-right">Data Sorteio</Label>
                      <Input
                        id="data_sorteio"
                        type="date"
                        value={formData.data_sorteio}
                        onChange={(e) => setFormData({...formData, data_sorteio: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="valor_cota" className="text-right">Valor Cota</Label>
                      <Input
                        id="valor_cota"
                        type="number"
                        step="0.01"
                        value={formData.valor_cota}
                        onChange={(e) => setFormData({...formData, valor_cota: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="max_cotas" className="text-right">Máx. Cotas</Label>
                      <Input
                        id="max_cotas"
                        type="number"
                        value={formData.max_cotas}
                        onChange={(e) => setFormData({...formData, max_cotas: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="premio_total" className="text-right">Prêmio Total</Label>
                      <Input
                        id="premio_total"
                        type="number"
                        step="0.01"
                        value={formData.premio_total}
                        onChange={(e) => setFormData({...formData, premio_total: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">
                      {editingConcurso ? 'Atualizar' : 'Criar'} Concurso
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Admin Table View */}
      {profile?.tipo === 'admin' && viewMode === 'table' ? (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concurso</TableHead>
                  <TableHead>Data Sorteio</TableHead>
                  <TableHead>Valor Cota</TableHead>
                  <TableHead>Cotas</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concursos.map((concurso) => (
                  <TableRow key={concurso.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{concurso.nome}</p>
                        <p className="text-sm text-muted-foreground">#{concurso.numero}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(concurso.data_sorteio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>R$ {concurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <div>
                        <p>{concurso.totalCotasVendidas || 0}/{concurso.max_cotas}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{
                              width: `${((concurso.totalCotasVendidas || 0) / concurso.max_cotas) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>R$ {concurso.premio_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(concurso.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleViewParticipants(concurso)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(concurso)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(concurso)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concursos.map((concurso) => (
            <Card key={concurso.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {concurso.nome}
                    </CardTitle>
                    <CardDescription>
                      Concurso #{concurso.numero}
                    </CardDescription>
                    {profile?.tipo === 'admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 mt-1 text-xs"
                        onClick={() => handleNotifyUsers(concurso)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Notificar usuários
                      </Button>
                    )}
                  </div>
                  {getStatusBadge(concurso.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {concurso.descricao && (
                    <p className="text-sm text-muted-foreground">{concurso.descricao}</p>
                  )}
                  
                  {/* Informações principais */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">{new Date(concurso.data_sorteio).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">R$ {concurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  {/* Progresso das vendas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso das vendas:</span>
                      <span className="font-medium">{concurso.totalCotasVendidas || 0}/{concurso.max_cotas} cotas</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${((concurso.totalCotasVendidas || 0) / concurso.max_cotas) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {(((concurso.totalCotasVendidas || 0) / concurso.max_cotas) * 100).toFixed(1)}% vendido
                    </div>
                  </div>

                  {/* Valores financeiros */}
                  <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Prêmio total:</span>
                      <span className="font-semibold text-lg text-green-400">
                        R$ {concurso.premio_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Arrecadado:</span>
                      <span className="font-medium text-blue-400">
                        R$ {(concurso.receitaSemAdmin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {profile?.tipo === 'admin' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Para jogar:</span>
                        <span className="font-medium text-primary">
                          R$ {(concurso.totalParaJogar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>

                  {concurso.numeros_sorteados && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Números sorteados:</p>
                      <div className="flex gap-1 flex-wrap">
                        {concurso.numeros_sorteados.map((num, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {num.toString().padStart(2, '0')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewParticipants(concurso)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    
                    {profile?.tipo === 'admin' ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(concurso)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(concurso)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </>
                    ) : (
                      <ComprarCotasDialog
                        concurso={concurso}
                        onSuccess={() => fetchConcursos()}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {concursos.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum concurso encontrado</h3>
            <p className="text-muted-foreground">
              {profile?.tipo === 'admin' 
                ? 'Crie seu primeiro concurso usando o botão acima.' 
                : 'Aguarde a criação de novos concursos.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Participants Dialog */}
      {selectedConcurso && (
        <ParticipantesDialog
          concurso={selectedConcurso}
          open={participantesDialogOpen}
          onOpenChange={setParticipantesDialogOpen}
        />
      )}

      {/* Notification Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Notificar Usuários</DialogTitle>
            <DialogDescription>
              Envie uma mensagem em massa para todos os usuários cadastrados sobre o concurso {notifyingConcurso?.nome} #{notifyingConcurso?.numero}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instance">Instância WhatsApp</Label>
              <Select
                value={notificationData.selectedInstance}
                onValueChange={(value) => setNotificationData({...notificationData, selectedInstance: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {availableInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{instance.name}</span>
                        {instance.profileName && (
                          <span className="text-muted-foreground text-sm">({instance.profileName})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {availableInstances.length} instância(s) conectada(s) disponível(eis)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption">Mensagem</Label>
              <Textarea
                id="caption"
                value={notificationData.caption}
                onChange={(e) => setNotificationData({...notificationData, caption: e.target.value})}
                rows={8}
                placeholder="Digite a mensagem que será enviada..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">URL da Imagem (opcional)</Label>
              <Input
                id="image"
                type="url"
                value={notificationData.image}
                onChange={(e) => setNotificationData({...notificationData, image: e.target.value})}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay">Delay entre mensagens (ms)</Label>
              <Input
                id="delay"
                type="number"
                min="500"
                max="10000"
                step="100"
                value={notificationData.delay}
                onChange={(e) => setNotificationData({...notificationData, delay: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">
                Tempo de espera entre cada envio (recomendado: 1000ms)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotifications}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Concursos;