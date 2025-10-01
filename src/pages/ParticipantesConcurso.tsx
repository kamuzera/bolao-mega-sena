import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Trophy, Calendar, DollarSign, Users, Target, Plus, Edit, Trash2, UserPlus, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Loader2 } from 'lucide-react';

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
}

interface Participante {
  id: string;
  user_id: string;
  concurso_id: string;
  numeros_escolhidos: number[];
  quantidade_cotas: number;
  valor_total: number;
  data_participacao: string;
  premiado: boolean;
  valor_premio: number;
  profiles?: {
    nome: string;
    email: string;
  };
}

interface Usuario {
  user_id: string;
  nome: string;
  email: string;
}

const ParticipantesConcurso = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [concurso, setConcurso] = useState<Concurso | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingParticipante, setEditingParticipante] = useState<Participante | null>(null);
  const [newParticipante, setNewParticipante] = useState({
    user_id: '',
    numeros_escolhidos: [] as number[],
    quantidade_cotas: 1,
    valor_total: 0
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchConcurso();
      fetchParticipantes();
    }
  }, [id]);

  // Recarregar usuários disponíveis quando participantes mudarem
  useEffect(() => {
    fetchUsuarios();
  }, [participantes]);

  // Calcular valor total quando concurso ou quantidade de cotas mudar
  useEffect(() => {
    if (concurso) {
      setNewParticipante(prev => ({
        ...prev,
        valor_total: prev.quantidade_cotas * concurso.valor_cota
      }));
    }
  }, [concurso, newParticipante.quantidade_cotas]);

  const fetchConcurso = async () => {
    try {
      const { data, error } = await supabase
        .from('concursos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setConcurso(data);
    } catch (error) {
      console.error('Erro ao buscar concurso:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar concurso",
        variant: "destructive",
      });
    }
  };

  const fetchParticipantes = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_participantes_concurso', { p_concurso_id: id });

      if (error) throw error;

      const participantesFormatados: Participante[] = (data || []).map((participante: any) => ({
        id: participante.id,
        user_id: participante.user_id,
        concurso_id: participante.concurso_id,
        numeros_escolhidos: participante.numeros_escolhidos || [],
        quantidade_cotas: participante.quantidade_cotas,
        valor_total: Number(participante.valor_total) || 0,
        data_participacao: participante.data_participacao,
        premiado: participante.premiado,
        valor_premio: Number(participante.valor_premio) || 0,
        profiles: {
          nome: participante.nome,
          email: participante.email,
        }
      }));

      setParticipantes(participantesFormatados);

      if (participantesFormatados.length > 0) {
        const totalCotas = participantesFormatados.reduce((acc, participante) => acc + participante.quantidade_cotas, 0);

        setConcurso(prev => prev ? {
          ...prev,
          cotas_vendidas: totalCotas,
          premio_total: prev.valor_cota * totalCotas,
        } : prev);
      } else {
        await fetchConcurso();
      }
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar participantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      // Se não há participantes, buscar todos os usuários
      if (participantes.length === 0) {
        const { data: todosUsuarios, error } = await supabase
          .from('profiles')
          .select('user_id, nome, email')
          .order('nome', { ascending: true });

        if (error) throw error;
        setUsuarios(todosUsuarios || []);
        return;
      }

      // Buscar todos os usuários primeiro
      const { data: todosUsuarios, error: usuariosError } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .order('nome', { ascending: true });

      if (usuariosError) throw usuariosError;

      // Filtrar usuários que NÃO participam do concurso
      const participantesIds = participantes.map(p => p.user_id);
      const usuariosDisponiveis = todosUsuarios?.filter(
        usuario => !participantesIds.includes(usuario.user_id)
      ) || [];

      setUsuarios(usuariosDisponiveis);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'aberto' ? 'default' : 'secondary'}>
        {status}
      </Badge>
    );
  };

  const handleAddParticipante = async () => {
    if (!selectedUsuario) {
      toast({
        title: "Erro",
        description: "Selecione um usuário",
        variant: "destructive",
      });
      return;
    }

    try {
      // Inserir participação
      const { error: participacaoError } = await supabase
        .from('participacoes')
        .insert({
          concurso_id: id,
          user_id: selectedUsuario.user_id,
          numeros_escolhidos: newParticipante.numeros_escolhidos,
          quantidade_cotas: newParticipante.quantidade_cotas,
          valor_total: newParticipante.valor_total,
          data_participacao: new Date().toISOString()
        });

      if (participacaoError) throw participacaoError;

      // Criar registro de pagamento correspondente
      const { error: pagamentoError } = await supabase
        .from('pagamentos')
        .insert({
          user_id: selectedUsuario.user_id,
          concurso_id: id,
          quantidade_cotas: newParticipante.quantidade_cotas,
          valor_total: newParticipante.valor_total,
          forma_pagamento: 'admin',
          status: 'confirmado'
        });

      if (pagamentoError) {
        console.error('Erro ao criar pagamento:', pagamentoError);
        // Não falha a operação se o pagamento não for criado
        toast({
          title: "Aviso",
          description: "Participante adicionado, mas registro de pagamento não foi criado",
          variant: "destructive",
        });
      }

      toast({
        title: "Sucesso",
        description: "Participante adicionado com sucesso!",
      });

      setIsAddDialogOpen(false);
      setNewParticipante({
        user_id: '',
        numeros_escolhidos: [],
        quantidade_cotas: 1,
        valor_total: concurso?.valor_cota || 0
      });
      setSelectedUsuario(null);
      fetchParticipantes();
    } catch (error) {
      console.error('Erro ao adicionar participante:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar participante",
        variant: "destructive",
      });
    }
  };

  const handleEditParticipante = async () => {
    if (!editingParticipante) return;

    try {
      const { error } = await supabase
        .from('participacoes')
        .update({
          numeros_escolhidos: editingParticipante.numeros_escolhidos,
          quantidade_cotas: editingParticipante.quantidade_cotas,
          valor_total: editingParticipante.valor_total
        })
        .eq('id', editingParticipante.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Participante atualizado com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingParticipante(null);
      fetchParticipantes();
    } catch (error) {
      console.error('Erro ao editar participante:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar participante",
        variant: "destructive",
      });
    }
  };

  const handleDeleteParticipante = async (participanteId: string) => {
    if (!confirm('Tem certeza que deseja excluir este participante?')) return;

    try {
      const { error } = await supabase
        .from('participacoes')
        .delete()
        .eq('id', participanteId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Participante excluído com sucesso!",
      });

      fetchParticipantes();
    } catch (error) {
      console.error('Erro ao excluir participante:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir participante",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (participante: Participante) => {
    setEditingParticipante({ ...participante });
    setIsEditDialogOpen(true);
  };

  const handleOpenAddDialog = () => {
    setNewParticipante({
      user_id: '',
      numeros_escolhidos: [],
      quantidade_cotas: 1,
      valor_total: concurso?.valor_cota || 0
    });
    setSelectedUsuario(null);
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando participantes...</span>
        </div>
      </div>
    );
  }

  if (!concurso) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Concurso não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/concursos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Participantes do Concurso</h1>
            <p className="text-muted-foreground">
              {concurso.nome} - #{concurso.numero}
            </p>
          </div>
        </div>
        
        {profile?.tipo === 'admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Participante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Participante</DialogTitle>
                <DialogDescription>
                  Adicione um novo participante ao concurso
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Selecionar Usuário</Label>
                  <Popover open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUserSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedUsuario ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{selectedUsuario.nome}</span>
                            <span className="text-sm text-muted-foreground">{selectedUsuario.email}</span>
                          </div>
                        ) : (
                          "Selecione um usuário..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar usuário..." 
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {usuarios.map((usuario) => (
                              <CommandItem
                                key={usuario.user_id}
                                value={`${usuario.nome} ${usuario.email}`}
                                onSelect={() => {
                                  setSelectedUsuario(usuario);
                                  setIsUserSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedUsuario?.user_id === usuario.user_id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{usuario.nome}</span>
                                  <span className="text-sm text-muted-foreground">{usuario.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="quantidade_cotas">Quantidade de Cotas</Label>
                  <Input
                    id="quantidade_cotas"
                    type="number"
                    min="1"
                    value={newParticipante.quantidade_cotas}
                    onChange={(e) => setNewParticipante(prev => ({ 
                      ...prev, 
                      quantidade_cotas: parseInt(e.target.value) || 1,
                      valor_total: (parseInt(e.target.value) || 1) * (concurso?.valor_cota || 0)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="valor_total">Valor Total</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    value={newParticipante.valor_total}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor calculado automaticamente: {newParticipante.quantidade_cotas} cotas × R$ {concurso?.valor_cota?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="numeros">Números Escolhidos (separados por vírgula)</Label>
                  <Input
                    id="numeros"
                    placeholder="Ex: 1, 5, 10, 15"
                    onChange={(e) => {
                      const numeros = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                      setNewParticipante(prev => ({ ...prev, numeros_escolhidos: numeros }));
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddParticipante}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Informações do Concurso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {concurso.nome}
          </CardTitle>
          <CardDescription>
            Concurso #{concurso.numero}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {concurso.descricao && (
              <p className="text-sm text-muted-foreground">{concurso.descricao}</p>
            )}
            
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
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso das vendas:</span>
        <span className="font-medium">{concurso.cotas_vendidas}/{concurso.max_cotas} cotas</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(concurso.cotas_vendidas / concurso.max_cotas) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {((concurso.cotas_vendidas / concurso.max_cotas) * 100).toFixed(1)}% vendido
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Prêmio total:</span>
                <span className="font-semibold text-lg text-green-400">
                  R$ {concurso.premio_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Lista de Participantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participantes ({participantes.length})
          </CardTitle>
          <CardDescription>
            Lista de todos os participantes deste concurso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participante</TableHead>
                <TableHead>Números</TableHead>
                <TableHead>Cotas</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                {profile?.tipo === 'admin' && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((participante) => {
                const podeVerEmail = profile?.tipo === 'admin' || participante.user_id === profile?.user_id;
                const emailVisivel = podeVerEmail ? (participante.profiles?.email || 'N/A') : '';

                return (
                  <TableRow key={participante.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{participante.profiles?.nome || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{emailVisivel}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {participante.numeros_escolhidos.map((num, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {num.toString().padStart(2, '0')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{participante.quantidade_cotas}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {participante.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(participante.data_participacao).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {participante.premiado ? (
                        <Badge variant="default" className="bg-yellow-500">
                          <Trophy className="h-3 w-3 mr-1" />
                          Premiado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Participando</Badge>
                      )}
                    </TableCell>
                    {profile?.tipo === 'admin' && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEditDialog(participante)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteParticipante(participante.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              
              {participantes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={profile?.tipo === 'admin' ? 7 : 6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum participante encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      {editingParticipante && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Participante</DialogTitle>
              <DialogDescription>
                Edite as informações do participante
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_quantidade_cotas">Quantidade de Cotas</Label>
                <Input
                  id="edit_quantidade_cotas"
                  type="number"
                  min="1"
                  value={editingParticipante.quantidade_cotas}
                  onChange={(e) => setEditingParticipante(prev => ({ 
                    ...prev!, 
                    quantidade_cotas: parseInt(e.target.value) || 1,
                    valor_total: (parseInt(e.target.value) || 1) * (concurso?.valor_cota || 0)
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_valor_total">Valor Total</Label>
                <Input
                  id="edit_valor_total"
                  type="number"
                  step="0.01"
                  value={editingParticipante.valor_total}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Valor calculado automaticamente: {editingParticipante.quantidade_cotas} cotas × R$ {concurso?.valor_cota?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div>
                <Label htmlFor="edit_numeros">Números Escolhidos (separados por vírgula)</Label>
                <Input
                  id="edit_numeros"
                  placeholder="Ex: 1, 5, 10, 15"
                  defaultValue={editingParticipante.numeros_escolhidos.join(', ')}
                  onChange={(e) => {
                    const numeros = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                    setEditingParticipante(prev => ({ ...prev!, numeros_escolhidos: numeros }));
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditParticipante}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ParticipantesConcurso;
